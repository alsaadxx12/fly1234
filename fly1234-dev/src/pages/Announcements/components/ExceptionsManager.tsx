import React from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Check, ChevronLeft, ChevronRight, Ban, AlertTriangle, Phone, User, Loader2, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import useWhatsAppGroups from '../hooks/useWhatsAppGroups';
import useWhatsAppContacts from '../hooks/useWhatsAppContacts';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount?: { instance_id: string; token: string } | null;
}

function ExceptionsManager({ isOpen, onClose, selectedAccount }: Props) {
  const { user } = useAuth();
  const [activeAccount, setActiveAccount] = React.useState<{ instance_id: string; token: string } | null>(selectedAccount || null);
  const [initialized, setInitialized] = React.useState(false);
  const [exceptions, setExceptions] = React.useState<{ id: string; type: string; name: string; }[]>([]);
  const [isLoadingExceptions, setIsLoadingExceptions] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(6);
  const [selectedTab, setSelectedTab] = React.useState<'groups' | 'contacts'>('groups');
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const { t, language } = useLanguage();
  const [loadingContactsPage, setLoadingContactsPage] = React.useState(false);

  const { 
    whatsappGroups, 
    isLoading: isLoadingGroups, 
    error: groupsError,
    groupImages,
    fetchGroups,
    loadGroupImages,
    totalGroups
  } = useWhatsAppGroups(false, activeAccount);

  const {
    whatsappContacts,
    isLoading: isLoadingContacts,
    error: contactsError,
    contactImages,
    fetchContacts,
    loadContactImages,
    totalContacts
  } = useWhatsAppContacts(false, activeAccount);

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    const items = selectedTab === 'groups' ? whatsappGroups : whatsappContacts;
        
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  }, [whatsappGroups, whatsappContacts, searchQuery, selectedTab]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  
  // Calculate paginated items
  const paginatedItems = React.useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Update active account when selectedAccount changes
  React.useEffect(() => {
    if (selectedAccount) {
      console.log("Setting active account in ExceptionsManager:", selectedAccount);
      setActiveAccount(selectedAccount);
      setInitialized(true);
    }
  }, [selectedAccount]);

  // Fetch groups/contacts when modal opens and account is active
  React.useEffect(() => {
    if (isOpen && activeAccount && initialized) {
      if (selectedTab === 'groups') {
        fetchGroups();
      } else {
        setLoadingContactsPage(true);
        fetchContacts().finally(() => {
          setLoadingContactsPage(false);
        });
      }
    }
  }, [isOpen, activeAccount, selectedTab, fetchGroups, fetchContacts, initialized]);

  // Load exceptions from Firestore
  React.useEffect(() => {
    const loadExceptions = async () => {
      if (!user?.uid) return;
      
      setIsLoadingExceptions(true);
      
      try {
        const exceptionsRef = doc(db, 'whatsapp_exceptions', user.uid);
        const docSnap = await getDoc(exceptionsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExceptions(data.exceptions || []);
        }
      } catch (error) {
        console.error('Error loading exceptions:', error);
      } finally {
        setIsLoadingExceptions(false);
      }
    };
    
    if (isOpen && user?.uid) {
      loadExceptions();
    }
  }, [user?.uid, isOpen]);

  // Load images for current page items
  React.useEffect(() => {
    if (activeAccount && paginatedItems.length > 0) {
      if (selectedTab === 'groups') {
        loadGroupImages(paginatedItems, activeAccount.instance_id, activeAccount.token);
      } else {
        loadContactImages(paginatedItems, activeAccount.instance_id, activeAccount.token);
      }
    }
  }, [paginatedItems, activeAccount, selectedTab, loadGroupImages, loadContactImages]);

  // Reset page number when search query changes
  React.useEffect(() => {
    setTimeout(() => setCurrentPage(1), 0);
  }, [searchQuery, selectedTab]);

  // Check if an item is in exceptions list
  const isExcepted = (id: string, type: string) => {
    return exceptions.some(ex => ex.id === id && ex.type === type);
  };

  // Toggle exception status for an item
  const toggleException = (item: { id: string; name: string }, type: string) => {
    setExceptions(prev => {
      const isCurrentlyExcepted = isExcepted(item.id, type);
      
      if (isCurrentlyExcepted) {
        return prev.filter(ex => !(ex.id === item.id && ex.type === type));
      } else {
        return [...prev, { id: item.id, type, name: item.name }];
      }
    });
  };

  // Save exceptions to Firestore
  const handleSave = async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      const exceptionsRef = doc(db, 'whatsapp_exceptions', user.uid);
      await setDoc(exceptionsRef, { exceptions }, { merge: true });
      setSaveSuccess(true);
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving exceptions:', error);
      setSaveError('حدث خطأ أثناء حفظ الاستثناءات');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-lg shadow w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 text-white border-b border-gray-200" style={{ backgroundColor: 'rgb(35 0 90)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <Ban className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">إدارة الاستثناءات</h3>
                <p className="text-white/80 text-xs">تحديد المجموعات والجهات المستثناة من الإرسال</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setSelectedTab('groups')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                selectedTab === 'groups'
                  ? 'bg-white text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>المجموعات</span>
              {exceptions.filter(ex => ex.type === 'group').length > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded-full text-xs">
                  {exceptions.filter(ex => ex.type === 'group').length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setSelectedTab('contacts')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                selectedTab === 'contacts'
                  ? 'bg-white text-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>جهات الاتصال</span>
              {exceptions.filter(ex => ex.type === 'contact').length > 0 && (
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded-full text-xs">
                  {exceptions.filter(ex => ex.type === 'contact').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-gray-50 relative">
          {/* Search and Stats */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-200 rounded-lg">
                  <Users className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-xl">
                    {selectedTab === 'groups' ? 'المجموعات المتاحة' : 'جهات الاتصال المتاحة'}
                  </h4>
                  {isLoadingExceptions ? (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري التحميل...</span>
                    </div>
                  ) : exceptions.filter(ex => ex.type === (selectedTab === 'groups' ? 'group' : 'contact')).length > 0 ? (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Ban className="w-3 h-3 text-red-500" />
                      <span>
                        تم استثناء {exceptions.filter(ex => ex.type === (selectedTab === 'groups' ? 'group' : 'contact')).length} {selectedTab === 'groups' ? 'مجموعة' : 'جهة اتصال'}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={selectedTab === 'groups' ? 'البحث في المجموعات...' : 'البحث في جهات الاتصال...'}
                className="w-full px-3 py-2 pr-9 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="px-3 py-1 bg-gray-200 rounded-md text-xs text-gray-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-500" />
                <span>إجمالي: {selectedTab === 'groups' ? totalGroups : totalContacts}</span>
              </div>
              <div className="px-3 py-1 bg-red-100 rounded-md text-xs text-red-700 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" />
                <span>
                  مستثناة: {exceptions.filter(ex => ex.type === (selectedTab === 'groups' ? 'group' : 'contact')).length}
                </span>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-hidden">
            {(selectedTab === 'groups' ? isLoadingGroups : (isLoadingContacts || loadingContactsPage)) ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">
                  {selectedTab === 'groups' ? 'جاري تحميل المجموعات...' : 'جاري تحميل جهات الاتصال...'}
                  </p>
                </div>
              </div>
            ) : (selectedTab === 'groups' ? groupsError : contactsError) ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{selectedTab === 'groups' ? groupsError : contactsError}</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center m-4">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-gray-200 rounded-full">
                    {selectedTab === 'groups' ? (
                      <Users className="w-8 h-8 text-gray-400" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {searchQuery ? 'لا توجد نتائج للبحث' : selectedTab === 'groups' ? 'لا توجد مجموعات متاحة' : 'لا توجد جهات اتصال متاحة'}
                </h3> 
                <p className="text-sm text-gray-500 max-w-xs mx-auto mb-4">
                  {searchQuery ? 'حاول تغيير كلمات البحث' : selectedTab === 'groups' ? 'قم بتحديث المجموعات للبدء' : 'قم بتحديث جهات الاتصال للبدء'}
                </p>
                {(searchQuery || selectedTab === 'contacts' && loadingContactsPage) && (
                  <button
                    onClick={() => {
                      if (searchQuery) { 
                        setSearchQuery('');
                      } else if (selectedTab === 'contacts') {
                        setLoadingContactsPage(true);
                        fetchContacts().finally(() => setLoadingContactsPage(false));
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    {searchQuery ? 'مسح البحث' : 'تحديث جهات الاتصال'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[450px] pr-1">
                {paginatedItems.map((item, index) => (
                  <div
                    key={`${selectedTab}-${item.id}-${index}`}
                    className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      isExcepted(item.id, selectedTab === 'groups' ? 'group' : 'contact')
                        ? 'bg-red-50 border border-red-200' 
                        : 'border border-gray-200' 
                    }`}
                    onClick={() => toggleException(item, selectedTab === 'groups' ? 'group' : 'contact')}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden relative ${
                      isExcepted(item.id, selectedTab === 'groups' ? 'group' : 'contact') ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {selectedTab === 'groups' && (
                        groupImages.has(item.id) ? (
                          <>
                            <img
                              src={groupImages.get(item.id)}
                              alt={item.name}
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            /> 
                          </>
                        ) : ( 
                          <Users
                            className={`w-5 h-5 ${
                              isExcepted(item.id, 'group') ? 'text-red-500' : 'text-gray-500'
                            }`}
                          />
                        )
                      )}
                      
                      {selectedTab === 'contacts' && (
                        contactImages.has(item.id) ? (
                          <>
                            <img
                              src={contactImages.get(item.id)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            /> 
                          </>
                        ) : ( 
                          <User
                            className={`w-6 h-6 ${
                              isExcepted(item.id, 'contact') ? 'text-red-500' : 'text-gray-500'
                            }`}
                          />
                        )
                      )}
                      {isExcepted(item.id, selectedTab === 'groups' ? 'group' : 'contact') && (
                        <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                          <Ban className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 mr-3">
                      <div
                        className={`font-medium ${
                          isExcepted(item.id, selectedTab === 'groups' ? 'group' : 'contact')
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.name}
                      </div>
                      {selectedTab === 'groups' && (
                        <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{(item as any).participants || '?'} مشارك</span>
                        </div>
                      )}
                      {selectedTab === 'contacts' && (
                        <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span dir="ltr">{(item as any).phone || item.id.split('@')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredItems.length > 0 && totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-3 sticky bottom-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-sm bg-gray-200 px-3 py-1.5 rounded-md">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-3 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
          {saveError && (
            <div className="flex-1 p-2 bg-red-50 text-red-600 rounded-md text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{saveError}</span> 
            </div>
          )}
          
          {saveSuccess && (
            <div className="flex-1 p-2 bg-green-50 text-green-600 rounded-md text-sm flex items-center gap-2">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span>تم حفظ الاستثناءات بنجاح</span>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          > 
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>حفظ الاستثناءات</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default ExceptionsManager;
