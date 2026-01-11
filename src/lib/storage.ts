'use client';

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { useStorage, useFirestore } from '@/firebase/provider';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const createUploadSession = async (userId: string, sessionId: string) => {
    const firestore = useFirestore();
    const sessionRef = doc(firestore, 'upload_sessions', sessionId);
    await setDoc(sessionRef, {
        userId,
        sessionId,
        createdAt: serverTimestamp(),
        status: 'uploading',
        files: {}
    });
};

export const markSessionAsReady = async (sessionId: string) => {
    const firestore = useFirestore();
    const sessionRef = doc(firestore, 'upload_sessions', sessionId);
    await updateDoc(sessionRef, {
        status: 'ready_for_processing',
        readyAt: serverTimestamp()
    });
};

export const useUploadFile = () => {
  const storage = useStorage();
  const firestore = useFirestore();

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

  const updateSessionFiles = async (sessionId: string, fileType: string, fileName: string, storagePath: string) => {
    const sessionRef = doc(firestore, 'upload_sessions', sessionId);
    await updateDoc(sessionRef, {
        [`files.${fileType}`]: {
            name: fileName,
            path: storagePath,
            uploadedAt: serverTimestamp()
        }
    });
  };

  return { uploadFile, updateSessionFiles };
};
