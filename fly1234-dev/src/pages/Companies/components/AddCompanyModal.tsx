import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Building2, DollarSign, CreditCard, Phone, Mail, Hash, MessageCircle, Users, Search, X } from 'lucide-react';
import { CompanyFormData } from '../hooks/useCompanies';
import useWhatsAppGroups from '../../../pages/Announcements/hooks/useWhatsAppGroups';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ModernModal from '../../../components/ModernModal';
import ModernInput from '../../../components/ModernInput';
import ModernButton from '../../../components/ModernButton';
import { useTheme } from '../../../contexts/ThemeContext';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData?: CompanyFormData;
  setFormData?: React.Dispatch<React.SetStateAction<CompanyFormData>>;
  isSubmitting: boolean;
  onSubmit?: (e: React.FormEvent) => Promise<boolean>;
  onCompanyAdded?: (company: any) => void;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  isSubmitting,
  onSubmit,
  onCompanyAdded
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { employee } = useAuth();
  const [localFormData, setLocalFormData] = React.useState<CompanyFormData>({
    name: '',
    paymentType: 'cash',
    companyId: '',
    whatsAppGroupId: null,
    whatsAppGroupName: null,
    phone: '',
    website: '',
    details: ''
  });
  const [localIsSubmitting, setLocalIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showWhatsAppSearch, setShowWhatsAppSearch] = React.useState(false);
  const [whatsAppSearchQuery, setWhatsAppSearchQuery] = React.useState('');
  const [selectedWhatsAppGroup, setSelectedWhatsAppGroup] = React.useState<WhatsAppGroup | null>(null);

  const selectedAccount = window.selectedWhatsAppAccount;

  const {
    whatsappGroups,
    isLoading: isLoadingGroups,
    error: groupsError,
    fetchGroups
  } = useWhatsAppGroups(false, selectedAccount);

  const actualFormData = formData || localFormData;
  const actualSetFormData = setFormData || setLocalFormData;

  React.useEffect(() => {
    if (showWhatsAppSearch && selectedAccount) {
      fetchGroups();
    }
  }, [showWhatsAppSearch, selectedAccount, fetchGroups]);

  React.useEffect(() => {
    if (!isOpen) {
      setLocalFormData({
        name: '',
        paymentType: 'cash',
        companyId: '',
        whatsAppGroupId: null,
        whatsAppGroupName: null,
        phone: '',
        website: '',
        details: ''
      });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const filteredGroups = React.useMemo(() => {
    if (!whatsAppSearchQuery) return whatsappGroups;
    const query = whatsAppSearchQuery.toLowerCase();
    return whatsappGroups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.id.toLowerCase().includes(query)
    );
  }, [whatsappGroups, whatsAppSearchQuery]);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      return;
    }

    setLocalIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!localFormData.name.trim()) {
        throw new Error('يرجى إدخال اسم الشركة');
      }

      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('name', '==', localFormData.name.trim()));
      const existingCompanies = await getDocs(q);

      if (!existingCompanies.empty) {
        throw new Error('يوجد شركة بهذا الاسم بالفعل');
      }

      const companyData = {
        name: localFormData.name.trim(),
        paymentType: localFormData.paymentType,
        companyId: localFormData.companyId || null,
        whatsAppGroupId: selectedWhatsAppGroup?.id || null,
        whatsAppGroupName: selectedWhatsAppGroup?.name || null,
        phone: localFormData.phone || null,
        website: localFormData.website || null,
        details: localFormData.details || null,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };

      const docRef = await addDoc(companiesRef, companyData);

      setSuccess('تم إضافة الشركة بنجاح');

      if (onCompanyAdded) {
        onCompanyAdded({
          id: docRef.id,
          ...companyData,
          createdAt: new Date()
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding company:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة الشركة');
    } finally {
      setLocalIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedWhatsAppGroup) {
      actualSetFormData(prev => ({
        ...prev,
        whatsAppGroupId: selectedWhatsAppGroup.id,
        whatsAppGroupName: selectedWhatsAppGroup.name
      }));
    }

    if (onSubmit) {
      const success = await onSubmit(e);
      if (success) {
        onClose();
      }
    } else {
      await handleLocalSubmit(e);
    }
  };

  return (
    <>
      <ModernModal
        isOpen={isOpen}
        onClose={onClose}
        title="إضافة شركة جديدة"
        description="أدخل تفاصيل الشركة الجديدة"
        icon={<Building2 className="w-6 h-6" />}
        iconColor="blue"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <ModernButton
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {t('cancel')}
            </ModernButton>
            <ModernButton
              type="submit"
              variant="primary"
              loading={isSubmitting || localIsSubmitting}
              onClick={handleSubmit}
            >
              إضافة الشركة
            </ModernButton>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className={`p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-red-900/30 border-red-700/50 text-red-400'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          {success && (
            <div className={`p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-green-50 border-green-200 text-green-600'
            }`}>
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ModernInput
              label="اسم الشركة"
              type="text"
              value={actualFormData.name}
              onChange={(e) => actualSetFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسم الشركة..."
              required
            />

            <ModernInput
              label="معرف الشركة"
              type="text"
              value={actualFormData.companyId || ''}
              onChange={(e) => actualSetFormData(prev => ({ ...prev, companyId: e.target.value }))}
              placeholder="COMP001"
              helperText="اختياري - يمكنك تركه فارغاً"
            />
          </div>

          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              نوع التعامل
              <span className="text-red-500 mr-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  type="radio"
                  name="paymentType"
                  value="cash"
                  checked={actualFormData.paymentType === 'cash'}
                  onChange={() => actualSetFormData(prev => ({ ...prev, paymentType: 'cash' }))}
                  className="peer sr-only"
                />
                <div className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  actualFormData.paymentType === 'cash'
                    ? theme === 'dark'
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-green-500 bg-green-50'
                    : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <div className={`p-2 rounded-lg ${
                    actualFormData.paymentType === 'cash'
                      ? theme === 'dark'
                        ? 'bg-green-500/30'
                        : 'bg-green-100'
                      : theme === 'dark'
                        ? 'bg-gray-700'
                        : 'bg-gray-100'
                  }`}>
                    <DollarSign className={`w-5 h-5 ${
                      actualFormData.paymentType === 'cash'
                        ? 'text-green-500'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className={`font-bold ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>نقدي</div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>دفع فوري</div>
                  </div>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="paymentType"
                  value="credit"
                  checked={actualFormData.paymentType === 'credit'}
                  onChange={() => actualSetFormData(prev => ({ ...prev, paymentType: 'credit' }))}
                  className="peer sr-only"
                />
                <div className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  actualFormData.paymentType === 'credit'
                    ? theme === 'dark'
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-orange-500 bg-orange-50'
                    : theme === 'dark'
                      ? 'border-gray-600 hover:border-gray-500'
                      : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <div className={`p-2 rounded-lg ${
                    actualFormData.paymentType === 'credit'
                      ? theme === 'dark'
                        ? 'bg-orange-500/30'
                        : 'bg-orange-100'
                      : theme === 'dark'
                        ? 'bg-gray-700'
                        : 'bg-gray-100'
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      actualFormData.paymentType === 'credit'
                        ? 'text-orange-500'
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className={`font-bold ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>آجل</div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>دفع مؤجل</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ModernInput
              label="رقم الهاتف"
              type="tel"
              value={actualFormData.phone}
              onChange={(e) => actualSetFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="07700000000"
              icon={<Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />}
            />

            <ModernInput
              label="البريد الإلكتروني"
              type="email"
              value={actualFormData.website}
              onChange={(e) => actualSetFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="example@company.com"
              icon={<Mail className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />}
            />
          </div>

          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              مجموعة واتساب
            </label>
            {selectedWhatsAppGroup ? (
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-green-500/20 border-green-700'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-green-500/30' : 'bg-green-100'
                  }`}>
                    <Users className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <div className={`font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>{selectedWhatsAppGroup.name}</div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>{selectedWhatsAppGroup.id}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWhatsAppGroup(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-red-500/20 text-red-400'
                      : 'hover:bg-red-100 text-red-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWhatsAppSearch(true)}
                className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-600 hover:border-green-500 hover:bg-green-500/10 text-gray-400 hover:text-green-400'
                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-500 hover:text-green-600'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span>اختيار مجموعة واتساب</span>
              </button>
            )}
          </div>

          <ModernInput
            label="التفاصيل"
            value={actualFormData.details}
            onChange={(e) => actualSetFormData(prev => ({ ...prev, details: e.target.value }))}
            placeholder="أي تفاصيل إضافية..."
            multiline
            rows={4}
          />
        </form>
      </ModernModal>

      {/* WhatsApp Group Search Modal */}
      {showWhatsAppSearch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setShowWhatsAppSearch(false)}>
          <div className={`rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <Users className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                </div>
                <h3 className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>اختيار مجموعة واتساب</h3>
              </div>
              <button
                onClick={() => setShowWhatsAppSearch(false)}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedAccount ? (
              <div className={`p-4 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                لم يتم اختيار حساب واتساب. يرجى اختيار حساب من القائمة العلوية أولاً.
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={whatsAppSearchQuery}
                    onChange={(e) => setWhatsAppSearchQuery(e.target.value)}
                    placeholder="البحث عن مجموعة..."
                    className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <Search className={`w-5 h-5 absolute right-4 top-3.5 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </div>

                <div className={`max-h-64 overflow-y-auto border rounded-xl ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  {isLoadingGroups ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className={`p-8 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      لم يتم العثور على مجموعات
                    </div>
                  ) : (
                    filteredGroups.map(group => (
                      <div
                        key={group.id}
                        className={`flex items-center p-4 cursor-pointer transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedWhatsAppGroup({
                            id: group.id,
                            name: group.name
                          });
                          setShowWhatsAppSearch(false);
                        }}
                      >
                        <div className={`p-2 rounded-lg mr-3 ${
                          theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`} />
                        </div>
                        <div>
                          <div className={`font-medium ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>{group.name}</div>
                          <div className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>{group.participants || '?'} مشارك</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AddCompanyModal;
