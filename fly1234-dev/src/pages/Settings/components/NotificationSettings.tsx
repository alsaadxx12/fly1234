import React from 'react';
import { Bell, Mail, MessageCircle, Calendar, DollarSign, Check, TrendingUp, TestTube, Volume2 } from 'lucide-react';
import SettingsCard from '../../../components/SettingsCard';
import SettingsToggle from '../../../components/SettingsToggle';
import { useNotification } from '../../../contexts/NotificationContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

const NOTIFICATION_SOUNDS = [
  { id: 'notification_high_pitch_alert', name: 'تنبيه بورصة (الافتراضي)', url: 'https://actions.google.com/sounds/v1/office/notification_high_pitch_alert.ogg' },
  { id: 'mechanical_clock_ring', name: 'جرس ساعة ميكانيكية', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
  { id: 'alarm_clock', name: 'منبه ساعة', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { id: 'digital_watch_alarm', name: 'منبه رقمي', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { id: 'bell_ding', name: 'جرس كلاسيكي', url: 'https://actions.google.com/sounds/v1/alarms/bell_ding.ogg' },
  { id: 'buzzer', name: 'جرس كهربائي', url: 'https://actions.google.com/sounds/v1/alarms/buzzer.ogg' },
  { id: 'beep_short', name: 'بيب قصير', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
];

export default function NotificationSettings() {
  const { requestPermission, isPermissionGranted } = useNotification();
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = React.useState(true);
  const [receiptNotifications, setReceiptNotifications] = React.useState(true);
  const [paymentNotifications, setPaymentNotifications] = React.useState(true);
  const [dueDateReminders, setDueDateReminders] = React.useState(true);
  const [systemNotifications, setSystemNotifications] = React.useState(true);
  const [exchangeRateNotifications, setExchangeRateNotifications] = React.useState(true);
  const [exchangeRateSoundEnabled, setExchangeRateSoundEnabled] = React.useState(true);
  const [browserNotifications, setBrowserNotifications] = React.useState(isPermissionGranted);
  const [saving, setSaving] = React.useState(false);
  const [selectedSound, setSelectedSound] = React.useState('notification_high_pitch_alert');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const settingsRef = doc(db, 'notification_settings', 'global');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setExchangeRateNotifications(data.exchangeRateNotifications !== false);
        setExchangeRateSoundEnabled(data.exchangeRateSoundEnabled !== false);
        setSelectedSound(data.notificationSound || 'notification_high_pitch_alert');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      const settingsRef = doc(db, 'notification_settings', 'global');
      await setDoc(settingsRef, {
        exchangeRateNotifications,
        exchangeRateSoundEnabled,
        notificationSound: selectedSound,
        updatedAt: new Date(),
        updatedBy: user.uid
      }, { merge: true });

      console.log('Settings saved to Firestore');
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  React.useEffect(() => {
    if (!loading && user) {
      saveSettings();
    }
  }, [exchangeRateNotifications, exchangeRateSoundEnabled, selectedSound]);

  const playSound = (soundId: string) => {
    const sound = NOTIFICATION_SOUNDS.find(s => s.id === soundId);
    if (sound) {
      const audio = new Audio(sound.url);
      audio.volume = 0.7;
      audio.play().catch(e => console.error('Sound play failed:', e));
    }
  };

  const handleSoundChange = (soundId: string) => {
    setSelectedSound(soundId);
    playSound(soundId);
  };

  const handleBrowserNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      setBrowserNotifications(granted);
      if (granted) {
        try {
          new Notification('اختبار الإشعارات', {
            body: 'تم تفعيل إشعارات المتصفح بنجاح! سيظهر هذا الإشعار حتى لو كان المتصفح مصغر.',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: false,
            silent: false
          });
        } catch (e) {
          console.error('Test notification failed:', e);
        }
      }
    } else {
      setBrowserNotifications(false);
    }
  };

  const handleTestNotification = () => {
    if (Notification.permission === 'granted') {
      console.log('[NotificationSettings] Creating test notification...');
      try {
        const notification = new Notification('اختبار إشعار سعر الصرف', {
          body: 'تم رفع سعر الصرف من 1,450 إلى 1,480 دينار (+2.07%)',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true,
          silent: false,
          tag: 'test-notification'
        });

        notification.onclick = () => {
          console.log('Notification clicked');
          window.focus();
          notification.close();
        };

        console.log('[NotificationSettings] Test notification created successfully');

        playSound(selectedSound);
      } catch (e) {
        console.error('[NotificationSettings] Test notification failed:', e);
        alert('فشل إنشاء الإشعار: ' + e);
      }
    } else {
      console.log('[NotificationSettings] Permission not granted:', Notification.permission);
      alert('يرجى تفعيل إشعارات المتصفح أولاً');
    }
  };

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={Bell}
        title="إشعارات النظام"
        description="إدارة الإشعارات الداخلية في النظام"
      >
        <div className="space-y-3">
          <SettingsToggle
            icon={Bell}
            title="إشعارات المتصفح"
            description="السماح بإرسال إشعارات عبر المتصفح"
            checked={browserNotifications}
            onChange={handleBrowserNotificationsToggle}
            color="blue"
          />

          {!isPermissionGranted && browserNotifications && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                يرجى السماح للمتصفح بإرسال الإشعارات عند ظهور الطلب.
              </p>
            </div>
          )}

          {browserNotifications && isPermissionGranted && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    تم تفعيل إشعارات المتصفح بنجاح
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    سيتم إرسال إشعار عند تحديث سعر الصرف حتى لو كان المتصفح مصغر
                  </p>
                </div>
                <button
                  onClick={handleTestNotification}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <TestTube className="w-4 h-4" />
                  <span>اختبار</span>
                </button>
              </div>
            </div>
          )}

          <SettingsToggle
            icon={Bell}
            title="إشعارات النظام العامة"
            description="تلقي إشعارات حول أحداث النظام المهمة"
            checked={systemNotifications}
            onChange={setSystemNotifications}
            color="blue"
          />

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              ⚙️ إعدادات عامة لجميع الموظفين
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              التغييرات التالية تنطبق على جميع الموظفين في النظام تلقائياً
            </p>
          </div>

          <SettingsToggle
            icon={TrendingUp}
            title="إشعارات تغيير سعر الصرف"
            description="تلقي إشعار فوري عند تحديث سعر الصرف"
            checked={exchangeRateNotifications}
            onChange={setExchangeRateNotifications}
            color="orange"
          />

          <SettingsToggle
            icon={Volume2}
            title="تفعيل صوت الإشعار"
            description="تشغيل الصوت عند تحديث سعر الصرف"
            checked={exchangeRateSoundEnabled}
            onChange={setExchangeRateSoundEnabled}
            color="blue"
          />

          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">صوت الإشعار</h4>
            </div>
            <div className="space-y-2">
              {NOTIFICATION_SOUNDS.map((sound) => (
                <label
                  key={sound.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <input
                    type="radio"
                    name="notificationSound"
                    value={sound.id}
                    checked={selectedSound === sound.id}
                    onChange={(e) => handleSoundChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{sound.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      playSound(sound.id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    title="تشغيل الصوت"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </label>
              ))}
            </div>
          </div>

          <SettingsToggle
            icon={DollarSign}
            title="إشعارات سندات القبض"
            description="تلقي إشعارات عند إضافة أو تعديل سندات القبض"
            checked={receiptNotifications}
            onChange={setReceiptNotifications}
            color="green"
          />

          <SettingsToggle
            icon={DollarSign}
            title="إشعارات سندات الدفع"
            description="تلقي إشعارات عند إضافة أو تعديل سندات الدفع"
            checked={paymentNotifications}
            onChange={setPaymentNotifications}
            color="purple"
          />

          <SettingsToggle
            icon={Calendar}
            title="تذكيرات المواعيد"
            description="تلقي تذكيرات بالمواعيد والاستحقاقات القادمة"
            checked={dueDateReminders}
            onChange={setDueDateReminders}
            color="blue"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Mail}
        title="إشعارات البريد الإلكتروني"
        description="إدارة الإشعارات عبر البريد الإلكتروني"
      >
        <div className="space-y-3">
          <SettingsToggle
            icon={Mail}
            title="تفعيل إشعارات البريد الإلكتروني"
            description="إرسال إشعارات مهمة عبر البريد الإلكتروني"
            checked={emailNotifications}
            onChange={setEmailNotifications}
            color="blue"
          />

          {emailNotifications && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                سيتم إرسال الإشعارات المهمة إلى بريدك الإلكتروني المسجل في الحساب.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={MessageCircle}
        title="إشعارات واتساب"
        description="إدارة الإشعارات عبر واتساب"
      >
        <div className="space-y-3">
          <SettingsToggle
            icon={MessageCircle}
            title="تفعيل إشعارات واتساب"
            description="إرسال تنبيهات مهمة عبر واتساب"
            checked={whatsappNotifications}
            onChange={setWhatsappNotifications}
            color="green"
          />

          {whatsappNotifications && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                تأكد من ربط حساب واتساب من صفحة إعدادات واتساب لتلقي الإشعارات.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
