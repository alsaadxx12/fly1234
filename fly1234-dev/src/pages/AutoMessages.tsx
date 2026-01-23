import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  DollarSign,
  Wallet,
  Trophy,
  AlertTriangle,
  Settings,
  Users,
  Calendar,
  Check,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import ModernButton from '../components/ModernButton';
import GroupsSidebar from './AutoMessages/components/GroupsSidebar';
import ContactsSidebar from './AutoMessages/components/ContactsSidebar';
import useWhatsAppGroups from '../hooks/useWhatsAppGroups';
import { getWhatsAppSettings } from '../lib/collections/whatsapp';

interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: string | number;
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
      setGroups(whatsappGroups.map((g: any) => ({ id: g.id, name: g.name })));
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
      showNotification('success', 'نجاح', 'تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'خطأ', 'فشل حفظ الإعدادات');
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
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            إدارة الرسائل التلقائية عبر الواتساب
          </p>
          {groups.length > 0 && (
            <p className={`mt-1 text-xs flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {groups.length} مجموعة متصلة
            </p>
          )}
        </div>
        <ModernButton
          variant="primary"
          onClick={handleSaveSettings}
          loading={saving}
          className="px-8"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </ModernButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exchange Rate Card */}
        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>سعر الصرف</h3>
                <p className="text-xs text-gray-500">إرسال تنبيه عند تغيير سعر الصرف</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({
                ...settings,
                exchangeRate: { ...settings.exchangeRate, enabled: !settings.exchangeRate.enabled }
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.exchangeRate.enabled ? 'bg-blue-600' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.exchangeRate.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>المجموعة المستهدفة</div>
              <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {settings.exchangeRate.groupName || 'لم يتم اختيار مجموعة'}
              </div>
            </div>
            <button
              onClick={() => setOpenSidebar('exchangeRate')}
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* API Balance Card */}
        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>رصيد الـ API</h3>
                <p className="text-xs text-gray-500">تنبيه يومي برصيد بوابة الواتساب</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({
                ...settings,
                apiBalance: { ...settings.apiBalance, enabled: !settings.apiBalance.enabled }
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.apiBalance.enabled ? 'bg-purple-600' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.apiBalance.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>جهة الاتصال المستهدفة</div>
              <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {settings.apiBalance.contactName || 'لم يتم اختيار جهة اتصال'}
              </div>
            </div>
            <button
              onClick={() => setOpenSidebar('apiBalance')}
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Top Employees Card */}
        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>أفضل الموظفين</h3>
                <p className="text-xs text-gray-500">تهنئة الموظفين الأكثر إنتاجية شهرياً</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({
                ...settings,
                topEmployees: { ...settings.topEmployees, enabled: !settings.topEmployees.enabled }
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.topEmployees.enabled ? 'bg-amber-600' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.topEmployees.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>المجموعة المستهدفة</div>
                <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {settings.topEmployees.groupName || 'لم يتم اختيار مجموعة'}
                </div>
              </div>
              <button
                onClick={() => setOpenSidebar('topEmployees')}
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => setSettings({
                  ...settings,
                  topEmployees: { ...settings.topEmployees, sendOnce: !settings.topEmployees.sendOnce }
                })}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${settings.topEmployees.sendOnce ? 'bg-amber-500 border-amber-500' : 'border-gray-400 hover:border-amber-500'}`}
              >
                {settings.topEmployees.sendOnce && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-xs text-gray-500 font-bold">إرسال التهنئة مرة واحدة فقط في الشهر</span>
            </div>
          </div>
        </div>

        {/* Unaudited Tickets Card */}
        <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>تنبيه التذاكر</h3>
                <p className="text-xs text-gray-500">تنبيه بالتذاكر غير المدققة مالياً</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({
                ...settings,
                unauditedTickets: { ...settings.unauditedTickets, enabled: !settings.unauditedTickets.enabled }
              })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.unauditedTickets.enabled ? 'bg-red-600' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.unauditedTickets.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>المجموعة المستهدفة</div>
                <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {settings.unauditedTickets.groupName || 'لم يتم اختيار مجموعة'}
                </div>
              </div>
              <button
                onClick={() => setOpenSidebar('unauditedTickets')}
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => setSettings({
                  ...settings,
                  unauditedTickets: { ...settings.unauditedTickets, sendMonthly: !settings.unauditedTickets.sendMonthly }
                })}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${settings.unauditedTickets.sendMonthly ? 'bg-red-500 border-red-500' : 'border-gray-400 hover:border-red-500'}`}
              >
                {settings.unauditedTickets.sendMonthly && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-xs text-gray-500 font-bold">إرسال تقرير شهري شامل بالحالات غير المدققة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebars */}
      <GroupsSidebar
        isOpen={openSidebar === 'exchangeRate'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.exchangeRate.groupId}
        onSelectGroup={(group: WhatsAppGroup) => {
          setSettings({
            ...settings,
            exchangeRate: {
              ...settings.exchangeRate,
              groupId: group.id,
              groupName: group.name
            }
          });
          setOpenSidebar(null);
        }}
        isLoading={loadingGroups}
        onRefresh={fetchGroups}
      />

      <ContactsSidebar
        isOpen={openSidebar === 'apiBalance'}
        onClose={() => setOpenSidebar(null)}
        contacts={contacts}
        selectedContactId={settings.apiBalance.contactId}
        onSelectContact={(contact: WhatsAppContact) => {
          setSettings({
            ...settings,
            apiBalance: {
              ...settings.apiBalance,
              contactId: contact.id,
              contactName: contact.name,
              contactNumber: contact.number
            }
          });
          setOpenSidebar(null);
        }}
      />

      <GroupsSidebar
        isOpen={openSidebar === 'topEmployees'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.topEmployees.groupId}
        onSelectGroup={(group: WhatsAppGroup) => {
          setSettings({
            ...settings,
            topEmployees: {
              ...settings.topEmployees,
              groupId: group.id,
              groupName: group.name
            }
          });
          setOpenSidebar(null);
        }}
        isLoading={loadingGroups}
        onRefresh={fetchGroups}
      />

      <GroupsSidebar
        isOpen={openSidebar === 'unauditedTickets'}
        onClose={() => setOpenSidebar(null)}
        groups={groups}
        selectedGroupId={settings.unauditedTickets.groupId}
        onSelectGroup={(group: WhatsAppGroup) => {
          setSettings({
            ...settings,
            unauditedTickets: {
              ...settings.unauditedTickets,
              groupId: group.id,
              groupName: group.name
            }
          });
          setOpenSidebar(null);
        }}
        isLoading={loadingGroups}
        onRefresh={fetchGroups}
      />
    </div>
  );
}
