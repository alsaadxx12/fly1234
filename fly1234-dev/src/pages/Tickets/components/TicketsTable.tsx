import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Users, CheckCircle, XCircle, User, Eye, ChevronDown, ChevronUp, Plane, Building2, Copy, Check, RotateCcw } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Ticket } from '../types';
import ModernModal from '../../../components/ModernModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNotification } from '../../../contexts/NotificationContext';
import RefundTicketModal from './RefundTicketModal';

interface TicketsTableProps {
  tickets: Ticket[];
  onToggleAudit: (id: string, current: boolean) => void;
  onToggleEntry: (id: string, current: boolean) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  canAudit?: boolean;
  canAuditTransfer?: boolean;
  canAuditEntry?: boolean;
}

interface EmployeeCache {
  [uid: string]: string;
}

export default function TicketsTable({
  tickets,
  onToggleAudit,
  onToggleEntry,
  onEdit,
  onDelete,
  canAudit = true,
  canAuditTransfer,
  canAuditEntry
}: TicketsTableProps) {
  // استخدام الصلاحيات الجديدة إذا تم تمريرها، وإلا استخدام canAudit القديمة
  const hasAuditTransferPermission = canAuditTransfer !== undefined ? canAuditTransfer : canAudit;
  const hasAuditEntryPermission = canAuditEntry !== undefined ? canAuditEntry : canAudit;
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [refundTicket, setRefundTicket] = useState<Ticket | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [employeeNames, setEmployeeNames] = useState<EmployeeCache>({});
  const [unauditConfirm, setUnauditConfirm] = useState<{ticketId: string, type: 'transfer' | 'entry'} | null>(null);
  const [copiedPNR, setCopiedPNR] = useState<string | null>(null);

  useEffect(() => {
    loadEmployeeNames();
  }, [tickets]);

  const loadEmployeeNames = async () => {
    const uniqueUids = [...new Set(tickets.map(t => t.createdBy).filter(Boolean))];
    const names: EmployeeCache = {};

    for (const uid of uniqueUids) {
      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('userId', '==', uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          names[uid] = snapshot.docs[0].data().name;
        } else {
          names[uid] = uid.substring(0, 8);
        }
      } catch (error) {
        names[uid] = uid.substring(0, 8);
      }
    }

    setEmployeeNames(names);
  };

  const formatCurrency = (amount: number, currency: string = 'IQD') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' ' + currency;
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const calculateTicketTotals = (ticket: Ticket) => {
    let purchase = 0;
    let sale = 0;
    ticket.passengers.forEach(p => {
      purchase += p.purchasePrice || 0;
      sale += p.salePrice || 0;
    });
    return { purchase, sale, profit: sale - purchase };
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'entry': return 'إدخال';
      case 'refund': return 'إرجاع';
      case 'change': return 'تغيير';
      default: return type;
    }
  };

  const copyPNR = async (pnr: string) => {
    try {
      await navigator.clipboard.writeText(pnr);
      setCopiedPNR(pnr);
      showNotification('success', 'تم نسخ PNR بنجاح');
      setTimeout(() => setCopiedPNR(null), 2000);
    } catch (error) {
      showNotification('error', 'فشل نسخ PNR');
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-black whitespace-nowrap';
    switch(type) {
      case 'entry':
        return `${baseClasses} ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`;
      case 'refund':
        return `${baseClasses} ${theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`;
      case 'change':
        return `${baseClasses} ${theme === 'dark' ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'}`;
      default:
        return baseClasses;
    }
  };

  const toggleRow = (ticketId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = (ticket: Ticket) => {
    setDeleteTicket(ticket);
  };

  const confirmDelete = () => {
    if (deleteTicket) {
      onDelete(deleteTicket.id);
      setDeleteTicket(null);
    }
  };

  if (tickets.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
        theme === 'dark'
          ? 'border-gray-700 text-gray-500'
          : 'border-gray-300 text-gray-400'
      }`}>
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">لا توجد تذاكر</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border shadow-lg">
        <table className="w-full">
          <thead>
            <tr className={`${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-blue-900/40 border-b-2 border-blue-700'
                : 'bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 border-b-2 border-blue-300'
            }`}>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>
                #
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-green-200' : 'text-green-900'
              }`}>
                PNR / الروت
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-red-200' : 'text-red-900'
              }`}>
                المسافرون
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-cyan-200' : 'text-cyan-900'
              }`}>
                المستفيد
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-pink-200' : 'text-pink-900'
              }`}>
                المصدر
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-yellow-200' : 'text-yellow-900'
              }`}>
                التواريخ
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-purple-200' : 'text-purple-900'
              }`}>
                العملة
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-orange-200' : 'text-orange-900'
              }`}>
                المبالغ
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-teal-200' : 'text-teal-900'
              }`}>
                الموظف
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-blue-200' : 'text-blue-900'
              }`}>
                التدقيق
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-purple-200' : 'text-purple-900'
              }`}>
                الإدخال
              </th>
              <th className={`px-4 py-5 text-center text-base font-black uppercase tracking-wider whitespace-nowrap ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
            {tickets.map((ticket, index) => {
              const totals = calculateTicketTotals(ticket);
              const isExpanded = expandedRows.has(ticket.id);
              const firstPassenger = ticket.passengers[0];
              const remainingPassengers = ticket.passengers.slice(1);

              return (
                <React.Fragment key={ticket.id}>
                  <tr
                    className={`border-b transition-colors ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-gray-700/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${index % 2 === 0 ? (theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50/50') : ''}`}
                  >
                    {/* Serial Number */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`font-black text-base ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>

                    {/* PNR / Route Combined */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-black text-base px-2 py-1 rounded ${
                            ticket.type === 'refund'
                              ? theme === 'dark'
                                ? 'bg-red-900/40 text-red-300'
                                : 'bg-red-100 text-red-700'
                              : theme === 'dark'
                                ? 'text-green-400'
                                : 'text-green-700'
                          }`}>
                            {ticket.pnr}
                          </span>
                          <button
                            onClick={() => copyPNR(ticket.pnr)}
                            className={`p-1.5 rounded-lg transition-all ${
                              copiedPNR === ticket.pnr
                                ? theme === 'dark'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-green-100 text-green-600'
                                : theme === 'dark'
                                  ? 'bg-gray-700 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400'
                                  : 'bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600'
                            }`}
                            title="نسخ PNR"
                          >
                            {copiedPNR === ticket.pnr ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {ticket.route && (
                          <div className="flex items-center justify-center gap-1">
                            <Plane className={`w-3 h-3 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                            <span className={`font-black text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {ticket.route}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Passengers - First passenger name + expand button */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-center">
                        {firstPassenger && (
                          <span className={`font-black text-base ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {firstPassenger.name}
                          </span>
                        )}
                        {remainingPassengers.length > 0 && (
                          <button
                            onClick={() => toggleRow(ticket.id)}
                            className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg transition-all text-xs font-black ${
                              theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-400'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            <span>+{remainingPassengers.length}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Beneficiary */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Building2 className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        <span className={`font-black text-base ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {ticket.beneficiary || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`font-black text-base ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {ticket.source || '-'}
                      </span>
                    </td>

                    {/* Dates with Labels */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-xs font-black ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            الإدخال:
                          </span>
                          <span className={`font-black text-xs ${
                            theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                          }`} dir="ltr">
                            {formatDate(ticket.entryDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-xs font-black ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            الإصدار:
                          </span>
                          <span className={`font-black text-xs ${
                            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'
                          }`} dir="ltr">
                            {formatDate(ticket.issueDate)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Currency */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-xs font-black ${
                        theme === 'dark'
                          ? 'bg-purple-900/30 text-purple-300'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {ticket.currency || 'IQD'}
                      </span>
                    </td>

                    {/* Amounts Combined with Labels */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-black ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            شراء:
                          </span>
                          <span className={`font-black text-xs ${
                            theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                          }`}>
                            {formatCurrency(totals.purchase, ticket.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-black ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            مبيع:
                          </span>
                          <span className={`font-black text-xs ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {formatCurrency(totals.sale, ticket.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-black ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            ربح:
                          </span>
                          <span className={`font-black text-xs ${
                            totals.profit >= 0
                              ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(totals.profit), ticket.currency)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Employee */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <User className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} />
                        <span className={`font-black text-base ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {employeeNames[ticket.createdBy] || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Audit Check */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (!hasAuditTransferPermission) return;
                          if (ticket.auditChecked) {
                            setUnauditConfirm({ ticketId: ticket.id, type: 'transfer' });
                          } else {
                            onToggleAudit(ticket.id, ticket.auditChecked);
                          }
                        }}
                        disabled={!hasAuditTransferPermission}
                        className={`p-2 rounded-lg transition-all ${
                          !hasAuditTransferPermission
                            ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400'
                            : ticket.auditChecked
                            ? theme === 'dark'
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={!hasAuditTransferPermission ? 'ليس لديك صلاحية التدقيق' : ''}
                      >
                        {ticket.auditChecked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* Entry Check */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (!hasAuditEntryPermission) return;
                          if (ticket.entryChecked) {
                            setUnauditConfirm({ ticketId: ticket.id, type: 'entry' });
                          } else {
                            onToggleEntry(ticket.id, ticket.entryChecked);
                          }
                        }}
                        disabled={!hasAuditEntryPermission}
                        className={`p-2 rounded-lg transition-all ${
                          !hasAuditEntryPermission
                            ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400'
                            : ticket.entryChecked
                            ? theme === 'dark'
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={!hasAuditEntryPermission ? 'ليس لديك صلاحية الإدخال' : ''}
                      >
                        {ticket.entryChecked ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewTicket(ticket)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                              : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                          }`}
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(ticket)}
                          disabled={ticket.auditChecked}
                          className={`p-2 rounded-lg transition-all ${
                            ticket.auditChecked
                              ? theme === 'dark'
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                              : theme === 'dark'
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                          title={ticket.auditChecked ? 'لا يمكن تعديل تذكرة مدققة' : 'تعديل'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRefundTicket(ticket)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                              : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          }`}
                          title="استرجاع"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ticket)}
                          disabled={ticket.auditChecked}
                          className={`p-2 rounded-lg transition-all ${
                            ticket.auditChecked
                              ? theme === 'dark'
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                              : theme === 'dark'
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                          title={ticket.auditChecked ? 'لا يمكن حذف تذكرة مدققة' : 'حذف'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded All Passengers Row */}
                  {isExpanded && (
                    <tr className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-blue-50/50'}>
                      <td colSpan={12} className="px-4 py-4">
                        <div className={`p-4 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                        }`}>
                          <h4 className={`font-black text-base mb-4 pb-2 border-b ${
                            theme === 'dark' ? 'text-gray-300 border-gray-700' : 'text-gray-800 border-gray-300'
                          }`}>
                            تفاصيل المسافرين:
                          </h4>
                          <div className="space-y-3">
                            {ticket.passengers.map((passenger, pIndex) => (
                              <div key={passenger.id} className={`pb-3 ${
                                pIndex < remainingPassengers.length ? (theme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''
                              }`}>
                                <div className="flex items-center gap-4 mb-2">
                                  <span className={`font-black text-base ${
                                    theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                                  }`}>
                                    المسافر #{pIndex + 1}:
                                  </span>
                                  <span className={`font-black text-base ${
                                    theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                                  }`}>
                                    {passenger.name}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded font-black ml-auto ${
                                    passenger.passengerType === 'adult'
                                      ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                      : passenger.passengerType === 'child'
                                      ? theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                                      : theme === 'dark' ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {passenger.passengerType === 'adult' ? 'بالغ' : passenger.passengerType === 'child' ? 'طفل' : 'رضيع'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-5 gap-4 mr-8">
                                  <div>
                                    <span className={`text-xs font-black block mb-1 ${
                                      theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                    }`}>
                                      رقم الجواز:
                                    </span>
                                    <span className={`font-black text-sm ${
                                      theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                                    }`}>
                                      {passenger.passportNumber || '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={`text-xs font-black block mb-1 ${
                                      theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                    }`}>
                                      رقم التذكرة:
                                    </span>
                                    <span className={`font-black text-sm ${
                                      theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                                    }`}>
                                      {passenger.ticketNumber || '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={`text-xs font-black block mb-1 ${
                                      theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                    }`}>
                                      سعر الشراء:
                                    </span>
                                    <span className={`font-black text-sm ${
                                      theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                                    }`}>
                                      {formatCurrency(passenger.purchasePrice, ticket.currency)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={`text-xs font-black block mb-1 ${
                                      theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                    }`}>
                                      سعر البيع:
                                    </span>
                                    <span className={`font-black text-sm ${
                                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
                                      {formatCurrency(passenger.salePrice, ticket.currency)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={`text-xs font-black block mb-1 ${
                                      theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                    }`}>
                                      الربح:
                                    </span>
                                    <span className={`font-black text-sm ${
                                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                    }`}>
                                      {formatCurrency(passenger.salePrice - passenger.purchasePrice, ticket.currency)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ModernModal
        isOpen={!!deleteTicket}
        onClose={() => setDeleteTicket(null)}
        title="تأكيد الحذف"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${
            theme === 'dark'
              ? 'bg-red-900/20 border border-red-800'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-red-800/50' : 'bg-red-100'
              }`}>
                <Trash2 className={`w-5 h-5 ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-700'
                }`} />
              </div>
              <span className={`font-black text-lg ${
                theme === 'dark' ? 'text-red-400' : 'text-red-700'
              }`}>
                هل أنت متأكد من حذف هذه التذكرة؟
              </span>
            </div>

            {deleteTicket && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    PNR:
                  </span>
                  <span className={`font-black ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                    {deleteTicket.pnr}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    الروت:
                  </span>
                  <span className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {deleteTicket.route || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    عدد المسافرين:
                  </span>
                  <span className={`font-black ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {deleteTicket.passengers.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={`p-3 rounded-lg ${
            theme === 'dark'
              ? 'bg-yellow-900/20 border border-yellow-800'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm font-bold text-center ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
            }`}>
              هذا الإجراء لا يمكن التراجع عنه!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTicket(null)}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              إلغاء
            </button>
            <button
              onClick={confirmDelete}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              حذف
            </button>
          </div>
        </div>
      </ModernModal>

      {/* View Ticket Details Modal */}
      <ModernModal
        isOpen={!!viewTicket}
        onClose={() => setViewTicket(null)}
        title="تفاصيل التذكرة"
      >
        {viewTicket && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    PNR
                  </span>
                  <div className={`font-black text-lg ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>
                    {viewTicket.pnr}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    النوع
                  </span>
                  <div className="mt-1">
                    <span className={getTypeBadge(viewTicket.type)}>
                      {getTypeLabel(viewTicket.type)}
                    </span>
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    الروت
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {viewTicket.route || '-'}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    العملة
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {viewTicket.currency || 'IQD'}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    المستفيد
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {viewTicket.beneficiary || '-'}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    المصدر
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {viewTicket.source || '-'}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    تاريخ الإدخال
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} dir="ltr">
                    {formatDate(viewTicket.entryDate)}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    تاريخ الإصدار
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} dir="ltr">
                    {formatDate(viewTicket.issueDate)}
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    الموظف
                  </span>
                  <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {employeeNames[viewTicket.createdBy] || '-'}
                  </div>
                </div>
              </div>

              {viewTicket.notes && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    ملاحظات
                  </span>
                  <div className={`font-bold mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {viewTicket.notes}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className={`font-black mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                المسافرون ({viewTicket.passengers.length})
              </h3>
              <div className="space-y-2">
                {viewTicket.passengers.map((passenger, index) => (
                  <div
                    key={passenger.id}
                    className={`p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-black ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {index + 1}. {passenger.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        passenger.passengerType === 'adult'
                          ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                          : passenger.passengerType === 'child'
                          ? theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                          : theme === 'dark' ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {passenger.passengerType === 'adult' ? 'بالغ' : passenger.passengerType === 'child' ? 'طفل' : 'رضيع'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          رقم الجواز
                        </span>
                        <div className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {passenger.passportNumber || '-'}
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          سعر الشراء
                        </span>
                        <div className={`font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                          {formatCurrency(passenger.purchasePrice, viewTicket.currency)}
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          سعر البيع
                        </span>
                        <div className={`font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                          {formatCurrency(passenger.salePrice, viewTicket.currency)}
                        </div>
                      </div>
                    </div>
                    {passenger.ticketNumber && (
                      <div className="mt-2 text-sm">
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          رقم التذكرة:
                        </span>
                        <span className={`font-bold mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {passenger.ticketNumber}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800'
                : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
            }`}>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <span className={`text-xs font-bold block mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    إجمالي الشراء
                  </span>
                  <div className={`font-black text-lg ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                    {formatCurrency(calculateTicketTotals(viewTicket).purchase, viewTicket.currency)}
                  </div>
                </div>
                <div className="text-center">
                  <span className={`text-xs font-bold block mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    إجمالي البيع
                  </span>
                  <div className={`font-black text-lg ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatCurrency(calculateTicketTotals(viewTicket).sale, viewTicket.currency)}
                  </div>
                </div>
                <div className="text-center">
                  <span className={`text-xs font-bold block mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    الربح
                  </span>
                  <div className={`font-black text-lg ${
                    calculateTicketTotals(viewTicket).profit >= 0
                      ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(calculateTicketTotals(viewTicket).profit), viewTicket.currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModernModal>

      {/* Unaudit Confirmation Modal */}
      <ModernModal
        isOpen={!!unauditConfirm}
        onClose={() => setUnauditConfirm(null)}
        title="تأكيد رفع التدقيق"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            theme === 'dark'
              ? 'bg-yellow-900/20 border-yellow-800'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              <XCircle className={`w-6 h-6 mt-0.5 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`font-bold mb-2 ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  هل أنت متأكد من رفع التدقيق؟
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                }`}>
                  عند رفع التدقيق، سوف يتمكن الموظفون من إجراء تعديلات على هذه التذكرة
                </p>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${
            theme === 'dark'
              ? 'bg-red-900/20 border border-red-800'
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm font-bold text-center ${
              theme === 'dark' ? 'text-red-400' : 'text-red-700'
            }`}>
              تأكد من أنك تريد السماح بالتعديل على هذه التذكرة!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setUnauditConfirm(null)}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                if (unauditConfirm) {
                  if (unauditConfirm.type === 'transfer') {
                    onToggleAudit(unauditConfirm.ticketId, true);
                  } else {
                    onToggleEntry(unauditConfirm.ticketId, true);
                  }
                  setUnauditConfirm(null);
                }
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              نعم، رفع التدقيق
            </button>
          </div>
        </div>
      </ModernModal>

      {/* Refund Ticket Modal */}
      {refundTicket && (
        <RefundTicketModal
          ticket={refundTicket}
          onClose={() => setRefundTicket(null)}
          onSuccess={() => {
            setRefundTicket(null);
          }}
        />
      )}
    </>
  );
}

