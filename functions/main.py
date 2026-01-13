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


@firestore_fn.on_document_updated("uploadSessions/{sessionId}")
def process_upload_session(event: firestore_fn.Event[firestore_fn.Change]) -> None:
    """
    Cloud Function triggered by a change to an UploadSession document in Firestore.
    """
    session_id = event.params["sessionId"]
    session_ref = db.collection('uploadSessions').document(session_id)
    
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
        # Note: This assumes column names like 'cost_item', 'budget_article', 'structural_unit' exist
        df_gl['budget_article'] = df_gl['cost_item'].map(pd.Series(df_cost_item_map.set_index('cost_item')['budget_article']))
        df_gl['budget_holder'] = df_gl['budget_article'].map(pd.Series(df_budget_mapping.set_index('budget_article')['budget_holder']))
        df_gl['region'] = df_gl['structural_unit'].map(pd.Series(df_regional_mapping.set_index('structural_unit')['region']))

        # 4. AGGREGATE INTO INCOME STATEMENT
        revenue_df = df_gl[df_gl['Amount_Reporting_Curr'] > 0].copy()
        costs_df = df_gl[df_gl['Amount_Reporting_Curr'] <= 0].copy()

        total_costs = costs_df['Amount_Reporting_Curr'].abs().sum()
        costs_by_holder = costs_df.groupby('budget_holder')['Amount_Reporting_Curr'].abs().sum().to_dict()
        costs_by_region = costs_df.groupby('region')['Amount_Reporting_Curr'].abs().sum().to_dict()
        
        # Simple revenue split for now, can be replaced by AI call
        retail_revenue = revenue_df['Amount_Reporting_Curr'].sum() * 0.7 # Mock 70%
        wholesale_revenue = revenue_df['Amount_Reporting_Curr'].sum() * 0.3 # Mock 30%

        # 5. CALL AI SERVICES (Placeholder)
        anomalies = ["AI analysis temporarily unavailable."]

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
        # Clean up temporary files
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
            logging.info(f"Cleaned up temporary directory: {temp_dir}")
