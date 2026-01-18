import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { UserCircle, DollarSign, Building2, Clock, CalendarDays, Coffee, Calculator, Receipt, FileText, ChevronDown, Trash2, Save, AlertTriangle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Props {
  searchQuery: string;
  onDelete: (id: string) => void;
}

interface Employee {
  id: string;
  name: string;
  salary: number;
  department: string;
}

interface SalaryData {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  nominalSalary: number;
  totalSalary: number;
  profitUsd: number;
  profitIqd: number;
  exchangeProfit: number;
  netProfit: number;
  daysCount: number;
  time: string;
  foodAllowance: number;
  deductions: number;
  advances: number;
  notes: string;
  month: number;
  year: number;
}

export default function SalariesList({ searchQuery, onEdit, onDelete }: Props) {
  const { t } = useLanguage();
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery || '');
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = React.useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(true);
  const [showMonthlyView, setShowMonthlyView] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState(3); // March
  const [selectedYear, setSelectedYear] = React.useState(2024);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [salaryCalculations, setSalaryCalculations] = React.useState<{[key: string]: number}>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(5);
  const [filterDepartment, setFilterDepartment] = React.useState('all');
  const [departments, setDepartments] = React.useState<string[]>([]);

  const calculateTotalSalary = (employeeId: string, nominalSalary: number, daysCount: number, foodAllowance: number, deductions: number, advances: number) => {
    // Calculate daily rate by dividing nominal salary by 26
    const dailyRate = nominalSalary / 26; 

    // Get work days from input
    const workDaysInput = (document.querySelector(`input[data-employee="${employeeId}"][name="workDays"]`) as HTMLInputElement)?.value;
    const workDays = workDaysInput ? parseFloat(workDaysInput.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())) : null;
    
    // Calculate partial salary based on days worked
    const partialSalary = workDays !== null ? (dailyRate * workDays) : 0;
    
    // Add nominal salary and food allowance, then subtract deductions and advances
    const totalSalary = nominalSalary + partialSalary + foodAllowance - deductions - advances;
    
    // Update calculations state
    setSalaryCalculations(prev => ({
      ...prev,
      [employeeId]: totalSalary
    }));
    
    return totalSalary;
  };

  // Fetch employees from Firestore
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          salary: doc.data().salary || 0, 
          department: doc.data().department || 'عام'
        }));
        
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
        
        // Extract unique departments for filtering
        const uniqueDepartments = Array.from(new Set(employeesData.map(emp => emp.department || 'عام')));
        setDepartments(uniqueDepartments);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Filter employees based on search query and department
  React.useEffect(() => {
    let result = [...employees];
    
    // Apply department filter
    if (filterDepartment !== 'all') {
      result = result.filter(employee => employee.department === filterDepartment);
    }
    
    // Apply search filter
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase();
      result = result.filter(employee =>
        employee.name.toLowerCase().includes(query) ||
        (employee.department && employee.department.toLowerCase().includes(query))
      );
    }
    
    setFilteredEmployees(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [employees, localSearchQuery, filterDepartment]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const [salaries, setSalaries] = React.useState<SalaryData[]>([]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Here you would collect all the input values and save them to Firestore
      // For now we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message or handle response
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaveError('فشل في حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-auto flex-1 group">
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="البحث عن موظف..."
            className="w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 group-hover:border-indigo-300 transition-colors"
          />
          <Search className="w-5 h-5 text-gray-400 absolute right-3 top-2.5 group-hover:text-indigo-500 transition-colors" />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border shadow-sm">
            <button
              onClick={() => setFilterDepartment('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filterDepartment === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:bg-white/50'}`}
            >
              الكل
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Employees Salary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEmployees.map((employee) => (
          <div key={employee.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 shadow-inner">
                    <UserCircle className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{employee.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{employee.department || 'عام'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-bold" dir="ltr">{employee.salary.toLocaleString('en-US')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">الراتب الأساسي</div>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                {/* Salary Calculation Form */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">أيام العمل</label>
                    <input
                      type="number"
                      name="workDays"
                      data-employee={employee.id}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      defaultValue="26"
                      min="0"
                      max="30"
                      dir="ltr"
                      onChange={(e) => {
                        const workDays = e.target.value ? parseFloat(e.target.value) : 0;
                        calculateTotalSalary(employee.id, employee.salary, 26, 0, 0, 0);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">بدل طعام</label>
                    <input
                      type="number"
                      name="foodAllowance"
                      className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                      dir="ltr"
                      onChange={(e) => {
                        const foodAllowance = e.target.value ? parseFloat(e.target.value) : 0;
                        calculateTotalSalary(employee.id, employee.salary, 26, foodAllowance, 0, 0);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">الاستقطاعات</label>
                    <input
                      type="number"
                      name="deductions"
                      className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                      dir="ltr"
                      onChange={(e) => {
                        const deductions = e.target.value ? parseFloat(e.target.value) : 0;
                        calculateTotalSalary(employee.id, employee.salary, 26, 0, deductions, 0);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">السلف</label>
                    <input
                      type="number"
                      name="advances"
                      className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                      dir="ltr"
                      onChange={(e) => {
                        const advances = e.target.value ? parseFloat(e.target.value) : 0;
                        calculateTotalSalary(employee.id, employee.salary, 26, 0, 0, advances);
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-16"
                    placeholder="أي ملاحظات إضافية..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">الراتب النهائي:</div>
                  <div className="text-lg font-bold text-indigo-600" dir="ltr">
                    ${(salaryCalculations[employee.id] || employee.salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {filteredEmployees.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-sm text-gray-600">
            عرض {paginatedEmployees.length} من {filteredEmployees.length} موظف
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}