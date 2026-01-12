'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing suggestions and analysis for detected anomalies.
 *
 * It uses a user's financial data from Firestore to provide context-aware responses.
 * It includes the AnomalySuggestionInput, AnomalySuggestionOutput types and the provideAnomalySuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('Firebase admin initialization error', e);
    }
}

const AnomalySuggestionInputSchema = z.object({
  message: z.string().describe('The user\'s query about their financial data.'),
  userId: z.string().describe('The authenticated user\'s ID.'),
  sessionId: z.string().optional().describe('The specific session ID to query data from.'),
});
export type AnomalySuggestionInput = z.infer<typeof AnomalySuggestionInputSchema>;

const AnomalySuggestionOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the user\'s query.'),
});
export type AnomalySuggestionOutput = z.infer<typeof AnomalySuggestionOutputSchema>;


export async function provideAnomalySuggestions(input: AnomalySuggestionInput): Promise<AnomalySuggestionOutput> {
  return provideAnomalySuggestionsFlow(input);
}


const provideAnomalySuggestionsFlow = ai.defineFlow(
  {
    name: 'provideAnomalySuggestionsFlow',
    inputSchema: AnomalySuggestionInputSchema,
    outputSchema: AnomalySuggestionOutputSchema,
  },
  async ({ message, userId, sessionId }) => {
    let userData = '';
    
    try {
      if (sessionId) {
        // Get specific session data
        const sessionDoc = await admin.firestore()
          .collection("budget_results")
          .doc(sessionId)
          .get();
        
        if (sessionDoc.exists && sessionDoc.data()?.userId === userId) {
          const sessionData = sessionDoc.data();
          userData = JSON.stringify({
            totalCosts: sessionData.totalCosts,
            retailRevenue: sessionData.retailRevenue,
            wholesaleRevenue: sessionData.wholesaleRevenue,
            costsByHolder: sessionData.costsByHolder,
            costsByRegion: sessionData.costsByRegion,
            anomalies: sessionData.anomalies,
            insights: sessionData.insights
          }, null, 2);
        }
      } else {
        // Get all user data (last 5 reports)
        const userDocs = await admin.firestore()
          .collection("budget_results")
          .where("userId", "==", userId)
          .orderBy("timestamp", "desc")
          .limit(5)
          .get();
        
        const sessions = userDocs.docs.map(doc => doc.data());
        userData = JSON.stringify(sessions, null, 2);
      }
    } catch (error) {
        console.error("Firestore query failed:", error);
        userData = "Could not retrieve financial data from the database.";
    }

    const prompt = `
      You are a financial analyst AI assistant for a gas distribution company. 
      The user has asked: "${message}"

      Here is the user's financial data:
      ${userData || "No financial data available for this user."}

      Please provide a comprehensive, helpful response based on their data. 
      If they're asking about specific financial metrics, trends, or insights, 
      reference their actual data in your response.

      Key guidelines:
      1. Be precise and data-driven
      2. Reference specific numbers from their data when relevant
      3. Provide actionable insights
      4. Explain complex financial concepts in simple terms
      5. If they ask about something not in the data, politely explain the limitation
      6. Format your response clearly with bullet points and sections when appropriate

      Response:
    `;

    const result = await ai.generate({ prompt });
    
    return {
      response: result.text,
    };
  }
);
