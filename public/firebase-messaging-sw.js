importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAo1waDH7OuJ2FwW0ttUZUh7w4nuPUVThg",
    authDomain: "dailynest-2457b.firebaseapp.com",
    databaseURL: "https://dailynest-2457b-default-rtdb.firebaseio.com",
    projectId: "dailynest-2457b",
    storageBucket: "dailynest-2457b.firebasestorage.app",
    messagingSenderId: "1061145447202",
    appId: "1:1061145447202:web:f5b522a0a25f8757f3337b",
    measurementId: "G-047X9P8L89"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'DailyNest Update';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.message || payload.data?.body || 'New message received',
        icon: '/logo.svg',
        badge: '/logo.svg',
        tag: payload.data?.type || 'general',
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            ...payload.data,
            url: payload.data?.click_url || payload.notification?.click_action || '/'
        }
    };

    return self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => console.log('[firebase-messaging-sw.js] showNotification resolved'))
        .catch(err => console.error('[firebase-messaging-sw.js] showNotification error:', err));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/apps';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
