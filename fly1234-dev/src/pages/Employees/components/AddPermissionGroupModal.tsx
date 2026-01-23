import React, { useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Building2, Users, Wallet, Box, Check, Megaphone, Settings, Save, Loader as Loader2, Star, Info, Home, Plane, CheckSquare, TrendingUp, DollarSign, Link as LinkIcon, CreditCard, AlertTriangle } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';

interface Permission {
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  delete?: boolean;
  print?: boolean;
  transfer?: boolean;
  confirm?: boolean;
  settlement?: boolean;
  filter?: boolean;
  auditTransfer?: boolean;
  auditEntry?: boolean;
  [key: string]: boolean | undefined;
}

interface FormData {
  name: string;
  description: string;
  color: string;
  permissions: {
    [key: string]: Permission;
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  webWindows: Array<{
    id: number;
    name: string;
    permissions: string[];
  }>,
  onPermissionAdded: () => void;
};

export default function AddPermissionGroupModal({ isOpen, onClose, webWindows, onPermissionAdded }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    description: '',
    color: '#4f46e5',
    permissions: {}
  });
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // When isAdmin changes, update all permissions
  useEffect(() => {
    if (isAdmin) {
      // Enable all permissions when admin is toggled on
      const allPermissionsEnabled: { [key: string]: Permission } = {};
      webWindows.forEach(window => {
        allPermissionsEnabled[window.name] = window.permissions.reduce<Permission>((acc, permission) => ({
          ...acc,
          [permission]: true
        }), {});
      });
      setFormData(prev => ({ ...prev, permissions: allPermissionsEnabled }));
    }
  }, [isAdmin, webWindows]);

  // Initialize permissions state
  useEffect(() => {
    // Initialize permissions for all windows
    const initialPermissions: { [key: string]: Permission } = {};
    webWindows.forEach(window => {
      initialPermissions[window.name] = window.permissions.reduce<Permission>((acc, permission) => ({
        ...acc,
        [permission]: false
      }), {});
    });

    setFormData(prev => ({ ...prev, permissions: initialPermissions }));
  }, [webWindows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!formData.name) {
        throw new Error('يرجى إدخال اسم المجموعة');
      }

      // Check if a group with this name already exists
      const permissionsRef = collection(db, 'permissions');
      const q = query(permissionsRef, where("name", "==", formData.name));
      const existingGroups = await getDocs(q);

      if (!existingGroups.empty) {
        throw new Error('يوجد مجموعة بهذا الاسم بالفعل، يرجى اختيار اسم آخر');
      }

      // If group name is "admin", force isAdmin to true
      const finalIsAdmin = formData.name.toLowerCase() === 'admin' ? true : isAdmin;

      // Format permissions for submission
      const formattedPermissions: { [key: string]: string[] | boolean } = {
        isAdmin: finalIsAdmin
      };

      // If admin, grant all permissions automatically
      if (finalIsAdmin) {
        webWindows.forEach(window => {
          formattedPermissions[window.name] = [...window.permissions];
        });
      } else {
        Object.entries(formData.permissions).forEach(([window, perms]) => {
          const enabledPerms = Object.entries(perms)
            .filter(([_, enabled]) => enabled)
            .map(([perm]) => perm);

          formattedPermissions[window] = enabledPerms;
        });
      }

      // Add to Firestore
      await addDoc(collection(db, 'permissions'), {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        permissions: formattedPermissions,
        created_by: user?.uid || '',
        created_at: serverTimestamp()
      });

      // Reset form
      setFormData({ name: '', description: '', color: '#4f46e5', permissions: {} });
      setIsAdmin(false);

      // Show success message
      setSuccess('تم إضافة مجموعة الصلاحيات بنجاح');

      // Notify parent to refresh data
      onPermissionAdded();

      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المجموعة');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (windowName: string, permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [windowName]: {
          ...prev.permissions[windowName],
          [permission]: checked
        }
      }
    }));
  };

  // Function to toggle all permissions for a window
  const toggleAllPermissions = (windowName: string, checked: boolean) => {
    const windowPermissions = webWindows.find(w => w.name === windowName)?.permissions || [];

    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [windowName]: windowPermissions.reduce((acc, permission) => ({
          ...acc,
          [permission]: checked
        }), {})
      }
    }));
  };

  // Function to check if all permissions for a window are enabled
  const areAllPermissionsEnabled = (windowName: string) => {
    const windowPermissions = webWindows.find(w => w.name === windowName)?.permissions || [];
    const currentPermissions = formData.permissions[windowName] || {};

    return windowPermissions.every(permission => currentPermissions[permission]);
  };

  const getWindowIcon = (windowName: string) => {
    if (windowName === 'الشركات') return <Building2 className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الموظفين') return <Users className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الحسابات') return <Wallet className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الصناديق') return <Box className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'اعلان') return <Megaphone className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الأرصدة') return <DollarSign className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'API') return <LinkIcon className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الاعدادات') return <Settings className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'لوحة التحكم') return <Home className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'التذاكر') return <Plane className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'التدقيق') return <CheckSquare className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'الأرباح') return <TrendingUp className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'المشاكل المعلقة') return <AlertTriangle className="w-4 h-4 text-indigo-600" />;
    if (windowName === 'مشاكل بوابة الماستر') return <CreditCard className="w-4 h-4 text-indigo-600" />;
    return <Settings className="w-4 h-4 text-indigo-600" />;
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة مجموعة صلاحيات"
      size="lg"
    >
      <div className="flex flex-col h-full">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4 flex items-center gap-2 text-sm border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg mb-4 flex items-center gap-2 text-sm border border-green-100">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Group Information */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    اسم المجموعة
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: مدير، محاسب..."
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData(prev => ({ ...prev, name: newName }));
                      if (newName.toLowerCase() === 'admin') {
                        setIsAdmin(true);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 w-full">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAdmin ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        onClick={() => setIsAdmin(!isAdmin)}
                      >
                        <span
                          className={`${isAdmin ? '-translate-x-6' : '-translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500" />
                          مدير النظام
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          يمنح جميع الصلاحيات في النظام
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-[10px] text-amber-800 dark:text-amber-400 font-bold">
                      <p className="mb-1">تم تفعيل صلاحيات المدير</p>
                      <p>سيتم منح جميع الصلاحيات تلقائياً لهذه المجموعة</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Windows Permissions */}
            <div className="space-y-3 max-h-[40vh] md:max-h-[50vh] overflow-y-auto px-1 custom-scrollbar text-right" dir="rtl">
              {webWindows.map((window) => (
                <div key={window.id} className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        {getWindowIcon(window.name)}
                      </div>
                      <span className="font-bold text-gray-800 dark:text-white">{window.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) {
                          toggleAllPermissions(window.name, !areAllPermissionsEnabled(window.name));
                        }
                      }}
                      disabled={isAdmin}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${isAdmin
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : areAllPermissionsEnabled(window.name)
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100'
                        }`}
                    >
                      {areAllPermissionsEnabled(window.name) ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {window.permissions.sort((a, b) => {
                      const order = { 'view': 0, 'add': 1, 'edit': 2, 'delete': 3 };
                      const aOrder = order[a as keyof typeof order] ?? 4;
                      const bOrder = order[b as keyof typeof order] ?? 4;
                      return aOrder - bOrder;
                    }).map((permission) => {
                      const currentPermissions = formData.permissions[window.name] || {};
                      const isChecked = currentPermissions[permission];

                      return (
                        <button
                          key={permission}
                          type="button"
                          onClick={() => {
                            if (!isAdmin) {
                              handlePermissionChange(window.name, permission, !isChecked);
                            }
                          }}
                          disabled={isAdmin}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${isAdmin || isChecked
                            ? (
                              permission === 'view' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-100' :
                                permission === 'add' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-100' :
                                  permission === 'edit' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100' :
                                    permission === 'delete' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100' :
                                      'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100'
                            )
                            : 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {(isAdmin || isChecked) && <Check className="w-3 h-3" />}
                          {permission === 'view' ? 'عرض' :
                            permission === 'add' ? 'اضافة' :
                              permission === 'edit' ? 'تعديل' :
                                permission === 'delete' ? 'حذف' :
                                  permission === 'print' ? 'طباعة' :
                                    permission === 'reset' ? 'تدوير' :
                                      permission === 'currency' ? 'عملة' :
                                        permission === 'settlement' ? 'تحاسب' :
                                          permission === 'confirm' ? 'تأكيد' :
                                            permission === 'auditTransfer' ? 'تدقيق' :
                                              permission === 'auditEntry' ? 'ادخال' :
                                                permission === 'audit' ? 'تدقيق' :
                                                  permission === 'filter' ? 'فلترة' :
                                                    permission}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الإضافة...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>إضافة المجموعة</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </ModernModal>
  );
}
