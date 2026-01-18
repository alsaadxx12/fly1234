import React from 'react';
import { Building2, Calendar, CreditCard, Trash2, Eye, Plus } from 'lucide-react';
import { Debt } from '../types';

interface DebtCardProps {
  debt: Debt;
  onAddPayment: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onViewHistory: (debt: Debt) => void;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  onAddPayment,
  onEdit,
  onDelete,
  onViewHistory,
  hasEditPermission,
  hasDeletePermission
}) => {
  // Get status text based on status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'paid':
        return 'مسدد';
      case 'overdue':
        return 'متأخر';
      default:
        return status;
    }
  };
  
  // Get status color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{debt.companyName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-100">
                  {debt.debtType}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-xs ${getStatusColor(debt.status)}`}>
                  {getStatusText(debt.status)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{formatDate(debt.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-xs text-green-600 mb-1">المبلغ</div>
            <div className="font-bold text-green-700 text-lg">
              {debt.amount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xs text-blue-600 mb-1">المسدد</div>
            <div className="font-bold text-blue-700 text-lg">
              {debt.paidAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${
            debt.remainingAmount > 0 
              ? 'bg-amber-50 border-amber-100' 
              : 'bg-green-50 border-green-100'
          }`}>
            <div className="text-xs text-amber-600 mb-1">المتبقي</div>
            <div className={`font-bold text-lg ${
              debt.remainingAmount > 0 
                ? 'text-amber-700' 
                : 'text-green-700'
            }`}>
              {debt.remainingAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
            </div>
          </div>
        </div>
        
        {/* Card Footer with Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {debt.payments?.length ? `${debt.payments.length} دفعة` : 'لا توجد دفعات'}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddPayment(debt)}
              className={`p-2 rounded-lg transition-colors hover:scale-105 active:scale-95 flex items-center gap-1 ${
                debt.status === 'paid'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              disabled={debt.status === 'paid'}
              title="تسديد دين"
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">تسديد</span>
            </button>
            
            <button
              onClick={() => onViewHistory(debt)}
              className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors hover:scale-105 active:scale-95 flex items-center gap-1"
              title="سجل العمليات"
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs">السجل</span>
            </button>
            
            {hasDeletePermission && (
              <button
                onClick={() => onDelete(debt)}
                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors hover:scale-105 active:scale-95 flex items-center gap-1"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs">حذف</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtCard;