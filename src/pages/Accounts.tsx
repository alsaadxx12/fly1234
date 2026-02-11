import React, { useState, useCallback } from 'react';
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
  Plus,
  ArrowDownRight,
  ArrowUpLeft,
  DollarSign,
  Search,
  Hash,
  Filter,
  X,
} from 'lucide-react';
import NewReceiptVoucherModal from './Accounts/components/NewReceiptVoucherModal';
import NewPaymentVoucherModal from './Accounts/components/NewPaymentVoucherModal';
import EditVoucherModal from './Accounts/components/EditVoucherModal';
import ViewVoucherDetailsModal from './Accounts/components/ViewVoucherDetailsModal';
import DeletedVouchersModal from './Accounts/components/DeletedVouchersModal';
import AccountsTable from './Accounts/components/AccountsTable';
import ExchangeRatesTable from './Accounts/components/ExchangeRatesTable';
import ExportToExcelButton from './Accounts/components/ExportToExcelButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { DatePicker } from '../components/ui/datepicker';
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
          <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl w-full sm:w-auto self-start backdrop-blur-xl border border-white/40 dark:border-gray-700/40 shadow-xl shadow-black/5 relative overflow-hidden">
            {[
              { id: 'receipt', label: 'قبض', icon: ArrowDownRight, color: 'emerald' },
              { id: 'payment', label: 'دفع', icon: ArrowUpLeft, color: 'rose' },
              ...(hasCurrencyPermission ? [{ id: 'exchange', label: 'صرف', icon: DollarSign, color: 'amber' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`relative px-8 py-2.5 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-3 z-10 ${activeView === tab.id
                  ? (tab.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : tab.color === 'rose' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {activeView === tab.id && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className={`absolute inset-0 rounded-xl shadow-lg z-[-1] ${tab.color === 'emerald' ? 'bg-white dark:bg-gray-700/80 shadow-emerald-500/10' : tab.color === 'rose' ? 'bg-white dark:bg-gray-700/80 shadow-rose-500/10' : 'bg-white dark:bg-gray-700/80 shadow-amber-500/10'}`}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <div className={`p-1.5 rounded-lg transition-all duration-500 ${activeView === tab.id
                  ? (tab.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-400/10' : tab.color === 'rose' ? 'bg-rose-50 dark:bg-rose-400/10' : 'bg-amber-50 dark:bg-amber-400/10')
                  : 'bg-transparent'
                  }`}>
                  <tab.icon className={`w-4 h-4 transition-all duration-500 ${activeView === tab.id ? 'scale-110' : 'opacity-40 scale-100'}`} />
                </div>
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Header Row */}
        <div className="flex flex-col gap-4 pb-4 border-b dark:border-gray-800">
          {activeView !== 'exchange' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Filter Toggle */}
                  <Button
                    variant={isFiltersExpanded ? "premium" : "outline"}
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">بحث وفلترة</span>
                  </Button>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                  {/* Pagination */}
                  <div className="relative group min-w-[120px]">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value: string) => {
                        setItemsPerPage(parseInt(value));
                        fetchVouchersPage('first');
                      }}
                    >
                      <SelectTrigger className="font-black">
                        <SelectValue placeholder="عدد السندات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 سند</SelectItem>
                        <SelectItem value="30">30 سند</SelectItem>
                        <SelectItem value="50">50 سند</SelectItem>
                        <SelectItem value="100">100 سند</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <motion.div
                    initial={{ height: 0, opacity: 0, scale: 0.95, y: -20 }}
                    animate={{
                      height: 'auto',
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        height: { duration: 0.4 },
                        opacity: { duration: 0.3 },
                        scale: { type: "spring", stiffness: 300, damping: 25 },
                        y: { type: "spring", stiffness: 300, damping: 25 }
                      }
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      scale: 0.95,
                      y: -20,
                      transition: {
                        height: { duration: 0.3 },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 },
                        y: { duration: 0.2 }
                      }
                    }}
                    className="overflow-hidden rounded-2xl mt-2 shadow-2xl border border-black/10 dark:border-white/10"
                  >
                    <div className="p-2.5 rounded-2xl space-y-2.5 bg-white/98 dark:bg-gray-950/98 backdrop-blur-3xl relative overflow-hidden group border border-gray-100 dark:border-gray-900">
                      {/* Subtlest possible inner glow for definition without hard edges */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-30 pointer-events-none" />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 relative z-10">
                        {/* Search Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1 tracking-widest leading-none">بحث نصي</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-600 pointer-events-none" />
                            <Input
                              placeholder="اسم الزبون أو التفاصيل..."
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
                              className="pl-9 text-xs h-8 bg-slate-50/50 dark:bg-gray-900/50 border-slate-300 dark:border-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Invoice Number */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1 tracking-widest leading-none">رقم السند</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-600 pointer-events-none" />
                            <Input
                              type="number"
                              placeholder="أدخل الرقم..."
                              value={invoiceNumberInput}
                              onChange={(e) => setInvoiceNumberInput(e.target.value)}
                              className="pl-9 text-xs h-8 bg-slate-50/50 dark:bg-gray-900/50 border-slate-300 dark:border-slate-700 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Currency Filter */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1 tracking-widest leading-none">العملة</label>
                          <Select
                            value={filters.currency}
                            onValueChange={(val: string) => setFilters(p => ({ ...p, currency: val as any }))}
                          >
                            <SelectTrigger className="font-black text-xs h-8 bg-slate-50/50 dark:bg-gray-900/50 border-slate-300 dark:border-slate-700">
                              <SelectValue placeholder="العملة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="text-xs">الكل 🏳️</SelectItem>
                              <SelectItem value="USD" className="text-xs">USD 💵</SelectItem>
                              <SelectItem value="IQD" className="text-xs">IQD 🇮🇶</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date From */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1 tracking-widest leading-none">من تاريخ</label>
                          <DatePicker
                            date={filters.dateFrom}
                            setDate={(d) => setFilters(p => ({ ...p, dateFrom: d }))}
                            placeholder="من تاريخ"
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-gray-900/50"
                          />
                        </div>

                        {/* Date To */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 px-1 tracking-widest leading-none">إلى تاريخ</label>
                          <DatePicker
                            date={filters.dateTo}
                            setDate={(d) => setFilters(p => ({ ...p, dateTo: d }))}
                            placeholder="إلى تاريخ"
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-gray-900/50"
                          />
                        </div>

                        {/* Reset & Apply */}
                        <div className="flex items-end gap-2 lg:col-span-1">
                          <Button
                            variant="premium"
                            className="flex-1 shadow-blue-500/10 h-8 text-[11px] font-black"
                            onClick={handleSearch}
                          >
                            <Filter className="w-3 h-3 ml-1.5" />
                            تطبيق الفلترة
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-slate-100 dark:bg-gray-800 border-0 hover:bg-rose-500/10 hover:text-rose-500 transition-colors h-8 w-8"
                            onClick={() => {
                              setSearchInput('');
                              setInvoiceNumberInput('');
                              setFilters({
                                currency: 'all',
                                dateFrom: undefined,
                                dateTo: undefined,
                              });
                              setTimeout(handleSearch, 10);
                            }}
                            title="إعادة ضبط"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
              <div className="absolute inset-0 z-20 bg-inherit/50 flex flex-col items-center justify-center rounded-3xl">
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

      {isNewReceiptVoucherModalOpen && <NewReceiptVoucherModal isOpen={isNewReceiptVoucherModalOpen} onClose={() => { setIsNewReceiptVoucherModalOpen(false); setTimeout(() => fetchVouchersPage('first'), 300); }} settings={settings} />}
      {isNewPaymentVoucherModalOpen && <NewPaymentVoucherModal isOpen={isNewPaymentVoucherModalOpen} onClose={() => { setIsNewPaymentVoucherModalOpen(false); setTimeout(() => fetchVouchersPage('first'), 300); }} />}
      {isEditVoucherModalOpen && selectedVoucherId && editingVoucher && <EditVoucherModal isOpen={isEditVoucherModalOpen} onClose={() => { setIsEditVoucherModalOpen(false); setEditingVoucher(null); setTimeout(() => fetchVouchersPage('refresh'), 300); }} voucherId={selectedVoucherId} settings={settings} onVoucherUpdated={() => { fetchVouchersPage('refresh'); }} />}
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
      {
        activeView !== 'exchange' && createPortal(
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
        )
      }
    </main >
  );
};

export default Accounts;
