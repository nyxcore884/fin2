'use server';

import * as admin from 'firebase-admin';
import { onDocumentUpdate } from 'firebase-functions/v2/firestore';
import { onFlow } from '@genkit-ai/firebase/functions';
import { ai } from '@/ai/genkit';
import { processUploadedFiles } from '../processors/dataProcessor';
import { analyzeWithAI } from '../processors/aiProcessor';
import { verifyFirebaseConfig } from '../processors/verifyConfig';

try {
  verifyFirebaseConfig();
  console.log('✅ Configuration verified successfully');
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
}


if (admin.apps.length === 0) {
    admin.initializeApp();
}

const processBudgetDataFlow = ai.defineFlow(
    {
        name: 'processBudgetDataFlow',
    },
    async (change) => {
        if (!change) {
            console.log('No change data received, likely a test run.');
            return;
        }

        const newData = change.after.data();
        const oldData = change.before.data();

        if (
            newData?.status === 'ready_for_processing' &&
            oldData?.status !== 'ready_for_processing'
        ) {
            const { userId, sessionId, files } = newData;
            console.log(`Processing session ${sessionId} for user ${userId}`);

            const sessionRef = admin.firestore().collection('upload_sessions').doc(sessionId);

            try {
                await sessionRef.update({
                    status: 'processing',
                    startedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                const processedData = await processUploadedFiles(
                    userId,
                    sessionId,
                    files
                );
                
                // Pass the API key from environment variables to the processor.
                const geminiApiKey = process.env.GEMINI_API_KEY;
                if (!geminiApiKey) {
                    throw new Error("GEMINI_API_KEY environment variable not set for function.");
                }
                const aiResult = await analyzeWithAI(processedData, geminiApiKey);

                const resultsRef = admin.firestore().collection('budget_results').doc();
                
                await resultsRef.set({
                    userId,
                    sessionId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    verifiedMetrics: aiResult.verifiedMetrics,
                    aiAnalysis: aiResult.aiAnalysis,
                    processingTime: new Date().toISOString(),
                    fileTypes: Object.keys(files || {})
                });
                
                await sessionRef.update({
                    status: 'completed',
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    resultId: resultsRef.id,
                });

                console.log(
                    `Successfully processed session ${sessionId} for user ${userId}`
                );
            } catch (error: any) {
                console.error('Processing failed:', error);
                await sessionRef.update({
                    status: 'error',
                    errorMessage: error.message,
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    }
);

export const processBudgetData = onFlow(
    {
        name: 'processBudgetData',
        trigger: onDocumentUpdate('upload_sessions/{sessionId}'),
        flow: processBudgetDataFlow
    },
);
