import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { X, DollarSign, CreditCard, Phone, Globe, FileText, Hash, Users, Search, MessageCircle, Save, Info, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { CompanyFormData, Company } from '../hooks/useCompanies';
import useWhatsAppGroups from '../../../pages/Announcements/hooks/useWhatsAppGroups';

// Reset form data when modal closes
const initialFormData: CompanyFormData = {
  name: '',
  paymentType: 'cash',
  companyId: '',
  whatsAppGroupId: null,
  whatsAppGroupName: null,
  phone: '',
  website: '',
  details: ''
};

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface NewEditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CompanyFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompanyFormData>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<boolean>;
  selectedCompany: Company | null;
}

const NewEditCompanyModal: React.FC<NewEditCompanyModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  selectedCompany
}) => {
  const { t } = useLanguage();
  const [showWhatsAppSearch, setShowWhatsAppSearch] = React.useState(false);
  const [whatsAppSearchQuery, setWhatsAppSearchQuery] = React.useState('');
  const [selectedWhatsAppGroup, setSelectedWhatsAppGroup] = React.useState<WhatsAppGroup | null>(null);
  
  // Reset form data and selected WhatsApp group when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedWhatsAppGroup(null);
      setWhatsAppSearchQuery('');
    }
  }, [isOpen]);
  
  // Get the selected WhatsApp account from the window object
  const selectedAccount = window.selectedWhatsAppAccount;
  
  // Initialize selectedWhatsAppGroup when component mounts, selectedCompany changes, or formData changes
  React.useEffect(() => {
    if (isOpen && selectedCompany) {
      // When modal opens with a selected company, initialize WhatsApp group
      if (selectedCompany.whatsAppGroupId && selectedCompany.whatsAppGroupName) {
        setSelectedWhatsAppGroup({
          id: selectedCompany.whatsAppGroupId,
          name: selectedCompany.whatsAppGroupName
        });
      } else {
        setSelectedWhatsAppGroup(null);
      }
    }
  }, [isOpen, selectedCompany]);
  
  // Use the WhatsApp groups hook
  const { 
    whatsappGroups, 
    isLoading: isLoadingGroups, 
    error: groupsError,
    fetchGroups
  } = useWhatsAppGroups(false, selectedAccount);
  
  // Fetch groups when the search is opened
  React.useEffect(() => {
    if (showWhatsAppSearch && selectedAccount) {
      fetchGroups();
    }
  }, [showWhatsAppSearch, selectedAccount, fetchGroups]);
  
  // Filter groups based on search query
  const filteredGroups = React.useMemo(() => {
    if (!whatsAppSearchQuery) return whatsappGroups;

    const query = whatsAppSearchQuery.toLowerCase();
    return whatsappGroups.filter(group => 
      group.name.toLowerCase().includes(query) || 
      group.id.toLowerCase().includes(query)
    );
  }, [whatsappGroups, whatsAppSearchQuery]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create a copy of the form data with WhatsApp group info
    const submissionData = {
      ...formData,
      whatsAppGroupId: selectedWhatsAppGroup?.id || null,
      whatsAppGroupName: selectedWhatsAppGroup?.name || null
    };
    
    console.log("Submitting edit form with data:", {
      ...submissionData
    });
    
    // Update form data with WhatsApp group info before submitting
    setFormData(submissionData);
    
    // Submit the form
    const success = await onSubmit(e);
    if (success) {
      onClose();
    }
  };

  if (!isOpen || !selectedCompany) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-0 max-w-xl mx-4 w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header with gradient background */}
        <div className="p-4 text-white" style={{ backgroundColor: 'rgb(35 0 90)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-50/20 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">تعديل الشركة</h3>
                <p className="text-sm opacity-90">{selectedCompany.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Column 1 - Basic Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('companyName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 shadow-sm text-sm"
                  placeholder={t('enterCompanyName')}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span>معرف الشركة</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.companyId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 shadow-sm text-sm"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نوع التعامل
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="cash"
                      checked={formData.paymentType === 'cash'}
                      onChange={() => setFormData(prev => ({ ...prev, paymentType: 'cash' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-green-200 peer-checked:bg-green-50 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">{t('cash')}</span>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="credit"
                      checked={formData.paymentType === 'credit'}
                      onChange={() => setFormData(prev => ({ ...prev, paymentType: 'credit' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-amber-200 peer-checked:bg-amber-50 text-sm">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-gray-900">{t('credit')}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Column 2 - Contact Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{t('phone')}</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 shadow-sm text-sm"
                  placeholder="07700000000"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span>{t('website')}</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 shadow-sm text-sm"
                  placeholder="www.example.com"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>{t('details')}</span>
                  </div>
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 resize-none h-[104px] text-sm"
                  placeholder={t('addCompanyDetails')}
                ></textarea>
              </div>
            </div>
            
            {/* Column 3 - WhatsApp Group */}
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 h-full flex flex-col">
                <label className="block text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span className="font-bold">ربط مجموعة واتساب</span>
                </label>
                
                {selectedWhatsAppGroup ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-green-200 shadow-sm mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{selectedWhatsAppGroup.name}</div>
                        <div className="text-xs text-gray-500">مجموعة واتساب متصلة</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppGroup(null)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppSearch(true)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 border border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-green-600 text-sm font-medium mb-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>اختيار مجموعة واتساب</span>
                  </button>
                )}
                
                <div className="mt-auto p-3 bg-gray-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <Info className="w-3 h-3 flex-shrink-0" />
                    <span>ربط مجموعة واتساب يتيح إرسال إشعارات تلقائية</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-[#ff5f0a] rounded-lg disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* WhatsApp Group Search Modal */}
        {showWhatsAppSearch && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowWhatsAppSearch(false)}>
            <div className="bg-white rounded-xl shadow-xl p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 rounded-lg shadow-inner">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">اختيار مجموعة واتساب</h3>
                </div>
                <button
                  onClick={() => setShowWhatsAppSearch(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {!selectedAccount ? (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-yellow-700 mb-3">
                  لم يتم اختيار حساب واتساب. يرجى اختيار حساب من القائمة العلوية أولاً.
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={whatsAppSearchQuery}
                      onChange={(e) => setWhatsAppSearchQuery(e.target.value)}
                      placeholder="البحث عن مجموعة..."
                      className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-900 text-sm"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                    {isLoadingGroups ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <span className="text-sm text-gray-600">جاري تحميل المجموعات...</span>
                      </div>
                    ) : groupsError ? (
                      <div className="p-3 text-red-600 text-center text-sm">
                        {groupsError}
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-3 text-gray-500 text-center text-sm">
                        لم يتم العثور على مجموعات
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredGroups.map(group => (
                          <div
                            key={group.id}
                            className="flex items-center p-3 hover:bg-green-50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedWhatsAppGroup({
                                id: group.id,
                                name: group.name
                              });
                              // Also update formData directly to ensure it's in sync
                              setFormData(prev => ({
                                ...prev,
                                whatsAppGroupId: group.id,
                                whatsAppGroupName: group.name
                              }));
                              setShowWhatsAppSearch(false);
                            }}
                          >
                            <div className="p-2 bg-green-100 rounded-lg mr-2">
                              <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{group.name}</div>
                              <div className="text-sm text-gray-500">{group.participants || '?'} مشارك</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEditCompanyModal;