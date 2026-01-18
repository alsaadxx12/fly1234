import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Clock, Download, Loader2, AlertCircle } from 'lucide-react';
import { Debt, Payment } from '../types';
import * as XLSX from 'xlsx';

interface DebtHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
}

const DebtHistoryModal: React.FC<DebtHistoryModalProps> = ({ isOpen, onClose, debt }) => {
  const [isExporting, setIsExporting] = useState(false);
  
  if (!isOpen || !debt) return null;
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
  };
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Export payments to Excel
  const exportToExcel = () => {
    if (!debt || !debt.payments || debt.payments.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // Transform payments data for Excel
      const excelData = debt.payments.map(payment => ({
        'تاريخ الدفع': formatDate(payment.paymentDate),
        'وقت الدفع': formatTime(payment.paymentDate),
        'المبلغ': payment.amount,
        'العملة': payment.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي',
        'الملاحظات': payment.notes || '-',
        'تم بواسطة': payment.createdBy
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 15 }, // تاريخ الدفع
        { wch: 10 }, // وقت الدفع
        { wch: 12 }, // المبلغ
        { wch: 15 }, // العملة
        { wch: 30 }, // الملاحظات
        { wch: 20 }  // تم بواسطة
      ];
      
      worksheet['!cols'] = columnWidths;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PaymentHistory');
      
      // Generate Excel file
      XLSX.writeFile(workbook, `debt_payments_${debt.companyName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('حدث خطأ أثناء تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[#230058] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">سجل الدفعات</h3>
                <p className="text-sm text-white/80">{debt.companyName} - {debt.debtType}</p>
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
        
        <div className="p-4 overflow-y-auto flex-1">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">المبلغ الكلي</div>
                <div className="font-bold text-blue-700 text-lg">
                  {debt.amount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">المبلغ المسدد</div>
                <div className="font-bold text-blue-700 text-lg">
                  {debt.paidAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">المبلغ المتبقي</div>
                <div className="font-bold text-blue-700 text-lg">
                  {debt.remainingAmount.toLocaleString()} {debt.currency === 'USD' ? '$' : 'د.ع'}
                </div>
              </div>
            </div>
          </div>
          
          {debt.payments && debt.payments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800">سجل الدفعات</h4>
                <button
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm border border-green-200"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>تصدير</span>
                </button>
              </div>
              
              {debt.payments.map((payment, index) => (
                <div key={payment.id || index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="font-bold text-gray-800">
                        {payment.amount.toLocaleString()} {payment.currency === 'USD' ? '$' : 'د.ع'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(payment.paymentDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{payment.createdBy}</span>
                    </div>
                    <div className="text-gray-500">
                      {formatTime(payment.createdAt)}
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{payment.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد دفعات</h3>
              <p className="text-gray-500 text-center max-w-md">
                لم يتم تسجيل أي دفعات لهذا الدين بعد. يمكنك إضافة دفعة جديدة باستخدام زر "إضافة دفعة".
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebtHistoryModal;