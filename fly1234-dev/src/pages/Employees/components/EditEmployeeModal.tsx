import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Users, X, Mail, Phone, DollarSign, Clock, Box, Loader2, Key, Lock, Calendar, Info, Check, Shield, UserCog, Save, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { collection, doc, getDoc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import AdminReauthModal from './AdminReauthModal';
import ModernModal from '../../../components/ModernModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
  onUpdate: () => void;
};

interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  salary: string;
  password?: string;
  startTime: string;
  endTime: string;
  permissionGroupId: string;
  safeId: string;
  isActive: boolean;
  departmentId: string;
}

interface Permission {
  id: string;
  name: string;
  permissions: Record<string, string[] | boolean>;
}

interface Department {
  id: string;
  name: string;
}

export default function EditEmployeeModal({ isOpen, onClose, employeeId, onUpdate }: Props) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    email: '',
    phone: '',
    salary: '',
    password: '',
    startTime: '09:00',
    endTime: '17:00',
    permissionGroupId: '',
    safeId: '',
    isActive: true,
    departmentId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [safes, setSafes] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminReauthModalOpen, setIsAdminReauthModalOpen] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId) return;

      setIsLoading(true);
      try {
        const [employeeDoc, permissionsSnapshot, safesSnapshot, departmentsSnapshot] = await Promise.all([
          getDoc(doc(db, 'employees', employeeId)),
          getDocs(query(collection(db, 'permissions'), orderBy('name', 'asc'))),
          getDocs(query(collection(db, 'safes'), orderBy('name', 'asc'))),
          getDocs(query(collection(db, 'departments'), orderBy('name', 'asc')))
        ]);

        if (employeeDoc.exists()) {
          const data = employeeDoc.data();
          const employeeData = {
            fullName: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            salary: data.salary?.toString() || '',
            password: '',
            startTime: data.startTime || '09:00',
            endTime: data.endTime || '17:00',
            permissionGroupId: data.role || '',
            safeId: data.safeId || '',
            isActive: data.isActive ?? true,
            departmentId: data.departmentId || '',
          };
          setFormData(employeeData);
          setStoredPassword(data.password || '');
        }

        const permissionsData = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[];
        setPermissions(permissionsData);

        const safesData = safesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setSafes(safesData);

        const departmentsData = departmentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Department[];
        setDepartments(departmentsData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('فشل في تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    } else {
      setFormData({
        fullName: '', email: '', password: '', phone: '',
        salary: '', permissionGroupId: '', safeId: '', isActive: true, departmentId: '',
        startTime: '09:00', endTime: '17:00'
      });
      setError(null);
      setSuccess(null);
      setIsAdminAuthenticated(false);
      setShowPassword(false);
    }
  }, [isOpen, employeeId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const updateData: any = {
        name: formData.fullName,
        phone: formData.phone,
        role: formData.permissionGroupId,
        salary: parseFloat(formData.salary) || 0,
        startTime: formData.startTime,
        endTime: formData.endTime,
        safeId: formData.safeId,
        isActive: formData.isActive,
        departmentId: formData.departmentId,
        updatedAt: new Date()
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateDoc(doc(db, 'employees', employeeId), updateData);

      setSuccess('تم تحديث بيانات الموظف بنجاح');
      onUpdate();

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error updating employee:', error);
      setError(error instanceof Error ? error.message : 'فشل في تحديث بيانات الموظف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل بيانات الموظف"
      description={formData.fullName}
      icon={<UserCog className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            إلغاء
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'جاري التحديث...' : 'حفظ التغييرات'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-2 border border-green-200 dark:border-green-800 text-sm">
                <Check className="w-5 h-5" /> {success}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800 text-sm">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">الاسم الكامل</label>
                <input type="text" value={formData.fullName} onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="الاسم الكامل" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">البريد الإلكتروني</label>
                <input type="email" value={formData.email} disabled className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none transition cursor-not-allowed text-gray-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">رقم الهاتف</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="رقم الهاتف" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">الراتب</label>
                <input type="text" value={formData.salary} onChange={(e) => setFormData(p => ({ ...p, salary: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="الراتب" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">أوقات الدوام</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))} className="w-full text-center px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">من</span>
                  </div>
                  <div className="relative">
                    <input type="time" value={formData.endTime} onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))} className="w-full text-center px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">إلى</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">مجموعة الصلاحيات</label>
                <select value={formData.permissionGroupId} onChange={(e) => setFormData(p => ({ ...p, permissionGroupId: e.target.value }))} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر مجموعة الصلاحيات</option>
                  {permissions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">الصندوق</label>
                <select value={formData.safeId} onChange={(e) => setFormData(p => ({ ...p, safeId: e.target.value }))} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر الصندوق</option>
                  {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">القسم</label>
                <select value={formData.departmentId} onChange={(e) => setFormData(p => ({ ...p, departmentId: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر القسم</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 mr-2">كلمة المرور</label>
                <div className="relative group/pass">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={isAdminAuthenticated ? (formData.password || storedPassword) : "********"}
                    onChange={(e) => {
                      if (isAdminAuthenticated) {
                        setFormData(p => ({ ...p, password: e.target.value }));
                      }
                    }}
                    placeholder={isAdminAuthenticated ? "كلمة المرور الحالية" : "انقر للقفل للعرض"}
                    disabled={!isAdminAuthenticated}
                    className={`w-full pr-4 pl-10 py-3 rounded-xl border transition appearance-none outline-none ${isAdminAuthenticated
                        ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:border-blue-500'
                        : 'bg-gray-100 dark:bg-gray-800 border-transparent cursor-not-allowed text-gray-400'
                      }`}
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {!isAdminAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => setIsAdminReauthModalOpen(true)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                        title="تحقق من الهوية لعرض كلمة المرور"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                {isAdminAuthenticated && (
                  <p className="text-[10px] text-blue-500 font-bold mt-1 px-2">يمكنك الآن رؤية وتعديل كلمة المرور</p>
                )}
              </div>
              <div className="md:col-span-2 flex items-center justify-center p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/50">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 shadow-inner"
                    style={{ backgroundColor: formData.isActive ? '#10b981' : '#cbd5e1' }}
                    onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                  >
                    <span className={`${formData.isActive ? 'translate-x-1.5' : 'translate-x-[2.1rem]'} inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-sm group-hover:scale-110`} />
                  </div>
                  <span className={`font-bold transition-colors duration-300 ${formData.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {formData.isActive ? 'موظف نشط حالياً' : 'موظف غير نشط'}
                  </span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      <AdminReauthModal
        isOpen={isAdminReauthModalOpen}
        onClose={() => setIsAdminReauthModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setShowPassword(true);
        }}
        description="يرجى إدخال كلمة مرور الإدمن الخاصة بك لعرض و تعديل كلمة مرور الموظف"
      />
    </ModernModal>
  );
}
