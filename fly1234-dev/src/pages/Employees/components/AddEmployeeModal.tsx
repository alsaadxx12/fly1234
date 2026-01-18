import React, { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { addEmployee, type Employee } from '../../../lib/collections/employees';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Users, X, Mail, Phone, DollarSign, Clock, Box, Loader2, Key, AlertCircle, Info, Check, Shield, Plus, UserPlus, Building2, Briefcase } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { createPortal } from 'react-dom';
import { storage } from '../../../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../../contexts/AuthContext';


type Props = {
  isOpen: boolean;
  onClose: () => void;
};

interface EmployeeFormData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  salary: string;
  permissionGroupId: string;
  safeId: string;
  branchId: string;
  departmentId: string;
  startTime: string;
  endTime: string;
}

interface Permission {
  id: string;
  name: string;
  permissions: Record<string, string[] | boolean>;
}

const AddEmployeeModal = ({ isOpen, onClose }: Props) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    salary: '',
    permissionGroupId: '',
    safeId: '',
    branchId: '',
    departmentId: '',
    startTime: '09:00',
    endTime: '17:00'
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [safesList, setSafesList] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
        // Reset form when modal closes
        setFormData({
            fullName: '', email: '', password: '', phone: '',
            salary: '', permissionGroupId: '', safeId: '',
            branchId: '', departmentId: '', startTime: '09:00', endTime: '17:00'
        });
        setError(null);
        setSuccess(null);
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [permissionsSnapshot, safesSnapshot, employeesSnapshot, branchesSnapshot, departmentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'permissions'), orderBy('name', 'asc'))),
        getDocs(query(collection(db, 'safes'), orderBy('name', 'asc'))),
        getDocs(collection(db, 'employees')),
        getDocs(query(collection(db, 'branches'), orderBy('name', 'asc'))),
        getDocs(query(collection(db, 'departments'), orderBy('name', 'asc'))),
      ]);

      const permissionsData = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[];
      setPermissions(permissionsData);

      const safesData = safesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setSafesList(safesData);
      
      const emails = employeesSnapshot.docs.map(doc => doc.data().email.toLowerCase());
      setExistingEmails(emails);

      const branchesData = branchesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setBranches(branchesData);

      const departmentsData = departmentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setDepartments(departmentsData);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('فشل في تحميل البيانات اللازمة');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    localStorage.setItem('isCreatingUser', 'true');
  
    try {
      if (existingEmails.includes(formData.email.toLowerCase())) {
        throw new Error('البريد الإلكتروني مستخدم بالفعل');
      }
  
      if (formData.password.length < 8) {
        throw new Error('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
      }
  
      // Get the current user (admin)
      const adminUser = auth.currentUser;
      if (!adminUser) {
        throw new Error('Admin user not authenticated');
      }
  
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      const employeeData = {
        userId: userCredential.user.uid,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.permissionGroupId,
        salary: parseFloat(formData.salary) || 0,
        startDate: new Date(),
        isActive: true,
        startTime: formData.startTime,
        endTime: formData.endTime,
        safeId: formData.safeId,
        branchId: formData.branchId,
        departmentId: formData.departmentId
      };
  
      await addEmployee(employeeData as any);
      setSuccess('تم إضافة الموظف بنجاح');
  
      // Re-sign the admin user to ensure context continuity
      if (auth.currentUser?.uid !== adminUser.uid) {
         await auth.updateCurrentUser(adminUser);
      }
  
      setTimeout(() => {
        onClose();
      }, 2000);
  
    } catch (error) {
      console.error('Error adding employee:', error);
      const errorMessage = error instanceof Error
        ? (error.message.includes('email-already-in-use') ? 'البريد الإلكتروني مستخدم بالفعل' : error.message)
        : 'فشل في إضافة الموظف';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      localStorage.removeItem('isCreatingUser');
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
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">إضافة موظف جديد</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">إضافة موظف جديد إلى النظام</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 max-h-[70vh] overflow-y-auto">
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
                <input type="email" name="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="البريد الإلكتروني" required autoComplete="off" className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
                <input type="password" name="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="كلمة المرور" required minLength={8} autoComplete="new-password" className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition" />
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
                <select name="safeId" value={formData.safeId} onChange={(e) => setFormData(p => ({ ...p, safeId: e.target.value }))} required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر الصندوق</option>
                  {safesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select name="branchId" value={formData.branchId} onChange={(e) => setFormData(p => ({ ...p, branchId: e.target.value }))} required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر الفرع</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                 <select name="departmentId" value={formData.departmentId} onChange={(e) => setFormData(p => ({ ...p, departmentId: e.target.value }))} required className="w-full text-center px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition appearance-none">
                  <option value="">اختر القسم</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              إلغاء
            </button>
            <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isLoading ? 'جاري الإضافة...' : 'إضافة الموظف'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddEmployeeModal;
