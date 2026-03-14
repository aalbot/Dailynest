
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
            if (stored) return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load branding override", e);
    }
    return null;
};

const DEFAULT_FIREBASE = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    databaseURL: "https://dclub-32718-default-rtdb.firebaseio.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59",
    measurementId: "G-Q9RC6QRR7K"
};

const DEFAULT_BRANDING = {
    appName: "DailyClub",
    logoUrl: "/logo.png"
};

export const CONFIG = {
    FIREBASE: getStoredConfig() || DEFAULT_FIREBASE,
    BRANDING: getStoredBranding() || DEFAULT_BRANDING,
    GOOGLE_MAPS: {
        apiKey: "AIzaSyDj1gRVZ4lRJIM2v8c4pJxdyfEY6I1ZGEk"
    },
    FCM: {
        vapidKey: "BORUQ2p7jMkhKXyww597I0dBGQvgfocigWjbu0kJ1CSjF7J4J6pJJE8lti_JI7c0KLdZy7EDgNm3hNblJA6ne1U",
        serverKey: "YOUR_FCM_SERVER_KEY" // Get this from Firebase Console > Project Settings > Cloud Messaging > Cloud Messaging API (Legacy)
    },
    ASSETS: {
        notificationSound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    },
    /** WhatsApp Business (Facebook Graph API) – used by Broadcast to send custom messages */
    WHATSAPP: {
        apiVersion: "v22.0",
        phoneNumberId: "1038973879298324",
        accessToken: "EAANjGOjb1tEBQ5aA0n0PlQ8L2Ji3U2Mzs4zTRQFJgGMtMtSXOcrGdpKswpTil0d22bFcVvrIyVkrS0bcTSkoeVm1HscloZCGNFhcdYPB63ZC3m95Yaamz9YZCR6c02ZApiYhOCywX4BzDcv4w1uTTwMuuNZBWS0Tg2Wxp2MgKiCIM4acalKVuOmsayaN0q6SZBVYIwggapZBDipj3vWNv2T06bZCnRn0CF64zdsS4mSFJbZCTJp7CoObfZAPBBZAAZACGZB1zlmczIoIg0ZCsgSQ6ZC6eWQ",
        getMessagesUrl(): string {
            return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
        },
    },
};
