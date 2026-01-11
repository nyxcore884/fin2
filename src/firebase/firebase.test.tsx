
import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { FirebaseProvider, useFirebaseApp, useAuth, useFirestore, useStorage, useUser, useFirebase } from './firebase.tsx';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Mock Firebase services
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

describe('FirebaseProvider', () => {
  it('initializes Firebase services', async () => {
    const TestComponent = () => {
      const { firebaseApp, auth, firestore, storage } = useFirebase();
      expect(firebaseApp).not.toBeNull();
      expect(auth).not.toBeNull();
      expect(firestore).not.toBeNull();
      expect(storage).not.toBeNull();
      return null;
    };

    render(
      <FirebaseProvider>
        <TestComponent />
      </FirebaseProvider>
    );

    await waitFor(() => {
      expect(initializeApp).toHaveBeenCalled();
      expect(getAuth).toHaveBeenCalled();
      expect(getFirestore).toHaveBeenCalled();
      expect(getStorage).toHaveBeenCalled();
    });
  });

  it('provides user and loading state', async () => {
    const mockUser = { uid: '123' };
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn(); // Unsubscribe function
    });

    const TestComponent = () => {
      const { user, isUserLoading } = useUser();
      if (isUserLoading) return <div>Loading...</div>;
      expect(user).toEqual(mockUser);
      return <div>Loaded</div>;
    };

    render(
      <FirebaseProvider>
        <TestComponent />
      </FirebaseProvider>
    );

    await waitFor(() => {
        const loadingElement = screen.queryByText('Loading...');
        expect(loadingElement).toBeNull();
    });
  });

  it('throws an error when useFirebase is used outside of a FirebaseProvider', () => {
    const TestComponent = () => {
      useFirebase();
      return null;
    };

    // Suppress console.error output from React
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => render(<TestComponent />)).toThrow('useFirebase must be used within a FirebaseProvider.');

    // Restore console.error
    console.error = originalError;
  });

  it('provides correct values through individual hooks', async () => {
    const TestComponent = () => {
      const firebaseApp = useFirebaseApp();
      const auth = useAuth();
      const firestore = useFirestore();
      const storage = useStorage();

      expect(firebaseApp).not.toBeNull();
      expect(auth).not.toBeNull();
      expect(firestore).not.toBeNull();
      expect(storage).not.toBeNull();
      return null;
    };

    render(
      <FirebaseProvider>
        <TestComponent />
      </FirebaseProvider>
    );

    await waitFor(() => {
      expect(initializeApp).toHaveBeenCalled();
    });
  });
});
