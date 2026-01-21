import { useEffect, useRef, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNotification as useAppNotification, NotificationType } from '../contexts/NotificationContext';
import { getShiftTimings } from '../utils/helpers';

interface NotificationSettings {
    pointsAddition: boolean;
    pointsDeduction: boolean;
    salaryReady: boolean;
    systemUpdate: boolean;
    exchangeRateUpdate: boolean;
    attendanceReminder: boolean;
    systemBroadcast: boolean;
    mastercardIssueNew: boolean;
    mastercardIssuePending: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    pointsAddition: true,
    pointsDeduction: true,
    salaryReady: true,
    systemUpdate: true,
    exchangeRateUpdate: true,
    attendanceReminder: true,
    systemBroadcast: true,
    mastercardIssueNew: true,
    mastercardIssuePending: true,
};

export default function NotificationManager() {
    const { employee } = useAuth();
    const { showNotification } = useAppNotification();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const lastProcessedTime = useRef<Timestamp>(Timestamp.now());
    const initialLoad = useRef(true);
    const attendanceNotified = useRef<string | null>(null); // Track if notified for today's shift

    // 1. Listen for personal settings
    useEffect(() => {
        if (!employee?.id) return;

        const settingsRef = doc(db, 'employee_notification_settings', employee.id);
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...doc.data() });
            }
        });

        return () => unsubscribe();
    }, [employee?.id]);

    // 2. Listen for System-wide Notifications
    useEffect(() => {
        if (!employee?.id || !settings.systemUpdate) return;

        const systemQ = query(
            collection(db, 'system_notifications'),
            where('createdAt', '>', lastProcessedTime.current),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(systemQ, (snapshot) => {
            if (initialLoad.current) return;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const isTargetedToMe = data.targetAll ||
                        (data.targetDepartments && data.targetDepartments.includes(employee.departmentId));

                    if (isTargetedToMe && data.senderId !== employee.id) {
                        handleNotification(data.title, data.message, 'info');
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [employee?.id, employee?.departmentId, settings.systemUpdate]);

    // 3. Listen for Mastercard Issues
    useEffect(() => {
        if (!employee?.id || !settings.mastercardIssueNew) return;

        const mcQ = query(
            collection(db, 'mastercard_issues'),
            where('createdAt', '>', lastProcessedTime.current),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(mcQ, (snapshot) => {
            if (initialLoad.current) return;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.createdBy !== employee.id) {
                        handleNotification('مشكلة ماستر جديدة', `تم إضافة مشكلة جديدة: ${data.title}`, 'warning');
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [employee?.id, settings.mastercardIssueNew]);

    // 4. Listen for Exchange Rate Changes (via Custom Event)
    useEffect(() => {
        if (!settings.exchangeRateUpdate) return;

        const handleRateChange = (event: any) => {
            const { oldRate, newRate } = event.detail;
            handleNotification('تحديث سعر الصرف', `تغير سعر الصرف من ${oldRate} إلى ${newRate}`, 'info');
        };

        window.addEventListener('exchange-rate-changed', handleRateChange);
        return () => window.removeEventListener('exchange-rate-changed', handleRateChange);
    }, [settings.exchangeRateUpdate]);

    // 5. Attendance Reminder Timer
    useEffect(() => {
        if (!employee?.id || !settings.attendanceReminder) return;

        const checkAttendanceTime = () => {
            const timings = getShiftTimings(employee);
            if (!timings.start) return;

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // If we haven't notified today and it's within 15 mins of shift start
            if (attendanceNotified.current !== todayStr) {
                const diffMs = timings.start.getTime() - now.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins >= 0 && diffMins <= 15) {
                    handleNotification('تذكير الحضور', 'حان موعد تسجيل الحضور، يرجى التوجه لمكان التبصيم', 'warning');
                    attendanceNotified.current = todayStr;
                }
            }
        };

        const interval = setInterval(checkAttendanceTime, 60000); // Check every minute
        checkAttendanceTime(); // Initial check

        return () => clearInterval(interval);
    }, [employee, settings.attendanceReminder]);

    // Handle initial load skip
    useEffect(() => {
        const timer = setTimeout(() => {
            initialLoad.current = false;
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleNotification = (title: string, body: string, type: NotificationType) => {
        // Show in-app toast
        showNotification(type, title, body, 8000);

        // Show system tray notification
        if (Notification.permission === 'granted') {
            try {
                const n = new Notification(title, {
                    body: body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    tag: 'system-notification',
                    requireInteraction: true,
                });

                n.onclick = () => {
                    window.focus();
                    n.close();
                };
            } catch (error) {
                console.warn('Failed to show system notification:', error);
            }
        }
    };

    return null;
}
