import React, { useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { X, CircleAlert as AlertCircle, Shield, CircleCheck as CheckCircle2, Lock, Building2, Users, Wallet, Box, Check, Megaphone, Settings, Save, Loader as Loader2, Star, ShieldCheck, Info, Home, Plane, CheckSquare, TrendingUp, DollarSign, Link as LinkIcon, CreditCard, AlertTriangle } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col">
        {/* Header with gradient background */}
        <div className="relative p-4 text-white overflow-hidden" style={{ backgroundColor: 'rgb(35 0 90)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/10 rounded-full -mt-32 -mr-32 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-50/5 rounded-full -mb-32 -ml-32 blur-2xl"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">إضافة مجموعة صلاحيات</h3>
                <p className="text-white/80 text-xs">تحديد صلاحيات الوصول للمستخدمين</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4 flex flex-col overflow-hidden flex-1">
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

          <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4 overflow-hidden">
            <div className="grid grid-cols-1 gap-4 overflow-hidden">
              {/* Group Information */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        // Auto-enable isAdmin if name is "admin"
                        if (newName.toLowerCase() === 'admin') {
                          setIsAdmin(true);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 shadow-sm"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 w-full">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          style={{ backgroundColor: isAdmin ? '#4f46e5' : '#d1d5db' }}
                          onClick={() => setIsAdmin(!isAdmin)}
                        >
                          <span
                            className={`${
                              isAdmin ? 'translate-x-1' : 'translate-x-7'
                            } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                          />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800 flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500" />
                            مدير النظام
                          </span>
                          <p className="text-xs text-gray-500">
                            يمنح جميع الصلاحيات في النظام
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Admin Notice */}
                {isAdmin && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold mb-1">تم تفعيل صلاحيات المدير</p>
                        <p>سيتم منح جميع الصلاحيات تلقائياً لهذه المجموعة</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Windows Permissions */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm overflow-y-auto" style={{ maxHeight: 'calc(70vh - 250px)' }}>
                <div className="grid grid-cols-1 gap-3">
                  {webWindows.map((window) => (
                    <div key={window.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-lg shadow-inner">
                            {getWindowIcon(window.name)}
                          </div>
                          <span className="font-medium text-gray-800">{window.name}</span>
                        </div>
                        
                        <label className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-xs ${
                          isAdmin
                            ? 'bg-gray-100 cursor-not-allowed opacity-50'
                            : 'bg-blue-50 cursor-pointer hover:bg-blue-100'
                        }`}>
                          <input
                            type="checkbox"
                            checked={areAllPermissionsEnabled(window.name)}
                            onChange={(e) => {
                              if (!isAdmin) {
                                toggleAllPermissions(window.name, e.target.checked);
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            disabled={isAdmin}
                          />
                          <span className={`font-medium ${isAdmin ? 'text-gray-500' : 'text-blue-600'}`}>تحديد الكل</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {window.permissions.sort((a, b) => {
                          // Custom sort order: view first, then add, edit, delete, and others
                          const order = { 'view': 0, 'add': 1, 'edit': 2, 'delete': 3 };
                          const aOrder = order[a as keyof typeof order] ?? 4;
                          const bOrder = order[b as keyof typeof order] ?? 4;
                          return aOrder - bOrder;
                        }).map((permission) => {
                          const currentPermissions = formData.permissions[window.name] || {};
                          const isChecked = currentPermissions[permission];
                          
                          return (
                            <label 
                              key={permission}
                              className="flex items-center gap-1.5 cursor-pointer group hover:opacity-90 transition-all"
                            >
                              <input
                                type="checkbox"
                                checked={isAdmin || isChecked}
                                onChange={(e) => {
                                  if (!isAdmin) {
                                    handlePermissionChange(window.name, permission, e.target.checked);
                                  }
                                }}
                                className="sr-only peer"
                                disabled={isAdmin}
                              />
                              <span className={`px-2 py-1.5 text-xs rounded-lg transition-all w-full text-center font-medium ${
                                isAdmin || isChecked ? (
                                  permission === 'view' ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' :
                                  permission === 'add' ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' :
                                  permission === 'edit' ? 'bg-orange-100 text-orange-700 border border-orange-200 shadow-sm' :
                                  permission === 'delete' ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm' :
                                  permission === 'print' ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm' :
                                  permission === 'reset' ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' :
                                  permission === 'currency' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' :
                                  permission === 'settlement' ? 'bg-sky-100 text-sky-700 border border-sky-200 shadow-sm' :
                                  permission === 'confirm' ? 'bg-teal-100 text-teal-700 border border-teal-200 shadow-sm' :
                                  permission === 'auditTransfer' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200 shadow-sm' :
                                  permission === 'auditEntry' ? 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 shadow-sm' :
                                  permission === 'audit' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm' :
                                  permission === 'filter' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' :
                                  'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                                ) : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 hover:border-gray-300'
                              } group-hover:shadow-sm flex items-center justify-center`}>
                                <Check className={`w-3 h-3 mr-0.5 ${(isAdmin || isChecked) ? 'opacity-100' : 'opacity-0'}`} />
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
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 mt-auto sticky bottom-0 bg-gray-50 pb-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name}
                className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md disabled:opacity-50"
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
