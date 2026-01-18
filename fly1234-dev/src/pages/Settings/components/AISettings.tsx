import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Brain, Key, Save, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import ModernButton from '../../../components/ModernButton';
import ModernInput from '../../../components/ModernInput';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function AISettings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const settingsRef = doc(db, 'settings', 'ai');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setApiKey(data.openai_api_key || '');
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const settingsRef = doc(db, 'settings', 'ai');
      await setDoc(settingsRef, {
        openai_api_key: apiKey.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user.email
      }, { merge: true });

      setSaveSuccess(true);
      window.dispatchEvent(new Event('ai-settings-updated'));

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving AI settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${
      theme === 'dark'
        ? 'bg-gray-800/60 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${
          theme === 'dark'
            ? 'from-purple-600 to-blue-600'
            : 'from-purple-500 to-blue-500'
        }`}>
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className={`text-lg font-bold ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
          }`}>إعدادات الذكاء الصناعي</h3>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>إعدادات OpenAI API</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 animate-spin ${
            theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
          }`} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            theme === 'dark'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">كيفية الحصول على مفتاح API:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>قم بزيارة <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></li>
                <li>سجل الدخول أو أنشئ حساباً جديداً</li>
                <li>انتقل إلى صفحة API Keys</li>
                <li>انقر على "Create new secret key"</li>
                <li>انسخ المفتاح والصقه هنا</li>
              </ol>
            </div>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={`w-full px-4 py-3 rounded-xl border pr-12 focus:outline-none focus:ring-2 transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:ring-purple-500'
                  : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-purple-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              {showApiKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className={`text-xs mt-2 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            المفتاح عام ومشترك بين جميع الموظفين في النظام
          </p>
        </div>

        {saveSuccess && (
          <div className={`p-4 rounded-xl border ${
            theme === 'dark'
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`} />
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-green-400' : 'text-green-700'
              }`}>
                تم حفظ الإعدادات بنجاح
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <ModernButton
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-4 h-4 ml-2" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </ModernButton>
        </div>
      </div>

      <div className={`mt-6 p-4 rounded-xl border ${
        theme === 'dark'
          ? 'bg-gray-700/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h4 className={`font-medium mb-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>الميزات المتاحة:</h4>
        <ul className={`space-y-2 text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>مساعد ذكي للدردشة والإجابة على الأسئلة</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>رؤى ذكية وتحليلات مالية مخصصة</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>توصيات لتحسين الأداء المالي</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>تنبيهات ذكية للمواعيد والاستحقاقات</span>
          </li>
        </ul>
      </div>
      )}
    </div>
  );
}
