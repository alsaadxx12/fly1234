import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowUpLeft, X, DollarSign, Building2, Phone, FileText, Check, Loader2, TriangleAlert as AlertTriangle, Box, CreditCard, Zap } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';
import useVouchers from '../hooks/useVouchers';
import AddClientModal from './AddClientModal';
import AddCompanyModal from '../../Companies/components/AddCompanyModal';
import AddExpenseModal from '../../Companies/components/AddExpenseModal';
import BeneficiarySelector from './BeneficiarySelector';

interface Company {
  id: string;
  name: string;
  entityType?: 'company' | 'client' | 'expense';
  whatsAppGroupId?: string;
  whatsAppGroupName?: string;
  phone?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
}

export default function NewPaymentVoucherModal({ isOpen, onClose }: Omit<Props, 'settings'>) {
  useLanguage();
  const { employee } = useAuth();
  const { createVoucher, nextInvoiceNumber, isLoadingInvoiceNumber } = useVouchers({ type: 'payment' });
  const { currentRate } = useExchangeRate();
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyId: '',
    amount: '',
    currency: 'IQD', // USD or IQD
    exchangeRate: currentRate,
    phone: '',
    details: '',
    safeId: '',
    safeName: '',
    whatsAppGroupId: null as string | null,
    whatsAppGroupName: null as string | null,
    entityType: 'company' as 'company' | 'client' | 'expense',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safes, setSafes] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Load safes
  useEffect(() => {
    const fetchSafes = async () => {
      if (!isOpen || !employee) return;

      try {
        const safesRef = collection(db, 'safes');
        const snapshot = await getDocs(safesRef);

        const safesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        setSafes(safesData);

        // Auto-select employee's safe if available
        if (employee.safeId) {
          const employeeSafe = safesData.find(safe => safe.id === employee.safeId);
          if (employeeSafe) {
            setFormData(prev => ({
              ...prev,
              safeId: employeeSafe.id,
              safeName: employeeSafe.name
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching safes:', error);
        setError('فشل في تحميل الصناديق');
      }
    };

    if (isOpen && employee) {
      fetchSafes();
    }
  }, [isOpen]);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const collectionsToFetch = [
          { name: 'companies', type: 'company' },
          { name: 'clients', type: 'client' },
          { name: 'expenses', type: 'expense' }
        ];

        let allEntities: Company[] = [];

        for (const coll of collectionsToFetch) {
          const snapshot = await getDocs(collection(db, coll.name));
          const entities = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            phone: doc.data().phone || '',
            whatsAppGroupId: doc.data().whatsAppGroupId || null,
            whatsAppGroupName: doc.data().whatsAppGroupName || null,
            entityType: coll.type as 'company' | 'client' | 'expense'
          }));
          allEntities = [...allEntities, ...entities];
        }

        setCompanies(allEntities);
      } catch (error) {
        console.error('Error fetching entities:', error);
      }
    };

    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        companyName: '',
        companyId: '',
        amount: '',
        currency: 'IQD',
        exchangeRate: currentRate,
        phone: '',
        details: '',
        safeId: '',
        safeName: '',
        whatsAppGroupId: null,
        whatsAppGroupName: null,
        entityType: 'company',
      });
      setError(null);
    } else {
      // Update exchange rate when modal opens
      setFormData(prev => ({
        ...prev,
        exchangeRate: currentRate
      }));
    }
  }, [isOpen, currentRate]);

  const handleCompanySelect = (name: string, id: string, phone: string, whatsAppGroupId: string | null, whatsAppGroupName: string | null, entityType: 'company' | 'client' | 'expense') => {
    setFormData(prev => ({
      ...prev,
      companyName: name,
      companyId: id,
      phone: phone || '',
      whatsAppGroupId: whatsAppGroupId || null,
      whatsAppGroupName: whatsAppGroupName || null,
      entityType: entityType || 'company'
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      return;
    }

    try {
      // Validate form
      if (!formData.companyName) {
        throw new Error('يرجى إدخال اسم الشركة');
      }

      if (!formData.amount) {
        throw new Error('يرجى إدخال المبلغ');
      }

      if (!formData.safeId) {
        throw new Error('يرجى اختيار الصندوق');
      }

      // Get safe name
      const selectedSafe = safes.find(safe => safe.id === formData.safeId);
      if (!selectedSafe) {
        throw new Error('الصندوق غير موجود');
      }

      // Prepare voucher data
      const voucherData = {
        type: 'payment',
        companyName: formData.companyName,
        companyId: formData.companyId || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        exchangeRate: formData.currency === 'USD' ? formData.exchangeRate : 1,
        phone: formData.phone || null,
        details: formData.details || null,
        safeId: formData.safeId,
        safeName: selectedSafe.name,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        employeeId: employee.id || '',
        employeeName: employee.name,
        entityType: formData.entityType,
      };

      await createVoucher(voucherData);
      onClose();

    } catch (error) {
      console.error('Error creating payment voucher:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء سند الدفع');
      setIsSubmitting(false);
    }
  };


  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200 safe-area-inset" onClick={onClose}>
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl mx-2 sm:mx-4 max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 sm:p-6 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 dark:from-red-700 dark:via-rose-700 dark:to-pink-700 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30 flex-shrink-0">
                <ArrowUpLeft className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">سند دفع مالي جديد</h3>
                <p className="text-sm text-red-100 mt-1 flex items-center gap-2 font-bold">
                  <span className="px-3 py-1 bg-white/20 rounded-lg font-mono tracking-widest uppercase">رقم {isLoadingInvoiceNumber ? '...' : nextInvoiceNumber}</span>
                  <span className="opacity-80 hidden sm:inline">|</span>
                  <span className="opacity-80">إنشاء سند صرف جديد</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-0 left-0 sm:relative p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 duration-300"
            >
              <X className="w-8 h-8 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/10">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Right Side: Beneficiary and Details */}
              <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-8 duration-500">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
                      <Building2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h4 className="font-black text-gray-800 dark:text-gray-100 text-lg">معلومات المستلم</h4>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                      <span>الجهة المستلمة</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="h-[60px]">
                      <BeneficiarySelector
                        value={formData.companyName}
                        onChange={handleCompanySelect}
                        companies={companies}
                        placeholder="ابحث عن شركة، عميل، أو اختر مصروف..."
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                        <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span>رقم الاتصال</span>
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full h-[56px] px-5 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all text-lg font-bold"
                        placeholder="07xxxxxxxx"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                        <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>من صندوق</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.safeId}
                        onChange={(e) => {
                          const selectedSafe = safes.find(safe => safe.id === e.target.value);
                          setFormData(prev => ({ ...prev, safeId: e.target.value, safeName: selectedSafe?.name || '' }));
                        }}
                        className="w-full h-[56px] px-5 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all font-bold text-lg cursor-pointer"
                        required
                      >
                        <option value="">اختر الصندوق...</option>
                        {safes.map(safe => (<option key={safe.id} value={safe.id}>{safe.name}</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-gray-800">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span>ملاحظات الدفع</span>
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all text-lg min-h-[140px] resize-none leading-relaxed"
                    placeholder="اكتب الغرض من الدفع أو أي تفاصيل إضافية هنا..."
                  />
                </div>
              </div>

              {/* Left Side: Amount and Quick Actions */}
              <div className="space-y-8 animate-in slide-in-from-left-8 duration-500 lg:border-r-2 lg:dark:border-gray-800 lg:pr-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="font-black text-gray-800 dark:text-gray-100 text-lg">تحصيص المبلغ</h4>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center justify-between">
                      <span>إجمالي المبلغ المدفوع</span>
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[0.65rem] font-black uppercase">مطلوب</span>
                    </label>
                    <div className="relative group">
                      <div className={`absolute right-0 top-0 h-full w-20 sm:w-24 flex items-center justify-center rounded-r-2xl font-black text-white text-sm sm:text-base transition-all duration-300 shadow-lg z-10 ${formData.currency === 'USD' ? 'bg-emerald-500 text-shadow' : 'bg-orange-500 text-shadow'}`}>
                        {formData.currency === 'USD' ? 'دولار' : 'دينار'}
                      </div>
                      <input
                        type="text"
                        value={formData.amount ? new Intl.NumberFormat().format(parseFloat(formData.amount)) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setFormData(prev => ({ ...prev, amount: val }));
                          }
                        }}
                        className={`w-full h-20 sm:h-[84px] text-center pr-20 sm:pr-24 pl-6 border-2 rounded-2xl focus:outline-none focus:ring-4 shadow-xl transition-all text-3xl sm:text-5xl font-black ${formData.currency === 'USD'
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500/20'
                          : 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 focus:ring-orange-500/20'
                          }`}
                        placeholder="0"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                      className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 font-black ${formData.currency === 'USD'
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 scale-105'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-emerald-300 dark:hover:border-emerald-700'}`}
                    >
                      <DollarSign className="w-5 h-5" />
                      <span className="text-[0.65rem] uppercase tracking-tighter">بالدولار</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
                      className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 font-black ${formData.currency === 'IQD'
                        ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20 scale-105'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-orange-300 dark:hover:border-orange-700'}`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-[0.65rem] uppercase tracking-tighter">بالدينار</span>
                    </button>
                  </div>

                  {formData.currency === 'USD' && (
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-between mb-2 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[0.65rem] font-black text-blue-500 uppercase">سعر الصرف المعتمد</p>
                          <p className="text-lg font-black text-blue-800 dark:text-blue-300">{formData.exchangeRate.toLocaleString()} <span className="text-[0.65rem]">د.ع / $</span></p>
                        </div>
                      </div>
                      <div className="text-left font-mono font-black text-blue-600 dark:text-blue-400">
                        = {(parseFloat(formData.amount || '0') * formData.exchangeRate).toLocaleString()} <span className="text-[0.6rem]">د.ع</span>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border-2 border-red-100 dark:border-red-900 flex items-center gap-3 text-red-600 dark:text-red-400 animate-bounce">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-black">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 bg-white dark:bg-gray-800/80 border-t-2 border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-end gap-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-4 text-sm font-black text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              إلغاء العملية
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-14 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-2xl text-lg font-black transition-all shadow-xl hover:shadow-red-500/20 transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>جاري دفع المبلغ...</span>
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  <span>تأكيد صرف السند</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>


      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onClientAdded={(client) => {
          handleCompanySelect(client.name, client.id, client.phone, null, null, 'client');
        }}
      />

      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        isSubmitting={isSubmitting}
        onCompanyAdded={(company) => {
          handleCompanySelect(company.name, company.id, company.phone, company.whatsAppGroupId, company.whatsAppGroupName, 'company');
        }}
      />

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onExpenseAdded={(expense) => {
          handleCompanySelect(expense.name, expense.id, expense.phone, null, null, 'expense');
        }}
      />
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
