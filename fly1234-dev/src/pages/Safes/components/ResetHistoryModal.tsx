import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { History, X, DollarSign, User, ArrowRight, ArrowUpRight, Loader2, Calendar, Clock, Building2, ArrowUpLeft, ArrowDownRight } from 'lucide-react';
import { Safe, ResetHistory } from '../types';

interface ResetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSafe: string | null;
  safes: Safe[];
  resetHistory: ResetHistory[];
  isLoadingHistory: boolean;
}

const ResetHistoryModal: React.FC<ResetHistoryModalProps> = ({
  isOpen,
  onClose,
  selectedSafe,
  safes,
  resetHistory,
  isLoadingHistory
}) => {
  const { t } = useLanguage();

  if (!isOpen || !selectedSafe) return null;

  const safeName = safes.find(s => s.id === selectedSafe)?.name || '';

  // Helper function to safely format numbers
  const formatBalance = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-md shadow-md w-full max-w-xl mx-4 max-h-[90vh] flex flex-col relative">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-md">
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">{t('resetHistory')}</h3>
              <p className="text-xs text-gray-500">سجل عمليات التصفير لصندوق {safeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-600 text-sm">جاري تحميل سجل العمليات...</p>
              </div>
            </div>
          ) : resetHistory.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-md border border-gray-100">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-gray-50 rounded-full">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">لا يوجد سجل تصفير</h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm">
                لم يتم تنفيذ أي عملية تصفير على هذا الصندوق حتى الآن.
                <br />
                سيتم حفظ سجل كامل عند تنفيذ أي عملية تصفير مستقبلية.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {resetHistory.map((record) => (
                <div key={record.id} className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1.5 rounded-md ${record.target_safe_id ? 'bg-blue-100' : 'bg-red-100'}`}>
                        <History className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          {record.target_safe_id 
                            ? 'تحويل إلى صندوق آخر' 
                            : record.reset_type === 'both' 
                              ? 'تصفير جميع الأرصدة' 
                              : record.reset_type === 'usd' 
                                ? 'تصفير رصيد الدولار' 
                                : 'تصفير رصيد الدينار'
                          }
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{record.created_at.toLocaleDateString('en-GB')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{record.created_at.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    {record.previous_balance_usd !== undefined && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                        <div className="p-1.5 bg-blue-100 rounded-md flex items-center justify-center">
                          <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">الرصيد السابق بالدولار</div>
                          <div className="font-bold text-gray-900 text-sm" dir="ltr">{formatBalance(record.previous_balance_usd)}</div>
                        </div>
                      </div>
                    )}
                    {record.previous_balance_iqd !== undefined && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                        <div className="p-1.5 bg-gray-100 rounded-md flex items-center justify-center">
                          <DollarSign className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">الرصيد السابق بالدينار</div>
                          <div className="font-bold text-gray-900 text-sm" dir="ltr">{formatBalance(record.previous_balance_iqd)}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Target Safe Information (if available) */}
                    {record.target_safe_id && record.target_safe_name && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-200">
                        <div className="p-1.5 bg-green-100 rounded-md flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-green-600">تم التحويل إلى صندوق</div>
                          <div className="font-bold text-green-700 text-sm">{record.target_safe_name}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                      <div className="p-1.5 bg-blue-100 rounded-md flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">تم بواسطة</div>
                        <div className="font-bold text-gray-900 text-sm">{record.reset_by}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-md text-xs"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetHistoryModal;