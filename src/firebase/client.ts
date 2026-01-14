'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, memoryLocalCache, enableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAQtEF3XZKZiAXcmqhofEXdSRB1IZTzMdo",
  authDomain: "studio-9381016045-4d625.firebaseapp.com",
  projectId: "studio-9381016045-4d625",
  storageBucket: "studio-9381016045-4d625.firebasestorage.app",
  messagingSenderId: "733431756980",
  appId: "1:733431756980:web:70c581646d298c84ed7fe1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline persistence
// It will fall back to memory cache if the browser doesn't support indexedDB.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});

const storage = getStorage(app);
const auth = getAuth(app);

// It's a good practice to explicitly enable the network connection after initialization
// if you want to ensure data is fetched on startup.
enableNetwork(db).catch(err => {
    console.error("Failed to enable Firestore network", err);
});


export { app, db, storage, auth, firebaseConfig };
