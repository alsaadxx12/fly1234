import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Phone, Send, History, Ban, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import WhatsAppAccountInfo from './Announcements/components/WhatsAppAccountInfo';
import AnnouncementHistory from './Announcements/components/AnnouncementHistory';
import GroupAnnouncement from './Announcements/components/GroupAnnouncement';
import CustomerAnnouncements from './Announcements/components/CustomerAnnouncements';
import ExceptionsManager from './Announcements/components/ExceptionsManager';
import useAnnouncements from './Announcements/hooks/useAnnouncements';
import { useWhatsAppApi } from './Announcements/hooks/useWhatsAppApi';
import { Announcement } from './Announcements/types';
import ModernModal from '../components/ModernModal';

export default function Announcements() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { fetchWhatsAppAccount } = useWhatsAppApi();
  const {
    announcements,
    isLoading: isLoadingAnnouncements,
    error: announcementsError,
    refresh: refreshAnnouncements,
    deleteAnnouncement,
  } = useAnnouncements();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const [selectedAccount, setSelectedAccount] = useState<{ instance_id: string; token: string } | null>(null);
  const [whatsappAccountInfo, setWhatsappAccountInfo] = useState<any>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  
  const [resendingAnnouncement, setResendingAnnouncement] = useState<Announcement | null>(null);

  const handleFetchAccount = React.useCallback(async (account: { instance_id: string; token: string }) => {
    setIsLoadingAccount(true);
    setAccountError(null);
    setWhatsappAccountInfo(null);
    try {
      const accountInfo = await fetchWhatsAppAccount(account.instance_id, account.token);
      setWhatsappAccountInfo(accountInfo);
    } catch (error) {
      setAccountError('فشل في جلب معلومات الحساب');
    } finally {
      setIsLoadingAccount(false);
    }
  }, [fetchWhatsAppAccount]);

  useEffect(() => {
    const initializeAccount = () => {
      const account = window.selectedWhatsAppAccount;
      if (account) {
        setSelectedAccount(account);
        handleFetchAccount(account);
      } else {
        setIsLoadingAccount(false);
      }
    };
    initializeAccount();
    const handleAccountUpdate = (event: any) => {
      const newAccount = event.detail?.account;
      if (newAccount) {
        setSelectedAccount(newAccount);
        handleFetchAccount(newAccount);
      }
    };
    window.addEventListener('whatsappAccountUpdated', handleAccountUpdate);
    return () => {
      window.removeEventListener('whatsappAccountUpdated', handleAccountUpdate);
    };
  }, [handleFetchAccount]);

  const handleResend = (announcement: Announcement) => {
    setResendingAnnouncement(announcement);
    if (announcement.type === 'group') {
      setIsGroupModalOpen(true);
    } else {
      setIsCustomerModalOpen(true);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (announcementToDelete) {
      await deleteAnnouncement(announcementToDelete.id);
      setIsDeleteModalOpen(false);
      setAnnouncementToDelete(null);
    }
  };
  
  const features = [
    {
      id: 'groups',
      title: 'إعلان للمجموعات',
      description: 'أرسل رسائل إلى مجموعات واتساب محددة.',
      icon: Users,
      onClick: () => { setResendingAnnouncement(null); setIsGroupModalOpen(true); },
      buttonColor: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600'
    },
    {
      id: 'contacts',
      title: 'إعلان للعملاء',
      description: 'استهدف عملاء محددين من النظام أو واتساب.',
      icon: Phone,
      onClick: () => { setResendingAnnouncement(null); setIsCustomerModalOpen(true); },
      buttonColor: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600'
    },
    {
      id: 'exceptions',
      title: 'إدارة الاستثناءات',
      description: 'حدد الأرقام والمجموعات المستثناة من الإرسال.',
      icon: Ban,
      onClick: () => setIsExceptionsModalOpen(true),
      buttonColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
    }
  ];

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className={`rounded-2xl shadow-lg border overflow-hidden ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700 bg-gradient-to-r from-blue-900/20 to-gray-800' : 'border-gray-200 bg-gradient-to-r from-blue-50 to-white'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Megaphone className={`w-7 h-7 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>مركز الإعلانات</h1>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>إرسال وإدارة الإعلانات عبر واتساب</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <WhatsAppAccountInfo
                accountInfo={whatsappAccountInfo}
                isLoading={isLoadingAccount}
                error={accountError}
                onRefresh={() => selectedAccount && handleFetchAccount(selectedAccount)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300`}>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-700`}>
                    <feature.icon className={`w-6 h-6 text-blue-600 dark:text-blue-400`} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">{feature.title}</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{feature.description}</p>
              </div>
              <button onClick={feature.onClick} className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg text-white ${feature.buttonColor} disabled:opacity-50`} disabled={!selectedAccount && feature.id !== 'exceptions'}>
                <Send className="w-4 h-4" />
                <span>ابدأ الآن</span>
              </button>
            </div>
          ))}
        </div>
        
        <AnnouncementHistory
          announcements={announcements}
          isLoading={isLoadingAnnouncements}
          error={announcementsError}
          onResend={handleResend}
          onDelete={handleDeleteClick}
        />
      </div>

      {isGroupModalOpen && <GroupAnnouncement isOpen={isGroupModalOpen} onClose={() => {setIsGroupModalOpen(false); setResendingAnnouncement(null);}} selectedAccount={selectedAccount} onSuccess={refreshAnnouncements} resendingAnnouncement={resendingAnnouncement}/>}
      {isCustomerModalOpen && <CustomerAnnouncements isOpen={isCustomerModalOpen} onClose={() => {setIsCustomerModalOpen(false); setResendingAnnouncement(null);}} selectedAccount={selectedAccount} onSuccess={refreshAnnouncements} resendingAnnouncement={resendingAnnouncement} />}
      {isExceptionsModalOpen && <ExceptionsManager isOpen={isExceptionsModalOpen} onClose={() => setIsExceptionsModalOpen(false)} selectedAccount={selectedAccount}/>}

      {/* Delete Confirmation Modal */}
      <ModernModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="تأكيد الحذف"
        icon={<AlertCircle className="w-8 h-8 text-red-500" />}
      >
        <p>هل أنت متأكد من حذف هذا الإعلان نهائياً من السجل؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">إلغاء</button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            نعم, احذف
          </button>
        </div>
      </ModernModal>
    </div>
  );
}
