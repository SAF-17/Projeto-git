import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  // Your Firebase configuration object will go here
  // You'll need to replace these with your actual Firebase project credentials
  apiKey: "AIzaSyDX5n9RnB8QOcpfwYjW9XjqmfgqD1ce3p4",
  authDomain: "projeto-touritrack.firebaseapp.com",
  projectId: "projeto-touritrack",
  storageBucket: "projeto-touritrack.firebasestorage.app",
  messagingSenderId: "204866520874",
  appId: "1:204866520874:web:1c660999615274e8cd8053",
  measurementId: "G-RLNZ4HH89D"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics (only in browser)
// let analytics;
// if (typeof window !== "undefined") {
//   analytics = getAnalytics(app);
// }
// export { analytics };

export default app; 