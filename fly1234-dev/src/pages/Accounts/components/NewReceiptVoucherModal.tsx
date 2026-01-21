import React, { useState, useEffect } from 'react';
import { ArrowDownRight, DollarSign, Building2, Phone, FileText, Check, Loader2, TriangleAlert as AlertTriangle, Box, CreditCard, CircleAlert as AlertCircle } from 'lucide-react';
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

export default function NewReceiptVoucherModal({ isOpen, onClose, settings }: Props) {
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

  const Header = (
    <div className="flex items-center justify-between w-full h-10 px-0 translate-y-[-4px]">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
          <ArrowDownRight className="w-5 h-5" />
        </div>
        <div className="font-black text-sm uppercase tracking-wider opacity-60">
          Receipt #{isLoadingInvoiceNumber ? '...' : nextInvoiceNumber}
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
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
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>الجهة المستلم منها</span>
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
                  placeholder="964xxx"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">
                  <Box className="w-3.5 h-3.5" />
                  <span>الصندوق</span>
                </label>
                <select
                  value={formData.safeId}
                  onChange={(e) => {
                    const selectedSafe = safes.find(safe => safe.id === e.target.value);
                    setFormData(prev => ({ ...prev, safeId: e.target.value, safeName: selectedSafe?.name || '' }));
                  }}
                  className="w-full h-11 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-gray-900 dark:text-white transition-all text-sm font-bold outline-none"
                  disabled={!!employee?.safeId}
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
                <span>ملاحظات إضافية</span>
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-gray-900 dark:text-white transition-all text-sm font-bold resize-none h-24"
                placeholder="اكتب تفاصيل إضافية..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-1">المبلغ المقبوض</label>
              <div className="relative group">
                <input
                  type="text"
                  name="receivedAmount"
                  value={formatNumber(formData.receivedAmount)}
                  onChange={handleNumericChange}
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

            <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center px-1">تحصيص المبلغ برمجياً</h4>

              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl border-2 ${distributionError ? 'bg-red-50/30 border-red-100 dark:border-red-900/20' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/20 dark:border-gray-800'}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase text-center block">{settings.gatesColumnLabel || 'جات'}</label>
                  <input type="text" readOnly value={formatNumber(formData.gates)} className="w-full h-10 text-center rounded-lg bg-gray-100 dark:bg-gray-700/50 text-gray-400 font-bold border-0" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-500 uppercase text-center block">{settings.internalColumnLabel || 'داخلي'}</label>
                  <input type="text" name="internal" value={formatNumber(formData.internal)} onChange={handleNumericChange} className="w-full h-10 text-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 font-black text-sm focus:border-blue-500 outline-none" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-purple-500 uppercase text-center block">{settings.externalColumnLabel || 'خارجي'}</label>
                  <input type="text" name="external" value={formatNumber(formData.external)} onChange={handleNumericChange} className="w-full h-10 text-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 font-black text-sm focus:border-purple-500 outline-none" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-green-500 uppercase text-center block">{settings.flyColumnLabel || 'فلاي'}</label>
                  <input type="text" name="fly" value={formatNumber(formData.fly)} onChange={handleNumericChange} className="w-full h-10 text-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 font-black text-sm focus:border-green-500 outline-none" dir="ltr" />
                </div>
              </div>

              {distributionError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-[10px] font-black leading-tight">{distributionError}</p>
                </div>
              )}
            </div>
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
