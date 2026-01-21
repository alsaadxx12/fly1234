import React, { useState, useEffect } from 'react';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';
import { useAuth } from '../../../contexts/AuthContext';
import useVoucherHistory from '../hooks/useVoucherHistory';
import {
  ArrowDownRight, ArrowUpLeft, Building2, DollarSign, Phone,
  FileText, Check, TriangleAlert as AlertTriangle, Loader2,
  Search, MessageCircle, CreditCard
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ModernModal from '../../../components/ModernModal';

interface EditVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId: string | null;
  settings: {
    useCustomColumns: boolean;
    showGatesColumn: boolean;
    showInternalColumn: boolean;
    showExternalColumn: boolean;
    showFlyColumn: boolean;
    gatesColumnLabel: string;
    internalColumnLabel: string;
    externalColumnLabel: string;
    flyColumnLabel: string;
  };
  onVoucherUpdated: () => void;
}

export default function EditVoucherModal({
  isOpen,
  onClose,
  voucherId,
  settings,
  onVoucherUpdated
}: EditVoucherModalProps) {
  const { currentRate } = useExchangeRate();
  const { employee } = useAuth();
  const { addHistoryEntry, detectChanges } = useVoucherHistory();

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
    whatsAppGroupId: '',
    whatsAppGroupName: '',
    currency: 'USD',
    amount: '',
    gates: '',
    internal: '',
    external: '',
    fly: '',
    phone: '',
    details: '',
    safeId: '',
    safeName: '',
    exchangeRate: currentRate.toString(),
    type: 'receipt' as 'receipt' | 'payment',
    entityType: 'company' as 'company' | 'client' | 'expense'
  });

  // Derived state
  const [distributionError, setDistributionError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string, whatsAppGroupId?: string, whatsAppGroupName?: string }>>([]);
  const [safes, setSafes] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<Array<{ id: string; name: string, whatsAppGroupId?: string, whatsAppGroupName?: string }>>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  // Load voucher data
  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      setError(null);

      try {
        const voucherRef = doc(db, 'vouchers', voucherId);
        const voucherDoc = await getDoc(voucherRef);

        if (!voucherDoc.exists()) throw new Error('لم يتم العثور على السند');

        const voucherData = voucherDoc.data();
        setOriginalData(voucherData);

        setFormData({
          companyId: voucherData.companyId || '',
          companyName: voucherData.companyName || '',
          whatsAppGroupId: voucherData.whatsAppGroupId || '',
          whatsAppGroupName: voucherData.whatsAppGroupName || '',
          currency: voucherData.currency || 'USD',
          amount: voucherData.amount?.toString() || '',
          gates: voucherData.gates?.toString() || '',
          internal: voucherData.internal?.toString() || '',
          external: voucherData.external?.toString() || '',
          fly: voucherData.fly?.toString() || '',
          phone: voucherData.phone || '',
          details: voucherData.details || '',
          safeId: voucherData.safeId || '',
          safeName: voucherData.safeName || '',
          exchangeRate: voucherData.exchangeRate?.toString() || currentRate.toString(),
          type: voucherData.type || 'receipt',
          entityType: voucherData.entityType || 'company'
        });

        setSearchQuery(voucherData.companyName || '');
        setIsCustomCompany(voucherData.isCustomCompany || voucherData.companyId === 'custom');

      } catch (error) {
        console.error('Error fetching voucher data:', error);
        setError('فشل في تحميل بيانات السند');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && voucherId) fetchVoucherData();
  }, [isOpen, voucherId, currentRate]);

  // Load companies and safes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const safesSnapshot = await getDocs(query(collection(db, 'safes'), orderBy('name', 'asc')));
        setSafes(safesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));

        setIsLoadingCompanies(true);
        const collectionsToFetch = [
          { name: 'companies', type: 'company' },
          { name: 'clients', type: 'client' },
          { name: 'expenses', type: 'expense' }
        ];

        let allEntities: any[] = [];
        for (const coll of collectionsToFetch) {
          const snapshot = await getDocs(collection(db, coll.name));
          allEntities = [...allEntities, ...snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            whatsAppGroupId: doc.data().whatsAppGroupId || null,
            whatsAppGroupName: doc.data().whatsAppGroupName || null,
            entityType: coll.type
          }))];
        }

        setCompanies(allEntities);
        setFilteredCompanies(allEntities);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('فشل في تحميل البيانات');
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    if (isOpen) fetchData();
  }, [isOpen]);

  // Filter companies
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredCompanies(companies.filter(company => company.name.toLowerCase().includes(q)));
  }, [searchQuery, companies]);

  // Recalculate distribution
  useEffect(() => {
    if (formData.type !== 'receipt') return;
    const amount = parseFloat(formData.amount) || 0;
    const internal = parseFloat(formData.internal) || 0;
    const external = parseFloat(formData.external) || 0;
    const fly = parseFloat(formData.fly) || 0;
    const totalDistribution = internal + external + fly;

    if (totalDistribution > amount) {
      setDistributionError('مجموع الحقول يتجاوز المبلغ الكلي');
      setFormData(prev => ({ ...prev, gates: '0' }));
    } else {
      setDistributionError(null);
      setFormData(prev => ({ ...prev, gates: (amount - totalDistribution).toString() }));
    }
  }, [formData.amount, formData.internal, formData.external, formData.fly, formData.type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSafeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const safeId = e.target.value;
    const safeName = safes.find(safe => safe.id === safeId)?.name || '';
    setFormData(prev => ({ ...prev, safeId, safeName }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !voucherId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('يرجى إدخال مبلغ صحيح');
      if (distributionError) throw new Error(distributionError);
      if (!formData.safeId) throw new Error('يرجى اختيار صندوق');

      const voucherData = {
        companyId: isCustomCompany ? 'custom' : formData.companyId,
        companyName: formData.companyName,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        currency: formData.currency,
        amount: amount,
        gates: parseFloat(formData.gates) || 0,
        internal: parseFloat(formData.internal) || 0,
        external: parseFloat(formData.external) || 0,
        fly: parseFloat(formData.fly) || 0,
        phone: formData.phone,
        details: formData.details,
        safeId: formData.safeId,
        safeName: formData.safeName,
        exchangeRate: parseFloat(formData.exchangeRate),
        updatedAt: new Date(),
        updatedBy: employee.name,
        updatedById: employee.id,
        isCustomCompany: isCustomCompany
      };

      await updateDoc(doc(db, 'vouchers', voucherId), voucherData);

      if (originalData) {
        const changes = detectChanges(originalData, voucherData);
        if (changes.length > 0) await addHistoryEntry(voucherId, employee.name, employee.id || '', changes);
      }

      setSuccess('تم تحديث السند بنجاح');
      onVoucherUpdated();
      setTimeout(onClose, 1500);
    } catch (error: any) {
      setError(error.message || 'فشل في تحديث السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Header = (
    <div className="flex items-center justify-between w-full h-10 px-0 translate-y-[-4px]">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${formData.type === 'receipt' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {formData.type === 'receipt' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpLeft className="w-5 h-5" />}
        </div>
        <div className="font-black text-sm uppercase tracking-wider opacity-60">
          Edit #{originalData?.invoiceNumber || '...'}
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          type="button"
          onClick={() => setFormData(p => ({ ...p, currency: 'USD', amount: '', gates: '0', internal: '0', external: '0', fly: '0' }))}
          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${formData.currency === 'USD'
            ? 'bg-emerald-500 text-white shadow-md'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>USD</span>
        </button>
        <button
          type="button"
          onClick={() => setFormData(p => ({ ...p, currency: 'IQD', amount: '', gates: '0', internal: '0', external: '0', fly: '0' }))}
          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${formData.currency === 'IQD'
            ? 'bg-orange-500 text-white shadow-md'
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
        <div className="flex gap-3 w-full justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">إلغاء</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className={`px-10 py-2.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${formData.type === 'receipt' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التعديلات'}
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-bold">جاري تحميل بيانات السند...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(error || success) && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-black animate-in slide-in-from-top-2 ${success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
              {success ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span>{success || error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">الجهة المستهدفة</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowCompanyDropdown(true); }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    className="w-full h-11 px-10 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 bg-transparent text-sm font-bold outline-none"
                    placeholder="ابحث عن شركة..."
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                  {showCompanyDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {filteredCompanies.length > 0 ? filteredCompanies.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({ ...p, companyId: c.id, companyName: c.name }));
                            setSearchQuery(c.name);
                            setShowCompanyDropdown(false);
                            setIsCustomCompany(false);
                          }}
                          className="w-full px-4 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-0 border-gray-100 dark:border-gray-700 flex items-center justify-between"
                        >
                          <span className="font-bold text-sm tracking-tight">{c.name}</span>
                          {c.whatsAppGroupId && <MessageCircle className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                      )) : (
                        <div className="p-4 text-center text-xs text-gray-500 italic">لا نتائج مطابقة</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">رقم الهاتف</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full h-11 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm text-left" dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">الصندوق</label>
                  <select name="safeId" value={formData.safeId} onChange={handleSafeChange} className="w-full h-11 px-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm outline-none cursor-pointer">
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">ملاحظات</label>
                <textarea name="details" value={formData.details} onChange={handleChange} className="w-full h-24 px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl bg-transparent font-bold text-sm resize-none" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 text-center block">المبلغ الإجمالي</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`w-full h-20 text-center px-4 rounded-2xl border-2 text-4xl font-black transition-all ${formData.currency === 'USD' ? 'border-emerald-100 bg-emerald-50/20 text-emerald-600 focus:border-emerald-500 dark:bg-emerald-900/10 dark:border-emerald-900' : 'border-orange-100 bg-orange-50/20 text-orange-600 focus:border-orange-500 dark:bg-orange-900/10 dark:border-orange-900'}`}
                  dir="ltr"
                />
              </div>

              {formData.type === 'receipt' ? (
                <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase text-center">تحصيص المبلغ</h4>
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl border-2 ${distributionError ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900' : 'bg-gray-50/50 border-gray-100 dark:bg-gray-800/20 dark:border-gray-700'}`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase text-center block">جات</label>
                      <input type="text" readOnly value={parseFloat(formData.gates).toLocaleString()} className="w-full h-9 text-center rounded-lg bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 font-bold border-0 text-xs" dir="ltr" />
                    </div>
                    {(['internal', 'external', 'fly'] as const).map(key => (
                      <div className="space-y-1" key={key}>
                        <label className="text-[9px] font-black text-gray-400 uppercase text-center block">
                          {(settings as any)[`${key}ColumnLabel`] || key}
                        </label>
                        <input
                          type="text"
                          name={key}
                          value={(formData as any)[key]}
                          onChange={handleChange}
                          className="w-full h-9 text-center rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 font-black text-xs outline-none focus:border-blue-500"
                          dir="ltr"
                        />
                      </div>
                    ))}
                  </div>
                  {distributionError && <p className="text-[10px] font-black text-red-500 text-center">{distributionError}</p>}
                </div>
              ) : formData.currency === 'USD' && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-blue-500 uppercase">Rate</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-300">{parseFloat(formData.exchangeRate).toLocaleString()}</p>
                  </div>
                  <div className="text-left font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                    ≈ {(parseFloat(formData.amount || '0') * parseFloat(formData.exchangeRate)).toLocaleString()} <span className="text-[10px]">IQD</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModernModal>
  );
}