import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.error("Firebase admin initialization error", error);
    }
}


// This route is a simple bridge to trigger the backend Cloud Function
// by updating the status of the session document in Firestore.
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const db = getFirestore();
    const sessionRef = db.collection('upload_sessions').doc(sessionId);

    // Update the session status to trigger the Cloud Function
    await sessionRef.update({
      status: 'ready_for_processing',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, sessionId });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

    