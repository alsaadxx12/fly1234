import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Building2, Trash2, AlertCircle, Check, Info, Shield } from 'lucide-react';
import SettingsCard from '../../../components/SettingsCard';
import SettingsToggle from '../../../components/SettingsToggle';
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function CompanySettings() {
  const { theme } = useTheme();
  const [allowCustomCompanies, setAllowCustomCompanies] = React.useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteSuccess, setDeleteSuccess] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'system_settings', 'global');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAllowCustomCompanies(data.allowCustomCompanies === true);
        }
      } catch (error) {
        console.error('Error loading company settings:', error);
      }
    };

    loadSettings();
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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'system_settings', 'global');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
          allowCustomCompanies,
          updatedAt: new Date()
        });
      } else {
        await setDoc(settingsRef, {
          allowCustomCompanies,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={Building2}
        title="إعدادات إدارة الشركات"
        description="تخصيص كيفية إضافة وإدارة الشركات"
      >
        <div className="space-y-4">
          <SettingsToggle
            icon={Building2}
            title="السماح بإضافة كيانات مخصصة"
            description="السماح بإضافة شركات/عملاء غير موجودين في قاعدة البيانات"
            checked={allowCustomCompanies}
            onChange={setAllowCustomCompanies}
            color="blue"
          />

          <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-lg mt-0.5">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  ملاحظة هامة
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                  عند تفعيل هذه الميزة، يمكن للمستخدمين إضافة شركات أو عملاء غير موجودين في قاعدة البيانات عند إنشاء السندات.
                  عند تعطيلها، يجب إضافة الشركات أولاً من صفحة الشركات.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Shield}
        title="منطقة الخطر"
        description="إجراءات خطيرة تؤثر على بيانات الشركات"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-800/40 rounded-lg mt-0.5">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  تحذير: إجراء خطير
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed mb-4">
                  حذف جميع الشركات سيؤدي إلى إزالة كافة البيانات المتعلقة بالشركات من النظام بشكل نهائي.
                  هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف جميع الشركات</span>
                </button>
              </div>
            </div>
          </div>

          {deleteSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-700 flex items-center gap-3">
              <div className="p-1 bg-green-100 dark:bg-green-800/50 rounded-lg">
                <Check className="w-5 h-5" />
              </div>
              <span className="font-medium">{deleteSuccess}</span>
            </div>
          )}

          {deleteError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700 flex items-center gap-3">
              <div className="p-1 bg-red-100 dark:bg-red-800/50 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="font-medium">{deleteError}</span>
            </div>
          )}
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </div>
        </button>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-0 max-w-md mx-4 w-full overflow-hidden">
            <div className="p-6 bg-red-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50/20 rounded-lg">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">تأكيد الحذف</h3>
                  <p className="text-sm text-red-100 mt-1">هذا الإجراء لا يمكن التراجع عنه</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف <span className="font-bold text-red-600 dark:text-red-400">جميع الشركات</span>؟
                سيتم حذف كافة البيانات المتعلقة بالشركات بشكل نهائي ولا يمكن استرجاعها.
              </p>

              <div className="flex items-center gap-3 justify-end pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
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
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
