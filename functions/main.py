import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore, storage
from firebase_functions import firestore_fn, options
import functions_framework
import logging
import os
import tempfile
import json
import requests

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO)
options.set_global_options(region=options.SupportedRegion.EUROPE_WEST1)

# --- Firebase Admin SDK Initialization ---
if not firebase_admin._apps:
    try:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
        logging.info("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin SDK: {e}")
db = firestore.client()

# --- Robust Data Cleaning and File Reading ---
def clean_numeric_column(series: pd.Series) -> pd.Series:
    """Cleans a pandas Series with multi-language numeric formats."""
    s = series.astype(str).str.strip()
    s = s.str.replace(r'[\s\',]', '', regex=True) # Remove spaces, apostrophes, and commas as thousand separators
    s = s.str.replace(',', '.') # Standardize decimal separator to period
    s = s.str.replace(r'[^\d\.\-]', '', regex=True) # Remove remaining non-numeric chars
    return pd.to_numeric(s, errors='coerce')

def read_financial_file(file_path: str) -> pd.DataFrame:
    """Reads CSV or Excel files with robust encoding and data cleaning."""
    file_extension = os.path.splitext(file_path)[1].lower()
    try:
        if file_extension == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8-sig')
        elif file_extension in ('.xlsx', '.xls'):
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        # Apply cleaning to all potential financial columns
        amount_columns = ['Amount_Reporting_Curr', 'Subc_Debit', 'Credit', 'Debit']
        for col in amount_columns:
            if col in df.columns:
                df[col] = clean_numeric_column(df[col])
        return df
    except Exception as e:
        logging.error(f"Error reading file {os.path.basename(file_path)}: {e}")
        raise

# --- AI Flow Communication ---
def call_genkit_flow(flow_name: str, data: dict, api_key: str) -> dict:
    """Calls a Genkit flow endpoint running in the Next.js service."""
    try:
        base_url = os.environ.get('SERVICE_URL', 'http://127.0.0.1:4000')
        genkit_url = f"{base_url}/api/flow/{flow_name}"
        headers = {"Content-Type": "application/json", "x-genkit-api-key": api_key}
        response = requests.post(genkit_url, headers=headers, json={'input': data})
        response.raise_for_status()
        return response.json().get('output', {})
    except requests.exceptions.RequestException as e:
        logging.error(f"Error calling Genkit flow '{flow_name}': {e}")
        return {"classification": "retail"} if flow_name == 'classifyRevenue' else {"anomalies": []}


# --- Main Cloud Function (Firestore Triggered) ---
@firestore_fn.on_document_updated("upload_sessions/{sessionId}")
def process_financial_data(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    """Processes financial data when an upload session status is updated."""
    session_id = event.params["sessionId"]
    before_data = event.data.before.to_dict() if event.data.before else {}
    after_data = event.data.after.to_dict()

    # Trigger only when status changes to 'ready_for_processing'
    if after_data.get('status') != 'ready_for_processing' or before_data.get('status') == 'ready_for_processing':
        logging.info(f"Skipping session {session_id}: status not 'ready_for_processing' or already processed.")
        return

    logging.info(f"Processing session: {session_id}")
    session_ref = db.collection('upload_sessions').document(session_id)
    session_ref.update({'status': 'processing', 'processedAt': firestore.SERVER_TIMESTAMP})

    temp_dir = tempfile.mkdtemp()
    try:
        files_meta = after_data.get('files', {})
        bucket_name = os.environ.get('FIREBASE_STORAGE_BUCKET')
        if not all([files_meta, bucket_name]):
            raise ValueError("Missing file metadata or storage bucket environment variable.")

        bucket = storage.bucket(bucket_name)
        local_files = {}
        for file_type, meta in files_meta.items():
            temp_file_path = os.path.join(temp_dir, os.path.basename(meta['name']))
            bucket.blob(meta['path']).download_to_filename(temp_file_path)
            local_files[file_type] = temp_file_path

        # --- Data Processing with Pandas ---
        gl_df = read_financial_file(local_files['glEntries'])
        gl_df.dropna(subset=['Amount_Reporting_Curr'], inplace=True)

        budget_holder_df = read_financial_file(local_files['budgetHolderMapping'])
        cost_item_map_df = read_financial_file(local_files['costItemMap'])
        regional_df = read_financial_file(local_files['regionalMapping'])

        processed_df = pd.merge(gl_df, cost_item_map_df, on='cost_item', how='left')
        processed_df = pd.merge(processed_df, budget_holder_df, on='budget_article', how='left')
        processed_df = pd.merge(processed_df, regional_df, on='structural_unit', how='left')

        # --- AI-Powered Analysis ---
        revenue_df = processed_df[processed_df['Amount_Reporting_Curr'] > 0]
        costs_df = processed_df[processed_df['Amount_Reporting_Curr'] <= 0].copy()
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_api_key: raise ValueError("GEMINI_API_KEY env var is not set.")

        retail_revenue, wholesale_revenue = 0, 0
        for _, row in revenue_df.iterrows():
            desc = row.get('counterparty', '')
            ai_input = {"revenueEntry": desc, "keywordsRetail": "individual,person", "keywordsWholesale": "company,ltd,llc"}
            result = call_genkit_flow('classifyRevenue', ai_input, gemini_api_key)
            if result.get('classification') == 'wholesale':
                wholesale_revenue += row['Amount_Reporting_Curr']
            else:
                retail_revenue += row['Amount_Reporting_Curr']

        # --- Final Calculations & AI Anomaly Detection ---
        total_costs = costs_df['Amount_Reporting_Curr'].abs().sum()
        costs_by_holder = costs_df.groupby('budget_holder')['Amount_Reporting_Curr'].sum().abs().to_dict()
        anomaly_input = {"incomeStatementData": json.dumps({k: v for k, v in costs_by_holder.items() if pd.notna(k)})}
        anomalies = call_genkit_flow('detectAnomalies', anomaly_input, gemini_api_key).get('anomalies', [])

        # --- Save to Firestore ---
        result_data = {
            'userId': after_data['userId'], 'sessionId': session_id, 'timestamp': firestore.SERVER_TIMESTAMP,
            'verifiedMetrics': {
                'totalCosts': float(total_costs), 'retailRevenue': float(retail_revenue), 'wholesaleRevenue': float(wholesale_revenue),
                'costsByHolder': {str(k): float(v) for k, v in costs_by_holder.items() if pd.notna(k)},
                'costsByRegion': {str(k): float(v) for k, v in costs_df.groupby('region')['Amount_Reporting_Curr'].sum().abs().to_dict().items() if pd.notna(k)},
            },
            'aiAnalysis': {'anomalies': [a['description'] for a in anomalies], 'insights': [], 'recommendations': []},
        }
        result_ref = db.collection('budget_results').document()
        result_ref.set(result_data)
        session_ref.update({'status': 'completed', 'resultId': result_ref.id, 'completedAt': firestore.SERVER_TIMESTAMP})
        logging.info(f"Successfully processed session {session_id}. Result ID: {result_ref.id}")

    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        logging.error(f"Error processing session {session_id}: {e}", exc_info=True)
        session_ref.update({'status': 'error', 'errorMessage': error_message, 'completedAt': firestore.SERVER_TIMESTAMP})

    finally:
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
