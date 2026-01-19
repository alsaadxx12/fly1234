importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "YOUR_API_KEY", // Note: Usually fine to be exposed in client code, but ideally handled via config
    authDomain: "fly4-1234.firebaseapp.com", // Example, strictly for SW context if needed, but mostly messagingSenderId is key
    projectId: "fly4-1234",
    storageBucket: "my-acc-3ee97.firebasestorage.app",
    messagingSenderId: "1060299646849", // Extracted from previously seen config or placeholder
    appId: "1:1060299646849:web:..."
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
