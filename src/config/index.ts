import { DEFAULT_BRANDING, normalizeBranding } from "./branding";

const getStoredConfig = () => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('FIREBASE_CONFIG_OVERRIDE');
            if (stored) return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load firebase config override", e);
    }
    return null;
};

const getStoredBranding = () => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('APP_BRANDING_OVERRIDE');
            if (stored) return normalizeBranding(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load branding override", e);
    }
    return null;
};

const DEFAULT_FIREBASE = {
    apiKey: "AIzaSyAo1waDH7OuJ2FwW0ttUZUh7w4nuPUVThg",
    authDomain: "dailynest-2457b.firebaseapp.com",
    databaseURL: "https://dailynest-2457b-default-rtdb.firebaseio.com",
    projectId: "dailynest-2457b",
    storageBucket: "dailynest-2457b.firebasestorage.app",
    messagingSenderId: "1061145447202",
    appId: "1:1061145447202:web:f5b522a0a25f8757f3337b",
    measurementId: "G-047X9P8L89"
};

export const CONFIG = {
    FIREBASE: getStoredConfig() || DEFAULT_FIREBASE,
    BRANDING: getStoredBranding() || DEFAULT_BRANDING,
    GOOGLE_MAPS: {
        apiKey: "AIzaSyDj1gRVZ4lRJIM2v8c4pJxdyfEY6I1ZGEk"
    },
    FCM: {
        vapidKey: "BORUQ2p7jMkhKXyww597I0dBGQvgfocigWjbu0kJ1CSjF7J4J6pJJE8lti_JI7c0KLdZy7EDgNm3hNblJA6ne1U",
        serverKey: "YOUR_FCM_SERVER_KEY"
    },
    ASSETS: {
        notificationSound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    },
    WHATSAPP: {
        apiVersion: "v22.0",
        phoneNumberId: "1018202878043686",
        accessToken: "EAANOON0t9jkBQ3cQCbFU5TfDxjkIXF0WzpD9FdWIM3hhq01r8fsyCGIbXTXNoOdjZB7yjmRZBUFtPxwzZC0ZAVd7JhnRd03M7jYYZAzpxyAFZCaFEYhGwvbcnJ9jZBscfDJGpXCQZBy9uMN6hf3S9kGCZBiehT9sbxqaIGNqmZAZC8Dxy3tcuaa5Ebp0H2sRwPVqgZDZD",
        getMessagesUrl(): string {
            return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
        },
    },
};
