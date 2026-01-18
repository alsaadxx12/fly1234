import React, { useState, useEffect } from 'react';
import { X, Settings, Percent, TrendingUp, Building2, Save, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getProfitSettings, saveProfitSettings, ProfitSettings } from '../../../lib/services/profitSettingsService';
import ModernButton from '../../../components/ModernButton';
import ModernInput from '../../../components/ModernInput';

interface ProfitSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ProfitSettingsModal({ isOpen, onClose, onSave }: ProfitSettingsModalProps) {
  const { theme } = useTheme();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeePercentage, setEmployeePercentage] = useState<number>(10);
  const [companyPercentage, setCompanyPercentage] = useState<number>(90);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    setCompanyPercentage(100 - employeePercentage);
    setError('');
  }, [employeePercentage]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getProfitSettings();
      setEmployeePercentage(settings.employeeProfitPercentage);
      setCompanyPercentage(settings.companyProfitPercentage);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (employeePercentage < 0 || employeePercentage > 100) {
      setError('يجب أن تكون النسبة بين 0 و 100');
      return;
    }

    if (employeePercentage + companyPercentage !== 100) {
      setError('يجب أن يكون مجموع النسب = 100%');
      return;
    }

    setSaving(true);
    try {
      const success = await saveProfitSettings({
        employeeProfitPercentage: employeePercentage,
        companyProfitPercentage: companyPercentage
      }, employee?.id);

      if (success) {
        onSave();
        onClose();
      } else {
        setError('فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-2xl w-full max-w-2xl`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <Settings className={`w-6 h-6 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              إعدادات نسب الأرباح
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                جاري التحميل...
              </p>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 ${
                theme === 'dark' ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                    }`}>
                      ملاحظة مهمة
                    </p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'
                    }`}>
                      هذه النسب تحدد كيفية توزيع الأرباح بين الموظفين والشركة.
                      سيتم تطبيق هذه النسب على جميع حسابات الأرباح في النظام.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`rounded-xl p-6 ${
                  theme === 'dark' ? 'bg-emerald-900/20 border-2 border-emerald-700/30' : 'bg-emerald-50 border-2 border-emerald-300'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${
                      theme === 'dark' ? 'bg-emerald-800/50' : 'bg-emerald-200'
                    }`}>
                      <TrendingUp className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                      }`} />
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-emerald-300' : 'text-emerald-900'
                    }`}>
                      نسبة ربح الموظف
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <ModernInput
                      label="النسبة المئوية"
                      type="number"
                      value={employeePercentage.toString()}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (value >= 0 && value <= 100) {
                          setEmployeePercentage(value);
                        }
                      }}
                      min="0"
                      max="100"
                      step="0.1"
                      icon={<Percent className="w-5 h-5" />}
                    />

                    <div className={`text-center py-4 rounded-xl ${
                      theme === 'dark' ? 'bg-emerald-800/30' : 'bg-emerald-100'
                    }`}>
                      <div className={`text-4xl font-black mb-1 ${
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                      }`}>
                        {employeePercentage.toFixed(1)}%
                      </div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-emerald-300/70' : 'text-emerald-600'
                      }`}>
                        من إجمالي الأرباح
                      </div>
                    </div>

                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-emerald-300/60' : 'text-emerald-700/70'
                    }`}>
                      مثال: إذا كان الربح الإجمالي $1,000 فإن ربح الموظف = ${((1000 * employeePercentage) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl p-6 ${
                  theme === 'dark' ? 'bg-blue-900/20 border-2 border-blue-700/30' : 'bg-blue-50 border-2 border-blue-300'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${
                      theme === 'dark' ? 'bg-blue-800/50' : 'bg-blue-200'
                    }`}>
                      <Building2 className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                      }`} />
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                    }`}>
                      نسبة ربح الشركة
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <ModernInput
                      label="النسبة المئوية (تلقائي)"
                      type="number"
                      value={companyPercentage.toString()}
                      onChange={() => {}}
                      disabled
                      icon={<Percent className="w-5 h-5" />}
                    />

                    <div className={`text-center py-4 rounded-xl ${
                      theme === 'dark' ? 'bg-blue-800/30' : 'bg-blue-100'
                    }`}>
                      <div className={`text-4xl font-black mb-1 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                      }`}>
                        {companyPercentage.toFixed(1)}%
                      </div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-blue-300/70' : 'text-blue-600'
                      }`}>
                        من إجمالي الأرباح
                      </div>
                    </div>

                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-blue-300/60' : 'text-blue-700/70'
                    }`}>
                      مثال: إذا كان الربح الإجمالي $1,000 فإن ربح الشركة = ${((1000 * companyPercentage) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`rounded-xl p-4 ${
                  theme === 'dark' ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`} />
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-red-300' : 'text-red-800'
                    }`}>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className={`rounded-xl p-4 ${
                theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    المجموع
                  </span>
                  <span className={`text-lg font-black ${
                    employeePercentage + companyPercentage === 100
                      ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                      : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                  }`}>
                    {(employeePercentage + companyPercentage).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${employeePercentage}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{ width: `${companyPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <ModernButton
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </ModernButton>
          <ModernButton
            variant="primary"
            onClick={handleSave}
            disabled={loading || saving || employeePercentage + companyPercentage !== 100}
            icon={<Save className="w-4 h-4" />}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </ModernButton>
        </div>
      </div>
    </div>
  );
}
