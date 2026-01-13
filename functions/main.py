import pandas as pd
import numpy as np
from firebase_admin import firestore, storage
import firebase_admin
from firebase_functions import firestore_fn, options
from datetime import datetime
import tempfile
import os
import json
import logging
import requests

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO)
options.set_global_options(region=options.SupportedRegion.EUROPE_WEST1)

# --- Firebase Admin SDK Initialization ---
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app()
        logging.info("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize Firebase Admin SDK: {e}")

db = firestore.client()
storage_client = storage.bucket()

def clean_numeric_column(series):
    """
    Robustly cleans a pandas Series containing numeric strings with various locale formats.
    Handles Georgian (lari), Russian, and European number formats.
    """
    if series.dtype == 'object':
        s = series.astype(str).str.strip()
        s = s.str.replace(r'[\s\',]', '', regex=True)
        s = s.str.replace(',', '.', regex=False)
        s = s.str.replace(r'[^\d\.\-]', '', regex=True)
        return pd.to_numeric(s, errors='coerce')
    return series

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


@firestore_fn.on_document_updated("upload_sessions/{sessionId}")
def process_upload_session(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    """
    Cloud Function triggered by a change to an UploadSession document in Firestore.
    """
    session_id = event.params["sessionId"]
    session_ref = db.collection('upload_sessions').document(session_id)
    
    after_data = event.data.after.to_dict()
    before_data = event.data.before.to_dict() if event.data.before else {}

    new_status = after_data.get('status')
    old_status = before_data.get('status')

    # Only proceed if the status just changed to 'ready_for_processing'
    if new_status != 'ready_for_processing' or old_status == 'ready_for_processing':
        logging.info(f"Ignoring status change from '{old_status}' to '{new_status}' for session {session_id}")
        return

    temp_dir = tempfile.mkdtemp()
    try:
        session_ref.update({
            'status': 'processing',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })

        # 1. DOWNLOAD FILES FROM CLOUD STORAGE
        files_meta = after_data.get('files', {})
        local_files = {}

        for file_type, meta in files_meta.items():
            blob = storage_client.blob(meta['path'])
            file_suffix = os.path.splitext(meta['name'])[1]
            temp_file_path = os.path.join(temp_dir, f"{file_type}{file_suffix}")
            blob.download_to_filename(temp_file_path)
            local_files[file_type] = temp_file_path

        # 2. READ AND VALIDATE FILES
        def read_file(path):
            if path.endswith('.csv'):
                return pd.read_csv(path, encoding='utf-8-sig')
            elif path.endswith(('.xlsx', '.xls')):
                return pd.read_excel(path, engine='openpyxl')
            raise ValueError(f"Unsupported file format for {path}")

        df_gl = read_file(local_files['glEntries'])
        
        amount_cols = ['Amount_Reporting_Curr', 'Subc_Debit', 'Credit', 'Debit']
        for col in amount_cols:
            if col in df_gl.columns:
                df_gl[col] = clean_numeric_column(df_gl[col])
        df_gl.dropna(subset=['Amount_Reporting_Curr'], inplace=True)

        df_budget_mapping = read_file(local_files['budgetHolderMapping'])
        df_cost_item_map = read_file(local_files['costItemMap'])
        df_regional_mapping = read_file(local_files['regionalMapping'])
        df_corrections = read_file(local_files['corrections']) if 'corrections' in local_files else pd.DataFrame()

        # 3. APPLY BUSINESS LOGIC MAPPINGS
        df_gl = pd.merge(df_gl, df_cost_item_map, on='cost_item', how='left')
        df_gl = pd.merge(df_gl, df_budget_mapping, on='budget_article', how='left')
        df_gl = pd.merge(df_gl, df_regional_mapping, on='structural_unit', how='left')

        # 4. AGGREGATE INTO INCOME STATEMENT
        revenue_df = df_gl[df_gl['Amount_Reporting_Curr'] > 0].copy()
        costs_df = df_gl[df_gl['Amount_Reporting_Curr'] <= 0].copy()

        total_costs = costs_df['Amount_Reporting_Curr'].abs().sum()
        costs_by_holder = costs_df.groupby('budget_holder')['Amount_Reporting_Curr'].abs().sum().to_dict()
        costs_by_region = costs_df.groupby('region')['Amount_Reporting_Curr'].abs().sum().to_dict()

        # 5. CALL AI SERVICES
        gemini_api_key = os.environ.get('GEMINI_API_KEY', "")
        retail_revenue, wholesale_revenue = 0.0, 0.0
        if not revenue_df.empty:
            ai_input = {"revenueEntry": revenue_df.to_json(orient='records'), "keywordsRetail": "individual,person", "keywordsWholesale": "company,ltd,llc"}
            # This part needs adjustment based on how classifyRevenue flow is designed to handle a batch
            # For simplicity, let's assume it iterates or we call it per row
            for _, row in revenue_df.iterrows():
                desc = row.get('counterparty', '')
                ai_input_row = {"revenueEntry": desc, "keywordsRetail": "individual,person", "keywordsWholesale": "company,ltd,llc"}
                result = call_genkit_flow('classifyRevenue', ai_input_row, gemini_api_key)
                if result.get('classification') == 'wholesale':
                    wholesale_revenue += row['Amount_Reporting_Curr']
                else:
                    retail_revenue += row['Amount_Reporting_Curr']
        
        anomaly_input = {"incomeStatementData": json.dumps({k: v for k, v in costs_by_holder.items() if pd.notna(k)})}
        anomalies_result = call_genkit_flow('detectAnomalies', anomaly_input, gemini_api_key).get('anomalies', [])
        anomalies = [a['description'] for a in anomalies_result] if anomalies_result else ["AI analysis temporarily unavailable."]

        # 6. SAVE RESULTS TO FIRESTORE
        results_ref = db.collection('budget_results').document()
        results_data = {
            'userId': after_data.get('userId'),
            'sessionId': session_id,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'verifiedMetrics': {
                'totalCosts': float(total_costs),
                'retailRevenue': float(retail_revenue),
                'wholesaleRevenue': float(wholesale_revenue),
                'costsByHolder': {str(k): float(v) for k, v in costs_by_holder.items() if pd.notna(k)},
                'costsByRegion': {str(k): float(v) for k, v in costs_by_region.items() if pd.notna(k)}
            },
            'aiAnalysis': {
                'anomalies': anomalies,
                'insights': [],
                'recommendations': []
            },
        }
        results_ref.set(results_data)

        # 7. UPDATE SESSION STATUS TO COMPLETED
        session_ref.update({
            'status': 'completed',
            'resultId': results_ref.id,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })

        logging.info(f"Successfully processed session {session_id}. Result ID: {results_ref.id}")

    except Exception as e:
        # 8. ROBUST ERROR HANDLING
        error_message = f"Processing failed: {str(e)}"
        logging.error(f"Error processing session {session_id}: {e}", exc_info=True)
        session_ref.update({
            'status': 'error',
            'errorMessage': error_message,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        raise e
    finally:
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)

    