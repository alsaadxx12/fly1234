import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Users, Search, Send, Loader2, Upload, Trash2, Info, CheckCircle2, Ban, Clock, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, MessageSquare, Filter, Plus, FileText, Check } from 'lucide-react';
import useWhatsAppGroups from '../hooks/useWhatsAppGroups';
import useImageUpload from '../hooks/useImageUpload';
import useMessageSending from '../hooks/useMessageSending';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import SendProgress from './SendProgress';
import useAnnouncements from '../hooks/useAnnouncements';
import ModernModal from '../../../components/ModernModal';
import ModernInput from '../../../components/ModernInput';
import ModernButton from '../../../components/ModernButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount?: { instance_id: string; token: string } | null;
  onSuccess?: () => void;
  resendingAnnouncement?: any;
}

const ITEMS_PER_PAGE = 12;

export default function GroupAnnouncement({ isOpen, onClose, selectedAccount, onSuccess, resendingAnnouncement }: Props) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { saveAnnouncement } = useAnnouncements();

  const [activeAccount, setActiveAccount] = useState(selectedAccount || null);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const {
    selectedImage,
    imagePreview,
    handleImageChange,
    clearSelectedImage,
    uploadImageWithRetry
  } = useImageUpload();

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

  const [sendError, setSendError] = useState<string | null>(null);

  const {
    whatsappGroups,
    isLoading: isLoadingGroups,
    isLoadingMore,
    error: groupsError,
    groupImages,
    fetchGroups,
    loadGroupImages,
    totalGroups,
    progress: groupsLoadProgress
  } = useWhatsAppGroups(false, activeAccount);
  
  const [dragActive, setDragActive] = useState(false);

  const dragEventHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageChange({ target: { files: e.dataTransfer.files } } as any);
      }
    },
  };

  useEffect(() => {
    if (selectedAccount) {
      setActiveAccount(selectedAccount);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (isOpen && activeAccount && !hasLoadedOnce) {
      fetchGroups();
      loadExceptions();
      setHasLoadedOnce(true);
    }
    if(resendingAnnouncement) {
      setTitle(resendingAnnouncement.title || '');
      setMessage(resendingAnnouncement.message || '');
    }
  }, [isOpen, activeAccount, hasLoadedOnce, fetchGroups, resendingAnnouncement]);

  const loadExceptions = async () => {
    if (!user?.uid) return;

    try {
      const exceptionsRef = doc(db, 'whatsapp_exceptions', user.uid);
      const docSnap = await getDoc(exceptionsRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const exceptionIds = new Set(
          (data.exceptions || [])
            .filter((ex: any) => ex && ex.id && ex.type === 'group')
            .map((ex: any) => ex.id)
        );
        setExceptions(exceptionIds);
      }
    } catch (error) {
      console.error('Error loading exceptions:', error);
    }
  };

  const filteredGroups = useMemo(() => {
    return whatsappGroups.filter(group => {
      const matchesSearch = searchQuery === '' ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notException = !exceptions.has(group.id);
      return matchesSearch && notException;
    });
  }, [whatsappGroups, searchQuery, exceptions]);

  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGroups = useMemo(() => {
    return filteredGroups.slice(startIndex, endIndex);
  }, [filteredGroups, startIndex, endIndex]);


  useEffect(() => {
    if (whatsappGroups.length > 0 && activeAccount && isOpen) {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const visibleGroups = filteredGroups.slice(startIndex, endIndex);

      if(visibleGroups.length > 0) {
        loadGroupImages(visibleGroups, activeAccount.instance_id, activeAccount.token);
      }
    }
  }, [whatsappGroups, activeAccount, currentPage, isOpen, loadGroupImages, filteredGroups]);

  const handleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.id));
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSend = async () => {
    if (!activeAccount || selectedGroups.length === 0 || !message.trim()) {
      return;
    }
  
    setSendError(null);
  
    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        setIsSending(true);
        imageUrl = await uploadImageWithRetry(selectedImage, activeAccount);
      }
  
      const groupsToSend = whatsappGroups.filter(g => selectedGroups.includes(g.id));
  
      const { successfulRecipients, failedRecipients } = await sendMessage({
        text: message,
        imageUrl: imageUrl,
        recipients: groupsToSend,
        recipientType: 'group',
        account: activeAccount
      });
  
      await saveAnnouncement({
        type: 'group',
        message,
        imageUrl,
        sentTo: groupsToSend.length,
        successfulRecipients,
        failedRecipients,
        failed: failedRecipients.length,
        groupIds: selectedGroups,
        title: title || 'إعلان للمجموعات'
      });
  
      if (onSuccess) {
        onSuccess();
      }
  
    } catch (error) {
      console.error('Error sending messages:', error);
      setSendError('حدث خطأ أثناء الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setTitle('');
    setSelectedGroups([]);
    setSearchQuery('');
    clearSelectedImage();
    setSendError(null);
    setIsSending(false);
    setCurrentPage(1);
    onClose();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const allFilteredSelected = filteredGroups.length > 0 &&
    filteredGroups.every(customer => selectedGroups.includes(customer.id));

  const showLoadingBar = isLoadingGroups || (groupsLoadProgress.total > 0 && groupsLoadProgress.loaded < groupsLoadProgress.total);
  const progressPercentage = (groupsLoadProgress.total > 0) ? Math.round((groupsLoadProgress.loaded / groupsLoadProgress.total) * 100) : 0;


  return (
    <ModernModal
      isOpen={isOpen}
      onClose={handleClose}
      title="إعلان للمجموعات"
      description={`${selectedGroups.length > 0 ? `محدد ${selectedGroups.length} مجموعة` : 'اختر المجموعات وأرسل رسالتك'}`}
      icon={<Users className="w-6 h-6" />}
      iconColor="green"
      size="xl"
      showCloseButton={!isSending}
      footer={
        !isSending ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-bold">{selectedGroups.length}</span> مجموعة محددة
            </div>
            <div className="flex gap-3">
              <ModernButton variant="secondary" onClick={handleClose}>إلغاء</ModernButton>
              <ModernButton
                variant="success"
                onClick={handleSend}
                disabled={selectedGroups.length === 0 || !message.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                إرسال ({selectedGroups.length})
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
          successfulGroups={[]} // Will be updated by useMessageSending
          failedGroups={[]} // Will be updated by useMessageSending
          onPauseResume={togglePause}
          onClose={() => {
            setIsSending(false);
            handleClose();
          }}
          isSending={isSending}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side - Message Compose */}
          <div className="lg:col-span-2 space-y-5">
            <div className={`p-5 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border-gray-700'
                : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${
                  theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <h3 className={`font-bold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  محتوى الرسالة
                </h3>
              </div>

              <div className="space-y-4">
                <ModernInput
                  label="عنوان الإعلان"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: عرض خاص"
                />

                <ModernInput
                  label="نص الرسالة"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  required
                  multiline
                  rows={6}
                />
              </div>
            </div>

            <div className={`p-5 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border-gray-700'
                : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${
                  theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <ImageIcon className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                </div>
                <h3 className={`font-bold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  الصورة (اختياري)
                </h3>
              </div>

              {!selectedImage ? (
                <div
                  {...dragEventHandlers}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'border-gray-600 hover:border-purple-500 bg-gray-700/30 hover:bg-gray-700/50'
                      : 'border-gray-200 hover:border-purple-400 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="group-image-upload"
                  />
                  <label htmlFor="group-image-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-3 rounded-full ${
                        theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
                      }`}>
                        <Upload className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </div>
                      <p className={`font-medium text-sm ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        اضغط أو اسحب الصورة
                      </p>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        PNG, JPG, GIF حتى 10MB
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden group">
                  <img
                    src={imagePreview || ''}
                    alt="Preview"
                    className="w-full h-40 object-contain bg-gray-900/5 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className={`absolute bottom-0 left-0 right-0 p-3 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-t from-black/90 to-transparent'
                      : 'bg-gradient-to-t from-black/80 to-transparent'
                  }`}>
                    <p className="text-white text-sm font-medium truncate">
                      {selectedImage.name}
                    </p>
                    <p className="text-white/80 text-xs">
                      {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Groups Selection */}
          <div className="lg:col-span-3 space-y-4">
            <div className={`p-5 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border-gray-700'
                : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                  }`}>
                    <Users className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                  </div>
                  <h3 className={`font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>
                    المجموعات
                  </h3>
                </div>
                <ModernButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                  icon={allFilteredSelected ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                >
                  {allFilteredSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                </ModernButton>
              </div>

               {showLoadingBar && (
                 <div className="mt-2 w-full mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                      جاري تحميل المجموعات...
                    </span>
                    <span className={`font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-2.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {groupsLoadProgress.loaded} / {groupsLoadProgress.total}
                  </span>
                </div>
              )}

              <ModernInput
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ابحث عن مجموعة..."
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentGroups.length === 0 && !isLoadingGroups ? (
                  <div className="col-span-full text-center py-16">
                    <Users className={`w-12 h-12 mx-auto mb-3 ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <p className={`${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      لا توجد مجموعات
                    </p>
                  </div>
                ) : (
                  currentGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => handleGroupToggle(group.id)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 group ${
                        selectedGroups.includes(group.id) ? 'ring-4 ring-green-500 shadow-xl' : theme === 'dark' ? 'hover:ring-2 hover:ring-gray-600' : 'hover:ring-2 hover:ring-gray-300'
                      }`}
                    >
                      <div className={`aspect-square w-full rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all ${
                        selectedGroups.includes(group.id)
                          ? 'bg-green-500/10'
                          : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                      }`}>
                        <div className="relative mb-2">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                            selectedGroups.includes(group.id) ? 'border-green-400' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {groupImages.get(group.id) ? (
                              <img src={groupImages.get(group.id)} alt={group.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                            )}
                          </div>
                          {selectedGroups.includes(group.id) && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <p className={`text-xs font-bold truncate w-full ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{group.name}</p>
                        <div className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          <p>{group.participants || '?'} مشارك</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                  <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                  }`}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === 1
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                        className={`min-w-[40px] h-10 rounded-lg font-medium transition-all ${
                          page === currentPage
                            ? 'bg-blue-500 text-white shadow-lg'
                            : page === '...'
                              ? 'cursor-default'
                              : theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition-all ${
                        currentPage === totalPages
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                )}
          </div>
        </div>
      )}
    </ModernModal>
  );
}
