import React, { useState, useMemo } from 'react';
import { Plus, Plane, RefreshCw, Sparkles, XCircle, CheckCircle, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTickets } from './Tickets/hooks/useTickets';
import { Ticket, TicketFilters, TicketType } from './Tickets/types';
import AddTicketModal from './Tickets/components/AddTicketModalNew';
import SmartAddTicketModal from './Tickets/components/SmartAddTicketModal';
import AddChangeModal from './Tickets/components/AddChangeModal';
import TicketsTable from './Tickets/components/TicketsTable';
import TicketsFilters from './Tickets/components/TicketsFilters';
import ModernButton from '../components/ModernButton';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function Tickets() {
  const { theme } = useTheme();
  const { currentUser, checkPermission } = useAuth();
  const { showNotification } = useNotification();
  const {
    tickets,
    loading,
    addTicket,
    updateTicket,
    deleteTicket,
    toggleAuditCheck,
    toggleEntryCheck
  } = useTickets();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartAddModal, setShowSmartAddModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TicketType>('entry');
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({
    searchTerm: '',
    showAuditChecked: true,
    showAuditUnchecked: true,
    showEntryChecked: true,
    showEntryUnchecked: true,
    currency: 'all',
  });

  // Filter tickets by type and search
  const filteredTickets = useMemo(() => {
    let filtered = tickets.filter(ticket => ticket.type === activeTab);

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
  }, [tickets, activeTab, filters]);

  const stats = useMemo(() => {
    const typeTickets = tickets.filter(t => t.type === activeTab);
    return {
      total: typeTickets.length,
      auditChecked: typeTickets.filter(t => t.auditChecked).length,
      entryChecked: typeTickets.filter(t => t.entryChecked).length,
      pending: typeTickets.filter(t => !t.auditChecked || !t.entryChecked).length,
    };
  }, [tickets, activeTab]);

  const handleEdit = (ticket: Ticket) => {
    if (ticket.auditChecked) {
      showNotification('error', 'خطأ', 'لا يمكن تعديل تذكرة مدققة');
      return;
    }
    setEditingTicket(ticket);
    // إذا كانت التذكرة من نوع 'change'، نستخدم GlobalChangeModal من خلال الـ context
    if (ticket.type === 'change') {
      // سنفتح نافذة التغيير المحلية بدلاً من GlobalChangeModal
      setShowChangeModal(true);
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
      showNotification('success', 'نجاح', 'تم حذف التذكرة بنجاح');
    } catch (error: any) {
      showNotification('error', 'خطأ', error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleAddChange = async (changeData: {
    pnr: string;
    source: string;
    beneficiary: string;
    sourceChangeAmount: number;
    beneficiaryChangeAmount: number;
    sourceCurrency: 'IQD' | 'USD';
    beneficiaryCurrency: 'IQD' | 'USD';
    changeDate: Date;
    entryDate: Date;
  }) => {
    if (!currentUser) return;

    const profit = changeData.beneficiaryChangeAmount - changeData.sourceChangeAmount;
    const profitText = changeData.sourceCurrency === changeData.beneficiaryCurrency
      ? `${profit.toFixed(2)} ${changeData.sourceCurrency}`
      : `الشراء: ${changeData.sourceChangeAmount} ${changeData.sourceCurrency} - البيع: ${changeData.beneficiaryChangeAmount} ${changeData.beneficiaryCurrency}`;

    // إذا كنا نعدل تذكرة موجودة
    if (editingTicket && editingTicket.type === 'change') {
      await updateTicket(editingTicket.id, {
        pnr: changeData.pnr,
        passengers: [
          {
            id: editingTicket.passengers[0]?.id || `passenger-${Date.now()}`,
            name: 'تغيير',
            passportNumber: '-',
            passengerType: 'adult',
            purchasePrice: changeData.sourceChangeAmount,
            salePrice: changeData.beneficiaryChangeAmount,
            ticketNumber: '-',
          },
        ],
        type: 'change',
        notes: `المصدر: ${changeData.source} | المستفيد: ${changeData.beneficiary} | الربح: ${profitText}`,
        route: '',
        beneficiary: changeData.beneficiary,
        source: changeData.source,
        currency: changeData.beneficiaryCurrency,
        entryDate: changeData.entryDate,
        issueDate: changeData.changeDate,
      });
      setEditingTicket(null);
    } else {
      // إضافة تذكرة جديدة
      await addTicket(
        changeData.pnr,
        [
          {
            id: `passenger-${Date.now()}`,
            name: 'تغيير',
            passportNumber: '-',
            passengerType: 'adult',
            purchasePrice: changeData.sourceChangeAmount,
            salePrice: changeData.beneficiaryChangeAmount,
            ticketNumber: '-',
          },
        ],
        'change',
        `المصدر: ${changeData.source} | المستفيد: ${changeData.beneficiary} | الربح: ${profitText}`,
        {
          route: '',
          beneficiary: changeData.beneficiary,
          source: changeData.source,
          currency: changeData.beneficiaryCurrency,
          entryDate: changeData.entryDate,
          issueDate: changeData.changeDate,
        }
      );
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAddMenu && !target.closest('.add-menu-container')) {
        setShowAddMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  if (loading) {
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
          <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
            إدخالات التذاكر
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            إدارة تذاكر السفر والطيران
          </p>
        </div>

        <div className="flex gap-3">
          {/* Add Change Button */}
          <button
            onClick={() => setShowChangeModal(true)}
            className={`px-6 py-3.5 rounded-xl font-black text-white shadow-lg border-2 flex items-center gap-2.5 ${theme === 'dark'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500/50 hover:from-orange-700 hover:to-amber-700'
                : 'bg-gradient-to-r from-orange-500 to-amber-600 border-orange-400 hover:from-orange-600 hover:to-amber-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            إضافة تغيير
          </button>

          {/* Add Refund Button */}
          <button
            onClick={() => setShowRefundModal(true)}
            className={`px-6 py-3.5 rounded-xl font-black text-white shadow-lg border-2 flex items-center gap-2.5 ${theme === 'dark'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500/50 hover:from-emerald-700 hover:to-teal-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 hover:from-emerald-600 hover:to-teal-700'
              }`}
          >
            <RefreshCw className="w-5 h-5" />
            إضافة استرجاع
          </button>

          {/* Add Ticket Button with Menu */}
          <div className="relative add-menu-container">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={`px-6 py-3.5 rounded-xl font-black text-white shadow-lg border-2 flex items-center gap-2.5 ${theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-500/50 hover:from-blue-700 hover:to-cyan-700'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-600 border-blue-400 hover:from-blue-600 hover:to-cyan-700'
                }`}
            >
              <Plus className="w-5 h-5" />
              إضافة تذكرة
              <svg className={`w-4 h-4 ${showAddMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAddMenu && (
              <div className={`absolute left-0 mt-2 w-72 rounded-2xl shadow-2xl border-2 z-50 overflow-hidden ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
                }`}>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                      setShowAddMenu(false);
                    }}
                    className={`w-full px-4 py-4 rounded-xl text-right font-bold flex items-center gap-3 ${theme === 'dark'
                        ? 'hover:bg-gray-700/70 text-gray-200'
                        : 'hover:bg-gray-50 text-gray-900'
                      }`}
                  >
                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                      }`}>
                      <Plus className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-base font-black mb-0.5">إضافة عادية</div>
                      <div className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        إدخال يدوي للبيانات
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowSmartAddModal(true);
                      setShowAddMenu(false);
                    }}
                    className={`w-full px-4 py-4 rounded-xl text-right font-bold flex items-center gap-3 mt-1 ${theme === 'dark'
                        ? 'hover:bg-gray-700/70 text-gray-200'
                        : 'hover:bg-gray-50 text-gray-900'
                      }`}
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-base font-black mb-0.5">الإضافة الذكية</div>
                      <div className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        استخراج تلقائي من PDF
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
          <Plane className="w-4 h-4" />
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
          <RefreshCw className="w-4 h-4" />
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>التغييرات</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <TicketsFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Table */}
      <TicketsTable
        tickets={filteredTickets}
        onToggleAudit={toggleAuditCheck}
        onToggleEntry={toggleEntryCheck}
        canAuditTransfer={checkPermission('التذاكر', 'auditTransfer')}
        canAuditEntry={checkPermission('التذاكر', 'auditEntry')}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add Modal */}
      <AddTicketModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addTicket}
        initialType={activeTab}
      />

      {/* Edit Modal */}
      <AddTicketModal
        isOpen={!!editingTicket}
        onClose={() => setEditingTicket(null)}
        onAdd={async (pnr, passengers, type, notes, additionalData) => {
          if (editingTicket) {
            await updateTicket(editingTicket.id, {
              pnr,
              passengers,
              type,
              notes,
              ...additionalData
            });
            setEditingTicket(null);
          }
        }}
        initialType={editingTicket?.type || activeTab}
        editingTicket={editingTicket}
      />

      {/* Smart Add Modal */}
      <SmartAddTicketModal
        isOpen={showSmartAddModal}
        onClose={() => setShowSmartAddModal(false)}
        onAdd={addTicket}
        initialType={activeTab}
      />

      {/* Add Refund Modal */}
      <AddTicketModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onAdd={addTicket}
        initialType="refund"
      />

      {/* Add Change Modal */}
      <AddChangeModal
        isOpen={showChangeModal}
        onClose={() => {
          setShowChangeModal(false);
          setEditingTicket(null);
        }}
        onAdd={handleAddChange}
        editingTicket={editingTicket}
      />
    </div>
  );
}
