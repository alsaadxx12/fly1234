import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  History, X, Search, ChevronLeft, ChevronRight, Send,
  Users, Phone, Calendar, Image as ImageIcon,
  Loader2, AlertCircle, Eye, Download, RefreshCw, Trash2, CheckCircle2, XCircle, FileText
} from 'lucide-react';
import { Announcement } from '../types';
import ModernModal from '../../../components/ModernModal';
import { useTheme } from '../../../contexts/ThemeContext';

interface AnnouncementHistoryProps {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  onResend?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
}

const AnnouncementHistory: React.FC<AnnouncementHistoryProps> = ({
  announcements,
  isLoading,
  error,
  onResend,
  onDelete
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewDetails = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsViewModalOpen(true);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5" />
          سجل الإعلانات
        </h3>
      </div>
      
      {announcements.length === 0 ? (
        <div className="text-center py-10">
          <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد إعلانات سابقة لعرضها.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {announcement.imageUrl ? (
                      <img className="h-12 w-12 rounded-lg object-cover" src={announcement.imageUrl} alt="" />
                    ) : (
                      announcement.type === 'group' ? <Users className="h-6 w-6 text-indigo-500" /> : <Phone className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{announcement.title || 'إعلان بدون عنوان'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{announcement.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">المستلمون</p>
                    <p className="font-bold text-gray-800 dark:text-white">{announcement.sentTo}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">النجاح</p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {announcement.successfulRecipients?.length || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">الفشل</p>
                    <p className="font-bold text-red-600 dark:text-red-400">{announcement.failedRecipients?.length || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleViewDetails(announcement)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => onResend && onResend(announcement)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete && onDelete(announcement)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAnnouncement && (
        <ModernModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`تفاصيل الإعلان: ${selectedAnnouncement.title || 'إعلان للعملاء'}`}
          size="lg"
        >
          <div className="space-y-6">
            {(selectedAnnouncement.imageUrl || selectedAnnouncement.message) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAnnouncement.imageUrl && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      الصورة المرسلة
                    </h4>
                    <img src={selectedAnnouncement.imageUrl} alt="Announcement" className="rounded-lg shadow-md w-full max-h-60 object-contain" />
                  </div>
                )}
                {selectedAnnouncement.message && (
                  <div className={`space-y-2 ${!selectedAnnouncement.imageUrl && 'md:col-span-2'}`}>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      الرسالة
                    </h4>
                    <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {selectedAnnouncement.message}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">ناجح ({selectedAnnouncement.successfulRecipients?.length || 0})</h4>
                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
                  {selectedAnnouncement.successfulRecipients?.length ? selectedAnnouncement.successfulRecipients.map((name, i) => <p key={i} className="text-xs p-1 rounded bg-white dark:bg-gray-800/50">{name}</p>) : <p className="text-xs text-center p-4">لا يوجد</p>}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">فاشل ({selectedAnnouncement.failedRecipients?.length || 0})</h4>
                <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
                  {selectedAnnouncement.failedRecipients?.length ? selectedAnnouncement.failedRecipients.map((name, i) => <p key={i} className="text-xs p-1 rounded bg-white dark:bg-gray-800/50">{name}</p>) : <p className="text-xs text-center p-4">لا يوجد</p>}
                </div>
              </div>
            </div>
          </div>
        </ModernModal>
      )}
    </div>
  );
};

export default AnnouncementHistory;
