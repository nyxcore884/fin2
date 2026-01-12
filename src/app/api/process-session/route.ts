import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc } from 'firebase-admin/firestore';
import { app } from '@/firebase/admin';

// This route now only updates the status of the session document in Firestore.
// This is a more robust pattern that allows a dedicated backend service (Cloud Function)
// to handle the heavy processing, preventing the Next.js server from timing out.
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    const db = getFirestore(app);
    const sessionRef = doc(db, 'upload_sessions', sessionId);

    // Update the status to 'ready_for_processing' to trigger the backend processor.
    await updateDoc(sessionRef, { status: 'ready_for_processing' });

    return NextResponse.json({
      success: true,
      message: `Processing initiated for session ${sessionId}. The backend is now handling the data.`,
    });

  } catch (error: any) {
    console.error("API Error in /api/process-session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
