import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';
import { useAuth } from '../../../contexts/AuthContext';
import useVoucherHistory from '../hooks/useVoucherHistory';
import {
  X, ArrowDownRight, Building2, DollarSign, Phone, FileText, Check, Loader2,
  AlertTriangle
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface EditReceiptVoucherModalProps {
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

export default function EditReceiptVoucherModal({
  isOpen,
  onClose,
  voucherId,
  settings,
  onVoucherUpdated
}: EditReceiptVoucherModalProps) {
  const { t } = useLanguage();
  const { currentRate } = useExchangeRate();
  const { employee } = useAuth();
  const { addHistoryEntry, detectChanges } = useVoucherHistory();
  
  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      setError(null);
      
      try {
        const voucherRef = doc(db, 'vouchers', voucherId);
        const voucherDoc = await getDoc(voucherRef);
        
        if (!voucherDoc.exists()) {
          throw new Error('لم يتم العثور على السند');
        }
        
        const voucherData = voucherDoc.data();
        setOriginalData(voucherData);
        
        setFormData({
          companyId: voucherData.companyId || '',
          companyName: voucherData.companyName || '',
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
        });

      } catch (error) {
        console.error('Error fetching voucher data:', error);
        setError('فشل في تحميل بيانات السند');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && voucherId) {
      fetchVoucherData();
    }
  }, [isOpen, voucherId, currentRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !voucherId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        gates: parseFloat(formData.gates) || 0,
        internal: parseFloat(formData.internal) || 0,
        external: parseFloat(formData.external) || 0,
        fly: parseFloat(formData.fly) || 0,
        exchangeRate: parseFloat(formData.exchangeRate) || currentRate,
        updatedAt: new Date(),
        updatedBy: employee.name,
      };

      await updateDoc(doc(db, 'vouchers', voucherId), updatedData);
      
      const changes = detectChanges(originalData, updatedData);
      if (changes.length > 0) {
        await addHistoryEntry(voucherId, employee.name, employee.id || '', changes);
      }
      
      setSuccess('تم تحديث السند بنجاح');
      onVoucherUpdated();
      setTimeout(() => onClose(), 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">تعديل سند قبض</h3>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
             <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" id="edit-voucher-form">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشركة</label>
                    <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
               </div>
               {/* Add other fields as needed */}
            </form>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button>
          <button type="submit" form="edit-voucher-form" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md">
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
