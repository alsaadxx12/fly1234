import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Debt } from '../types';

interface DeleteDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onDebtDeleted: () => void;
}

const DeleteDebtModal: React.FC<DeleteDebtModalProps> = ({
  isOpen,
  onClose,
  debt,
  onDebtDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!isOpen || !debt) return null;
  
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      if (!debt || !debt.id) {
        throw new Error('لم يتم العثور على بيانات الدين');
      }
      
      // Delete the debt document
      const debtRef = doc(db, 'debts', debt.id);
      await deleteDoc(debtRef);
      
      // Delete all related payments
      const paymentsRef = collection(db, 'debt_payments');
      const q = query(paymentsRef, where('debtId', '==', debt.id));
      const paymentsSnapshot = await getDocs(q);
      
      // Use batch to delete all payments
      const batch = writeBatch(db);
      paymentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Commit the batch
      await batch.commit();
      
      // Call the callback to refresh the debts list
      onDebtDeleted();
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error deleting debt:', error);
      setError(error instanceof Error ? error.message : 'فشل في حذف الدين');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 bg-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">حذف الدين</h3>
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
        
        <div className="p-4">
          <div className="mb-4">
            <p className="text-gray-700 mb-4">
              هل أنت متأكد من حذف هذا الدين؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">
                سيتم حذف جميع الدفعات المرتبطة بهذا الدين أيضاً.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-700">الشركة:</span>
                <span className="text-gray-900">{debt.companyName}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-700">نوع الدين:</span>
                <span className="text-gray-900">{debt.debtType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">المبلغ:</span>
                <span className="text-gray-900">
                  {debt.amount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </span>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteDebtModal;