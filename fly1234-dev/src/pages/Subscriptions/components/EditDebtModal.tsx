import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  X, Building2, CreditCard, DollarSign, Calendar, 
  FileText, Loader2, Check, AlertTriangle, Pencil
} from 'lucide-react';
import { Debt, DebtFormData } from '../types';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ar from 'date-fns/locale/ar';
import "react-datepicker/dist/react-datepicker.css";

// Register Arabic locale
registerLocale('ar', ar);

interface EditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onDebtUpdated: () => void;
}

const EditDebtModal: React.FC<EditDebtModalProps> = ({
  isOpen,
  onClose,
  debt,
  onDebtUpdated
}) => {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [formData, setFormData] = useState<DebtFormData>({
    companyId: '',
    companyName: '',
    debtType: '',
    amount: '',
    currency: 'USD',
    dueDate: new Date(),
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debtTypes, setDebtTypes] = useState<string[]>([
    'قرض',
    'فاتورة',
    'مستحقات',
    'تمويل',
    'أخرى'
  ]);

  // Initialize form data when debt changes
  useEffect(() => {
    if (debt) {
      setFormData({
        companyId: debt.companyId,
        companyName: debt.companyName,
        debtType: debt.debtType,
        amount: debt.amount.toString(),
        currency: debt.currency,
        dueDate: debt.dueDate,
        notes: debt.notes || ''
      });
    }
  }, [debt]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!debt) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate form
      if (!formData.debtType) {
        throw new Error('يرجى اختيار نوع الدين');
      }
      
      if (!formData.amount) {
        throw new Error('يرجى إدخال المبلغ');
      }
      
      if (isNaN(parseFloat(formData.amount))) {
        throw new Error('يرجى إدخال مبلغ صحيح');
      }
      
      // TODO: Implement actual update logic
      // For now, just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setSuccess('تم تحديث الدين بنجاح');
      
      // Refresh debts
      onDebtUpdated();
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating debt:', error);
      setError(error instanceof Error ? error.message : 'فشل في تحديث الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[#230058] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">تعديل دين</h3>
                <p className="text-sm text-white/80">{debt.companyName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2 border border-green-100 text-sm">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Info (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ff5f0a]" />
                    <span>الشركة</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 shadow-sm cursor-not-allowed"
                  readOnly
                />
              </div>
              
              {/* Debt Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#ff5f0a]" />
                    <span>نوع الدين</span>
                  </div>
                </label>
                <select
                  value={formData.debtType}
                  onChange={(e) => setFormData(prev => ({ ...prev, debtType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm"
                  required
                >
                  <option value="">اختر نوع الدين...</option>
                  {debtTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#ff5f0a]" />
                    <span>المبلغ</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => {
                      // Only allow numbers and decimal point
                      const value = e.target.value.replace(/[^\d.]/g, '');
                      // Prevent multiple decimal points
                      const parts = value.split('.');
                      if (parts.length > 2) return;
                      
                      setFormData(prev => ({ ...prev, amount: value }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm pl-10"
                    placeholder="0.00"
                    dir="ltr"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#ff5f0a]" />
                    <span>العملة</span>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="relative">
                    <input
                      type="radio"
                      name="currency"
                      checked={formData.currency === 'USD'}
                      onChange={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-blue-200 peer-checked:bg-blue-50 hover:border-blue-200">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">دولار أمريكي</span>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="currency"
                      checked={formData.currency === 'IQD'}
                      onChange={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-green-200 peer-checked:bg-green-50 hover:border-green-200">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">دينار عراقي</span>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#ff5f0a]" />
                    <span>تاريخ الاستحقاق</span>
                  </div>
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.dueDate}
                    onChange={(date: Date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm"
                    locale="ar"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff5f0a]" />
                    <span>ملاحظات</span>
                  </div>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm resize-none h-24"
                  placeholder="أدخل أي ملاحظات إضافية..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#ff5f0a] text-white rounded-lg hover:bg-[#ff5f0a]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>تحديث الدين</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDebtModal;