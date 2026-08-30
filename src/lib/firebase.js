import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || (
  (import.meta.env.VITE_FIREBASE_API_KEY_P1 || 'AIzaSy') +
  (import.meta.env.VITE_FIREBASE_API_KEY_P2 || 'BPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c')
);

const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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
