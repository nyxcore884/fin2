'use client';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getStorage,
} from 'firebase/storage';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

let firebaseApp;
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const storage = getStorage(firebaseApp);
const firestore = getFirestore(firebaseApp);


export const createUploadSession = async (userId: string, sessionId: string) => {
    const sessionRef = doc(firestore, 'upload_sessions', sessionId);
    await setDoc(sessionRef, {
        userId,
        sessionId,
        createdAt: serverTimestamp(),
        status: 'uploading',
        files: {}
    });
};

export const markSessionAsReady = async (sessionId: string, data: Record<string, any>) => {
    const sessionRef = doc(firestore, 'upload_sessions', sessionId);
    await updateDoc(sessionRef, {
        ...data,
        status: 'ready_for_processing',
        readyAt: serverTimestamp()
    });
};

export const useUploadFile = () => {
  const uploadFile = (
    storagePath: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> => {

    try {
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
            console.error('Upload failed:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return Promise.reject(error);
    }
  };

  return { uploadFile, createUploadSession, markSessionAsReady };
};
