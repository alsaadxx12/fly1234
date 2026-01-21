import React, { useState, useMemo } from 'react';
import { CheckSquare, Search, Filter, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuditTickets } from './Audit/useAuditTickets';
import { TicketFilters, TicketType } from './Tickets/types';
import TicketsTable from './Tickets/components/TicketsTable';
import TicketsFilters from './Tickets/components/TicketsFilters';
import TicketsStats from './Tickets/components/TicketsStats';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Employee {
  id: string;
  name: string;
  email: string;
}

export default function Audit() {
  const { theme } = useTheme();
  const { checkPermission } = useAuth();
  const { showNotification } = useNotification();
  const { tickets, loading } = useAuditTickets();

  const [activeTab, setActiveTab] = useState<TicketType>('entry');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TicketFilters>({
    searchTerm: '',
    showAuditChecked: true,
    showAuditUnchecked: true,
    showEntryChecked: true,
    showEntryUnchecked: true,
    currency: 'all',
  });

  // Load employees
  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeesSnapshot = await getDocs(collection(db, 'employees'));
        const employeesList = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email
        }));
        setEmployees(employeesList);
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  // Close suggestions on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle functions
  const toggleAuditCheck = async (ticketId: string) => {
    // التحقق من صلاحية التدقيق
    if (!checkPermission('التدقيق', 'auditTransfer') && !checkPermission('audit', 'auditTransfer')) {
      showNotification('error', 'خطأ', 'ليس لديك صلاحية التدقيق');
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      auditChecked: !ticket.auditChecked
    });
  };

  const toggleEntryCheck = async (ticketId: string) => {
    // التحقق من صلاحية الإدخال
    if (!checkPermission('التدقيق', 'auditEntry') && !checkPermission('audit', 'auditEntry')) {
      showNotification('error', 'خطأ', 'ليس لديك صلاحية الإدخال');
      return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      entryChecked: !ticket.entryChecked
    });
  };

  const deleteTicket = async (ticketId: string) => {
    const ticketRef = doc(db, 'tickets', ticketId);
    await deleteDoc(ticketRef);
  };

  // Get filtered employee suggestions
  const employeeSuggestions = useMemo(() => {
    if (!employeeSearchTerm) return [];
    const term = employeeSearchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [employees, employeeSearchTerm]);

  // Get employees who have tickets
  const employeesWithTickets = useMemo(() => {
    const employeeIds = new Set(tickets.map(t => t.createdBy));
    return employees.filter(emp => employeeIds.has(emp.id));
  }, [employees, tickets]);

  const filteredTickets = useMemo(() => {
    let filtered = tickets.filter(ticket => ticket.type === activeTab);

    // Filter by selected employee
    if (selectedEmployeeId) {
      filtered = filtered.filter(ticket => ticket.createdBy === selectedEmployeeId);
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.pnr.toLowerCase().includes(term) ||
        ticket.passengers.some(p =>
          p.name.toLowerCase().includes(term) ||
          p.passportNumber.toLowerCase().includes(term)
        )
      );
    }

    // Audit filter
    if (!filters.showAuditChecked || !filters.showAuditUnchecked) {
      filtered = filtered.filter(ticket => {
        if (filters.showAuditChecked && ticket.auditChecked) return true;
        if (filters.showAuditUnchecked && !ticket.auditChecked) return true;
        return false;
      });
    }

    // Entry filter
    if (!filters.showEntryChecked || !filters.showEntryUnchecked) {
      filtered = filtered.filter(ticket => {
        if (filters.showEntryChecked && ticket.entryChecked) return true;
        if (filters.showEntryUnchecked && !ticket.entryChecked) return true;
        return false;
      });
    }

    // Date filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(ticket => {
        const ticketDate = ticket.entryDate ? new Date(ticket.entryDate) : ticket.createdAt;
        return ticketDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ticket => {
        const ticketDate = ticket.entryDate ? new Date(ticket.entryDate) : ticket.createdAt;
        return ticketDate <= toDate;
      });
    }

    // Currency filter
    if (filters.currency && filters.currency !== 'all') {
      filtered = filtered.filter(ticket => ticket.currency === filters.currency);
    }

    return filtered;
  }, [tickets, activeTab, selectedEmployeeId, filters]);

  const stats = useMemo(() => {
    const typeTickets = filteredTickets;
    return {
      total: typeTickets.length,
      auditChecked: typeTickets.filter(t => t.auditChecked).length,
      entryChecked: typeTickets.filter(t => t.entryChecked).length,
      pending: typeTickets.filter(t => !t.auditChecked || !t.entryChecked).length,
    };
  }, [filteredTickets]);

  if (loading || loadingEmployees) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
            <CheckSquare className="w-8 h-8" />
            صفحة التدقيق
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            مراجعة وتدقيق بيانات التذاكر لجميع الموظفين
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className={`mb-4 flex gap-3 ${theme === 'dark' ? '' : ''
        }`}>
        {/* Employee Search */}
        <div className="flex-1 relative employee-search-container">
          <div className={`relative rounded-xl border ${theme === 'dark'
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200'
            }`}>
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
            <input
              type="text"
              value={employeeSearchTerm}
              onChange={(e) => {
                setEmployeeSearchTerm(e.target.value);
                setShowEmployeeSuggestions(true);
              }}
              onFocus={() => setShowEmployeeSuggestions(true)}
              placeholder="ابحث عن موظف بالاسم أو البريد الإلكتروني..."
              className={`w-full px-3 py-3 pr-10 rounded-xl font-bold text-sm ${theme === 'dark'
                ? 'bg-transparent text-white placeholder-gray-500'
                : 'bg-transparent text-gray-900 placeholder-gray-400'
                } focus:outline-none`}
            />
            {(employeeSearchTerm || selectedEmployeeId) && (
              <button
                onClick={() => {
                  setEmployeeSearchTerm('');
                  setSelectedEmployeeId('');
                  setShowEmployeeSuggestions(false);
                }}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-700/50 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Employee Suggestions Dropdown */}
          {showEmployeeSuggestions && (employeeSuggestions.length > 0 || employeesWithTickets.length > 0) && (
            <div className={`absolute z-50 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
              }`}>
              <div className="max-h-64 overflow-y-auto">
                {/* Search Results */}
                {employeeSuggestions.length > 0 ? (
                  <>
                    <div className={`px-3 py-2 text-xs font-bold border-b ${theme === 'dark'
                      ? 'bg-gray-900/50 text-gray-400 border-gray-700'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                      نتائج البحث
                    </div>
                    {employeeSuggestions.map(employee => {
                      const ticketCount = tickets.filter(t => t.createdBy === employee.id && t.type === activeTab).length;
                      return (
                        <button
                          key={employee.id}
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeeSearchTerm(employee.name);
                            setShowEmployeeSuggestions(false);
                          }}
                          className={`w-full px-4 py-3 text-right hover:bg-opacity-50 transition-colors border-b last:border-b-0 ${theme === 'dark'
                            ? 'hover:bg-gray-700 border-gray-700/50'
                            : 'hover:bg-gray-50 border-gray-100'
                            } ${selectedEmployeeId === employee.id
                              ? theme === 'dark'
                                ? 'bg-blue-900/30'
                                : 'bg-blue-50'
                              : ''
                            }`}
                        >
                          <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {employee.name}
                          </div>
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {employee.email}
                            {ticketCount > 0 && (
                              <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-bold ${theme === 'dark'
                                ? 'bg-blue-900/50 text-blue-300'
                                : 'bg-blue-100 text-blue-700'
                                }`}>
                                {ticketCount} {activeTab === 'entry' ? 'تذكرة' : activeTab === 'refund' ? 'استرجاع' : 'تغيير'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : employeeSearchTerm && employeesWithTickets.length > 0 ? (
                  <>
                    <div className={`px-3 py-2 text-xs font-bold border-b ${theme === 'dark'
                      ? 'bg-gray-900/50 text-gray-400 border-gray-700'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                      الموظفين الذين لديهم {activeTab === 'entry' ? 'تذاكر' : activeTab === 'refund' ? 'استرجاعات' : 'تغييرات'}
                    </div>
                    {employeesWithTickets.slice(0, 5).map(employee => {
                      const ticketCount = tickets.filter(t => t.createdBy === employee.id && t.type === activeTab).length;
                      return (
                        <button
                          key={employee.id}
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeeSearchTerm(employee.name);
                            setShowEmployeeSuggestions(false);
                          }}
                          className={`w-full px-4 py-3 text-right hover:bg-opacity-50 transition-colors border-b last:border-b-0 ${theme === 'dark'
                            ? 'hover:bg-gray-700 border-gray-700/50'
                            : 'hover:bg-gray-50 border-gray-100'
                            } ${selectedEmployeeId === employee.id
                              ? theme === 'dark'
                                ? 'bg-blue-900/30'
                                : 'bg-blue-50'
                              : ''
                            }`}
                        >
                          <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {employee.name}
                          </div>
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {employee.email}
                            <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-bold ${theme === 'dark'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-blue-100 text-blue-700'
                              }`}>
                              {ticketCount} {activeTab === 'entry' ? 'تذكرة' : activeTab === 'refund' ? 'استرجاع' : 'تغيير'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : !employeeSearchTerm && employeesWithTickets.length > 0 ? (
                  <>
                    <div className={`px-3 py-2 text-xs font-bold border-b ${theme === 'dark'
                      ? 'bg-gray-900/50 text-gray-400 border-gray-700'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                      الموظفين الذين لديهم {activeTab === 'entry' ? 'تذاكر' : activeTab === 'refund' ? 'استرجاعات' : 'تغييرات'}
                    </div>
                    {employeesWithTickets.slice(0, 8).map(employee => {
                      const ticketCount = tickets.filter(t => t.createdBy === employee.id && t.type === activeTab).length;
                      return (
                        <button
                          key={employee.id}
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeeSearchTerm(employee.name);
                            setShowEmployeeSuggestions(false);
                          }}
                          className={`w-full px-4 py-3 text-right hover:bg-opacity-50 transition-colors border-b last:border-b-0 ${theme === 'dark'
                            ? 'hover:bg-gray-700 border-gray-700/50'
                            : 'hover:bg-gray-50 border-gray-100'
                            } ${selectedEmployeeId === employee.id
                              ? theme === 'dark'
                                ? 'bg-blue-900/30'
                                : 'bg-blue-50'
                              : ''
                            }`}
                        >
                          <div className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {employee.name}
                          </div>
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {employee.email}
                            <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-bold ${theme === 'dark'
                              ? 'bg-blue-900/50 text-blue-300'
                              : 'bg-blue-100 text-blue-700'
                              }`}>
                              {ticketCount} {activeTab === 'entry' ? 'تذكرة' : activeTab === 'refund' ? 'استرجاع' : 'تغيير'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-5 py-3 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 ${showFilters
            ? theme === 'dark'
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30'
            : theme === 'dark'
              ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
        >
          <Filter className="w-5 h-5" />
          <span>فلتر</span>
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 mb-4 p-1 rounded-xl border ${theme === 'dark'
        ? 'bg-gray-800/50 border-gray-700'
        : 'bg-white/80 border-gray-200'
        }`}>
        <button
          onClick={() => setActiveTab('entry')}
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${activeTab === 'entry'
            ? theme === 'dark'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
            : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <span>التذاكر</span>
        </button>
        <button
          onClick={() => setActiveTab('refund')}
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${activeTab === 'refund'
            ? theme === 'dark'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
            : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <span>الاسترجاعات</span>
        </button>
        <button
          onClick={() => setActiveTab('change')}
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm ${activeTab === 'change'
            ? theme === 'dark'
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
            : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <span>التغييرات</span>
        </button>
      </div>

      {/* Financial Stats */}
      <TicketsStats tickets={filteredTickets} currency={filters.currency || 'all'} activeTab={activeTab} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className={`relative overflow-hidden rounded-xl border p-4 ${theme === 'dark'
          ? 'bg-gradient-to-br from-cyan-900/40 via-cyan-800/30 to-cyan-900/20 border-cyan-700/50'
          : 'bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50 border-cyan-300'
          }`}>
          <div className="relative z-10">
            <h3 className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-cyan-300' : 'text-cyan-700'
              }`}>
              إجمالي التذاكر
            </h3>
            <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              {stats.total}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl border p-4 ${theme === 'dark'
          ? 'bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-emerald-900/20 border-emerald-700/50'
          : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-300'
          }`}>
          <div className="relative z-10">
            <h3 className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
              }`}>
              تم التدقيق
            </h3>
            <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              {stats.auditChecked}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl border p-4 ${theme === 'dark'
          ? 'bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/20 border-blue-700/50'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-blue-300'
          }`}>
          <div className="relative z-10">
            <h3 className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
              تم الإدخال
            </h3>
            <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              {stats.entryChecked}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-xl border p-4 ${theme === 'dark'
          ? 'bg-gradient-to-br from-orange-900/40 via-orange-800/30 to-orange-900/20 border-orange-700/50'
          : 'bg-gradient-to-br from-orange-50 via-white to-orange-50/50 border-orange-300'
          }`}>
          <div className="relative z-10">
            <h3 className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
              }`}>
              قيد الانتظار
            </h3>
            <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              {stats.pending}
            </p>
          </div>
        </div>
      </div>

      {/* Filters - Collapsible */}
      {showFilters && (
        <div className={`mb-4 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-200 ${theme === 'dark'
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              <Filter className="w-4 h-4" />
              خيارات الفلترة
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className={`p-1 rounded-lg hover:bg-gray-700/50 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <TicketsFilters filters={filters} onFiltersChange={setFilters} />
        </div>
      )}

      {/* Table */}
      <TicketsTable
        tickets={filteredTickets}
        onToggleAudit={toggleAuditCheck}
        onToggleEntry={toggleEntryCheck}
        canAuditTransfer={checkPermission('التدقيق', 'auditTransfer') || checkPermission('audit', 'auditTransfer')}
        canAuditEntry={checkPermission('التدقيق', 'auditEntry') || checkPermission('audit', 'auditEntry')}
        onEdit={() => { }}
        onDelete={deleteTicket}
      />
    </div>
  );
}
