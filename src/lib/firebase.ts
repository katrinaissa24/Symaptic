import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** When no Firebase config is present the app runs in a local, single-browser demo mode. */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export type AuthModule = typeof import('firebase/auth');
export type FirestoreModule = typeof import('firebase/firestore');

export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  /** The firebase/auth and firebase/firestore modules, loaded on demand. */
  A: AuthModule;
  F: FirestoreModule;
}

let loading: Promise<Firebase> | null = null;

/**
 * Loads the Firebase SDK (about 560 kB) the first time it is needed, after the page has painted,
 * so no screen waits on it. Callers that need Firebase are async anyway.
 */
export function getFirebase(): Promise<Firebase> {
  if (!isFirebaseConfigured) return Promise.reject(new Error('Firebase is not configured'));
  if (!loading) {
    loading = Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]).then(([appMod, A, F]) => {
      const app = appMod.getApps()[0] ?? appMod.initializeApp(config);
      // No popupRedirectResolver here: that keeps the Google sign-in (gapi) iframe from loading on
      // every page. The resolver is passed explicitly where a popup is actually opened (lib/auth.tsx).
      const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] });
      const db = F.getFirestore(app);
      return { app, auth, db, A, F };
    });
  }
  return loading;
}
