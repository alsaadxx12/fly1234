import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
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

interface PermissionWindow {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

interface PermissionEditorProps {
  groupId: string;
  permissions: {
    [key: string]: string[] | boolean;
  };
  windows: PermissionWindow[];
  onSave: (groupId: string, permissions: { [key: string]: string[] }) => Promise<void>;
  isAdmin: boolean;
}

const PermissionEditor: React.FC<PermissionEditorProps> = ({
  groupId,
  permissions,
  windows,
  onSave,
  isAdmin
}) => {
  const { t } = useLanguage();
  const [editedPermissions, setEditedPermissions] = useState<{ [key: string]: string[] }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const initialEdited: { [key: string]: string[] } = {};
    windows.forEach(win => {
        const perms = permissions[win.name];
        if (Array.isArray(perms)) {
            initialEdited[win.name] = [...perms];
        } else {
            // Ensure it's always an array, handle boolean case for legacy data
            initialEdited[win.name] = perms === true ? [...win.permissions] : [];
        }
    });
    setEditedPermissions(initialEdited);
  }, [permissions, windows]);

  // Get icon for window
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

  const handlePermissionToggle = (windowName: string, permission: string) => {
    setEditedPermissions(prev => {
        const currentPermissions = Array.isArray(prev[windowName]) ? prev[windowName] : [];
        const newPermissions = currentPermissions.includes(permission)
            ? currentPermissions.filter(p => p !== permission)
            : [...currentPermissions, permission];
        return {
            ...prev,
            [windowName]: newPermissions
        };
    });
  };
  
  // Function to toggle all permissions for a window
  const toggleAllPermissions = (windowName: string, checked: boolean) => {
    const windowPermissions = windows.find(w => w.name === windowName)?.permissions || [];
    
    setEditedPermissions(prev => ({
      ...prev,
      [windowName]: checked ? [...windowPermissions] : []
    }));
  };

  // Function to check if all permissions for a window are enabled
  const areAllPermissionsEnabled = (windowName: string) => {
    const windowPermissions = windows.find(w => w.name === windowName)?.permissions || [];
    const currentPermissions = Array.isArray(editedPermissions[windowName]) ? editedPermissions[windowName] : [];
    
    return windowPermissions.length > 0 && windowPermissions.every(permission => currentPermissions.includes(permission));
  };
  
  // Save permissions
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(groupId, editedPermissions);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
        console.error("Save failed in editor:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-700">تعديل الصلاحيات</span>
        </div>
        <p className="text-blue-600">
          قم بتحديد أو إلغاء تحديد الصلاحيات المطلوبة لكل قسم من أقسام النظام.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {windows.map((window) => (
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
                  checked={isAdmin || areAllPermissionsEnabled(window.name)}
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
                const currentPermissions = Array.isArray(editedPermissions[window.name]) ? editedPermissions[window.name] : [];
                const isChecked = isAdmin || currentPermissions.includes(permission);
                
                return (
                  <label 
                    key={permission}
                    className="flex items-center gap-1.5 cursor-pointer group hover:opacity-90 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (!isAdmin) {
                          handlePermissionToggle(window.name, permission);
                        }
                      }}
                      className="sr-only peer"
                      disabled={isAdmin}
                    />
                    <span className={`px-2 py-1.5 text-xs rounded-lg transition-all w-full text-center font-medium ${
                      isChecked ? (
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
                      <Check className={`w-3 h-3 mr-0.5 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
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
      
      <div className="flex items-center justify-end gap-3 mt-4">
        {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-fadeIn">
                <CheckCircle2 className="w-5 h-5" />
                <span>تم الحفظ بنجاح!</span>
            </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || Object.keys(editedPermissions).length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PermissionEditor;
