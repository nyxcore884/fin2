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
        const sessionRef = doc(firestore, 'upload_sessions', sessionId);
        await setDoc(sessionRef, {
            userId,
            sessionId,
            createdAt: serverTimestamp(),
            status: 'uploading',
            files: {}
        });
    };
    
    // This function is now simplified, just for updating with file info before triggering backend
    const updateSessionWithFiles = async (sessionId: string, data: Record<string, any>) => {
        const sessionRef = doc(firestore, 'upload_sessions', sessionId);
        await updateDoc(sessionRef, data);
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

    return { uploadFile, createUploadSession, updateSessionWithFiles };
};

    