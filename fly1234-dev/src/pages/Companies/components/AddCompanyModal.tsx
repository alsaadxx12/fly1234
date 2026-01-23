import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Building2, DollarSign, CreditCard, Phone, Mail, Hash, Users, Search, X, AlertCircle, Sparkles, Info } from 'lucide-react';
import { CompanyFormData } from '../hooks/useCompanies';
import useWhatsAppGroups from '../../../hooks/useWhatsAppGroups';
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
      setSelectedWhatsAppGroup(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const filteredGroups = React.useMemo(() => {
    if (!whatsAppSearchQuery) return whatsappGroups;
    const query = whatsAppSearchQuery.toLowerCase();
    return whatsappGroups.filter((group: any) =>
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
      if (!actualFormData.name.trim()) {
        throw new Error('يرجى إدخال اسم الشركة');
      }

      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('name', '==', actualFormData.name.trim()));
      const existingCompanies = await getDocs(q);

      if (!existingCompanies.empty) {
        throw new Error('يوجد شركة بهذا الاسم بالفعل');
      }

      const companyData = {
        name: actualFormData.name.trim(),
        paymentType: actualFormData.paymentType,
        companyId: actualFormData.companyId || null,
        whatsAppGroupId: selectedWhatsAppGroup?.id || actualFormData.whatsAppGroupId || null,
        whatsAppGroupName: selectedWhatsAppGroup?.name || actualFormData.whatsAppGroupName || null,
        phone: actualFormData.phone || null,
        website: actualFormData.website || null,
        details: actualFormData.details || null,
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
    } catch (error: any) {
      console.error('Error adding company:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة الشركة');
    } finally {
      setLocalIsSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (selectedWhatsAppGroup) {
      actualSetFormData(prev => ({
        ...prev,
        whatsAppGroupId: selectedWhatsAppGroup.id,
        whatsAppGroupName: selectedWhatsAppGroup.name
      }));
    }

    if (onSubmit) {
      const successResult = await onSubmit(e!);
      if (successResult) {
        onClose();
      }
    }
    else {
      await handleLocalSubmit(e!);
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة شركة جديدة"
      description="قم بتعبئة بيانات الشركة بدقة لضمان تكامل الحسابات والات شعارات"
      icon={<Building2 className="w-8 h-8" />}
      iconColor="blue"
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-3 px-1">
          <ModernButton
            type="button"
            variant="secondary"
            onClick={onClose}
            className="px-8 py-3.5"
          >
            {t('cancel')}
          </ModernButton>
          <ModernButton
            type="submit"
            variant="primary"
            loading={isSubmitting || localIsSubmitting}
            onClick={() => handleSubmit()}
            className="px-12 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            إضافة الشركة
          </ModernButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">
        {/* Messages */}
        {(error || success) && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {error && (
              <div className={`p-4 rounded-2xl border flex items-center gap-4 ${theme === 'dark' ? 'bg-red-900/30 border-red-700/50 text-red-100' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                <div className="p-2 bg-red-500/20 rounded-xl"><X className="w-5 h-5 text-red-500" /></div>
                <span className="font-black text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className={`p-4 rounded-2xl border flex items-center gap-4 ${theme === 'dark' ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-100' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                <div className="p-2 bg-emerald-500/20 rounded-xl"><Sparkles className="w-5 h-5 text-emerald-500" /></div>
                <span className="font-black text-sm">{success}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Main Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <ModernInput
                label="اسم الشركة"
                type="text"
                value={actualFormData.name}
                onChange={(e) => actualSetFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="اسم الشركة الرسمي..."
                required
                icon={<Building2 className="w-5 h-5 opacity-40" />}
                iconPosition="right"
              />

              <ModernInput
                label="يوزر فلاي (ID)"
                type="text"
                value={actualFormData.companyId || ''}
                onChange={(e) => actualSetFormData(prev => ({ ...prev, companyId: e.target.value }))}
                placeholder="fly-user-001"
                icon={<Hash className="w-5 h-5 opacity-40" />}
                iconPosition="right"
                helperText="اختياري - يوزر فلاي الخاص بالشركة لتسهيل التتبع"
              />
            </div>

            <div className="space-y-4">
              <label className={`block text-sm font-black tracking-tight ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>نظام الدفع</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="group relative cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="cash"
                    checked={actualFormData.paymentType === 'cash'}
                    onChange={() => actualSetFormData(prev => ({ ...prev, paymentType: 'cash' }))}
                    className="sr-only"
                  />
                  <div className={`h-full flex flex-col gap-4 p-5 rounded-[2rem] border-2 transition-all duration-300 ${actualFormData.paymentType === 'cash' ? 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/5' : theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-gray-100 bg-gray-50/50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className={`p-4 rounded-2xl ${actualFormData.paymentType === 'cash' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <DollarSign className="w-7 h-7" />
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${actualFormData.paymentType === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}>
                        {actualFormData.paymentType === 'cash' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                      </div>
                    </div>
                    <div>
                      <p className={`font-black text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>نقدي (Cash)</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">تسوية فورية</p>
                    </div>
                  </div>
                </label>

                <label className="group relative cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="credit"
                    checked={actualFormData.paymentType === 'credit'}
                    onChange={() => actualSetFormData(prev => ({ ...prev, paymentType: 'credit' }))}
                    className="sr-only"
                  />
                  <div className={`h-full flex flex-col gap-4 p-5 rounded-[2rem] border-2 transition-all duration-300 ${actualFormData.paymentType === 'credit' ? 'border-orange-500 bg-orange-500/5 ring-4 ring-orange-500/5' : theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-gray-100 bg-gray-50/50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className={`p-4 rounded-2xl ${actualFormData.paymentType === 'credit' ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${actualFormData.paymentType === 'credit' ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}>
                        {actualFormData.paymentType === 'credit' && <div className="w-3 h-3 bg-orange-500 rounded-full" />}
                      </div>
                    </div>
                    <div>
                      <p className={`font-black text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>آجل (Credit)</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">حساب مفتوح</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModernInput
                label="رقم الهاتف"
                type="tel"
                value={actualFormData.phone}
                onChange={(e) => actualSetFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0770 000 0000"
                icon={<Phone className="w-5 h-5 opacity-40" />}
                iconPosition="right"
              />
              <ModernInput
                label="الموقع / الإيميل"
                type="text"
                value={actualFormData.website}
                onChange={(e) => actualSetFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="www.company.com"
                icon={<Mail className="w-5 h-5 opacity-40" />}
                iconPosition="right"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className={`block text-sm font-black tracking-tight ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>ربط الواتساب</label>
              <div className={`p-6 rounded-[2.5rem] border-2 border-dashed flex flex-col min-h-[440px] ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-900/30' : 'bg-emerald-50/20 border-emerald-100 shadow-xl shadow-emerald-500/5'
                }`}>
                {selectedWhatsAppGroup && !showWhatsAppSearch ? (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col justify-center text-center">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/20 shadow-lg">
                      <Users className="w-12 h-12 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedWhatsAppGroup.name}</h4>
                      <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        مجموعة متصلة بنجاح
                      </div>
                    </div>
                    <div className="pt-8 space-y-3">
                      <button type="button" onClick={() => setShowWhatsAppSearch(true)} className="w-full py-4 rounded-2xl border-2 border-emerald-100 bg-white text-emerald-600 font-black text-sm hover:bg-emerald-50 transition-all">تغيير المجموعة</button>
                      <button type="button" onClick={() => { setSelectedWhatsAppGroup(null); actualSetFormData(prev => ({ ...prev, whatsAppGroupId: null, whatsAppGroupName: null })); }} className="w-full py-4 rounded-2xl text-red-600 font-black text-xs opacity-60 hover:opacity-100 transition-all">إلغاء الربط</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex flex-col h-full">
                    <div className="relative group">
                      <input
                        type="text"
                        value={whatsAppSearchQuery}
                        onChange={(e) => { setWhatsAppSearchQuery(e.target.value); setShowWhatsAppSearch(true); }}
                        placeholder="ابحث عن اسم المجموعة..."
                        className={`w-full px-6 py-4 pr-14 rounded-2xl border-2 focus:outline-none transition-all text-sm font-black ${theme === 'dark'
                          ? 'bg-gray-950/50 border-gray-800 text-white placeholder-gray-600 focus:border-emerald-500/50'
                          : 'bg-white border-emerald-100 text-gray-900 placeholder-gray-400 focus:border-emerald-500/50'
                          }`}
                      />
                      <Search className={`w-6 h-6 absolute right-5 top-4 transition-colors ${theme === 'dark' ? 'text-gray-700' : 'text-emerald-300'
                        }`} />
                    </div>

                    <div className={`flex-1 overflow-y-auto rounded-[1.5rem] border-2 p-2 space-y-1 ${theme === 'dark' ? 'bg-gray-950/80 border-gray-800' : 'bg-white border-emerald-50 shadow-inner'
                      }`}>
                      {!selectedAccount ? (
                        <div className="p-10 text-center space-y-4">
                          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto opacity-30" />
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-relaxed">يرجى اختيار حساب واتساب نشط أولاً</p>
                        </div>
                      ) : isLoadingGroups ? (
                        <div className="p-16 text-center animate-pulse"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                      ) : filteredGroups.length === 0 ? (
                        <div className="p-16 text-center text-xs text-gray-400 font-black opacity-40">لا توجد مجموعات حالياً</div>
                      ) : (
                        filteredGroups.slice(0, 8).map((group: any) => (
                          <div key={group.id} className={`flex items-center gap-4 p-4 cursor-pointer transition-all rounded-2xl ${theme === 'dark' ? 'hover:bg-emerald-500/10' : 'hover:bg-emerald-50'
                            }`} onClick={() => { setSelectedWhatsAppGroup({ id: group.id, name: group.name }); setShowWhatsAppSearch(false); }}>
                            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-emerald-100'}`}><Users className="w-5 h-5 text-emerald-600" /></div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{group.name}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase">{group.participants || '0'} مشارك</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className={`mt-auto p-4 rounded-2xl flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-white/60'}`}>
                  <Info className="w-4 h-4 text-emerald-600 opacity-60" />
                  <p className="text-[9px] text-emerald-800/60 font-black uppercase tracking-widest leading-relaxed">سيصل التنبيه عند تعديل القيود المالية مباشرة للمجموعة المربوطة</p>
                </div>
              </div>
            </div>

            <ModernInput
              label="تفاصيل وملاحظات"
              value={actualFormData.details}
              onChange={(e) => actualSetFormData(prev => ({ ...prev, details: e.target.value }))}
              placeholder="اكتب ملاحظاتك هنا..."
              multiline
              rows={4}
              icon={<Info className="w-5 h-5 opacity-40" />}
              iconPosition="right"
            />
          </div>
        </div>
      </form>
    </ModernModal>
  );
};

export default AddCompanyModal;
