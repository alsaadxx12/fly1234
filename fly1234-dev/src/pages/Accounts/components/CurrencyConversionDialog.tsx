import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DollarSign, X, ArrowRight, Check } from 'lucide-react';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';
import { useTheme } from '../../../contexts/ThemeContext';

interface CurrencyConversionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (convertToIQD: boolean) => void;
  amount: number;
  exchangeRate: number;
}

const CurrencyConversionDialog: React.FC<CurrencyConversionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  exchangeRate
}) => {
  const [convertToIQD, setConvertToIQD] = useState(false);
  const { currentRate: globalRate } = useExchangeRate();
  const { theme } = useTheme();
  
  const rate = exchangeRate > 0 ? exchangeRate : globalRate;
  
  const convertedAmount = amount * rate;
  
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`rounded-2xl shadow-2xl border p-6 max-w-md w-full mx-4 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl shadow-lg ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                : 'bg-gradient-to-br from-blue-100 to-blue-50'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                theme === 'dark' ? 'text-white' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>تحويل العملة</h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>اختر عملة الإرسال</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className={`p-5 rounded-xl border mb-5 ${
          theme === 'dark'
            ? 'bg-gray-700/50 border-gray-600'
            : 'bg-blue-50 border-blue-100'
        }`}>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border shadow-sm ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-blue-200'
            }`}>
              <div className={`text-sm mb-1 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
              }`}>المبلغ بالدولار</div>
              <div className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`} dir="ltr">${amount.toLocaleString()}</div>
            </div>
            <div className={`p-4 rounded-lg border shadow-sm ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-blue-200'
            }`}>
              <div className={`text-sm mb-1 ${
                theme === 'dark' ? 'text-green-400' : 'text-green-700'
              }`}>المبلغ بالدينار</div>
              <div className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-green-300' : 'text-green-800'
              }`} dir="ltr">{convertedAmount.toLocaleString()} د.ع</div>
            </div>
          </div>
          <div className="flex items-center justify-center mt-4 gap-2">
            <ArrowRight className={`w-5 h-5 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} />
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-blue-700'
            }`}>سعر الصرف:</div>
            <div className={`text-base font-bold ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
            }`} dir="ltr">{rate.toLocaleString()} د.ع</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="currency"
                checked={!convertToIQD}
                onChange={() => setConvertToIQD(false)}
                className="peer sr-only"
              />
              <div className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                !convertToIQD
                  ? theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-blue-500 bg-blue-50'
                  : theme === 'dark'
                    ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    : 'border-gray-200 bg-white hover:border-blue-300'
              }`}>
                <div className={`p-2.5 rounded-lg ${
                  !convertToIQD
                    ? 'bg-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-600'
                      : 'bg-blue-100'
                }`}>
                  <DollarSign className={`w-5 h-5 ${
                    !convertToIQD
                      ? 'text-white'
                      : theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>إرسال بالدولار</div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>الإبقاء على العملة الأصلية</div>
                </div>
                {!convertToIQD && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="currency"
                checked={convertToIQD}
                onChange={() => setConvertToIQD(true)}
                className="peer sr-only"
              />
              <div className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all ${
                convertToIQD
                  ? theme === 'dark'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-green-500 bg-green-50'
                  : theme === 'dark'
                    ? 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    : 'border-gray-200 bg-white hover:border-green-300'
              }`}>
                <div className={`p-2.5 rounded-lg ${
                  convertToIQD
                    ? 'bg-green-600'
                    : theme === 'dark'
                      ? 'bg-gray-600'
                      : 'bg-green-100'
                }`}>
                  <DollarSign className={`w-5 h-5 ${
                    convertToIQD
                      ? 'text-white'
                      : theme === 'dark'
                        ? 'text-gray-300'
                        : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>تحويل إلى الدينار</div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>إرسال المبلغ بالدينار العراقي</div>
                </div>
                {convertToIQD && (
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
        
        <div className={`flex items-center justify-end gap-3 mt-6 pt-5 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(convertToIQD)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-medium"
          >
            تأكيد الإرسال
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CurrencyConversionDialog;
