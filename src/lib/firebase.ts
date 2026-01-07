import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/auth";
import "firebase/compat/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    databaseURL: "https://dclub-32718-default-rtdb.firebaseio.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59",
    measurementId: "G-Q9RC6QRR7K"
};

// Initialize modular SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize compat SDK (for backward compatibility with existing code)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const compatDb = firebase.database();
const compatAuth = firebase.auth();

export { app, db, auth, storage, analytics, firebase, compatDb, compatAuth };
