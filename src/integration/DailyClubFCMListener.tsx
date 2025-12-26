import React, { useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { Toaster, toast } from 'sonner';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCSH0uuKssWvkgvMOnWV_1u3zPO-1XNWPg",
    authDomain: "dailyclub11.firebaseapp.com",
    databaseURL: "https://dailyclub11-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dailyclub11",
    storageBucket: "dailyclub11.firebasestorage.app",
    messagingSenderId: "439424426599",
    appId: "1:439424426599:web:c2e064f640bf5927fdaac2"
};

// Initialize
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const FCMPushListener = () => {
    useEffect(() => {
        // 1. Request Permission
        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Notification permission granted.');

                    // 2. Get Token (VAPID Key is public, can be generated in console, or used without for basic)
                    // You might need to add your VAPID key: getToken(messaging, { vapidKey: 'YOUR_KEY' });
                    const token = await getToken(messaging, {
                        vapidKey: 'YOUR_VAPID_PUBLIC_KEY_HERE' // OPTIONAL but recommended
                    });

                    if (token) {
                        console.log('FCM Token:', token);
                        // In a real app, you would send this token to your backend to subscribe it to the topic "dailyclub_all"
                        // Since we don't have a backend to subscribe, clients must handle subscription differently or
                        // the "Sender" must send to individual tokens (Impractical without backend).
                        //
                        // HOWEVER, assuming you set up a cloud function or use Console to subscribe tokens:
                        // For now, we just enable the foreground listener.
                    }
                }
            } catch (err) {
                console.log('Unable to get permission to notify.', err);
            }
        };

        requestPermission();

        // 3. Handle Foreground Messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            toast(payload.notification?.title || "New Message", {
                description: payload.notification?.body,
                duration: 5000,
            });

            // Play sound
            try {
                new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play();
            } catch (e) { }
        });

        return () => unsubscribe();
    }, []);

    return null;
};

export default FCMPushListener;
