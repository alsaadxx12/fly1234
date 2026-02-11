import React from 'react';
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

import { Trash2, Globe, Check, Loader2, Printer, CircleAlert as AlertCircle } from 'lucide-react';
import PrintTemplateEditor from './PrintTemplateEditor';
import AISettingsTab from './AISettingsTab';
import LanguageSettings from './LanguageSettings';
import CompanySettings from './CompanySettings';

export default function SystemSettings() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = React.useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = React.useState(false);
  const [_error, setError] = React.useState<string | null>(null);
  const [allowCustomCompanies, setAllowCustomCompanies] = React.useState(true);
  const [_settingsSuccess, setSettingsSuccess] = React.useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = React.useState('');
  const [_showApiKey, _setShowApiKey] = React.useState(false);
  const [_isTestingKey, setIsTestingKey] = React.useState(false);
  const [_keyTestResult, setKeyTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  React.useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        const settingsRef = doc(db, 'system_settings', 'global');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAllowCustomCompanies(data.allowCustomCompanies === true);
          if (data.aiApiKey) {
            setAiApiKey(data.aiApiKey);
            localStorage.setItem('ai_api_key', data.aiApiKey);
            localStorage.setItem('openai_api_key', data.aiApiKey);
          }
        }

        const storedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('openai_api_key');
        if (storedKey && !aiApiKey) {
          setAiApiKey(storedKey);
        }
      } catch (error) {
        console.error('Error loading system settings:', error);
      }
    };

    loadSystemSettings();
  }, []);

  const handleDeleteAllCompanies = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setDeleteSuccess('تم حذف جميع الشركات بنجاح');
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setDeleteSuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Error deleting companies:', error);
      setDeleteError('فشل في حذف الشركات');
    } finally {
      setIsDeleting(false);
    }
  };

  const _handleTestApiKey = async () => {
    if (!aiApiKey.trim()) {
      setKeyTestResult({ success: false, message: 'يرجى إدخال مفتاح API أولاً' });
      return;
    }

    setIsTestingKey(true);
    setKeyTestResult(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiApiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'مرحبا' }]
          }]
        })
      });

      if (response.ok) {
        setKeyTestResult({ success: true, message: '✓ المفتاح صالح ويعمل بشكل صحيح!' });
      } else {
        await response.json().catch(() => ({}));
        let errorMsg = 'المفتاح غير صالح';

        if (response.status === 400) {
          errorMsg = 'المفتاح غير صحيح';
        } else if (response.status === 429) {
          errorMsg = 'تم تجاوز حد الاستخدام';
        }

        setKeyTestResult({ success: false, message: `✗ ${errorMsg}` });
      }
    } catch (error) {
      setKeyTestResult({ success: false, message: '✗ فشل الاتصال بخادم Google AI' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    setError(null);
    setSettingsSuccess(null);

    try {
      const settingsRef = doc(db, 'system_settings', 'global');
      const settingsDoc = await getDoc(settingsRef);

      if (aiApiKey.trim()) {
        localStorage.setItem('ai_api_key', aiApiKey.trim());
        localStorage.setItem('openai_api_key', aiApiKey.trim());
      } else {
        localStorage.removeItem('ai_api_key');
        localStorage.removeItem('openai_api_key');
      }

      window.dispatchEvent(new CustomEvent('apikey-updated', {
        detail: { apiKey: aiApiKey.trim() }
      }));

      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
          allowCustomCompanies,
          aiApiKey: aiApiKey.trim(),
          updatedAt: new Date()
        });
      } else {
        await setDoc(settingsRef, {
          allowCustomCompanies,
          aiApiKey: aiApiKey.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setSettingsSuccess('تم حفظ الإعدادات بنجاح');

      setTimeout(() => {
        setSettingsSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      setError('فشل في حفظ الإعدادات');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* AI Settings */}
      <AISettingsTab />

      {/* Language Settings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl shadow-inner">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">إعدادات اللغة والمنطقة</h3>
              <p className="text-sm text-gray-500 mt-1">تخصيص لغة النظام والتوقيت المحلي</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <LanguageSettings />
        </div>
      </div>

      {/* Print Templates */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl shadow-inner">
              <Printer className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">قوالب الطباعة</h3>
              <p className="text-sm text-gray-500 mt-1">تخصيص تصميم وشكل سندات القبض والدفع</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <PrintTemplateEditor />
        </div>
      </div>

      {/* Company Settings */}
      <CompanySettings />

      {/* Save Button */}
      <div className="flex items-center justify-end pt-6 border-t-2 border-gray-200/50">
        <button
          onClick={handleUpdateSettings}
          disabled={isUpdatingSettings}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-medium"
        >
          {isUpdatingSettings ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>حفظ الإعدادات</span>
            </>
          )}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">منطقة الخطر</h3>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                الإجراءات في هذا القسم خطيرة وقد تؤدي إلى حذف دائم للبيانات. يرجى المتابعة بحذر.
              </p>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف جميع الشركات</span>
              </button>
            </div>
          </div>

          {deleteSuccess && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm flex items-center gap-2 border border-green-200">
              <Check className="w-5 h-5" />
              <span>{deleteSuccess}</span>
            </div>
          )}

          {deleteError && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-5 h-5" />
              <span>{deleteError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-md mx-4 w-full overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gradient-to-r from-red-600 to-rose-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50/20 rounded-xl">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">تأكيد الحذف</h3>
                  <p className="text-sm text-red-100 mt-1">هذا الإجراء لا يمكن التراجع عنه</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف <span className="font-bold text-red-600">جميع الشركات</span>؟
                سيتم حذف كافة البيانات المتعلقة بالشركات بشكل نهائي ولا يمكن استرجاعها.
              </p>

              <div className="flex items-center gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteAllCompanies}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-medium"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>نعم، احذف الكل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
