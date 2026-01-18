import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, Search, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Info, Phone, User, X, Upload, MessageCircle, Clock, Users, Building2, Smartphone, Check } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import useImageUpload from '../hooks/useImageUpload';
import useWhatsAppContacts from '../hooks/useWhatsAppContacts';
import ModernModal from '../../../components/ModernModal';
import ModernInput from '../../../components/ModernInput';
import ModernButton from '../../../components/ModernButton';
import SendProgress from './SendProgress';
import useAnnouncements from '../hooks/useAnnouncements';
import useMessageSending from '../hooks/useMessageSending';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount?: { instance_id: string; token: string } | null;
  onSuccess?: () => void;
  resendingAnnouncement?: any;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  entityType?: 'company' | 'client';
  source?: 'whatsapp' | 'firestore';
}

const ITEMS_PER_PAGE = 12;

export default function CustomerAnnouncements({ isOpen, onClose, selectedAccount, onSuccess, resendingAnnouncement }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { saveAnnouncement } = useAnnouncements();

  const [activeAccount, setActiveAccount] = useState<{ instance_id: string; token: string } | null>(selectedAccount || null);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'firestore' | 'whatsapp'>('firestore');
  const [currentPage, setCurrentPage] = useState(1);
  const [sendError, setSendError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [firestoreCustomers, setFirestoreCustomers] = useState<Customer[]>([]);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(false);

  const {
    whatsappContacts,
    isLoading: isLoadingWhatsApp,
    error: contactsError,
  } = useWhatsAppContacts(true, activeAccount);

  const { selectedImage, imagePreview, handleImageChange, clearSelectedImage, uploadImageWithRetry, setImagePreview, setSelectedImage } = useImageUpload();

  const {
    isSending,
    sendProgress,
    sendMessage,
    isPaused,
    togglePause,
    sendDelay,
    setSendDelay,
    setIsSending
  } = useMessageSending();

  useEffect(() => {
    if (selectedAccount) {
      setActiveAccount(selectedAccount);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (isOpen) {
      fetchFirestoreCustomers();
    }
    if (resendingAnnouncement) {
      setTitle(resendingAnnouncement.title || '');
      setMessage(resendingAnnouncement.message || '');
      if (resendingAnnouncement.imageUrl) {
        setImagePreview(resendingAnnouncement.imageUrl);
      }
      if (resendingAnnouncement.contactIds) {
        setSelectedCustomers(resendingAnnouncement.contactIds);
      }
    }
  }, [isOpen, resendingAnnouncement]);

  const fetchFirestoreCustomers = async () => {
    if (!user?.uid) return;
    setIsLoadingFirestore(true);
    try {
      const clientsRef = collection(db, 'clients');
      const companiesRef = collection(db, 'companies');
      const [clientsSnapshot, companiesSnapshot] = await Promise.all([
        getDocs(query(clientsRef, orderBy('name'))),
        getDocs(query(companiesRef, orderBy('name'))),
      ]);
      const clients = clientsSnapshot.docs
        .map(doc => ({ id: `fs-${doc.id}`, ...doc.data(), source: 'firestore' as const, entityType: 'client' as const } as Customer))
        .filter(customer => customer.phone && customer.phone.trim() !== '');
      const companies = companiesSnapshot.docs
        .map(doc => ({ id: `fs-${doc.id}`, ...doc.data(), source: 'firestore' as const, entityType: 'company' as const } as Customer))
        .filter(customer => customer.phone && customer.phone.trim() !== '');
      setFirestoreCustomers([...clients, ...companies]);
    } catch (error) {
      console.error('Error fetching firestore customers', error);
    } finally {
      setIsLoadingFirestore(false);
    };
  };

  const allCustomers = useMemo(() => {
    const combined = new Map<string, Customer>();
    if (sourceFilter === 'whatsapp') {
      whatsappContacts.forEach(c => c.phone && combined.set(c.phone, { ...c, source: 'whatsapp' }));
    } else {
      firestoreCustomers.forEach(c => c.phone && combined.set(c.phone, c));
    }
    return Array.from(combined.values());
  }, [whatsappContacts, firestoreCustomers, sourceFilter]);

  const filteredCustomers = useMemo(() => {
    let baseCustomers = allCustomers;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseCustomers = allCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.includes(query)
      );
    }
    return baseCustomers;
  }, [allCustomers, searchQuery]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredCustomers.map(c => c.id);
    const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedCustomers.includes(id));

    if (allFilteredSelected) {
      setSelectedCustomers(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedCustomers(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!activeAccount || !message.trim() || selectedCustomers.length === 0) {
      setSendError('يرجى التأكد من اختيار حساب وكتابة رسالة وتحديد عميل واحد على الأقل.');
      return;
    }
    setIsSending(true);
    setSendError(null);

    const customersToSend = allCustomers.filter(c => selectedCustomers.includes(c.id));
    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImageWithRetry(selectedImage, activeAccount);
      } else if (imagePreview) {
        imageUrl = imagePreview;
      }
      const { successfulRecipients, failedRecipients } = await sendMessage({
        text: message,
        imageUrl,
        recipients: customersToSend,
        recipientType: 'contact',
        account: activeAccount,
      });

      await saveAnnouncement({
        type: 'contact',
        message,
        imageUrl,
        sentTo: customersToSend.length,
        successfulRecipients,
        failedRecipients,
        failed: failedRecipients.length,
        contactIds: selectedCustomers,
        title: title || 'إعلان للعملاء'
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error sending announcements:', error);
      setSendError('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleClose = () => {
    setSelectedCustomers([]);
    setSearchQuery('');
    setMessage('');
    setTitle('');
    clearSelectedImage();
    setSendError(null);
    setCurrentPage(1);
    onClose();
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const allFilteredSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomers.includes(c.id));

  return createPortal(
    <ModernModal
      isOpen={isOpen}
      onClose={handleClose}
      title="إعلان للعملاء"
      description={`${selectedCustomers.length > 0 ? `محدد ${selectedCustomers.length} عميل` : 'اختر العملاء وأرسل رسائلك'}`}
      icon={<Phone className="w-6 h-6" />}
      iconColor="green"
      size="xl"
      showCloseButton={!isSending}
      footer={
        !isSending ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-bold">{selectedCustomers.length}</span> عميل محدد
            </div>
            <div className="flex gap-3">
              <ModernButton variant="secondary" onClick={handleClose}>إلغاء</ModernButton>
              <ModernButton
                variant="success"
                onClick={handleSendAnnouncement}
                disabled={isSending || !activeAccount || !message.trim() || selectedCustomers.length === 0}
                icon={<Send className="w-4 h-4" />}
              >
                إرسال ({selectedCustomers.length})
              </ModernButton>
            </div>
          </div>
        ) : null
      }
    >
      {isSending ? (
        <SendProgress
          sendProgress={sendProgress}
          isPaused={isPaused}
          sendDelay={sendDelay}
          setSendDelay={setSendDelay}
          successfulGroups={[]}
          failedGroups={[]}
          onPauseResume={togglePause}
          onClose={() => {
            setIsSending(false);
            handleClose();
          }}
          isSending={isSending}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <ModernInput label="عنوان الإعلان" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عرض خاص للعملاء" />
            <ModernInput label="نص الرسالة" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." required multiline rows={6} />
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>الصورة (اختياري)</label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="customer-image-upload" />
                <label htmlFor="customer-image-upload" className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer block ${theme === 'dark' ? 'border-gray-600 hover:border-green-500' : 'border-gray-200 hover:border-green-400'}`}>
                  {imagePreview ? <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" /> : <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400"><Upload className="w-8 h-8" /> <span className="text-sm font-medium">اضغط أو اسحب الصورة</span></div>}
                </label>
                {(selectedImage || imagePreview) && <button type="button" onClick={clearSelectedImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-center mb-4">
              <div className={`relative flex items-center p-1.5 rounded-full shadow-inner ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <button
                  onClick={() => { setSourceFilter('firestore'); setCurrentPage(1); }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 ${sourceFilter === 'firestore' ? (theme === 'dark' ? 'text-gray-900 bg-white' : 'text-gray-900 bg-white shadow-sm') : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <Users className="w-5 h-5" />
                  <span>جهات اتصال النظام</span>
                </button>
                <button
                  onClick={() => { setSourceFilter('whatsapp'); setCurrentPage(1); }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 ${sourceFilter === 'whatsapp' ? (theme === 'dark' ? 'text-gray-900 bg-white' : 'text-gray-900 bg-white shadow-sm') : 'text-gray-600 dark:text-gray-300'}`}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>جهات اتصال واتساب</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModernInput type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث بالاسم أو الرقم..." icon={<Search className="w-4 h-4" />} className="flex-1" />
              <ModernButton onClick={handleSelectAll} variant="secondary">
                {allFilteredSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </ModernButton>
            </div>
            {(isLoadingWhatsApp || isLoadingFirestore) ? <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8" /></div> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
                {paginatedCustomers.map(customer => (
                  <div key={customer.id} onClick={() => handleSelectCustomer(customer.id)} className={`relative p-3 border-2 rounded-xl cursor-pointer transition-all ${selectedCustomers.includes(customer.id) ? 'border-purple-500 bg-purple-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-700'}`}>{getInitials(customer.name)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate dark:text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.phone}</p>
                      </div>
                    </div>
                    {selectedCustomers.includes(customer.id) && <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800"><Check className="w-3 h-3" /></div>}
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-purple-600/20 disabled:opacity-50' : 'bg-gray-100 hover:bg-purple-100 disabled:opacity-50'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-purple-600/20 disabled:opacity-50' : 'bg-gray-100 hover:bg-purple-100 disabled:opacity-50'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModernModal>,
    document.body
  );
}
