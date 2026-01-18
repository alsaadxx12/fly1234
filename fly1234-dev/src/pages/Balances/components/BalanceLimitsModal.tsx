import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ModernButton from '../../../components/ModernButton';
import ModernInput from '../../../components/ModernInput';

interface BalanceLimitsModalProps {
  balance: {
    id: string;
    sourceName: string;
    amount: number;
    currency: string;
    limits?: {
      red: number;
      yellow: number;
      green: number;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function BalanceLimitsModal({ balance, onClose, onSuccess }: BalanceLimitsModalProps) {
  const { theme } = useTheme();
  const { showNotification } = useNotification();

  const [redLimit, setRedLimit] = useState(balance.limits?.red?.toString() || '1000');
  const [yellowLimit, setYellowLimit] = useState(balance.limits?.yellow?.toString() || '5000');
  const [greenLimit, setGreenLimit] = useState(balance.limits?.green?.toString() || '10000');
  const [loading, setLoading] = useState(false);

  const getCurrentColor = (amount: number) => {
    const red = parseFloat(redLimit) || 0;
    const yellow = parseFloat(yellowLimit) || 0;
    const green = parseFloat(greenLimit) || 0;

    if (amount < red) return 'red';
    if (amount >= red && amount < yellow) return 'yellow';
    if (amount >= yellow) return 'green';
    return 'gray';
  };

  const currentColor = getCurrentColor(balance.amount);

  const handleSave = async () => {
    const red = parseFloat(redLimit);
    const yellow = parseFloat(yellowLimit);
    const green = parseFloat(greenLimit);

    if (isNaN(red) || isNaN(yellow) || isNaN(green)) {
      showNotification('يرجى إدخال أرقام صحيحة', 'error');
      return;
    }

    if (red >= yellow || yellow >= green) {
      showNotification('يجب أن يكون: الحد الأحمر < الحد الأصفر < الحد الأخضر', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'balances', balance.id), {
        limits: {
          red,
          yellow,
          green
        }
      });

      showNotification('تم حفظ الحدود بنجاح', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving limits:', error);
      showNotification('فشل حفظ الحدود', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } max-h-[85vh] overflow-hidden flex flex-col`}
        style={{ position: 'relative', zIndex: 10000 }}
      >
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className={`text-2xl font-black ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              إعدادات حدود الرصيد - {balance.sourceName}
            </h2>
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              الرصيد الحالي: {balance.amount} {balance.currency}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className={`rounded-xl p-4 ${
            theme === 'dark' ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <div>
                <p className={`text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                }`}>
                  كيف تعمل حدود الرصيد؟
                </p>
                <ul className={`text-sm space-y-1 ${
                  theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'
                }`}>
                  <li>• <span className="text-red-600 font-bold">أحمر</span> عندما يكون الرصيد أقل من أو يساوي هذا الحد</li>
                  <li>• <span className="text-yellow-600 font-bold">أصفر</span> عندما يكون الرصيد بين الحد الأحمر والأصفر</li>
                  <li>• <span className="text-green-600 font-bold">أخضر</span> عندما يكون الرصيد أعلى من الحد الأصفر</li>
                </ul>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${
            currentColor === 'red'
              ? theme === 'dark' ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-400'
              : currentColor === 'yellow'
              ? theme === 'dark' ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-50 border-yellow-400'
              : theme === 'dark' ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-400'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full ${
                currentColor === 'red' ? 'bg-red-600'
                : currentColor === 'yellow' ? 'bg-yellow-500'
                : 'bg-green-600'
              }`} />
              <span className={`font-bold text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                الحالة الحالية (تحذير حرج)
              </span>
            </div>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              الرصيد الحالي: <span className="font-bold">{balance.amount} {balance.currency}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className={`rounded-xl p-4 border-2 ${
              theme === 'dark' ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                <label className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-700'
                }`}>
                  الحد الأحمر (تحذير حرج)
                </label>
              </div>
              <ModernInput
                type="number"
                value={redLimit}
                onChange={(e) => setRedLimit(e.target.value)}
                placeholder="مثال: 1000"
              />
            </div>

            <div className={`rounded-xl p-4 border-2 ${
              theme === 'dark' ? 'bg-yellow-900/10 border-yellow-800/30' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <label className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  الحد الأصفر (تحذير متوسط)
                </label>
              </div>
              <ModernInput
                type="number"
                value={yellowLimit}
                onChange={(e) => setYellowLimit(e.target.value)}
                placeholder="مثال: 5000"
              />
            </div>

            <div className={`rounded-xl p-4 border-2 ${
              theme === 'dark' ? 'bg-green-900/10 border-green-800/30' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-600" />
                <label className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-700'
                }`}>
                  الحد الأخضر (رصيد جيد)
                </label>
              </div>
              <ModernInput
                type="number"
                value={greenLimit}
                onChange={(e) => setGreenLimit(e.target.value)}
                placeholder="مثال: 10000"
              />
            </div>
          </div>

          <div className={`rounded-xl p-4 ${
            theme === 'dark' ? 'bg-gray-900/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <p className={`text-sm font-bold mb-3 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              معاينة الألوان:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl p-4 text-center ${
                theme === 'dark' ? 'bg-green-900/30 border-2 border-green-600' : 'bg-green-50 border-2 border-green-400'
              }`}>
                <p className={`text-xs font-bold mb-1 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-700'
                }`}>أخضر</p>
                <p className={`text-sm font-black ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-600'
                }`}>&gt; {yellowLimit}</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${
                theme === 'dark' ? 'bg-yellow-900/30 border-2 border-yellow-600' : 'bg-yellow-50 border-2 border-yellow-400'
              }`}>
                <p className={`text-xs font-bold mb-1 ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>أصفر</p>
                <p className={`text-sm font-black ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                }`}>&ge; {redLimit}</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${
                theme === 'dark' ? 'bg-red-900/30 border-2 border-red-600' : 'bg-red-50 border-2 border-red-400'
              }`}>
                <p className={`text-xs font-bold mb-1 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-700'
                }`}>أحمر</p>
                <p className={`text-sm font-black ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-600'
                }`}>&lt; {redLimit}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <ModernButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </ModernButton>
          <ModernButton
            onClick={handleSave}
            loading={loading}
          >
            حفظ الحدود
          </ModernButton>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
