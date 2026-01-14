'use client';

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/client';

// Initialize Firebase
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export default function TestUploadPage() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [progress, setProgress] = useState<number>(0);

  const testUpload = async () => {
    try {
      setStatus('Creating test session...');
      
      // Create a test session document
      const sessionId = 'test-session-' + Date.now();
      const userId = 'test-user'; // Placeholder user ID
      
      await setDoc(doc(db, 'upload_sessions', sessionId), {
        userId,
        sessionId,
        createdAt: new Date(),
        status: 'uploading',
        files: {}
      });

      setStatus('Uploading test file...');
      
      // Create a small test file
      const testContent = 'this is a test file to verify upload functionality.';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      // Upload file
      const storagePath = `user_uploads/${userId}/${sessionId}/test/test-file.txt`;
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, testFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(currentProgress);
          setStatus(`Uploading: ${Math.round(currentProgress)}%`);
        },
        (error) => {
          console.error('Upload failed:', error);
          setStatus(`Upload failed: ${error.message}`);
        },
        async () => {
          setStatus('Upload completed! Updating session...');
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update session
          await setDoc(doc(db, 'upload_sessions', sessionId), {
            status: 'ready_for_processing',
            files: {
              test: {
                name: 'test-file.txt',
                path: storagePath,
                uploadedAt: new Date(),
                url: downloadURL,
              }
            }
          }, { merge: true });

          setStatus('Test completed successfully!');
        }
      );

    } catch (error: any) {
      console.error('Test failed:', error);
      setStatus(`Test failed: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">File Upload Test Page</h1>
      <p className="mb-4 text-muted-foreground">This page tests the core file upload functionality to Firebase Storage. Click the button below and observe the status. Check the developer console for any errors.</p>
      <button 
        onClick={testUpload}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
      >
        Run Upload Test
      </button>
      <div className="mt-6 p-4 border rounded-lg bg-muted/50">
        <h2 className="font-semibold">Status: <span className="font-mono font-normal">{status}</span></h2>
        {progress > 0 && (
          <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
