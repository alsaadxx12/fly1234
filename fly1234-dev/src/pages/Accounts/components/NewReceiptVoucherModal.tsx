import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowDownRight, X, DollarSign, Building2, Phone, FileText, Check, Loader2, TriangleAlert as AlertTriangle, Box, CreditCard, Zap, Plane, CircleAlert as AlertCircle, ArrowUpLeft } from 'lucide-react';
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

export default function NewReceiptVoucherModal({ isOpen, onClose, settings }: Props) {
  useLanguage();
  const { employee } = useAuth();
  const { createVoucher, nextInvoiceNumber, isLoadingInvoiceNumber } = useVouchers({ type: 'receipt' });
  const { currentRate } = useExchangeRate();
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyId: '',
    receivedAmount: '',
    currency: 'IQD' as 'IQD' | 'USD',
    exchangeRate: currentRate,
    phone: '',
    details: '',
    safeId: '',
    safeName: '',
    gates: '',
    internal: '',
    external: '',
    fly: '',
    whatsAppGroupId: null as string | null,
    whatsAppGroupName: null as string | null,
    entityType: 'company' as 'company' | 'client' | 'expense'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safes, setSafes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [distributionError, setDistributionError] = useState<string | null>(null);

  const formatNumber = (numStr: string | number): string => {
    if (numStr === '' || numStr === null || numStr === undefined) return '';
    const num = typeof numStr === 'string' ? parseFloat(numStr.replace(/,/g, '')) : numStr;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const parseNumber = (str: string): string => {
    return str.replace(/,/g, '');
  };

  useEffect(() => {
    const fetchSafes = async () => {
      if (!isOpen || !employee) return;

      try {
        const safesRef = collection(db, 'safes');
        const snapshot = await getDocs(safesRef);

        let safesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        setSafes(safesData);

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

    fetchSafes();
  }, [isOpen, employee]);

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

  useEffect(() => {
    if (isOpen) {
      const employeeSafe = employee?.safeId ? safes.find(safe => safe.id === employee.safeId) : null;
      setFormData({
        companyName: '',
        companyId: '',
        receivedAmount: '',
        currency: 'IQD',
        exchangeRate: currentRate,
        phone: '',
        details: '',
        safeId: employee?.safeId || '',
        safeName: employeeSafe?.name || '',
        gates: '',
        internal: '',
        external: '',
        fly: '',
        whatsAppGroupId: null,
        whatsAppGroupName: null,
        entityType: 'company'
      });
      setError(null);
      setIsAddCompanyModalOpen(false);
    }
  }, [isOpen, employee, safes, currentRate]);

  useEffect(() => {
    const receivedAmount = parseFloat(parseNumber(formData.receivedAmount)) || 0;
    const internal = parseFloat(parseNumber(formData.internal)) || 0;
    const external = parseFloat(parseNumber(formData.external)) || 0;
    const fly = parseFloat(parseNumber(formData.fly)) || 0;

    const totalDistribution = internal + external + fly;

    if (totalDistribution > receivedAmount) {
      setDistributionError('مجموع التقسيمات يتجاوز المبلغ المستلم');
    } else {
      setDistributionError(null);
    }

    const calculatedGates = receivedAmount - totalDistribution;
    setFormData(prev => ({
      ...prev,
      gates: calculatedGates >= 0 ? String(calculatedGates) : '0'
    }));

  }, [formData.receivedAmount, formData.internal, formData.external, formData.fly]);

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedValue = parseNumber(value);

    if (!isNaN(Number(parsedValue)) || parsedValue === '') {
      const receivedAmount = parseFloat(parseNumber(formData.receivedAmount)) || 0;
      const internal = parseFloat(parseNumber(formData.internal)) || 0;
      const external = parseFloat(parseNumber(formData.external)) || 0;
      const fly = parseFloat(parseNumber(formData.fly)) || 0;
      const newValue = parseFloat(parsedValue) || 0;

      let otherSum = 0;
      if (name === 'internal') otherSum = external + fly;
      if (name === 'external') otherSum = internal + fly;
      if (name === 'fly') otherSum = internal + external;

      if (name !== 'receivedAmount' && newValue + otherSum > receivedAmount) {
        setDistributionError('مجموع التقسيمات لا يمكن أن يتجاوز المبلغ المستلم');
      } else {
        setDistributionError(null);
        setFormData(prev => ({
          ...prev,
          [name]: parsedValue
        }));
      }
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!formData.companyName) throw new Error('يرجى إدخال اسم الشركة');
      const receivedAmount = parseFloat(parseNumber(formData.receivedAmount));
      if (isNaN(receivedAmount) || receivedAmount <= 0) throw new Error('يرجى إدخال مبلغ صحيح');
      if (!formData.safeId) throw new Error('يرجى اختيار الصندوق');
      if (distributionError) throw new Error(distributionError);

      const selectedSafe = safes.find(safe => safe.id === formData.safeId);
      if (!selectedSafe) throw new Error('الصندوق غير موجود');

      const voucherData = {
        type: 'receipt',
        companyName: formData.companyName,
        companyId: formData.companyId || null,
        amount: receivedAmount,
        currency: formData.currency,
        exchangeRate: formData.currency === 'USD' ? (formData.exchangeRate || currentRate) : 1,
        phone: formData.phone || null,
        details: formData.details || null,
        safeId: formData.safeId,
        safeName: selectedSafe.name,
        gates: parseFloat(parseNumber(formData.gates)) || 0,
        internal: parseFloat(parseNumber(formData.internal)) || 0,
        external: parseFloat(parseNumber(formData.external)) || 0,
        fly: parseFloat(parseNumber(formData.fly)) || 0,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        employeeId: employee.id || '',
        employeeName: employee.name,
        entityType: formData.entityType,
      };

      await createVoucher(voucherData);
      onClose();

    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء إنشاء سند القبض');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200 safe-area-inset">
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl mx-2 sm:mx-4 max-h-[96vh] sm:max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-800 via-violet-800 to-purple-900 text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30 flex-shrink-0">
                <ArrowDownRight className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">سند قبض مالي</h3>
                <p className="text-xs sm:text-sm text-purple-200 mt-0.5 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-md font-mono">رقم {isLoadingInvoiceNumber ? '...' : nextInvoiceNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 p-1 bg-white/10 rounded-xl flex-1 sm:flex-none">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${formData.currency === 'USD'
                    ? 'bg-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>$ دولار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${formData.currency === 'IQD'
                    ? 'bg-orange-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>دينار</span>
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all h-10 w-10 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3 border border-red-200 dark:border-red-800 text-sm animate-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                    <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>الجهة (الشركة / العميل)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="h-[52px]">
                    <BeneficiarySelector
                      value={formData.companyName}
                      onChange={handleCompanySelect}
                      companies={companies}
                      placeholder="ابحث عن شركة أو عميل..."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                      <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span>رقم الهاتف</span>
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-[52px] px-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all text-base"
                      placeholder="964xxxxxxxxx"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                      <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>الصندوق</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.safeId}
                      onChange={(e) => {
                        const selectedSafe = safes.find(safe => safe.id === e.target.value);
                        setFormData(prev => ({ ...prev, safeId: e.target.value, safeName: selectedSafe?.name || '' }));
                      }}
                      className="w-full h-[52px] px-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm transition-all disabled:opacity-60 text-base"
                      disabled={!!employee?.safeId}
                      required
                    >
                      <option value="">اختر الصندوق...</option>
                      {safes.map(safe => (<option key={safe.id} value={safe.id}>{safe.name}</option>))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff5f0a]" />
                    <span>تفاصيل إضافية</span>
                  </label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm resize-none text-base h-20 sm:h-24"
                    placeholder="اكتب ملاحظات السند هنا..."
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                    <span>المبلغ المقبوض</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center h-16 sm:h-[72px]">
                    <div className={`h-full flex items-center justify-center px-4 rounded-r-xl font-black text-white text-sm sm:text-base ${formData.currency === 'USD' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                      {formData.currency === 'USD' ? 'دولار' : 'دينار'}
                    </div>
                    <input
                      type="text"
                      name="receivedAmount"
                      value={formatNumber(formData.receivedAmount)}
                      onChange={handleNumericChange}
                      className={`w-full h-full text-center px-4 py-3 border-y-2 border-l-2 rounded-l-xl focus:outline-none focus:ring-2 shadow-sm transition-all text-2xl sm:text-4xl font-black ${formData.currency === 'USD'
                        ? 'border-emerald-300 dark:border-emerald-600 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100'
                        : 'border-orange-300 dark:border-orange-600 focus:ring-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                        }`}
                      placeholder="0"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-black text-gray-800 dark:text-gray-100 text-lg">تحصيص المبلغ</h4>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl ${distributionError ? 'bg-red-50/50 dark:bg-red-900/10 border-2 border-red-200' : 'bg-gray-100/50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700'}`}>
                    <div className="space-y-1.5 font-bold">
                      <label className="flex items-center gap-1.5 text-[0.7rem] font-black text-gray-500 dark:text-gray-400">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span>{settings.gatesColumnLabel || 'جات'}</span>
                      </label>
                      <input
                        type="text"
                        name="gates"
                        readOnly
                        value={formatNumber(formData.gates)}
                        className="w-full h-12 px-3 text-base font-black text-center border-2 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-700"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <label className="flex items-center gap-1.5 text-[0.7rem] font-black text-gray-500 dark:text-gray-400">
                        <ArrowDownRight className="w-3.5 h-3.5 text-blue-500" />
                        <span>{settings.internalColumnLabel || 'داخلي'}</span>
                      </label>
                      <input
                        type="text"
                        name="internal"
                        value={formatNumber(formData.internal)}
                        onChange={handleNumericChange}
                        className="w-full h-12 px-3 text-base font-black text-center border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border-gray-200 dark:border-gray-700 transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <label className="flex items-center gap-1.5 text-[0.7rem] font-black text-gray-500 dark:text-gray-400">
                        <ArrowUpLeft className="w-3.5 h-3.5 text-purple-500" />
                        <span>{settings.externalColumnLabel || 'خارجي'}</span>
                      </label>
                      <input
                        type="text"
                        name="external"
                        value={formatNumber(formData.external)}
                        onChange={handleNumericChange}
                        className="w-full h-12 px-3 text-base font-black text-center border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border-gray-200 dark:border-gray-700 transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <label className="flex items-center gap-1.5 text-[0.7rem] font-black text-gray-500 dark:text-gray-400">
                        <Plane className="w-3.5 h-3.5 text-green-500" />
                        <span>{settings.flyColumnLabel || 'فلاي'}</span>
                      </label>
                      <input
                        type="text"
                        name="fly"
                        value={formatNumber(formData.fly)}
                        onChange={handleNumericChange}
                        className="w-full h-12 px-3 text-base font-black text-center border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border-gray-200 dark:border-gray-700 transition-all"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  {distributionError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-xs font-black">{distributionError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
            >
              إلغاء العملية
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-indigo-500/20 transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>إتمام وحفظ السند</span>
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
