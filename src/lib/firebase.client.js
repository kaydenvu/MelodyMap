// Import the functions you need from the SDKs you need
import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only on the client-side
let firebaseApp;
let auth;
let db;

if (typeof window !== 'undefined') {
  // Initialize Firebase app if not already initialized
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp(); // Reuse the already initialized app
  }

  // Get the Auth and Firestore instances
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  // Optional: Set persistence for auth (if needed)
  setPersistence(auth, inMemoryPersistence)
    .catch((error) => {
      console.error('Error setting persistence:', error);
    });
}

export { db, auth };
