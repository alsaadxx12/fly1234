import { useState, useEffect } from 'react';
import { messaging, db } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const { employee } = useAuth();

    useEffect(() => {
        if (!messaging || !employee?.id) return;

        const requestPermission = async () => {
            try {
                const result = await Notification.requestPermission();
                setPermission(result);

                if (result === 'granted') {
                    // Get FCM Token
                    const token = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                    });

                    if (token) {
                        console.log('✅ FCM Token:', token);
                        setFcmToken(token);

                        // Update employee document with the new token
                        const employeeRef = doc(db, 'employees', employee.id!);
                        await updateDoc(employeeRef, {
                            fcmToken: token,
                            lastTokenUpdate: new Date().toISOString()
                        });
                    } else {
                        console.warn('No registration token available. Request permission to generate one.');
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token.', error);
            }
        };

        requestPermission();

        // Listen for foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground Message received:', payload);
            // You can manually show a toast here using your UI library if you want
            // or rely on a standard Notification if the page is visible (though browsers often restrict that)
            if (payload.notification) {
                new Notification(payload.notification.title || 'New Message', {
                    body: payload.notification.body,
                    icon: '/pwa-192x192.png'
                });
            }
        });

        return () => unsubscribe();
    }, []);

    return { permission, fcmToken };
}
