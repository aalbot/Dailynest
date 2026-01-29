importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// These credentials should match your main Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBUhKliTOKWKVW-TCTaYiRN9FXCjoxcsHg",
    authDomain: "dclub-32718.firebaseapp.com",
    databaseURL: "https://dclub-32718-default-rtdb.firebaseio.com",
    projectId: "dclub-32718",
    storageBucket: "dclub-32718.firebasestorage.app",
    messagingSenderId: "401946278556",
    appId: "1:401946278556:web:efd912ca5196ce248b0b59"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    if (!payload.notification) {
        console.log('[firebase-messaging-sw.js] No notification property in payload');
        return;
    }

    const notificationTitle = payload.notification.title || 'DailyClub Update';
    const notificationOptions = {
        body: payload.notification.body || '',
        icon: '/logo.png',
        badge: '/logo.png', // Small icon for the status bar
        tag: payload.data?.type || 'general', // Groups notifications
        renotify: true,
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => console.log('[firebase-messaging-sw.js] Notification successfully displayed'))
        .catch(err => console.error('[firebase-messaging-sw.js] Error displaying notification:', err));
});

