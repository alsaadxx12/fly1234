import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Pencil, Trash2, Mail, Phone, DollarSign, Power, User, Check, Search, RefreshCw, Clock, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, getDoc, doc, deleteDoc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface EmployeeFile {
  id: string;
  name: string;
  url: string;
}

interface Employee {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  isActive: boolean;
  userId?: string;
  shift?: string;
  image?: string;
  files?: EmployeeFile[];
}

interface EmployeeWithPermissionGroup extends Employee {
  permissionGroupName?: string;
}

interface EmployeesListProps {
  onEdit?: (id: string) => void;
}

export default function EmployeesList({ onEdit }: EmployeesListProps) {
  const { theme } = useTheme();
  const [employees, setEmployees] = React.useState<EmployeeWithPermissionGroup[]>([]);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = React.useState<Employee | null>(null);
  const [filterRole, setFilterRole] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [permissionGroups, setPermissionGroups] = React.useState<Array<{ id: string, name: string }>>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      if (!isRefreshing) setIsLoading(true);
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);

      const employeesData = await Promise.all(snapshot.docs.map(async (employeeDoc) => {
        const data = employeeDoc.data() as Employee;
        let permissionGroupName = 'موظف';
        if (data.userId) {
          try {
            const permRef = doc(db, 'permissions', data.userId);
            const permSnap = await getDoc(permRef);
            if (permSnap.exists()) {
              permissionGroupName = permSnap.data().name;
            }
          } catch (e) {
            console.error('Error fetching permission group:', e);
          }
        }

        return {
          ...data,
          id: employeeDoc.id,
          permissionGroupName
        };
      }));

      setEmployees(employeesData);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('فشل في تحميل بيانات الموظفين');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchPermissionGroups = async () => {
    try {
      const q = query(collection(db, 'permissions'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as any
      }));
      setPermissionGroups(groups);
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPermissionGroups();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEmployees();
  };

  const handleDelete = async () => {
    if (!deletingEmployee?.id) return;
    try {
      await deleteDoc(doc(db, 'employees', deletingEmployee.id));
      setEmployees(employees.filter(emp => emp.id !== deletingEmployee.id));
      setDeletingEmployee(null);
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('فشل في حذف الموظف');
    }
  };

  const toggleStatus = async (employee: Employee) => {
    if (!employee.id) return;
    try {
      setIsUpdatingStatus(true);
      const empRef = doc(db, 'employees', employee.id);
      await updateDoc(empRef, {
        isActive: !employee.isActive
      });
      setEmployees(employees.map(emp =>
        emp.id === employee.id ? { ...emp, isActive: !emp.isActive } : emp
      ));
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || emp.permissionGroupName === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' ? emp.isActive : !emp.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
        <p className="font-bold text-gray-500 animate-pulse">جاري تحميل بيانات الموظفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between">
          <span className="font-bold">{error}</span>
          <button onClick={handleRefresh} className="p-2 hover:bg-red-200 rounded-xl transition-all"><RefreshCw className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="space-y-4">
        {/* Row 1: Search & Refresh */}
        <div className={`p-4 rounded-[2rem] border shadow-sm backdrop-blur-md flex gap-4 items-center justify-between ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم، البريد، أو الوظيفة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-11 pl-4 py-3 rounded-2xl border transition-all text-sm font-bold ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-700 focus:border-blue-600'}`}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isUpdatingStatus}
            className={`p-3 rounded-2xl transition-all ${isRefreshing ? 'animate-spin' : ''} ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Row 2: Secondary Filters */}
        <div className={`p-4 rounded-[2rem] border shadow-sm backdrop-blur-md flex flex-wrap gap-4 items-center ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">المجموعة:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`flex-1 px-4 py-2 rounded-xl border transition-all text-xs font-black appearance-none ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-700 focus:border-blue-600'}`}
            >
              <option value="all">كل المجموعات</option>
              {permissionGroups.map(group => (
                <option key={group.id} value={group.name}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-[150px]">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">الحالة:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={`flex-1 px-4 py-2 rounded-xl border transition-all text-xs font-black appearance-none ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700 text-white focus:border-blue-500' : 'bg-white border-gray-200 text-gray-700 focus:border-blue-600'}`}
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {(filterRole !== 'all' || filterStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterRole('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-black bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20"
            >
              تفريغ الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredEmployees.map((employee, index) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative rounded-[2rem] border overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700/50 hover:border-blue-500/50' : 'bg-white border-gray-100 hover:border-blue-200'}`}
            >
              {/* Card Header Background */}
              <div className={`h-24 w-full bg-gradient-to-br ${employee.isActive ? 'from-blue-500 to-indigo-600' : 'from-gray-400 to-gray-600'} opacity-10 group-hover:opacity-20 transition-opacity`} />

              <div className="absolute top-4 left-4 z-10 flex gap-1">
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === employee.id ? null : (employee.id || null))}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {activeMenuId === employee.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`absolute left-0 mt-2 w-48 rounded-2xl shadow-2xl border py-2 z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                    >
                      <button
                        onClick={() => {
                          if (employee.id && onEdit) onEdit(employee.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Pencil className="w-4 h-4" /> تعديل البيانات
                      </button>
                      <button
                        onClick={() => {
                          toggleStatus(employee);
                          setActiveMenuId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-bold ${employee.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        <Power className="w-4 h-4" /> {employee.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                      </button>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => {
                          setDeletingEmployee(employee);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" /> حذف الموظف
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 -mt-12 text-center">
                <div className="relative inline-block mb-4">
                  <div className={`w-24 h-24 rounded-3xl overflow-hidden border-4 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} shadow-2xl group-hover:scale-105 transition-transform duration-500`}>
                    {employee.image ? (
                      <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-4 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} shadow-lg flex items-center justify-center ${employee.isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>

                <h3 className={`text-xl font-black mb-1 transition-colors ${theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'}`}>{employee.name}</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                    {employee.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                    {employee.permissionGroupName}
                  </span>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span>{employee.phone}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className={`text-lg font-black ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {employee.salary.toLocaleString()}
                      </span>
                    </div>
                    {employee.shift && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {employee.shift}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {deletingEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                  <Trash2 className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  حذف موظف
                </h3>
                <p className={`text-sm mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  هذا الإجراء نهائي. هل تريد حذف
                  <span className="font-bold mx-1 text-red-500">{deletingEmployee.name}</span>؟
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-500/30"
                  >
                    حذف نهائي
                  </button>
                  <button
                    onClick={() => setDeletingEmployee(null)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
