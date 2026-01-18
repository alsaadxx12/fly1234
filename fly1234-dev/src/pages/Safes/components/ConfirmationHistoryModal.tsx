import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { X, Clock, DollarSign, Wallet, User, Calendar, Building2, FolderOpen, FileText, ArrowDownRight, ArrowUpLeft, Trash2 } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';
import ModernButton from '../../../components/ModernButton';
import { getConfirmationHistory, clearConfirmationHistory, ConfirmationRecord } from '../../../lib/collections/confirmationHistory';

interface ConfirmationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  safeId?: string;
  safeName?: string;
}

const ConfirmationHistoryModal: React.FC<ConfirmationHistoryModalProps> = ({
  isOpen,
  onClose,
  safeId,
  safeName
}) => {
  const { theme } = useTheme();
  const [history, setHistory] = useState<ConfirmationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, safeId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await getConfirmationHistory(safeId);
      setHistory(records);
    } catch (error) {
      console.error('Error loading confirmation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const confirmMessage = safeId
      ? `هل أنت متأكد من تفريغ سجل التأكيدات لصندوق "${safeName}"؟`
      : 'هل أنت متأكد من تفريغ جميع سجلات التأكيدات؟';

    if (!window.confirm(confirmMessage + '\n\nهذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }

    setClearing(true);
    try {
      const deletedCount = await clearConfirmationHistory(safeId);
      alert(`تم حذف ${deletedCount} سجل بنجاح!`);
      await loadHistory();
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('فشل في تفريغ السجل: ' + (error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={safeName ? `سجل التأكيدات - ${safeName}` : 'سجل التأكيدات'}
    >
      <div className="space-y-4">
        {history.length > 0 && !loading && (
          <div className="flex justify-end">
            <ModernButton
              onClick={handleClearHistory}
              variant="danger"
              disabled={clearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {clearing ? 'جاري التفريغ...' : 'تفريغ السجل'}
            </ModernButton>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              جاري التحميل...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              لا يوجد سجل تأكيدات
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {history.map((record) => (
              <div
                key={record.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {record.safeName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className={`w-3.5 h-3.5 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatDate(record.confirmedAt)}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    theme === 'dark'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {record.vouchersConfirmed} سند
                  </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* USD */}
                  {record.unconfirmedBalanceUSD !== 0 && (
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-blue-900/20 border-blue-800/50'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                        <span className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                        }`}>
                          دولار
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${
                        record.unconfirmedBalanceUSD >= 0
                          ? theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                          : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {record.unconfirmedBalanceUSD >= 0 ? '+' : ''}${Math.abs(record.unconfirmedBalanceUSD).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* IQD */}
                  {record.unconfirmedBalanceIQD !== 0 && (
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-yellow-900/20 border-yellow-800/50'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                        }`} />
                        <span className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                        }`}>
                          دينار
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${
                        record.unconfirmedBalanceIQD >= 0
                          ? theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                          : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {record.unconfirmedBalanceIQD >= 0 ? '+' : ''}{Math.abs(record.unconfirmedBalanceIQD).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Voucher Details */}
                {record.voucherDetails && record.voucherDetails.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className={`w-3.5 h-3.5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-xs font-bold ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        تفاصيل السندات المؤكدة:
                      </span>
                    </div>
                    <div className="space-y-2">
                      {record.voucherDetails.map((voucher, index) => (
                        <div
                          key={voucher.id}
                          className={`p-2 rounded-lg text-xs ${
                            theme === 'dark'
                              ? 'bg-gray-700/50'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {voucher.type === 'receipt' ? (
                                <ArrowDownRight className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <ArrowUpLeft className="w-3.5 h-3.5 text-red-500" />
                              )}
                              <span className={`font-bold ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {voucher.type === 'receipt' ? 'قبض' : 'صرف'}
                              </span>
                            </div>
                            <span className={`font-bold ${
                              voucher.type === 'receipt'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {voucher.currency === 'USD' ? '$' : ''}{voucher.amount.toLocaleString()}{voucher.currency === 'IQD' ? ' IQD' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <div className="flex items-center gap-1">
                              <Building2 className={`w-3 h-3 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                {voucher.companyName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FolderOpen className={`w-3 h-3 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                                {voucher.section}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmed By */}
                <div className={`flex items-center gap-2 pt-3 border-t ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <User className={`w-3.5 h-3.5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <span className={`text-xs ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    تم التأكيد بواسطة: <strong>{record.confirmedBy}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernModal>
  );
};

export default ConfirmationHistoryModal;
