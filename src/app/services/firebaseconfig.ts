// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { setPersistence, browserSessionPersistence } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIcJZDTCUuIpCQMZfxMAVu3senR5HVR0o",
  authDomain: "finalpid-675de.firebaseapp.com",
  projectId: "finalpid-675de",
  storageBucket: "finalpid-675de.firebasestorage.app",
  messagingSenderId: "814324838858",
  appId: "1:814324838858:web:60a6fcb1c40fdd711d9f33",
  measurementId: "G-4KSQ5M2ZN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);