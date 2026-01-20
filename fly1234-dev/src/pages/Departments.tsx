import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit, Trash2, UserCheck, Gift, Clock, Sparkles, MapPin, ShieldCheck, ShieldOff } from 'lucide-react';
import ModernModal from '../components/ModernModal';

interface Department {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  branchId?: string;
  branchName?: string;
  createdAt: Date;
  foodAllowance?: number;
  incentive?: number;
  overtimePointsPerMinute?: number;
  lateDeductionPointsPerMinute?: number;
  salaryIncrementAmount?: number;
  salaryIncrementPeriodMonths?: number;
  attendanceGracePeriod?: number;
  absenceLimitMinutes?: number;
  exemptEmployeeIds?: string[];
}

interface Employee {
  id: string;
  name: string;
  departmentId?: string;
  salary?: number;
  profitSettings?: {
    enableChangeProfit: boolean;
    enableIssuanceProfit: boolean;
  };
}

interface Branch {
  id: string;
  name: string;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [editingField, setEditingField] = useState<{ dep: Department, field: keyof Department } | null>(null);
  const [currentValue, setCurrentValue] = useState('');


  useEffect(() => {
    setLoading(true);
    const depUnsub = onSnapshot(query(collection(db, 'departments'), orderBy('name')), (snapshot) => {
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
      setLoading(false);
    });

    const empUnsub = onSnapshot(query(collection(db, 'employees'), orderBy('name')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const branchUnsub = onSnapshot(query(collection(db, 'branches'), orderBy('name')), (snapshot) => {
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Branch)));
    });

    return () => {
      depUnsub();
      empUnsub();
      branchUnsub();
    };
  }, []);

  const openModal = (department: Department | null = null) => {
    setEditingDepartment(department);
    setDepartmentName(department?.name || '');
    setManagerId(department?.managerId || '');
    setBranchId(department?.branchId || '');
    setIsModalOpen(true);
  };

  const openEditValueModal = (department: Department, field: keyof Department) => {
    setEditingDepartment(department);
    setEditingField({ dep: department, field });
    setCurrentValue((department[field] as any || '0').toString());
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setDepartmentName('');
    setManagerId('');
    setBranchId('');
    setEditingField(null);
    setCurrentValue('');
  };

  const handleSaveDepartment = async () => {
    if (!departmentName.trim() || !managerId) {
      alert('الرجاء إدخال اسم القسم واختيار مدير');
      return;
    }

    const manager = employees.find(e => e.id === managerId);
    if (!manager) {
      alert('المدير المختار غير موجود');
      return;
    }

    const branch = branches.find(b => b.id === branchId);

    const departmentData = {
      name: departmentName,
      managerId: managerId,
      managerName: manager.name,
      branchId: branchId,
      branchName: branch ? branch.name : '',
      updatedAt: serverTimestamp(),
    };

    if (editingDepartment) {
      await updateDoc(doc(db, 'departments', editingDepartment.id), departmentData);
    } else {
      await addDoc(collection(db, 'departments'), {
        ...departmentData,
        createdAt: serverTimestamp(),
        foodAllowance: 0,
        incentive: 0,
        overtimePointsPerMinute: 0,
        lateDeductionPointsPerMinute: 0,
        salaryIncrementAmount: 0,
        salaryIncrementPeriodMonths: 0,
        attendanceGracePeriod: 0,
        absenceLimitMinutes: 0,
        exemptEmployeeIds: []
      });
    }

    closeModals();
  };

  const handleSaveValue = async () => {
    if (!editingField || !editingDepartment) return;

    const newValue = parseFloat(currentValue) || 0;

    await updateDoc(doc(db, 'departments', editingDepartment.id), {
      [editingField.field]: newValue
    });

    closeModals();
  };

  const handleDeleteDepartment = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم إلغاء ربط الموظفين به.')) {
      const employeesInDeptQuery = query(collection(db, 'employees'), where('departmentId', '==', id));
      const employeesSnapshot = await getDocs(employeesInDeptQuery);
      const updatePromises = employeesSnapshot.docs.map(employeeDoc =>
        updateDoc(doc(db, 'employees', employeeDoc.id), { departmentId: '' })
      );
      await Promise.all(updatePromises);

      await deleteDoc(doc(db, 'departments', id));
    }
  };

  const toggleExemption = async (departmentId: string, employeeId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (!department) return;

    const currentExemptIds = department.exemptEmployeeIds || [];
    const isExempt = currentExemptIds.includes(employeeId);
    const newExemptIds = isExempt
      ? currentExemptIds.filter(id => id !== employeeId)
      : [...currentExemptIds, employeeId];

    try {
      await updateDoc(doc(db, 'departments', departmentId), {
        exemptEmployeeIds: newExemptIds
      });
    } catch (error) {
      console.error("Failed to toggle employee exemption:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const getAllowanceLabel = (field: keyof Department) => {
    switch (field) {
      case 'foodAllowance': return 'بدل الطعام';
      case 'incentive': return 'الحافز';
      case 'overtimePointsPerMinute': return 'نقاط الوقت الإضافي/دقيقة';
      case 'lateDeductionPointsPerMinute': return 'نقاط خصم التأخير/دقيقة';
      case 'salaryIncrementAmount': return 'مبلغ الزيادة';
      case 'salaryIncrementPeriodMonths': return 'فترة الزيادة (أشهر)';
      case 'attendanceGracePeriod': return 'فترة السماح (دقائق)';
      case 'absenceLimitMinutes': return 'حد التغيب (دقائق بعد الموعد)';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            الأقسام
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold">إدارة الأقسام والمدراء والمخصصات للموظفين</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {departments.map(dep => {
          const depEmployees = employees.filter(e => e.departmentId === dep.id);
          return (
            <div key={dep.id} className="bg-white dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 truncate">{dep.name}</h3>
                  <div className="space-y-1.5 mt-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      المدير: <span className="text-gray-700 dark:text-gray-300">{dep.managerName}</span>
                    </p>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      الفرع: <span className="text-gray-700 dark:text-gray-300">{dep.branchName || 'غير محدد'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(dep)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:scale-110 active:scale-95 transition-all"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteDepartment(dep.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-xl hover:scale-110 active:scale-95 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                    onClick={() => openEditValueModal(dep, 'foodAllowance')}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-emerald-600 dark:text-emerald-400">
                      <Gift className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase">طعام</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {formatCurrency(dep.foodAllowance || 0)} <span className="text-[10px] opacity-70">د.ع</span>
                    </p>
                  </div>
                  <div
                    className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20 cursor-pointer group hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    onClick={() => openEditValueModal(dep, 'incentive')}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase">حافز</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {formatCurrency(dep.incentive || 0)} <span className="text-[10px] opacity-70">د.ع</span>
                    </p>
                  </div>

                  <div
                    className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 cursor-pointer group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    onClick={() => openEditValueModal(dep, 'overtimePointsPerMinute')}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase">إضافي/د</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {dep.overtimePointsPerMinute || 0} <span className="text-[10px] opacity-70">نقطة</span>
                    </p>
                  </div>

                  <div
                    className="p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 cursor-pointer group hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                    onClick={() => openEditValueModal(dep, 'lateDeductionPointsPerMinute')}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-rose-600 dark:text-rose-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase">تأخير/د</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {dep.lateDeductionPointsPerMinute || 0} <span className="text-[10px] opacity-70">نقطة</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-900/5 dark:border-amber-900/10 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div className="cursor-pointer flex-1 text-center border-l dark:border-amber-900/20" onClick={() => openEditValueModal(dep, 'salaryIncrementAmount')}>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-0.5">الزيادة</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatCurrency(dep.salaryIncrementAmount || 0)}</span>
                  </div>
                  <div className="cursor-pointer flex-1 text-center" onClick={() => openEditValueModal(dep, 'salaryIncrementPeriodMonths')}>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-0.5">الفترة</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{dep.salaryIncrementPeriodMonths || 0} <span className="text-[9px] opacity-60">شهر</span></span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الموظفين ({depEmployees.length})</h4>
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      onClick={() => openEditValueModal(dep, 'attendanceGracePeriod')}
                    >
                      <span className="text-[10px] font-bold text-gray-500">سماح الحضور:</span>
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{dep.attendanceGracePeriod || 0} د</span>
                    </div>
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      onClick={() => openEditValueModal(dep, 'absenceLimitMinutes')}
                    >
                      <span className="text-[10px] font-bold text-gray-500">حد الغياب:</span>
                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">{dep.absenceLimitMinutes || 0} د</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {depEmployees.length > 0 ? (
                      depEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50 transition-all hover:bg-white dark:hover:bg-gray-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{emp.name}</span>
                          </div>
                          <button
                            onClick={() => toggleExemption(dep.id, emp.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-lg transition-all ${dep.exemptEmployeeIds?.includes(emp.id)
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-gray-100 text-gray-400 hover:text-gray-600 dark:bg-gray-700 dark:text-gray-500'
                              }`}
                          >
                            {dep.exemptEmployeeIds?.includes(emp.id) ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                            {dep.exemptEmployeeIds?.includes(emp.id) ? 'معفي' : 'استثناء'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400">لا يوجد موظفين</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ModernModal isOpen={isModalOpen} onClose={closeModals} title={editingDepartment ? 'تعديل قسم' : 'إضافة قسم جديد'}>
        <div className="space-y-4">
          <div>
            <label className="font-medium">اسم القسم</label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="font-medium">مدير القسم</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">اختر مدير</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">الفرع</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">اختر فرع</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={closeModals} className="px-4 py-2 bg-gray-200 rounded">إلغاء</button>
            <button onClick={handleSaveDepartment} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
          </div>
        </div>
      </ModernModal>

      <ModernModal isOpen={!!editingField} onClose={closeModals} title={`تعديل ${editingField ? getAllowanceLabel(editingField.field) : ''}`}>
        <div className="space-y-4">
          <div>
            <label className="font-medium">القيمة الجديدة</label>
            <input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="w-full p-2 border rounded mt-1 dark:bg-gray-700 dark:border-gray-600"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={closeModals} className="px-4 py-2 bg-gray-200 rounded">إلغاء</button>
            <button onClick={handleSaveValue} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
