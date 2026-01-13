
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

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
 * This API route triggers the backend processing by updating the status of a session document.
 * The actual processing is handled by a Firestore-triggered Cloud Function.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const db = getFirestore();
    const sessionRef = db.collection('uploadSessions').doc(sessionId);

    // Update the session status to trigger the Cloud Function
    await sessionRef.update({
      status: 'ready_for_processing',
      updatedAt: new Date(),
    });

    console.log(`Session ${sessionId} marked as ready_for_processing.`);
    return NextResponse.json({ success: true, sessionId });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred' }, { status: 500 });
  }
}
