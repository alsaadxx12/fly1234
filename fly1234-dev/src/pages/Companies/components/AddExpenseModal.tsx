import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { X, Briefcase, Phone, FileText, Loader2, Save, AlertCircle, Check, DollarSign } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ExpenseFormData {
  name: string;
  phone: string;
  details: string;
  amount: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: (expense: any) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded
}) => {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [formData, setFormData] = React.useState<ExpenseFormData>({
    name: '',
    phone: '',
    details: '',
    amount: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  
  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        phone: '',
        details: '',
        amount: ''
      });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('يرجى إدخال اسم المصروف');
      }
      
      // Check if expense with same name already exists
      const expensesRef = collection(db, 'expenses');
      const q = query(expensesRef, where('name', '==', formData.name.trim()));
      const existingExpenses = await getDocs(q);
      
      if (!existingExpenses.empty) {
        throw new Error('يوجد مصروف بهذا الاسم بالفعل');
      }
      
      // Create expense object
      const expenseData = {
        name: formData.name.trim(),
        phone: formData.phone || null,
        details: formData.details || null,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || '',
        entityType: 'expense',
        paymentType: 'cash' // Default to cash
      };
      
      // Add to Firestore
      const docRef = await addDoc(expensesRef, expenseData);
      
      // Show success message
      setSuccess('تم إضافة المصروف بنجاح');

      // Call onExpenseAdded callback if provided
      if (onExpenseAdded) {
        onExpenseAdded({
          id: docRef.id,
          ...expenseData,
          createdAt: new Date()
        });
      } else {
        // Only auto-close if no callback provided (backward compatibility)
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl p-0 max-w-md mx-4 w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 bg-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">إضافة مصروف جديد</h3>
                <p className="text-sm text-white/80">أدخل بيانات المصروف</p>
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
        
        <div className="p-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم المصروف <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-gray-900 shadow-sm"
                  placeholder="أدخل اسم المصروف"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المبلغ
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-gray-900 shadow-sm pl-10"
                  placeholder="0.00"
                  dir="ltr"
                />
                <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-2" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم هاتف المسؤول
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-gray-900 shadow-sm pl-10"
                  placeholder="964xxxxxxxxx"
                  dir="ltr"
                />
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-2" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تفاصيل المصروف
              </label>
              <div className="relative">
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 text-gray-900 shadow-sm"
                  placeholder="أدخل تفاصيل المصروف"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ</span>
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

export default AddExpenseModal;
