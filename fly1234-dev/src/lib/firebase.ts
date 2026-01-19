import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "my-acc-3ee97.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const rtdb = getDatabase(app);

let messaging: any = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn('Firebase Messaging failed to initialize:', error);
}

// تعيين الاستمرارية للمصادقة لضمان بقاء المستخدم مسجل الدخول
setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error("Error setting persistence:", error);
  });

// Connect to emulators if running locally
if (window.location.hostname === 'localhost') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectDatabaseEmulator(rtdb, 'localhost', 9000);
  } catch (emulatorError) {
    console.warn('Failed to connect to emulators:', emulatorError);
  }
}

export { db, auth, rtdb, storage, messaging };
