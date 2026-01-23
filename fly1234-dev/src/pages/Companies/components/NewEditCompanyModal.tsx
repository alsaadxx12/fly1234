import { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { X, DollarSign, CreditCard, Phone, Globe, FileText, Hash, Users, Search, MessageCircle, Save, Info, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { CompanyFormData, Company } from '../hooks/useCompanies';
import useWhatsAppGroups from '../../../hooks/useWhatsAppGroups';

interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: string | number;
}

interface NewEditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdate: (id: string, data: Partial<Company>) => Promise<void>;
  isSubmitting: boolean;
}

export default function NewEditCompanyModal({
  isOpen,
  onClose,
  company,
  onUpdate,
  isSubmitting
}: NewEditCompanyModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    paymentType: 'cash',
    companyId: '',
    whatsAppGroupId: null,
    whatsAppGroupName: null,
    phone: '',
    website: '',
    details: ''
  });

  const [showWhatsAppSearch, setShowWhatsAppSearch] = useState(false);
  const [whatsAppSearchQuery, setWhatsAppSearchQuery] = useState('');
  const [selectedWhatsAppGroup, setSelectedWhatsAppGroup] = useState<WhatsAppGroup | null>(null);

  const selectedAccount = window.selectedWhatsAppAccount;

  const {
    whatsappGroups,
    isLoading: isLoadingGroups,
    fetchGroups
  } = useWhatsAppGroups(false, selectedAccount);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        paymentType: company.paymentType || 'cash',
        companyId: company.companyId || '',
        whatsAppGroupId: company.whatsAppGroupId || null,
        whatsAppGroupName: company.whatsAppGroupName || null,
        phone: company.phone || '',
        website: company.website || '',
        details: company.details || ''
      });
      setSelectedWhatsAppGroup(company.whatsAppGroupId ? {
        id: company.whatsAppGroupId,
        name: company.whatsAppGroupName || 'المجموعة الحالية'
      } : null);
    }
  }, [company]);

  useEffect(() => {
    if (showWhatsAppSearch && selectedAccount) {
      fetchGroups();
    }
  }, [showWhatsAppSearch, selectedAccount, fetchGroups]);

  const filteredGroups = useMemo(() => {
    if (!whatsAppSearchQuery) return whatsappGroups;
    const query = whatsAppSearchQuery.toLowerCase();
    return whatsappGroups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.id.toLowerCase().includes(query)
    );
  }, [whatsappGroups, whatsAppSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const updateData = {
      ...formData,
      whatsAppGroupId: selectedWhatsAppGroup?.id || null,
      whatsAppGroupName: selectedWhatsAppGroup?.name || null,
    };

    await onUpdate(company.id, updateData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-500/10 rounded-2xl">
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">تعديل بيانات الشركة</h2>
              <p className="text-sm text-gray-500 font-bold mt-1">تحديث المعلومات الأساسية وإعدادات الواتساب</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-500/10 hover:text-red-500 text-gray-400 rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8" dir="rtl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Right Column: Main Info */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 dark:text-gray-400 mr-1">اسم الشركة</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="اسم الشركة الرسمي..."
                      required
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold group-hover:border-gray-200 dark:group-hover:border-gray-700"
                    />
                    <Building2 className="absolute left-5 top-4 w-5 h-5 text-gray-400 opacity-40" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 dark:text-gray-400 mr-1">يوزر فلاي (ID)</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      placeholder="fly-user-001"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold group-hover:border-gray-200 dark:group-hover:border-gray-700"
                    />
                    <Hash className="absolute left-5 top-4 w-5 h-5 text-gray-400 opacity-40" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-600 dark:text-gray-400">نظام الدفع</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'cash' })}
                    className={`flex flex-col gap-3 p-5 rounded-[2rem] border-2 transition-all duration-300 text-right ${formData.paymentType === 'cash'
                        ? 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/5'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                      }`}
                  >
                    <div className={`p-3 w-fit rounded-xl ${formData.paymentType === 'cash' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">نقدي (Cash)</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">تسوية فورية</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'credit' })}
                    className={`flex flex-col gap-3 p-5 rounded-[2rem] border-2 transition-all duration-300 text-right ${formData.paymentType === 'credit'
                        ? 'border-orange-500 bg-orange-500/5 ring-4 ring-orange-500/5'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                      }`}
                  >
                    <div className={`p-3 w-fit rounded-xl ${formData.paymentType === 'credit' ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white">آجل (Credit)</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">حساب مفتوح</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 dark:text-gray-400 mr-1">رقم الهاتف</label>
                  <div className="relative group">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0770 000 0000"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold"
                    />
                    <Phone className="absolute left-5 top-4 w-5 h-5 text-gray-400 opacity-40" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 dark:text-gray-400 mr-1">الموقع / الإيميل</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.company.com"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold"
                    />
                    <Globe className="absolute left-5 top-4 w-5 h-5 text-gray-400 opacity-40" />
                  </div>
                </div>
              </div>
            </div>

            {/* Left Column: WhatsApp & Details */}
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-600 dark:text-gray-400">ربط الواتساب</label>
                <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/[0.02] rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/30 min-h-[400px] flex flex-col">
                  {selectedWhatsAppGroup && !showWhatsAppSearch ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in scale-95">
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-4 border-2 border-emerald-500/20">
                        <Users className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{selectedWhatsAppGroup.name}</h4>
                      <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">مربوط حالياً</span>

                      <div className="mt-8 w-full space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowWhatsAppSearch(true)}
                          className="w-full py-4 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 font-black text-sm hover:bg-emerald-50 dark:hover:bg-white/5 transition-all"
                        >
                          تغيير المجموعة
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedWhatsAppGroup(null)}
                          className="w-full py-2 text-red-500 font-bold text-xs opacity-60 hover:opacity-100 transition-all underline underline-offset-4"
                        >
                          إلغاء الربط
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="relative group">
                        <input
                          type="text"
                          value={whatsAppSearchQuery}
                          onChange={(e) => { setWhatsAppSearchQuery(e.target.value); setShowWhatsAppSearch(true); }}
                          placeholder="ابحث عن اسم المجموعة..."
                          className="w-full px-12 py-4 bg-white dark:bg-gray-950 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-2xl outline-none focus:border-emerald-500 transition-all font-black text-sm"
                        />
                        <Search className="absolute right-5 top-4 w-5 h-5 text-emerald-300" />
                      </div>

                      <div className="flex-1 overflow-y-auto bg-white/50 dark:bg-black/20 rounded-2xl border-2 border-emerald-50/50 dark:border-emerald-900/20 p-2 space-y-1 scrollbar-hide">
                        {!selectedAccount ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                            <AlertCircle className="w-10 h-10 text-amber-500 opacity-30" />
                            <p className="text-[10px] text-gray-500 font-black leading-relaxed">يرجى اختيار حساب واتساب نشط أولاً</p>
                          </div>
                        ) : isLoadingGroups ? (
                          <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                        ) : filteredGroups.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">لا توجد مجموعات</div>
                        ) : (
                          filteredGroups.slice(0, 10).map((group: any) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => { setSelectedWhatsAppGroup(group); setShowWhatsAppSearch(false); }}
                              className="w-full flex items-center gap-4 p-4 hover:bg-emerald-500/10 rounded-2xl transition-all text-right group"
                            >
                              <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Users className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-black text-sm text-gray-900 dark:text-gray-200 truncate">{group.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{group.participants || 0} مشارك</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-4 rounded-2xl bg-white/50 dark:bg-white/5 flex gap-3 items-center">
                    <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-[9px] text-emerald-800 dark:text-emerald-400/60 font-black leading-relaxed">تلقي تنبيهات مالية فورية للمجموعة</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-gray-600 dark:text-gray-400 mr-1">تفاصيل وملاحظات</label>
                <div className="relative group">
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder="اكتب ملاحظاتك الإضافية هنا..."
                    rows={4}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] focus:border-blue-500 outline-none transition-all font-bold resize-none"
                  />
                  <FileText className="absolute left-5 top-5 w-5 h-5 text-gray-400 opacity-40" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ التعديلات
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-10 py-5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-3xl font-black text-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
