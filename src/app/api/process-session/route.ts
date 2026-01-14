
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { processBudgetData } from '@/ai/flows/process-budget-data';

// Initialize Firebase Admin SDK if not already done.
// This is safe to run multiple times.
if (!admin.apps.length) {
    try {
        // Use application default credentials on the server
        admin.initializeApp();
        console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
        console.error("Firebase admin initialization error", error);
    }
}

/**
 * This API route triggers the backend processing.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const db = getFirestore();
    // Use correct collection name 'upload_sessions'
    const sessionRef = db.collection('upload_sessions').doc(sessionId);

    // Update the session status
    await sessionRef.update({
      status: 'ready_for_processing',
      updatedAt: new Date(),
    });

    console.log(`Session ${sessionId} marked as ready_for_processing. Triggering backend processing...`);

    // Trigger the processing logic directly
    await processBudgetData(sessionId);

    return NextResponse.json({ success: true, sessionId });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred' }, { status: 500 });
  }
}
