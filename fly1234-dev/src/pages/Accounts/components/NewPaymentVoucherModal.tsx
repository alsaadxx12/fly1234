import React, { useState, useEffect } from 'react';
import { ArrowUpLeft, DollarSign, Building2, Phone, FileText, Check, Loader2, TriangleAlert as AlertTriangle, Box, CreditCard, Zap } from 'lucide-react';
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
import ModernModal from '../../../components/ModernModal';

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

  const Header = (
    <div className="flex items-center justify-between w-full h-10 px-0 translate-y-[-4px]">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
          <ArrowUpLeft className="w-5 h-5" />
        </div>
        <div className="font-black text-sm uppercase tracking-wider opacity-60">
          Payment #{isLoadingInvoiceNumber ? '...' : nextInvoiceNumber}
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${formData.currency === 'USD'
            ? 'bg-emerald-500 text-white shadow-md scale-105'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>USD</span>
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${formData.currency === 'IQD'
            ? 'bg-orange-500 text-white shadow-md scale-105'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>IQD</span>
        </button>
      </div>
    </div>
  );

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      headerContent={Header}
      title=""
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>حفظ السند</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3 border border-red-200 dark:border-red-800 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="font-black">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Right Side: Beneficiary and Details */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>الجهة المستلمة</span>
              </label>
              <BeneficiarySelector
                value={formData.companyName}
                onChange={handleCompanySelect}
                companies={companies}
                placeholder="ابحث عن شركة أو عميل..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>رقم الهاتف</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full h-11 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-gray-900 dark:text-white transition-all text-sm font-bold"
                  placeholder="07xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                  <Box className="w-3.5 h-3.5" />
                  <span>من صندوق</span>
                </label>
                <select
                  value={formData.safeId}
                  onChange={(e) => {
                    const selectedSafe = safes.find(safe => safe.id === e.target.value);
                    setFormData(prev => ({ ...prev, safeId: e.target.value, safeName: selectedSafe?.name || '' }));
                  }}
                  className="w-full h-11 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-gray-900 dark:text-white transition-all text-sm font-bold outline-none cursor-pointer"
                  required
                >
                  <option value="">اختر الصندوق...</option>
                  {safes.map(safe => (<option key={safe.id} value={safe.id}>{safe.name}</option>))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                <FileText className="w-3.5 h-3.5" />
                <span>ملاحظات الدفع</span>
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-gray-900 dark:text-white transition-all text-sm font-bold resize-none h-24"
                placeholder="اكتب الغرض من الدفع..."
              />
            </div>
          </div>

          {/* Left Side: Amount and Exchange Info */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">إجمالي المبلغ المدفوع</label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.amount ? new Intl.NumberFormat().format(parseFloat(formData.amount)) : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/,/g, '');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData(prev => ({ ...prev, amount: val }));
                    }
                  }}
                  className={`w-full h-20 text-center px-4 rounded-2xl border-2 transition-all text-4xl font-black ${formData.currency === 'USD'
                    ? 'border-emerald-100 bg-emerald-50/30 text-emerald-600 focus:border-emerald-500 dark:border-emerald-900/40 dark:bg-emerald-900/10'
                    : 'border-orange-100 bg-orange-50/30 text-orange-600 focus:border-orange-500 dark:border-orange-900/40 dark:bg-orange-900/10'
                    }`}
                  placeholder="0"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {formData.currency === 'USD' && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-between mb-2 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter leading-none mb-1">Exchange Rate</p>
                    <p className="text-lg font-black text-blue-800 dark:text-blue-300 leading-none">{formData.exchangeRate.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-left font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                  ≈ {(parseFloat(formData.amount || '0') * formData.exchangeRate).toLocaleString()} <span className="text-[10px]">IQD</span>
                </div>
              </div>
            )}
          </div>
        </div>
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
    </ModernModal>
  );
}
