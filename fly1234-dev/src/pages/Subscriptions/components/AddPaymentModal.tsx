import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import useDebts from '../hooks/useDebts';
import {
  X, DollarSign, Calendar, FileText,
  Loader2, Check, AlertTriangle, Plus, Building2, CreditCard
} from 'lucide-react';
import { Debt, PaymentFormData } from '../types';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ar from 'date-fns/locale/ar';
import "react-datepicker/dist/react-datepicker.css";

// Register Arabic locale
registerLocale('ar', ar);

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onPaymentAdded: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  onPaymentAdded
}) => {
  const { t } = useLanguage();
  const { addPayment } = useDebts();
  const { employee } = useAuth();
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    paymentDate: new Date(),
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form when modal closes or debt changes
  useEffect(() => {
    if (!isOpen || !debt) {
      setFormData({
        amount: '',
        paymentDate: new Date(),
        notes: ''
      });
      setError(null);
      setSuccess(null);
    } else {
      // Set default amount to remaining amount
      setFormData(prev => ({
        ...prev,
        amount: debt.remainingAmount.toString()
      }));
    }
  }, [isOpen, debt]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!debt) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate form
      if (!formData.amount) {
        throw new Error('يرجى إدخال المبلغ');
      }
      
      if (isNaN(parseFloat(formData.amount))) {
        throw new Error('يرجى إدخال مبلغ صحيح');
      }
      
      const paymentAmount = parseFloat(formData.amount);
      if (paymentAmount <= 0) {
        throw new Error('يجب أن يكون المبلغ أكبر من صفر');
      }
      
      if (paymentAmount > debt.remainingAmount) {
        throw new Error('المبلغ المدخل أكبر من المبلغ المتبقي');
      }
      
      // Add payment
      await addPayment(debt.id, formData);
      
      // Show success message
      setSuccess('تم إضافة الدفعة بنجاح');
      
      // Refresh debts
      onPaymentAdded();
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding payment:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[#230058] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">تسديد دفعة من الدين</h3>
                <p className="text-sm text-white/80">تسديد دين {debt.companyName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
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
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{debt.companyName}</h4>
                <p className="text-sm text-gray-600">{debt.debtType}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600">المبلغ الكلي</div>
                <div className="font-bold text-blue-700">
                  {debt.amount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600">المبلغ المسدد</div>
                <div className="font-bold text-blue-700">
                  {debt.paidAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600">المبلغ المتبقي</div>
                <div className="font-bold text-blue-700">
                  {debt.remainingAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
            
            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ff5f0a]" />
                  <span>تاريخ الدفع</span>
                </div>
              </label>
              <div className="relative">
                <DatePicker
                  selected={formData.paymentDate}
                  onChange={(date: Date) => setFormData(prev => ({ ...prev, paymentDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm"
                  locale="ar"
                />
              </div>
            </div>
            
            {/* Notes */}
            <div>
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
                    <span>جاري التسديد...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>تسديد الدين</span>
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

export default AddPaymentModal;