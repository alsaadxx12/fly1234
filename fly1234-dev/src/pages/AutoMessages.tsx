import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  MessageSquare,
  DollarSign,
  Wallet,
  Trophy,
  AlertTriangle,
  Settings,
  Send,
  Users,
  Calendar,
  Check,
  X,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';
import GroupsSidebar from './AutoMessages/components/GroupsSidebar';
import ContactsSidebar from './AutoMessages/components/ContactsSidebar';
import useWhatsAppGroups from '../pages/Announcements/hooks/useWhatsAppGroups';
import { getWhatsAppSettings } from '../lib/collections/whatsapp';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
}

interface AutoMessageSettings {
  exchangeRate: {
    enabled: boolean;
    groupId: string;
    groupName: string;
  };
  apiBalance: {
    enabled: boolean;
    contactId: string;
    contactName: string;
    contactNumber: string;
  };
  topEmployees: {
    enabled: boolean;
    groupId: string;
    groupName: string;
    sendOnce: boolean;
    lastSentMonth: string;
  };
  unauditedTickets: {
    enabled: boolean;
    groupId: string;
    groupName: string;
    sendMonthly: boolean;
    lastSentMonth: string;
  };
}

export default function AutoMessages() {
  const { theme } = useTheme();
  const { showNotification } = useNotification();

  const [settings, setSettings] = useState<AutoMessageSettings>({
    exchangeRate: {
      enabled: false,
      groupId: '',
      groupName: ''
    },
    apiBalance: {
      enabled: false,
      contactId: '',
      contactName: '',
      contactNumber: ''
    },
    topEmployees: {
      enabled: false,
      groupId: '',
      groupName: '',
      sendOnce: true,
      lastSentMonth: ''
    },
    unauditedTickets: {
      enabled: false,
      groupId: '',
      groupName: '',
      sendMonthly: true,
      lastSentMonth: ''
    }
  });

  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{ instance_id: string; token: string } | null>(null);

  const [openSidebar, setOpenSidebar] = useState<'exchangeRate' | 'apiBalance' | 'topEmployees' | 'unauditedTickets' | null>(null);

  const { whatsappGroups, isLoading: loadingGroups, fetchGroups } = useWhatsAppGroups(false, selectedAccount);

  useEffect(() => {
    loadSettings();
    loadWhatsAppAccount();
    loadContacts();
  }, []);

  useEffect(() => {
    if (whatsappGroups.length > 0) {
      setGroups(whatsappGroups.map(g => ({ id: g.id, name: g.name })));
    }
  }, [whatsappGroups]);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'auto_messages');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings(docSnap.data() as AutoMessageSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWhatsAppAccount = async () => {
    try {
      const accounts = await getWhatsAppSettings('global');
      if (accounts && accounts.length > 0) {
        const activeAccount = accounts.find((acc: any) => acc.is_active) || accounts[0];
        if (activeAccount) {
          setSelectedAccount({
            instance_id: activeAccount.instance_id,
            token: activeAccount.token
          });
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp account:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsSnapshot = await getDocs(collection(db, 'whatsapp_contacts'));
      const contactsData = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        number: doc.data().number
      }));
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'auto_messages'), settings);
      showNotification('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            الرسائل التلقائية
          </h1>
          <p className={`mt-1 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            إدارة الرسائل التلقائية عبر الواتساب
          </p>
          {groups.length > 0 && (
            <p className={`mt-1 text-xs flex items-center gap-1.5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              <Users className="w-3.5 h-3.5" />
              {groups.length} مجموعة متاحة
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchGroups}
            disabled={loadingGroups}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              loadingGroups
                ? 'bg-gray-300 cursor-not-allowed'
                : theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loadingGroups ? 'animate-spin' : ''}`} />
            {loadingGroups ? 'جاري التحديث...' : 'تحديث المجموعات'}
          </button>
          <ModernButton
            onClick={handleSaveSettings}
            loading={saving}
            icon={<Check className="w-5 h-5" />}
          >
            حفظ الإعدادات
          </ModernButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exchange Rate Messages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">سعر الصرف</h3>
                <p className="text-sm text-white/80">إرسال تحديثات سعر الصرف للمجموعة</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                تفعيل الإرسال التلقائي
              </span>
              <button
                onClick={() => setSettings({
                  ...settings,
                  exchangeRate: { ...settings.exchangeRate, enabled: !settings.exchangeRate.enabled }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.exchangeRate.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.exchangeRate.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                اختر المجموعة
              </label>
              <button
                onClick={() => settings.exchangeRate.enabled && setOpenSidebar('exchangeRate')}
                disabled={!settings.exchangeRate.enabled}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-right flex items-center justify-between group ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white hover:border-green-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 hover:border-green-500'
                } outline-none ${
                  !settings.exchangeRate.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className={settings.exchangeRate.groupName ? '' : 'opacity-60'}>
                  {settings.exchangeRate.groupName || 'اختر مجموعة...'}
                </span>
                <ChevronLeft className={`w-5 h-5 transition-transform ${
                  settings.exchangeRate.enabled ? 'group-hover:translate-x-1' : ''
                }`} />
              </button>
            </div>

            {settings.exchangeRate.groupName && (
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                  }`}>
                    المجموعة المحددة: {settings.exchangeRate.groupName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Balance Messages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">رصيد API</h3>
                <p className="text-sm text-white/80">إرسال تحديثات الرصيد التلقائي</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                تفعيل الإرسال التلقائي
              </span>
              <button
                onClick={() => setSettings({
                  ...settings,
                  apiBalance: { ...settings.apiBalance, enabled: !settings.apiBalance.enabled }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.apiBalance.enabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.apiBalance.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                اختر جهة الاتصال
              </label>
              <button
                onClick={() => settings.apiBalance.enabled && setOpenSidebar('apiBalance')}
                disabled={!settings.apiBalance.enabled}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-right flex items-center justify-between group ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white hover:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 hover:border-blue-500'
                } outline-none ${
                  !settings.apiBalance.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className={settings.apiBalance.contactName ? '' : 'opacity-60'}>
                  {settings.apiBalance.contactName ? `${settings.apiBalance.contactName} - ${settings.apiBalance.contactNumber}` : 'اختر جهة اتصال...'}
                </span>
                <ChevronLeft className={`w-5 h-5 transition-transform ${
                  settings.apiBalance.enabled ? 'group-hover:translate-x-1' : ''
                }`} />
              </button>
            </div>

            {settings.apiBalance.contactName && (
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    جهة الاتصال: {settings.apiBalance.contactName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Employees Messages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">الموظف الأكثر مبيعات</h3>
                <p className="text-sm text-white/80">إرسال تهنئة للأوائل (المركز 1، 2، 3)</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                تفعيل الإرسال التلقائي
              </span>
              <button
                onClick={() => setSettings({
                  ...settings,
                  topEmployees: { ...settings.topEmployees, enabled: !settings.topEmployees.enabled }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.topEmployees.enabled ? 'bg-yellow-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.topEmployees.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                اختر المجموعة
              </label>
              <button
                onClick={() => settings.topEmployees.enabled && setOpenSidebar('topEmployees')}
                disabled={!settings.topEmployees.enabled}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-right flex items-center justify-between group ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white hover:border-yellow-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 hover:border-yellow-500'
                } outline-none ${
                  !settings.topEmployees.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className={settings.topEmployees.groupName ? '' : 'opacity-60'}>
                  {settings.topEmployees.groupName || 'اختر مجموعة...'}
                </span>
                <ChevronLeft className={`w-5 h-5 transition-transform ${
                  settings.topEmployees.enabled ? 'group-hover:translate-x-1' : ''
                }`} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border-2 ${
              theme === 'dark' ? 'bg-yellow-900/10 border-yellow-800/30' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
                <div>
                  <p className={`text-sm font-bold mb-1 ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'
                  }`}>
                    الإرسال مرة واحدة شهرياً
                  </p>
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-yellow-200/80' : 'text-yellow-800'
                  }`}>
                    سيتم إرسال الرسالة تلقائياً في بداية كل شهر للموظفين الثلاثة الأوائل
                  </p>
                </div>
              </div>
            </div>

            {settings.topEmployees.lastSentMonth && (
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    آخر إرسال: {settings.topEmployees.lastSentMonth}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unaudited Tickets Messages */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">تنبيهات التذاكر</h3>
                <p className="text-sm text-white/80">تنبيهات شهرية للتذاكر غير المدققة</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                تفعيل التنبيهات الشهرية
              </span>
              <button
                onClick={() => setSettings({
                  ...settings,
                  unauditedTickets: { ...settings.unauditedTickets, enabled: !settings.unauditedTickets.enabled }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.unauditedTickets.enabled ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.unauditedTickets.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                اختر المجموعة
              </label>
              <button
                onClick={() => settings.unauditedTickets.enabled && setOpenSidebar('unauditedTickets')}
                disabled={!settings.unauditedTickets.enabled}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all text-right flex items-center justify-between group ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white hover:border-red-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 hover:border-red-500'
                } outline-none ${
                  !settings.unauditedTickets.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className={settings.unauditedTickets.groupName ? '' : 'opacity-60'}>
                  {settings.unauditedTickets.groupName || 'اختر مجموعة...'}
                </span>
                <ChevronLeft className={`w-5 h-5 transition-transform ${
                  settings.unauditedTickets.enabled ? 'group-hover:translate-x-1' : ''
                }`} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border-2 ${
              theme === 'dark' ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                <Calendar className={`w-5 h-5 mt-0.5 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`} />
                <div>
                  <p className={`text-sm font-bold mb-1 ${
                    theme === 'dark' ? 'text-red-300' : 'text-red-900'
                  }`}>
                    تنبيه شهري
                  </p>
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-red-200/80' : 'text-red-800'
                  }`}>
                    سيتم إرسال تنبيه في بداية كل شهر في حال وجود تذاكر غير مدققة
                  </p>
                </div>
              </div>
            </div>

            {settings.unauditedTickets.lastSentMonth && (
              <div className={`p-3 rounded-xl ${
                theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    آخر إرسال: {settings.unauditedTickets.lastSentMonth}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className={`rounded-2xl shadow-lg p-6 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <Settings className={`w-6 h-6 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <h3 className={`text-lg font-black ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ملخص الإعدادات
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${
            settings.exchangeRate.enabled
              ? theme === 'dark' ? 'bg-green-900/20 border-2 border-green-600' : 'bg-green-50 border-2 border-green-400'
              : theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-5 h-5 ${
                settings.exchangeRate.enabled
                  ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <span className={`font-bold text-sm ${
                settings.exchangeRate.enabled
                  ? theme === 'dark' ? 'text-green-300' : 'text-green-700'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                سعر الصرف
              </span>
            </div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {settings.exchangeRate.enabled ? 'مفعل' : 'غير مفعل'}
            </p>
          </div>

          <div className={`p-4 rounded-xl ${
            settings.apiBalance.enabled
              ? theme === 'dark' ? 'bg-blue-900/20 border-2 border-blue-600' : 'bg-blue-50 border-2 border-blue-400'
              : theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className={`w-5 h-5 ${
                settings.apiBalance.enabled
                  ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <span className={`font-bold text-sm ${
                settings.apiBalance.enabled
                  ? theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                رصيد API
              </span>
            </div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {settings.apiBalance.enabled ? 'مفعل' : 'غير مفعل'}
            </p>
          </div>

          <div className={`p-4 rounded-xl ${
            settings.topEmployees.enabled
              ? theme === 'dark' ? 'bg-yellow-900/20 border-2 border-yellow-600' : 'bg-yellow-50 border-2 border-yellow-400'
              : theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className={`w-5 h-5 ${
                settings.topEmployees.enabled
                  ? theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                  : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <span className={`font-bold text-sm ${
                settings.topEmployees.enabled
                  ? theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                الأكثر مبيعات
              </span>
            </div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {settings.topEmployees.enabled ? 'مفعل' : 'غير مفعل'}
            </p>
          </div>

          <div className={`p-4 rounded-xl ${
            settings.unauditedTickets.enabled
              ? theme === 'dark' ? 'bg-red-900/20 border-2 border-red-600' : 'bg-red-50 border-2 border-red-400'
              : theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${
                settings.unauditedTickets.enabled
                  ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <span className={`font-bold text-sm ${
                settings.unauditedTickets.enabled
                  ? theme === 'dark' ? 'text-red-300' : 'text-red-700'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                تنبيهات التذاكر
              </span>
            </div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {settings.unauditedTickets.enabled ? 'مفعل' : 'غير مفعل'}
            </p>
          </div>
        </div>
      </div>

      <GroupsSidebar
        isOpen={openSidebar === 'exchangeRate'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.exchangeRate.groupId}
        onSelectGroup={(group) => {
          setSettings({
            ...settings,
            exchangeRate: {
              ...settings.exchangeRate,
              groupId: group.id,
              groupName: group.name
            }
          });
        }}
        title="اختر مجموعة سعر الصرف"
        color="green"
      />

      <ContactsSidebar
        isOpen={openSidebar === 'apiBalance'}
        onClose={() => setOpenSidebar(null)}
        contacts={contacts}
        selectedContactId={settings.apiBalance.contactId}
        onSelectContact={(contact) => {
          setSettings({
            ...settings,
            apiBalance: {
              ...settings.apiBalance,
              contactId: contact.id,
              contactName: contact.name,
              contactNumber: contact.number
            }
          });
        }}
        title="اختر جهة اتصال رصيد API"
        color="blue"
      />

      <GroupsSidebar
        isOpen={openSidebar === 'topEmployees'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.topEmployees.groupId}
        onSelectGroup={(group) => {
          setSettings({
            ...settings,
            topEmployees: {
              ...settings.topEmployees,
              groupId: group.id,
              groupName: group.name
            }
          });
        }}
        title="اختر مجموعة الموظف الأكثر مبيعات"
        color="yellow"
      />

      <GroupsSidebar
        isOpen={openSidebar === 'unauditedTickets'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.unauditedTickets.groupId}
        onSelectGroup={(group) => {
          setSettings({
            ...settings,
            unauditedTickets: {
              ...settings.unauditedTickets,
              groupId: group.id,
              groupName: group.name
            }
          });
        }}
        title="اختر مجموعة تنبيهات التذاكر"
        color="purple"
      />
    </div>
  );
}
