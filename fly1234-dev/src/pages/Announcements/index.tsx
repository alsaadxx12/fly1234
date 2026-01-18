import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Phone, Send, Ban, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WhatsAppAccountInfo from './components/WhatsAppAccountInfo';
import AnnouncementHistory from './components/AnnouncementHistory';
import GroupAnnouncement from './components/GroupAnnouncement';
import CustomerAnnouncements from './components/CustomerAnnouncements';
import ExceptionsManager from './components/ExceptionsManager';
import useAnnouncements from './hooks/useAnnouncements';
import { useWhatsAppApi } from './hooks/useWhatsAppApi';
import { Announcement } from './types';
import ModernModal from '../../components/ModernModal';

export default function Announcements() {
  const { checkPermission } = useAuth();
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
    const handleAccountUpdate = (event: any) => {
      const account = event.detail.account;
      setSelectedAccount(account);
      handleFetchAccount(account);
    };

    if ((window as any).selectedWhatsAppAccount) {
      const account = (window as any).selectedWhatsAppAccount;
      setSelectedAccount(account);
      handleFetchAccount(account);
    }

    window.addEventListener('whatsappAccountUpdated', handleAccountUpdate);
    return () => window.removeEventListener('whatsappAccountUpdated', handleAccountUpdate);
  }, [handleFetchAccount]);

  const stats = [
    {
      label: 'إجمالي الإعلانات',
      value: announcements.length,
      icon: Megaphone,
      color: 'bg-blue-500',
    },
    {
      label: 'إعلانات المجموعات',
      value: announcements.filter(a => a.type === 'group').length,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      label: 'إعلانات العملاء',
      value: announcements.filter(a => a.type === 'customer').length,
      icon: Phone,
      color: 'bg-green-500',
    }
  ];

  const features = [
    {
      title: 'إعلان للمجموعات',
      description: 'إرسال رسائل جماعية لكافة المجموعات النشطة أو مجموعات محددة',
      icon: Users,
      onClick: () => setIsGroupModalOpen(true),
      permission: 'group_announcement',
    },
    {
      title: 'إعلان للعملاء',
      description: 'إرسال رسائل نصية أو وسائط لكافة العملاء المسجلين في النظام',
      icon: Phone,
      onClick: () => setIsCustomerModalOpen(true),
      permission: 'customer_announcement',
    },
    {
      title: 'إدارة الاستثناءات',
      description: 'تحديد العملاء أو المجموعات المستثناة من الإعلانات التلقائية',
      icon: Ban,
      onClick: () => setIsExceptionsModalOpen(true),
      permission: 'manage_exceptions',
    }
  ];

  if (!checkPermission('اعلان', 'view')) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="p-6 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">عذراً، ليس لديك صلاحية الوصول</h2>
        <p className="text-gray-500 dark:text-gray-400">يرجى التواصل مع مسؤول النظام لطلب الصلاحيات اللازمة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <WhatsAppAccountInfo
            isLoading={isLoadingAccount}
            error={accountError}
            accountInfo={whatsappAccountInfo}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={feature.onClick}
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group gap-3"
              >
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-gray-500 group-hover:text-blue-500" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-gray-800 dark:text-white">{feature.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{feature.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
          <AnnouncementHistory
            announcements={announcements}
            isLoading={isLoadingAnnouncements}
            onDelete={(a) => {
              setAnnouncementToDelete(a);
              setIsDeleteModalOpen(true);
            }}
            onResend={(a) => setResendingAnnouncement(a)}
          />
        </div>
      </div>

      {/* Modals */}
      <ModernModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="إعلان للمجموعات"
      >
        <GroupAnnouncement
          onSuccess={() => {
            setIsGroupModalOpen(false);
            refreshAnnouncements();
          }}
          onCancel={() => setIsGroupModalOpen(false)}
          selectedAccount={selectedAccount}
        />
      </ModernModal>

      <ModernModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="إعلان للموظفين والعملاء"
      >
        <CustomerAnnouncements
          onSuccess={() => {
            setIsCustomerModalOpen(false);
            refreshAnnouncements();
          }}
          onCancel={() => setIsCustomerModalOpen(false)}
          selectedAccount={selectedAccount}
        />
      </ModernModal>

      <ModernModal
        isOpen={isExceptionsModalOpen}
        onClose={() => setIsExceptionsModalOpen(false)}
        title="إدارة الاستثناءات"
      >
        <ExceptionsManager onCancel={() => setIsExceptionsModalOpen(false)} />
      </ModernModal>

      <ModernModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="حذف الإعلان"
      >
        <div className="p-6 text-center">
          <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">هل أنت متأكد من حذف هذا الإعلان؟</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">سيتم حذف سجل الإعلان نهائياً من النظام.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={async () => {
                if (announcementToDelete) {
                  await deleteAnnouncement(announcementToDelete.id);
                  setIsDeleteModalOpen(false);
                  setAnnouncementToDelete(null);
                  refreshAnnouncements();
                }
              }}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
              تأكيد الحذف
            </button>
          </div>
        </div>
      </ModernModal>

      {resendingAnnouncement && (
        <ModernModal
          isOpen={true}
          onClose={() => setResendingAnnouncement(null)}
          title="إعادة إرسال الإعلان"
        >
          {resendingAnnouncement.type === 'group' ? (
            <GroupAnnouncement
              initialData={resendingAnnouncement}
              onSuccess={() => {
                setResendingAnnouncement(null);
                refreshAnnouncements();
              }}
              onCancel={() => setResendingAnnouncement(null)}
              selectedAccount={selectedAccount}
            />
          ) : (
            <CustomerAnnouncements
              initialData={resendingAnnouncement}
              onSuccess={() => {
                setResendingAnnouncement(null);
                refreshAnnouncements();
              }}
              onCancel={() => setResendingAnnouncement(null)}
              selectedAccount={selectedAccount}
            />
          )}
        </ModernModal>
      )}
    </div>
  );
}
