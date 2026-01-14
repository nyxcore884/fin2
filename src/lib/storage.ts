'use client';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getStorage,
} from 'firebase/storage';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth } from '@/firebase/client'; // Import auth to get user

export const useUploadFile = () => {
    const storage = getStorage();
    const firestore = getFirestore();

    const createUploadSession = async (userId: string, sessionId: string) => {
        const sessionRef = doc(firestore, 'uploadSessions', sessionId);
        await setDoc(sessionRef, {
            userId,
            sessionId,
            createdAt: serverTimestamp(),
            status: 'uploading',
            files: {}
        });
        return sessionRef;
    };
    
    // This function is now simplified, just for updating with file info before triggering backend
    const markSessionAsReady = async (sessionId: string, data: Record<string, any>) => {
        const sessionRef = doc(firestore, 'uploadSessions', sessionId);
        await updateDoc(sessionRef, {
            ...data,
            status: 'ready_for_processing',
            readyAt: serverTimestamp(),
        });
        
        // Call API route to trigger backend processing
        const response = await fetch('/api/process-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });

        // Don't parse JSON. Just check for a successful status code.
        // The API route's job is to kick off a background task, not return data.
        if (!response.ok) {
            // Try to get more error info, but don't assume it's JSON
            const errorText = await response.text();
            throw new Error(`Failed to initiate processing. Server responded with ${response.status}: ${errorText}`);
        }
    };

    const uploadFile = (
        storagePath: string,
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<string> => {
        const fileRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress?.(Math.round(progress));
            },
            (error) => {
                console.error('Upload error:', error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL); // Resolves with the HTTP URL
            }
            );
        });
    };

    return { uploadFile, createUploadSession, markSessionAsReady };
};
