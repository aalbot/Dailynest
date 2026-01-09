import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import "firebase/compat/auth";
import "firebase/compat/storage";

import { CONFIG } from "@/config";

// Your web app's Firebase configuration
const firebaseConfig = CONFIG.FIREBASE;

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
