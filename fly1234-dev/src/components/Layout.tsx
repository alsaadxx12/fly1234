import React, { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Popover from '@radix-ui/react-popover';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useExchangeRate } from '../contexts/ExchangeRateContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { Settings, LogOut, Menu, User, Bell, CreditCard, ChevronDown, Shield, Phone, Smartphone, Briefcase, CircleAlert as AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { getWhatsAppSettings } from '../lib/collections/whatsapp';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useWhatsAppApi } from '../pages/Announcements/hooks/useWhatsAppApi';
import Sidebar from './Sidebar';
import { menuItems } from '../lib/constants';
import GlobalModals from './GlobalModals';
import useIssues from '../hooks/useIssues';
import useMastercardIssues from '../pages/MastercardIssues/hooks/useMastercardIssues';

const NOTIFICATION_SOUNDS = [
  { id: 'notification_high_pitch_alert', url: 'https://actions.google.com/sounds/v1/office/notification_high_pitch_alert.ogg' },
  { id: 'mechanical_clock_ring', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' },
  { id: 'alarm_clock', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { id: 'digital_watch_alarm', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { id: 'bell_ding', url: 'https://actions.google.com/sounds/v1/alarms/bell_ding.ogg' },
  { id: 'buzzer', url: 'https://actions.google.com/sounds/v1/alarms/buzzer.ogg' },
  { id: 'beep_short', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { employee, signOut, checkPermission, user } = useAuth();
  const { t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, customSettings } = useTheme();
  const { showNotification } = useNotification();
  const { currentRate } = useExchangeRate();

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };


  const [whatsappAccounts, setWhatsappAccounts] = useState<Array<{
    id?: string;
    instance_id: string;
    token: string;
    name?: string;
    is_active?: boolean;
  }>>([]);
  const [selectedAccount, setSelectedAccount] = useState<{
    instance_id: string;
    token: string;
  } | null>(null);
  const { fetchWhatsAppAccount } = useWhatsAppApi();
  const [whatsappAccountInfo, setWhatsappAccountInfo] = useState<any>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    exchangeRateNotifications: true,
    exchangeRateSoundEnabled: true,
    notificationSound: 'notification_high_pitch_alert'
  });
  const { issues } = useIssues();
  const { issues: mastercardIssues } = useMastercardIssues();
  const [isIssuesPopoverOpen, setIsIssuesPopoverOpen] = useState(false);
  const pendingIssues = issues.filter(issue => issue.status === 'pending' || issue.status === 'in_progress');
  const pendingMastercardIssues = mastercardIssues.filter(issue => issue.status === 'pending' || issue.status === 'in_progress');
  const allPendingIssues = [...pendingIssues, ...pendingMastercardIssues];
  const [departmentName, setDepartmentName] = useState('');

  useEffect(() => {
    if (employee?.departmentId) {
      const fetchDept = async () => {
        try {
          const deptRef = doc(db, 'departments', employee.departmentId);
          const deptSnap = await getDoc(deptRef);
          if (deptSnap.exists()) {
            setDepartmentName(deptSnap.data().name);
          }
        } catch (e) {
          console.error("Error fetching department name:", e);
        }
      };
      fetchDept();
    } else {
      setDepartmentName('');
    }
  }, [employee?.departmentId]);


  useEffect(() => {
    // Other layout effects
    const activeMenuItem = menuItems.find(item => {
      if (item.path && location.pathname === item.path) return true;
      if (item.subItems) {
        return item.subItems.some(subItem => location.pathname.startsWith(subItem.path));
      }
      return false;
    });
    if (activeMenuItem) {
      // Logic for title if needed
    }
  }, [location.pathname, t]);

  useEffect(() => {
    const settingsRef = doc(db, 'notification_settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setNotificationSettings({
          exchangeRateNotifications: data.exchangeRateNotifications !== false,
          exchangeRateSoundEnabled: data.exchangeRateSoundEnabled !== false,
          notificationSound: data.notificationSound || 'notification_high_pitch_alert'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchAccountInfo = async (instanceId: string, token: string) => {
    try {
      const accountInfo = await fetchWhatsAppAccount(instanceId, token);
      if (accountInfo && !accountInfo.error) {
        setWhatsappAccountInfo(accountInfo);
      } else {
        throw new Error(accountInfo.error || "فشل جلب معلومات الحساب");
      }
    } catch (error: any) {
      console.error('Error fetching account info:', error);
      setWhatsappAccountInfo(null);
    }
  };

  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
    (window as any).selectedWhatsAppAccount = account;
    const event = new CustomEvent('whatsappAccountUpdated', { detail: { account } });
    window.dispatchEvent(event);
    fetchAccountInfo(account.instance_id, account.token);
    setIsUserMenuOpen(false);
  };

  const loadWhatsAppAccounts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const accounts = await getWhatsAppSettings(user.uid);

      if (accounts && accounts.length > 0) {
        const formattedAccounts = accounts.map((account: any) => ({
          id: account.id,
          instance_id: account.instance_id,
          token: account.token,
          name: account.name || account.instance_id,
          is_active: account.is_active
        }));

        setWhatsappAccounts(formattedAccounts);

        const activeAccount = formattedAccounts.find((account: any) => account.is_active);
        if (activeAccount) {
          handleAccountSelect(activeAccount);
        } else {
          handleAccountSelect(formattedAccounts[0]);
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp accounts:', error);
    }
  }, [user?.uid, fetchWhatsAppAccount]);

  useEffect(() => {
    loadWhatsAppAccounts();
  }, [user?.uid, loadWhatsAppAccounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    console.log('[Layout] Setting up exchange rate change listener...');

    if ('Notification' in window && Notification.permission === 'default') {
      const hasAskedBefore = localStorage.getItem('notificationPermissionAsked');
      if (!hasAskedBefore) {
        setTimeout(() => {
          Notification.requestPermission().then((permission) => {
            console.log('[Layout] Notification permission:', permission);
            localStorage.setItem('notificationPermissionAsked', 'true');
            if (permission === 'granted') {
              showNotification(
                'success',
                'تم تفعيل الإشعارات',
                'سيتم إرسال إشعار عند تحديث سعر الصرف حتى لو كان المتصفح مصغر',
                5000
              );
            }
          });
        }, 3000);
      }
    }

    const handleExchangeRateChange = (event: CustomEvent) => {
      console.log('[Layout] Exchange rate change event received!', event.detail);

      const { oldRate, newRate } = event.detail;
      const change = newRate - oldRate;
      const changePercent = ((change / oldRate) * 100).toFixed(2);
      const isIncrease = change > 0;

      const title = 'تم تغيير سعر الصرف';
      const message = `تم ${isIncrease ? 'رفع' : 'خفض'} سعر الصرف من ${oldRate.toLocaleString('en-US')} إلى ${newRate.toLocaleString('en-US')} دينار (${isIncrease ? '+' : ''}${changePercent}%)`;

      console.log('[Layout] Showing notification:', title, message);

      if (notificationSettings.exchangeRateSoundEnabled) {
        try {
          console.log('[Layout] Playing notification sound...');
          const sound = NOTIFICATION_SOUNDS.find(s => s.id === notificationSettings.notificationSound);
          const soundUrl = sound?.url || NOTIFICATION_SOUNDS[0].url;

          const audio = new Audio(soundUrl);
          audio.volume = 0.7;

          audio.oncanplaythrough = () => console.log('[Layout] Audio loaded successfully');
          audio.onerror = (e) => console.error('[Layout] Audio load error:', e);
          audio.onended = () => console.log('[Layout] Audio playback finished');

          audio.play()
            .then(() => console.log('[Layout] Audio playing...'))
            .catch(e => {
              console.error('[Layout] Audio play failed:', e);
              const fallbackAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
              fallbackAudio.volume = 0.7;
              fallbackAudio.play().catch(err => console.error('[Layout] Fallback audio failed:', err));
            });
        } catch (e) {
          console.error('[Layout] Audio creation failed:', e);
        }
      } else {
        console.log('[Layout] Sound disabled by user');
      }

      showNotification(
        isIncrease ? 'warning' : 'success',
        title,
        message,
        10000
      );

      if ('Notification' in window) {
        console.log('[Layout] Notification permission status:', Notification.permission);
        if (Notification.permission === 'granted') {
          try {
            console.log('[Layout] Creating browser notification...');
            const notification = new Notification(title, {
              body: message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              requireInteraction: true,
              silent: false,
              tag: 'exchange-rate-update'
            });
            console.log('[Layout] Browser notification created successfully');

            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (e) {
            console.error('[Layout] Browser notification failed:', e);
          }
        } else if (Notification.permission === 'default') {
          console.log('[Layout] Requesting notification permission...');
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                requireInteraction: true,
                silent: false,
                tag: 'exchange-rate-update'
              });
            }
          });
        } else {
          console.log('[Layout] Notification permission denied by user');
        }
      } else {
        console.log('[Layout] Browser does not support notifications');
      }
    };

    window.addEventListener('exchange-rate-changed', handleExchangeRateChange as EventListener);
    console.log('[Layout] Exchange rate listener attached successfully');

    return () => {
      console.log('[Layout] Removing exchange rate listener...');
      window.removeEventListener('exchange-rate-changed', handleExchangeRateChange as EventListener);
    };
  }, [showNotification, notificationSettings.exchangeRateSoundEnabled, notificationSettings.notificationSound]);

  const priorityConfig = {
    high: { label: 'عاجلة', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-500/10 text-red-500', cardBg: 'bg-gradient-to-tr from-red-50 to-white border-red-200', cardBgDark: 'dark:from-red-900/20 dark:to-gray-800/10 dark:border-red-800/50' },
    medium: { label: 'متوسطة', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500/10 text-yellow-500', cardBg: 'bg-gradient-to-tr from-yellow-50 to-white border-yellow-200', cardBgDark: 'dark:from-yellow-900/20 dark:to-gray-800/10 dark:border-yellow-800/50' },
    low: { label: 'عادية', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-500', cardBg: 'bg-gradient-to-tr from-blue-50 to-white border-blue-200', cardBgDark: 'dark:from-blue-900/20 dark:to-gray-800/10 dark:border-blue-800/50' },
    open_transfer_pending: { label: 'تحويل معلق', icon: <RefreshCw className="w-4 h-4" />, color: 'bg-purple-500/10 text-purple-500', cardBg: 'bg-gradient-to-tr from-purple-50 to-white border-purple-200', cardBgDark: 'dark:from-purple-900/20 dark:to-gray-800/10 dark:border-purple-800/50' },
  };

  const hasPendingIssuesPermission = checkPermission('المشاكل المعلقة', 'view');
  const hasMastercardIssuesPermission = checkPermission('مشاكل بوابة الماستر', 'view');

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-[#1a1d29] dark:via-[#1f2937] dark:to-[#111827] flex flex-col transition-colors duration-200 text-right h-screen overflow-hidden">
      {/* Full Width Header */}
      <header className={`flex-shrink-0 bg-gradient-to-r ${customSettings.headerGradient} dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 z-50 safe-top shadow-lg relative`}>
        <div className="flex items-center justify-between px-3 md:px-6 h-14 md:h-[60px] text-white">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 h-full">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1.5 sm:p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all border border-white/20 shadow-lg group"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-4 h-4 md:w-5 h-5 text-white" />
            </button>

            {/* Logo for both mobile and web */}
            <div className="flex items-center">
              <img
                src={customSettings.logoUrl}
                alt="Logo"
                className="h-8 md:h-9 w-auto object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-white/60 text-sm">سعر الصرف الحالي:</span>
              <span className="font-bold text-lg">{currentRate?.toLocaleString('en-US') || '...'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(hasPendingIssuesPermission || hasMastercardIssuesPermission) && (
              <Popover.Root open={isIssuesPopoverOpen} onOpenChange={setIsIssuesPopoverOpen}>
                <Popover.Trigger asChild>
                  <button
                    className={`relative p-2.5 rounded-xl transition-all duration-500 group overflow-hidden border ${allPendingIssues.length > 0
                      ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                      : 'bg-white/10 border-white/20 hover:bg-white/20'
                      }`}
                    title="الاشعارات والمشاكل المعلقة"
                  >
                    <div className="relative z-10">
                      <Bell className={`w-5 h-5 transition-transform duration-500 group-hover:rotate-12 ${allPendingIssues.length > 0 ? 'text-rose-400' : 'text-white'
                        }`} />
                      {allPendingIssues.length > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-bounce">
                          {allPendingIssues.length}
                        </span>
                      )}
                    </div>
                    {/* Animated background for active notifications */}
                    {allPendingIssues.length > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-orange-500/20 animate-pulse" />
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    sideOffset={12}
                    align="center"
                    collisionPadding={16}
                    className={`z-50 w-[280px] sm:w-[320px] rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)] border backdrop-blur-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col ${theme === 'dark'
                        ? 'bg-gray-950/90 border-white/10 text-white'
                        : 'bg-white/90 border-gray-100 text-gray-900'
                      }`}
                  >
                    {/* Compact Header */}
                    <div className={`p-4 border-b flex items-center justify-between shrink-0 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-50 bg-gray-50/50'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="font-black text-[10px] uppercase tracking-tighter">التنبيهات</h3>
                      </div>
                      <Link
                        to="/pending-issues"
                        onClick={() => setIsIssuesPopoverOpen(false)}
                        className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${theme === 'dark' ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'
                          }`}
                      >
                        الكل
                      </Link>
                    </div>

                    {/* Highly Controlled Width List */}
                    <ScrollArea.Root className="w-full h-[380px] sm:h-[450px] overflow-hidden flex-1">
                      <ScrollArea.Viewport className="w-full h-full py-4 px-2">
                        {allPendingIssues.length > 0 ? (
                          <div className="flex flex-col items-center gap-3">
                            {allPendingIssues.map((issue) => {
                              const isMastercardIssue = 'refundAmount' in issue;
                              const linkTo = isMastercardIssue ? "/mastercard-issues" : "/pending-issues";
                              const priority = priorityConfig[issue.priority as keyof typeof priorityConfig] || priorityConfig.low;

                              return (
                                <Link
                                  to={linkTo}
                                  key={issue.id}
                                  onClick={() => setIsIssuesPopoverOpen(false)}
                                  className={`group block w-[240px] p-3 rounded-2xl border transition-all duration-300 hover:scale-105 relative overflow-hidden flex-shrink-0 ${theme === 'dark'
                                      ? 'bg-white/5 border-white/5 hover:border-blue-500/30'
                                      : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${isMastercardIssue
                                        ? 'bg-purple-500/10 border-purple-500/10 text-purple-500'
                                        : 'bg-blue-500/10 border-blue-500/10 text-blue-500'
                                      }`}>
                                      {isMastercardIssue ? <CreditCard className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-black text-[11px] truncate pr-1 tracking-tight mb-0.5">
                                        {issue.title}
                                      </h4>
                                      <p className="text-[9px] font-bold opacity-40 line-clamp-1 mb-2">
                                        {issue.description || 'بلا وصف'}
                                      </p>
                                      <div className="flex items-center justify-between text-[8px] font-bold opacity-50">
                                        <span className="truncate max-w-[80px]">{issue.createdByName}</span>
                                        <div className={`px-1.5 py-0.5 rounded-md border ${priority.color.replace('text-', 'border-')}`}>
                                          {priority.label}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                            <Bell className="w-8 h-8 mb-2" />
                            <p className="font-black text-[10px] uppercase tracking-widest">فارغ</p>
                          </div>
                        )}
                      </ScrollArea.Viewport>
                      <ScrollArea.Scrollbar className="flex select-none touch-none p-0.5 bg-transparent w-1" orientation="vertical">
                        <ScrollArea.Thumb className="flex-1 bg-gray-500/10 rounded-full" />
                      </ScrollArea.Scrollbar>
                    </ScrollArea.Root>

                    {/* Footer strip */}
                    <div className="p-3 bg-blue-500/5 text-center">
                      <p className="text-[7px] font-black opacity-30 tracking-[0.5em] uppercase">SYSTEM.NODE</p>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 h-[44px] bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all border border-white/20 shadow-lg group"
              >
                {employee?.image ? (
                  <img src={employee.image} alt={employee.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30" />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-white/30">
                    <span className="text-xs font-bold text-white">{employee?.name?.charAt(0) || 'U'}</span>
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-bold text-white whitespace-nowrap">{employee?.name || 'المستخدم'}</span>
                <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#1f2937] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in-5 slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {employee?.image ? (
                        <img src={employee.image} alt={employee.name} className="w-10 h-10 rounded-full object-cover shadow-lg ring-2 ring-white/10" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/10">
                          {employee?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 dark:text-white truncate">{employee?.name || 'المستخدم'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{employee?.email || 'user@example.com'}</div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Accounts Selector */}
                  {whatsappAccounts.length > 0 && (
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/5">
                      <div className="text-[10px] font-black text-gray-400 uppercase px-2 mb-1">حسابات واتساب</div>
                      <div className="space-y-1">
                        {whatsappAccounts.map(account => (
                          <button
                            key={account.instance_id}
                            onClick={() => handleAccountSelect(account)}
                            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedAccount?.instance_id === account.instance_id
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-3.5 h-3.5" />
                              <div className="flex flex-col items-start">
                                <span className="truncate">{account.name}</span>
                                {selectedAccount?.instance_id === account.instance_id && whatsappAccountInfo && (
                                  <span className="text-[8px] opacity-60">نشط</span>
                                )}
                              </div>
                            </div>
                            {selectedAccount?.instance_id === account.instance_id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">القسم:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{departmentName || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">الصلاحية:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{employee?.permission_group?.name || 'موظف'}</span>
                    </div>
                    <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">الهاتف:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{employee?.phone || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors group w-full text-sm font-medium"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      <span>الملف الشخصي</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors group w-full text-sm font-medium"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      <span>الإعدادات</span>
                    </Link>
                    <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                    {showInstallButton && (
                      <button
                        onClick={() => {
                          handleInstallClick();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group w-full text-sm font-medium"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>تثبيت التطبيق</span>
                      </button>
                    )}
                    <button
                      onClick={() => signOut().catch(error => console.error('Error during sign out:', error))}
                      className="flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group w-full text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          isCollapsed={isSidebarCollapsed}
          onCollapseChange={setIsSidebarCollapsed}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 relative ${!isSidebarOpen
            ? 'mr-0'
            : isSidebarCollapsed
              ? 'md:mr-20'
              : 'md:mr-64'
            } bg-slate-50 dark:bg-transparent pb-20 md:pb-6`}
        >
          <div className="w-full h-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">
            {children}
          </div>
        </main>
      </div>

      <GlobalModals />
    </div>
  );
};

export default Layout;
