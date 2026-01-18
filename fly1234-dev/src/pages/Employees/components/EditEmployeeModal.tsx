import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Users, X, Mail, Phone, DollarSign, Clock, Box, Loader2, Key, Lock, Calendar, Info, Check, Shield, UserCog, Save, AlertCircle, UserPlus, Building
} from 'lucide-react';
import { collection, doc, getDoc, updateDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createPortal } from 'react-dom';

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
  

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform animate-scaleIn max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserCog className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">تعديل بيانات الموظف</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formData.fullName}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {success && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg mb-4 flex items-center gap-2 border border-green-200 text-sm">
                    <Check className="w-5 h-5" /> {success}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 flex items-center gap-2 border border-red-200 text-sm">
                    <AlertCircle className="w-5 h-5" /> {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={formData.fullName} onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))} placeholder="الاسم الكامل" required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                    <input type="email" name="email" value={formData.email} disabled className="w-full text-center px-4 py-3 bg-gray-200 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl outline-none transition cursor-not-allowed text-gray-500" />
                    <input type="tel" name="phone" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="رقم الهاتف (اختياري)" className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                    <input type="text" name="salary" value={formData.salary} onChange={(e) => setFormData(p => ({ ...p, salary: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="الراتب (اختياري)" className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">أوقات الدوام</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                                className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">من</span>
                            </div>
                            <div className="relative">
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                                className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">إلى</span>
                            </div>
                        </div>
                    </div>
                    
                    <select name="permissionGroupId" value={formData.permissionGroupId} onChange={(e) => setFormData(p => ({ ...p, permissionGroupId: e.target.value }))} required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                      <option value="">اختر مجموعة الصلاحيات</option>
                      {permissions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="relative">
                      <select name="safeId" value={formData.safeId} onChange={(e) => setFormData(p => ({ ...p, safeId: e.target.value }))} required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                        <option value="">اختر الصندوق</option>
                        {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    
                     <select name="departmentId" value={formData.departmentId} onChange={(e) => setFormData(p => ({ ...p, departmentId: e.target.value }))} className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                      <option value="">اختر القسم</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div className="md:col-span-2">
                       <input type="password" name="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)" minLength={8} autoComplete="new-password" className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200" style={{backgroundColor: formData.isActive ? '#10b981' : '#d1d5db'}}
                            onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                            >
                                <span className={`${formData.isActive ? 'translate-x-1' : 'translate-x-7'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                {formData.isActive ? 'موظف نشط' : 'موظف غير نشط'}
                            </span>
                        </label>
                    </div>
                </div>
              </>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'جاري التحديث...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
