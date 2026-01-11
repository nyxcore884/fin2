'use server';

import * as admin from 'firebase-admin';
import { onDocumentUpdate } from '@genkit-ai/firebase/functions';
import { ai } from '@/ai/genkit';
import { processUploadedFiles } from '../processors/dataProcessor';
import { analyzeWithAI } from '../processors/aiProcessor';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

export const processBudgetData = ai.defineFlow(
    {
        name: 'processBudgetData',
        triggers: [
            onDocumentUpdate(
                'upload_sessions/{sessionId}',
            ),
        ],
    },
    async (change) => {
        if (!change) {
            console.log('No change data received, likely a test run.');
            return;
        }

        const newData = change.after.data();
        const oldData = change.before.data();

        // Only trigger when status changes to ready_for_processing
        if (
            newData?.status === 'ready_for_processing' &&
            oldData?.status !== 'ready_for_processing'
        ) {
            const { userId, sessionId, files } = newData;
            console.log(`Processing session ${sessionId} for user ${userId}`);

            const sessionRef = admin.firestore().collection('upload_sessions').doc(sessionId);

            try {
                // 1. Update status to processing
                await sessionRef.update({
                    status: 'processing',
                    startedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // 2. Process the files through the ETL pipeline
                const processedData = await processUploadedFiles(
                    userId,
                    sessionId,
                    files
                );
                
                // 3. Get AI analysis for revenue classification and anomalies
                const aiAnalysis = await analyzeWithAI(processedData);

                // 4. Save final result to budget_results collection
                const resultsRef = await admin
                    .firestore()
                    .collection('budget_results')
                    .add({
                        userId,
                        sessionId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        ...processedData,
                        ...aiAnalysis,
                    });
                
                // 5. Update session as completed
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
