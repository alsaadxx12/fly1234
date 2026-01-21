import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useExchangeRate } from '../contexts/ExchangeRateContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import useAccountSettings from './Accounts/hooks/useAccountSettings';
import useVouchers from './Accounts/hooks/useVouchers';
import {
  Trash2,
  Download,
  Loader2,
  Check,
  ShieldOff,
  Info,
  ArrowDownRight,
  ArrowUpLeft,
  DollarSign,
  Search,
  Plus,
  Hash,
  X,
  Filter,
  Calendar
} from 'lucide-react';
import NewReceiptVoucherModal from './Accounts/components/NewReceiptVoucherModal';
import NewPaymentVoucherModal from './Accounts/components/NewPaymentVoucherModal';
import EditVoucherModal from './Accounts/components/EditVoucherModal';
import ViewVoucherDetailsModal from './Accounts/components/ViewVoucherDetailsModal';
import DeletedVouchersModal from './Accounts/components/DeletedVouchersModal';
import AccountsTable from './Accounts/components/AccountsTable';
import ExchangeRatesTable from './Accounts/components/ExchangeRatesTable';
import ExportToExcelButton from './Accounts/components/ExportToExcelButton';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ModernModal from '../components/ModernModal';
import * as XLSX from 'xlsx';

const Accounts = () => {
  const [activeView, setActiveView] = React.useState<'payment' | 'receipt' | 'exchange'>('receipt');
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isExchangeRateModalOpen, setIsExchangeRateModalOpen] = React.useState(false);
  const [isNewReceiptVoucherModalOpen, setIsNewReceiptVoucherModalOpen] = useState(false);
  const [isNewPaymentVoucherModalOpen, setIsNewPaymentVoucherModalOpen] = useState(false);
  const [isEditVoucherModalOpen, setIsEditVoucherModalOpen] = React.useState(false);
  const [isViewVoucherModalOpen, setIsViewVoucherModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeletedVouchersModalOpen, setIsDeletedVouchersModalOpen] = React.useState(false);
  const [isPermissionErrorModalOpen, setIsPermissionErrorModalOpen] = React.useState(false);
  const [permissionErrorType, setPermissionErrorType] = React.useState<'edit' | 'delete' | 'confirm' | 'settlement' | 'add' | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = React.useState<string | null>(null);
  const [editingVoucher, setEditingVoucher] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedInvoiceNumber, setAppliedInvoiceNumber] = useState('');

  const [filters, setFilters] = useState({
    currency: 'all' as 'all' | 'USD' | 'IQD',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [allVouchersForExport, setAllVouchersForExport] = useState<any[]>([]);

  const {
    vouchers,
    isLoading: isLoadingVouchers,
    deleteVoucher,
    nextPage,
    prevPage,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    totalVouchers,
    toggleSettlement,
    toggleConfirmation,
    fetchVouchersPage,
  } = useVouchers({
    type: activeView,
    searchTerm: appliedSearchTerm,
    invoiceNumberFilter: appliedInvoiceNumber,
    currencyFilter: filters.currency,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    itemsPerPage: itemsPerPage,
  });

  const [newRate, setNewRate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { currentRate, history, updateRate, isLoading: isLoadingRates } = useExchangeRate();
  const { employee, checkPermission } = useAuth();
  const { settings } = useAccountSettings();

  const hasAddPermission = checkPermission('accounts', 'add');
  const hasEditPermission = checkPermission('accounts', 'edit');
  const hasDeletePermission = checkPermission('accounts', 'delete');
  const hasConfirmPermission = checkPermission('accounts', 'confirm');
  const hasSettlementPermission = checkPermission('accounts', 'settlement');
  const hasCurrencyPermission = checkPermission('accounts', 'currency');

  const readOnlyMode = !hasAddPermission && !hasEditPermission && !hasDeletePermission &&
    !hasConfirmPermission && !hasSettlementPermission;

  const handleSearch = useCallback(() => {
    setAppliedSearchTerm(searchInput);
    setAppliedInvoiceNumber(invoiceNumberInput);
  }, [searchInput, invoiceNumberInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setInvoiceNumberInput('');
    setAppliedSearchTerm('');
    setAppliedInvoiceNumber('');
  }, []);

  const fetchAllVouchersForExport = async () => {
    try {
      let q = query(collection(db, 'vouchers'), where('type', '==', activeView));
      if (filters.currency !== 'all') {
        q = query(q, where('currency', '==', filters.currency));
      }
      if (filters.dateFrom) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
      }
      if (filters.dateTo) {
        const adjustedDateTo = new Date(filters.dateTo);
        adjustedDateTo.setHours(23, 59, 59, 999);
        q = query(q, where('createdAt', '<=', Timestamp.fromDate(adjustedDateTo)));
      }
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      let vouchersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (appliedSearchTerm) {
        const term = appliedSearchTerm.toLowerCase();
        vouchersData = vouchersData.filter((v: any) =>
          v.companyName.toLowerCase().includes(term) ||
          (v.details && v.details.toLowerCase().includes(term))
        );
      }
      if (appliedInvoiceNumber) {
        vouchersData = vouchersData.filter((v: any) =>
          v.invoiceNumber.toString().includes(appliedInvoiceNumber)
        );
      }
      setAllVouchersForExport(vouchersData);
    } catch (err) {
      console.error("Error fetching all vouchers for export:", err);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRate || !employee) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await updateRate(parseFloat(newRate), notes, employee.name);
      setIsExchangeRateModalOpen(false);
      setNewRate('');
      setNotes('');
      setSuccess('تم تحديث سعر الصرف بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating rate:', error);
      setError('فشل في تحديث سعر الصرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoucherAction = (action: 'view' | 'edit' | 'delete', voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    if (action === 'edit' && !hasEditPermission) {
      setPermissionErrorType('edit'); setIsPermissionErrorModalOpen(true); return;
    }
    if (action === 'delete' && !hasDeletePermission) {
      setPermissionErrorType('delete'); setIsPermissionErrorModalOpen(true); return;
    }

    setSelectedVoucherId(voucherId);
    if (action === 'view') setIsViewVoucherModalOpen(true);
    if (action === 'edit') { setEditingVoucher(voucher as any); setIsEditVoucherModalOpen(true); }
    if (action === 'delete') setIsDeleteModalOpen(true);
  };

  const confirmDeleteVoucher = async () => {
    if (!selectedVoucherId) return;
    try {
      setIsSubmitting(true);
      await deleteVoucher(selectedVoucherId);
      setIsDeleteModalOpen(false);
      setSelectedVoucherId(null);
      setSuccess('تم حذف السند بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting voucher:', error);
      setError('فشل في حذف السند');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExchangeRates = () => {
    if (!history || history.length === 0) return;
    try {
      const excelData = history.map(item => ({
        'السعر': item.rate,
        'التاريخ': new Date(item.created_at).toLocaleDateString('en-GB'),
        'الوقت': new Date(item.created_at).toLocaleTimeString('en-US'),
        'تم بواسطة': item.created_by,
        'الملاحظات': item.notes || '',
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ExchangeRateHistory');
      XLSX.writeFile(workbook, `exchange_rate_history_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) { console.error('Error exporting exchange rates:', error); }
  };

  const selectedVoucherForDelete = vouchers.find(v => v.id === selectedVoucherId);

  return (
    <main className={`w-full flex flex-col flex-1 min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {success && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Check className="w-5 h-5" />
          <span className="font-bold">{success}</span>
        </div>
      )}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <ShieldOff className="w-5 h-5" />
          <span className="font-bold">{error}</span>
          <button onClick={() => setError(null)} className="mr-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Read Only Mode Banner */}
      {readOnlyMode && (
        <div className="mx-4 mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-500" />
          <div className="text-sm">
            <span className="font-bold block">وضع القراءة فقط</span>
            <span className="opacity-80">أنت حالياً في وضع العرض فقط ولا تملك صلاحيات التعديل.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-inherit/80 backdrop-blur-md pt-4 px-4 sm:px-6">
        <div className="flex items-center justify-center mb-6">
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl w-full sm:w-auto self-start backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
            <button
              onClick={() => setActiveView('receipt')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2.5 ${activeView === 'receipt'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-emerald-900/50 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <div className={`p-1 rounded-md transition-colors ${activeView === 'receipt' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-transparent'}`}>
                <ArrowDownRight className={`w-4 h-4 transition-transform duration-500 ${activeView === 'receipt' ? 'rotate-0' : '-rotate-45 opacity-50'}`} />
              </div>
              <span>قبض</span>
            </button>
            <button
              onClick={() => setActiveView('payment')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2.5 ${activeView === 'payment'
                ? 'bg-white dark:bg-gray-700 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100/50 dark:border-rose-900/50 scale-[1.02]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
            >
              <div className={`p-1 rounded-md transition-colors ${activeView === 'payment' ? 'bg-rose-50 dark:bg-rose-900/30' : 'bg-transparent'}`}>
                <ArrowUpLeft className={`w-4 h-4 transition-transform duration-500 ${activeView === 'payment' ? 'rotate-0' : 'rotate-45 opacity-50'}`} />
              </div>
              <span>دفع</span>
            </button>
            {hasCurrencyPermission && <button onClick={() => setActiveView('exchange')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2.5 ${activeView === 'exchange'
              ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100/50 dark:border-amber-900/50 scale-[1.02]'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}>
              <div className={`p-1 rounded-md transition-colors ${activeView === 'exchange' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-transparent'}`}>
                <DollarSign className="w-4 h-4" />
              </div>
              <span>صرف</span>
            </button>}
          </div>
        </div>

        {/* Header Row */}
        <div className="flex flex-col gap-4 pb-4 border-b dark:border-gray-800">
          {activeView !== 'exchange' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className={`h-11 px-4 flex items-center gap-2 rounded-xl border-2 transition-all font-bold text-sm ${isFiltersExpanded ? 'bg-blue-600 border-blue-600 text-white' : theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-100 text-gray-600'}`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">بحث وفلترة</span>
                  </button>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                  {/* Pagination */}
                  <div className="relative group">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        fetchVouchersPage('first');
                      }}
                      className="h-11 px-3 pr-8 rounded-xl border-2 font-bold bg-transparent border-gray-100 dark:border-gray-700 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value={15}>15 سند</option>
                      <option value={30}>30 سند</option>
                      <option value={50}>50 سند</option>
                      <option value={-1}>الكل</option>
                    </select>
                    <Plus className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 rotate-45 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* New Voucher Button (Desktop only) */}
                  <button
                    onClick={() => {
                      if (activeView === 'receipt') {
                        hasAddPermission ? setIsNewReceiptVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
                      } else {
                        hasAddPermission ? setIsNewPaymentVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
                      }
                    }}
                    className={`hidden lg:flex items-center gap-2 h-11 px-6 rounded-xl text-white font-black shadow-lg transition-all text-sm whitespace-nowrap ${activeView === 'receipt' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}
                  >
                    <Plus className="w-5 h-5" />
                    <span>{activeView === 'receipt' ? 'إضافة قبض' : 'إضافة دفع'}</span>
                  </button>

                  {/* Export */}
                  <ExportToExcelButton
                    vouchers={allVouchersForExport}
                    onPrepareExport={fetchAllVouchersForExport}
                    fileName={activeView === 'receipt' ? 'receipts' : 'payments'}
                    voucherType={activeView}
                    className="h-11 px-4 !bg-emerald-500/10 !text-emerald-500 !rounded-xl !border-0 hover:!bg-emerald-500/20 shadow-sm transition-all"
                  >
                    <Download className="w-5 h-5" />
                  </ExportToExcelButton>

                  <button
                    onClick={() => setIsDeletedVouchersModalOpen(true)}
                    className="h-11 px-4 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all shadow-sm"
                    title="المحذوفات"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isFiltersExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 mt-2 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search Input */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 px-1">بحث نصي</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="اسم الزبون أو التفاصيل..."
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
                              className={`w-full pr-4 pl-10 h-11 rounded-xl border-2 transition-all outline-none font-bold text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                        </div>

                        {/* Invoice Number */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 px-1">رقم السند</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              placeholder="أدخل الرقم..."
                              value={invoiceNumberInput}
                              onChange={(e) => setInvoiceNumberInput(e.target.value)}
                              className={`w-full pr-4 pl-10 h-11 rounded-xl border-2 transition-all outline-none font-bold text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                            />
                          </div>
                        </div>

                        {/* Currency */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 px-1">العملة</label>
                          <select
                            value={filters.currency}
                            onChange={(e) => setFilters(p => ({ ...p, currency: e.target.value as any }))}
                            className={`w-full h-11 px-3 rounded-xl border-2 font-black outline-none cursor-pointer text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-400' : 'bg-white border-gray-100 text-blue-600'}`}
                          >
                            <option value="all">الكل 🏳️</option>
                            <option value="USD">USD 💵</option>
                            <option value="IQD">IQD 🇮🇶</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 px-1">من تاريخ</label>
                          <div className="relative">
                            <input type="date" value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''} onChange={(e) => setFilters(p => ({ ...p, dateFrom: e.target.value ? new Date(e.target.value) : undefined }))} className={`w-full h-11 px-4 pr-10 rounded-xl border-2 outline-none font-bold text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 px-1">إلى تاريخ</label>
                          <div className="relative">
                            <input type="date" value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''} onChange={(e) => setFilters(p => ({ ...p, dateTo: e.target.value ? new Date(e.target.value) : undefined }))} className={`w-full h-11 px-4 pr-10 rounded-xl border-2 outline-none font-bold text-sm ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleSearch}
                          className="px-8 h-11 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          <span>تطبيق الفلترة</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full font-bold">
              <button onClick={() => setIsExchangeRateModalOpen(true)} className="px-6 h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"><Plus className="w-5 h-5" />تحديث السعر</button>
              <button onClick={handleExportExchangeRates} className="h-11 px-4 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center gap-2 hover:bg-emerald-500/20 transition-all"><Download className="w-4 h-4" />تصدير</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 pb-28">
        {activeView !== 'exchange' ? (
          <div className="relative">
            {isLoadingVouchers && (
              <div className="absolute inset-0 z-20 bg-inherit/50 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                <p className="text-sm font-bold opacity-60">جاري التحميل...</p>
              </div>
            )}
            <AccountsTable
              vouchers={vouchers}
              onSettlementToggle={(v) => hasSettlementPermission ? toggleSettlement(v) : (setPermissionErrorType('settlement'), setIsPermissionErrorModalOpen(true))}
              onConfirmationToggle={(v) => hasConfirmPermission ? toggleConfirmation(v) : (setPermissionErrorType('confirm'), setIsPermissionErrorModalOpen(true))}
              onViewVoucher={(id) => handleVoucherAction('view', id)}
              onEditVoucher={(id) => handleVoucherAction('edit', id)}
              onDeleteVoucher={(id) => handleVoucherAction('delete', id)}
              readOnlyMode={readOnlyMode}
              onNextPage={nextPage}
              onPreviousPage={prevPage}
              currentPage={currentPage}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              totalVouchers={totalVouchers}
              itemsPerPage={itemsPerPage}
            />
          </div>
        ) : (
          <ExchangeRatesTable history={history} isLoading={isLoadingRates} />
        )}
      </div>



      {/* Modals */}
      <ModernModal isOpen={isPermissionErrorModalOpen} onClose={() => setIsPermissionErrorModalOpen(false)} title="تنبيه: صلاحيات محدودة" icon={<ShieldOff className="w-8 h-8 text-red-500" />}>
        <div className="text-center p-2">
          <p className="text-lg font-bold mb-4">
            {permissionErrorType === 'edit' && 'ليس لديك صلاحية تعديل السندات.'}
            {permissionErrorType === 'delete' && 'ليس لديك صلاحية حذف السندات.'}
            {permissionErrorType === 'add' && 'ليس لديك صلاحية إضافة سندات.'}
            {permissionErrorType === 'confirm' && 'ليس لديك صلاحية تأكيد السندات.'}
            {permissionErrorType === 'settlement' && 'ليس لديك صلاحية تحاسب السندات.'}
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 text-sm">يرجى مراجعة إدارة النظام لطلب الصلاحيات.</div>
        </div>
      </ModernModal>

      {isNewReceiptVoucherModalOpen && <NewReceiptVoucherModal isOpen={isNewReceiptVoucherModalOpen} onClose={() => setIsNewReceiptVoucherModalOpen(false)} settings={settings} />}
      {isNewPaymentVoucherModalOpen && <NewPaymentVoucherModal isOpen={isNewPaymentVoucherModalOpen} onClose={() => setIsNewPaymentVoucherModalOpen(false)} />}
      {isEditVoucherModalOpen && selectedVoucherId && editingVoucher && <EditVoucherModal isOpen={isEditVoucherModalOpen} onClose={() => { setIsEditVoucherModalOpen(false); setEditingVoucher(null); }} voucherId={selectedVoucherId} settings={settings} onVoucherUpdated={() => { }} />}
      {isViewVoucherModalOpen && selectedVoucherId && <ViewVoucherDetailsModal isOpen={isViewVoucherModalOpen} onClose={() => { setIsViewVoucherModalOpen(false); setSelectedVoucherId(null); }} voucherId={selectedVoucherId} settings={settings} />}

      <ModernModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="تأكيد الحذف" icon={<Trash2 className="w-8 h-8 text-red-600" />} footer={
        <div className="flex gap-3 w-full justify-end">
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 transition-colors">تراجع</button>
          <button onClick={confirmDeleteVoucher} disabled={isSubmitting} className="px-8 py-2.5 rounded-xl font-black bg-red-600 text-white shadow-lg shadow-red-500/20 disabled:opacity-50">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد الحذف'}</button>
        </div>
      }>
        <div className="space-y-4">
          <p className="opacity-70 font-medium">سيتم نقل السند إلى قائمة المحذوفات.</p>
          {selectedVoucherForDelete && (
            <div className={`p-4 rounded-2xl border-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xl font-black text-red-600 dark:text-red-400 mb-2">{selectedVoucherForDelete.companyName}</div>
              <div className="flex justify-between font-bold opacity-80">
                <span>#{selectedVoucherForDelete.invoiceNumber}</span>
                <span>{selectedVoucherForDelete.amount.toLocaleString()} {selectedVoucherForDelete.currency}</span>
              </div>
            </div>
          )}
        </div>
      </ModernModal>

      <DeletedVouchersModal isOpen={isDeletedVouchersModalOpen} onClose={() => setIsDeletedVouchersModalOpen(false)} />

      <ModernModal isOpen={isExchangeRateModalOpen} onClose={() => setIsExchangeRateModalOpen(false)} title={t('updateExchangeRate')} icon={<DollarSign className="w-8 h-8 text-amber-500" />}>
        <form onSubmit={handleUpdateRate} className="space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 flex items-center justify-between">
            <span className="font-bold opacity-70">الحالي:</span>
            <span className="text-2xl font-black text-emerald-600">{currentRate.toLocaleString()} <small>د.ع</small></span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-black opacity-70 px-1">السعر الجديد (لكل 100$)</label>
            <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full h-14 px-4 text-2xl font-black text-center border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 outline-none transition-all" placeholder="0" dir="ltr" required />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-24 p-4 text-sm font-bold border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-100 dark:bg-gray-800 outline-none resize-none" placeholder="ملاحظات..." />
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsExchangeRateModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold bg-gray-100 dark:bg-gray-800">إلغاء</button>
            <button type="submit" disabled={isSubmitting || !newRate} className="flex-[2] h-12 rounded-xl font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg disabled:opacity-50">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تحديث الآن'}</button>
          </div>
        </form>
      </ModernModal>
      {/* Floating Action Button (FAB) - Mobile Only, Icon Only, Fixed via Portal */}
      {activeView !== 'exchange' && createPortal(
        <button
          onClick={() => {
            if (activeView === 'receipt') {
              hasAddPermission ? setIsNewReceiptVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
            } else {
              hasAddPermission ? setIsNewPaymentVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
            }
          }}
          className={`fixed bottom-24 left-6 z-[100] lg:hidden flex items-center justify-center w-16 h-16 rounded-full text-white font-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-white dark:border-gray-900 active:scale-95 transition-all ${activeView === 'receipt' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}
        >
          <Plus className="w-8 h-8" />
        </button>,
        document.body
      )}
    </main>
  );
};

export default Accounts;
