import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { X, AlertTriangle, CheckCircle, DollarSign, Wallet } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';

interface ConfirmAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  safeName: string;
  vouchersCount: number;
  unconfirmedBalanceUSD: number;
  unconfirmedBalanceIQD: number;
}

const ConfirmAllModal: React.FC<ConfirmAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  safeName,
  vouchersCount,
  unconfirmedBalanceUSD,
  unconfirmedBalanceIQD
}) => {
  const { theme } = useTheme();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="تأكيد جميع السندات"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className={`p-4 rounded-lg border-2 ${
          theme === 'dark'
            ? 'bg-orange-900/20 border-orange-700/50'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
            }`} />
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-2 ${
                theme === 'dark' ? 'text-orange-300' : 'text-orange-900'
              }`}>
                تحذير: عملية تأكيد جماعية
              </h3>
              <p className={`text-sm leading-relaxed ${
                theme === 'dark' ? 'text-orange-200' : 'text-orange-800'
              }`}>
                أنت على وشك تأكيد جميع السندات المعلقة في هذا الصندوق. هذه العملية سوف:
              </p>
              <ul className={`mt-3 space-y-2 text-sm ${
                theme === 'dark' ? 'text-orange-200' : 'text-orange-800'
              }`}>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span>تأكيد <strong>{vouchersCount}</strong> سند معلق</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span>تحديث رصيد الصندوق بشكل نهائي</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span>حفظ سجل للعملية في قاعدة البيانات</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Safe Info */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <h4 className={`text-base font-bold mb-3 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
          }`}>
            معلومات الصندوق
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                اسم الصندوق:
              </span>
              <span className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {safeName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                عدد السندات:
              </span>
              <span className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {vouchersCount} سند
              </span>
            </div>
          </div>
        </div>

        {/* Pending Balances */}
        <div className="space-y-3">
          <h4 className={`text-base font-bold ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
          }`}>
            الأرصدة المعلقة التي سيتم تأكيدها:
          </h4>

          {/* USD Balance */}
          {unconfirmedBalanceUSD !== 0 && (
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-blue-900/30 border-blue-700/50'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    دولار أمريكي
                  </span>
                </div>
                <span className={`text-2xl font-bold ${
                  unconfirmedBalanceUSD >= 0
                    ? theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {unconfirmedBalanceUSD >= 0 ? '+' : ''}${Math.abs(unconfirmedBalanceUSD).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* IQD Balance */}
          {unconfirmedBalanceIQD !== 0 && (
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-yellow-900/30 border-yellow-700/50'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                  }`}>
                    دينار عراقي
                  </span>
                </div>
                <span className={`text-2xl font-bold ${
                  unconfirmedBalanceIQD >= 0
                    ? theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                    : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {unconfirmedBalanceIQD >= 0 ? '+' : ''}{Math.abs(unconfirmedBalanceIQD).toLocaleString()} IQD
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-base transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-base transition-colors flex items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            تأكيد الكل
          </button>
        </div>
      </div>
    </ModernModal>
  );
};

export default ConfirmAllModal;
