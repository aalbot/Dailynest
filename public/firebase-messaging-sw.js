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
    console.log('[firebase-messaging-sw.js] 📥 Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'DailyClub Update';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.message || payload.data?.body || 'New message received',
        // icon: '/logo.png', // Disabling potentially heavy icon for troubleshooting
        // badge: '/logo.png',
        tag: payload.data?.type || 'general',
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            ...payload.data,
            url: payload.data?.click_url || payload.notification?.click_action || '/'
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => console.log('[firebase-messaging-sw.js] ✅ showNotification resolved'))
        .catch(err => console.error('[firebase-messaging-sw.js] ❌ showNotification error:', err));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 🖱 Notification clicked:', event.notification.tag);
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // If a tab is already open, focus it
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If no tab is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

