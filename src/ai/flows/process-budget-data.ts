'use server';

/**
 * @fileOverview This file contains the main backend logic for processing uploaded financial data.
 * It is triggered by an API call from the client after files are uploaded.
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { processUploadedFiles } from '@/ai/processors/dataProcessor';
import { classifyRevenue } from './classify-revenue';
import { detectAnomalies } from './detect-anomalies';
import { Readable } from 'stream';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin SDK if not already initialized
// This gives the server backend privileged access to Firebase services.
if (!admin.apps.length) {
  admin.initializeApp({
    // projectId and storageBucket are read from environment variables
  });
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Orchestrates the entire data processing pipeline for a given session.
 * @param sessionId The unique ID of the upload session to process.
 */
export async function processBudgetData(sessionId: string): Promise<void> {
  if (!sessionId) {
    console.error('processBudgetData called without a sessionId.');
    return;
  }

  const sessionRef = db.collection('upload_sessions').doc(sessionId);
  
  try {
    // 1. Update session status to 'processing'
    await sessionRef.update({ status: 'processing', processedAt: FieldValue.serverTimestamp() });

    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new Error(`Session ${sessionId} not found.`);
    }
    const sessionData = sessionDoc.data()!;

    // 2. Process the uploaded files from Cloud Storage
    const { processedDf } = await processUploadedFiles(sessionData.files, storage.bucket());
    
    const revenueDf = processedDf.filter((row: any) => row.Amount_Reporting_Curr > 0);
    const costsDf = processedDf.filter((row: any) => row.Amount_Reporting_Curr < 0);

    // 3. AI-Powered Revenue Classification
    let retail_revenue = 0;
    let wholesale_revenue = 0;

    for (const row of revenueDf) {
        const entry_description = row.counterparty || '';
        if (entry_description) {
            const ai_input = {
                revenueEntry: entry_description,
                keywordsRetail: "individual, person, private",
                keywordsWholesale: "company, organization, ltd, llc"
            };
            const classification_result = await classifyRevenue(ai_input);
            if (classification_result.classification === 'wholesale') {
                wholesale_revenue += row.Amount_Reporting_Curr;
            } else {
                retail_revenue += row.Amount_Reporting_Curr;
            }
        } else {
            retail_revenue += row.Amount_Reporting_Curr; // Default to retail
        }
    }

    // 4. Perform Calculations
    const total_costs = costsDf.reduce((acc, row) => acc + Math.abs(row.Amount_Reporting_Curr), 0);
    
    const costs_by_holder: { [key: string]: number } = {};
    costsDf.forEach(row => {
        if (row.budget_holder) {
            costs_by_holder[row.budget_holder] = (costs_by_holder[row.budget_holder] || 0) + Math.abs(row.Amount_Reporting_Curr);
        }
    });

    const costs_by_region: { [key: string]: number } = {};
    costsDf.forEach(row => {
        if (row.region) {
            costs_by_region[row.region] = (costs_by_region[row.region] || 0) + Math.abs(row.Amount_Reporting_Curr);
        }
    });

    // 5. AI Anomaly Detection
    const costs_by_holder_str = JSON.stringify(costs_by_holder);
    const anomaly_input = { incomeStatementData: costs_by_holder_str };
    const ai_anomalies_result = await detectAnomalies(anomaly_input);
    const anomalies = ai_anomalies_result.anomalies.map(a => a.description);
    
    // 6. Structure Final Result
    const result_data = {
      userId: sessionData.userId,
      sessionId: sessionId,
      timestamp: FieldValue.serverTimestamp(),
      verifiedMetrics: {
        totalCosts: total_costs,
        retailRevenue: retail_revenue,
        wholesaleRevenue: wholesale_revenue,
        costsByHolder: costs_by_holder,
        costsByRegion: costs_by_region,
      },
      aiAnalysis: {
        anomalies: anomalies,
        insights: ["Insight from unified TS backend."],
        recommendations: ["Recommendation from unified TS backend."],
      },
    };

    // 7. Save result to Firestore and update session
    const resultRef = await db.collection('budget_results').add(result_data);
    await sessionRef.update({
      status: 'completed',
      resultId: resultRef.id,
      completedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Successfully processed session ${sessionId}. Result ID: ${resultRef.id}`);

  } catch (error: any) {
    console.error(`Error processing session ${sessionId}:`, error);
    await sessionRef.update({
      status: 'error',
      errorMessage: error.message || 'An unexpected error occurred during processing.',
      completedAt: FieldValue.serverTimestamp(),
    });
  }
}
