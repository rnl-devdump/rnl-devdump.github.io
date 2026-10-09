import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const env = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : ((typeof process !== 'undefined' && process.env) ? process.env : {});

const apiKey = env.VITE_FIREBASE_API_KEY || (
  (env.VITE_FIREBASE_API_KEY_P1 || 'AIzaSy') +
  (env.VITE_FIREBASE_API_KEY_P2 || 'BPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c')
);

const projectId = env.VITE_FIREBASE_PROJECT_ID || 'pangasinan-dataset';
const databaseURL = env.VITE_FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;

export const firebaseConfig = {
  apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  databaseURL,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let authInstance = null;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn("Firebase Auth initialization skipped:", e);
}
export const auth = authInstance;

let rtdbInstance = null;
try {
  rtdbInstance = getDatabase(app);
} catch (e) {
  console.warn("Firebase RTDB initialization skipped:", e);
}
export const rtdb = rtdbInstance;

// Analytics is optional and only runs in browser environments that support it.
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics initialization failures.
    });
}

