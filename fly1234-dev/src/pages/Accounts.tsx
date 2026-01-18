import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
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
  Filter,
  Plus,
  Hash,
  X
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
import AccountsFilters from './Accounts/components/AccountsFilters';
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
    beneficiary: '',
    safe: '',
    employee: '',
    confirmation: 'all',
    settlement: 'all',
    currency: 'all' as 'all' | 'USD' | 'IQD',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const [companies, setCompanies] = useState<any[]>([]);
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
    beneficiaryFilter: filters.beneficiary,
    currencyFilter: filters.currency,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    itemsPerPage: itemsPerPage,
  });

  const paginatedVouchers = vouchers;


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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        setCompanies(companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleSearch = useCallback(() => {
    setAppliedSearchTerm(searchInput);
    setAppliedInvoiceNumber(invoiceNumberInput);
  }, [searchInput, invoiceNumberInput]);

  const handleClearSearch = () => {
    setSearchInput('');
    setInvoiceNumberInput('');
    setAppliedSearchTerm('');
    setAppliedInvoiceNumber('');
  };

  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setInvoiceNumberInput('');
    setAppliedSearchTerm('');
    setAppliedInvoiceNumber('');
    setFilters({
      beneficiary: '',
      safe: '',
      employee: '',
      confirmation: 'all',
      settlement: 'all',
      currency: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
  }, []);

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

  const fetchAllVouchersForExport = async () => {
    try {
      let q = query(collection(db, 'vouchers'), where('type', '==', activeView));

      if (filters.beneficiary) {
        q = query(q, where('companyName', '==', filters.beneficiary));
      }
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
    } catch (error) {
      console.error('Error exporting exchange rates:', error);
    }
  };

  const handleVoucherAction = (action: 'view' | 'edit' | 'delete', voucherId: string) => {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;

    let requiredPermission: 'edit' | 'delete' | null = null;
    let permissionError: 'edit' | 'delete' | null = null;

    if (action === 'edit') {
      requiredPermission = 'edit';
      permissionError = 'edit';
    } else if (action === 'delete') {
      requiredPermission = 'delete';
      permissionError = 'delete';
    }

    if (requiredPermission && !checkPermission('accounts', requiredPermission)) {
      setPermissionErrorType(permissionError);
      setIsPermissionErrorModalOpen(true);
      return;
    }

    setSelectedVoucherId(voucherId);

    switch (action) {
      case 'view':
        setIsViewVoucherModalOpen(true);
        break;
      case 'edit':
        setEditingVoucher(voucher as any);
        setIsEditVoucherModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
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

  const activeFiltersCount = [
    appliedSearchTerm,
    appliedInvoiceNumber,
    filters.beneficiary,
    filters.safe,
    filters.employee,
    filters.dateFrom,
    filters.dateTo,
    filters.currency !== 'all',
    filters.confirmation !== 'all',
    filters.settlement !== 'all'
  ].filter(Boolean).length;

  const selectedVoucherForDelete = vouchers.find(v => v.id === selectedVoucherId);

  return (
    <main className={`w-full flex flex-col flex-1 min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Success Notification */}
      {success && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Check className="w-5 h-5" />
          </div>
          <span className="font-bold">{success}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <ShieldOff className="w-5 h-5" />
          </div>
          <span className="font-bold">{error}</span>
          <button onClick={() => setError(null)} className="mr-auto hover:bg-white/10 rounded-lg p-1 transition-colors">
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

      {/* View Switcher Tabs */}
      <div className="sticky top-0 z-40 bg-inherit/80 backdrop-blur-md pt-4 px-4 sm:px-6">
        <div className="flex items-center justify-center mb-6">
          <div className={`flex flex-wrap sm:flex-nowrap gap-2 p-1.5 rounded-2xl shadow-inner w-full sm:w-auto ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200/50'}`}>
            <button
              onClick={() => setActiveView('receipt')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeView === 'receipt'
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg scale-[1.02]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>قبض</span>
            </button>

            <button
              onClick={() => setActiveView('payment')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeView === 'payment'
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg scale-[1.02]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <ArrowUpLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>دفع</span>
            </button>

            {hasCurrencyPermission && (
              <button
                onClick={() => setActiveView('exchange')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeView === 'exchange'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg scale-[1.02]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>صرف</span>
              </button>
            )}
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b dark:border-gray-800">
          {activeView !== 'exchange' ? (
            <>
              {/* Search & Actions Group */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row gap-2 flex-grow">
                  <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو التفاصيل..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className={`w-full pr-4 pl-10 h-11 rounded-xl border-2 transition-all outline-none text-sm ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                    />
                  </div>
                  <div className="relative flex-1 min-w-0 sm:min-w-[140px]">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      placeholder="رقم السند..."
                      value={invoiceNumberInput}
                      onChange={(e) => setInvoiceNumberInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className={`w-full pr-4 pl-10 h-11 rounded-xl border-2 transition-all outline-none text-sm ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700 text-white focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleSearch} className="flex-1 sm:flex-none px-4 sm:px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                    <Search className="w-4 h-4 sm:hidden" />
                    <span className="sm:inline">بحث</span>
                  </button>
                  <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className={`min-w-[44px] h-11 flex items-center justify-center rounded-xl transition-all relative ${isFiltersExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                  >
                    <Filter className="w-5 h-5" />
                    {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">{activeFiltersCount}</span>}
                  </button>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button onClick={() => setIsDeletedVouchersModalOpen(true)} className="h-11 px-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold" title="عرض السجلات المحذوفة">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">المحذوفات</span>
                </button>

                <ExportToExcelButton
                  vouchers={allVouchersForExport}
                  onPrepareExport={fetchAllVouchersForExport}
                  fileName={activeView === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers'}
                  voucherType={activeView}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">تصدير</span>
                </ExportToExcelButton>

                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    setItemsPerPage(newSize);
                    fetchVouchersPage('first');
                  }}
                  className="h-11 px-3 rounded-xl border-2 font-bold transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-transparent focus:border-blue-500 outline-none text-xs sm:text-sm"
                >
                  <option value={15}>15 صفحة</option>
                  <option value={30}>30 صفحة</option>
                  <option value={50}>50 صفحة</option>
                  <option value={-1}>عرض الكل</option>
                </select>

                <div className="hidden lg:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

                <button
                  onClick={() => {
                    if (activeView === 'receipt') {
                      hasAddPermission ? setIsNewReceiptVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
                    } else {
                      hasAddPermission ? setIsNewPaymentVoucherModalOpen(true) : (setPermissionErrorType('add'), setIsPermissionErrorModalOpen(true));
                    }
                  }}
                  className={`flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-white font-black shadow-lg transition-all text-sm whitespace-nowrap grow sm:grow-0 ${activeView === 'receipt' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-emerald-500/20' : 'bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-rose-500/20'}`}
                >
                  <Plus className="w-5 h-5" />
                  <span>{activeView === 'receipt' ? t('newReceiptVoucher') : t('newPaymentVoucher')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-row-reverse items-center justify-between w-full">
              <button
                onClick={() => setIsExchangeRateModalOpen(true)}
                className="px-6 h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>{t('updateRate')}</span>
              </button>
              <button
                onClick={handleExportExchangeRates}
                className="h-11 px-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-bold"
              >
                <Download className="w-4 h-4" />
                <span>تصدير الأسعار</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 pb-20">
        {activeView !== 'exchange' ? (
          <div className="flex-1 flex flex-col gap-4">
            {isFiltersExpanded && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <AccountsFilters
                  beneficiaryFilter={filters.beneficiary}
                  setBeneficiaryFilter={(value) => setFilters(prev => ({ ...prev, beneficiary: value }))}
                  currencyFilter={filters.currency}
                  setCurrencyFilter={(value) => setFilters(prev => ({ ...prev, currency: value }))}
                  dateFrom={filters.dateFrom}
                  setDateFrom={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                  dateTo={filters.dateTo}
                  setDateTo={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                  onReset={handleResetFilters}
                  beneficiaries={companies.map(c => c.name)}
                  companies={companies}
                />
              </div>
            )}

            <div className="flex-1 relative min-h-[400px]">
              {isLoadingVouchers ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-inherit/50 backdrop-blur-sm rounded-3xl">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-500 font-bold animate-pulse">جاري تحميل السندات...</p>
                </div>
              ) : (
                <AccountsTable
                  vouchers={paginatedVouchers}
                  onSettlementToggle={(voucher) => {
                    if (!hasSettlementPermission) {
                      setPermissionErrorType('settlement');
                      setIsPermissionErrorModalOpen(true);
                      return;
                    }
                    toggleSettlement(voucher);
                  }}
                  onConfirmationToggle={(voucher) => {
                    if (!hasConfirmPermission) {
                      setPermissionErrorType('confirm');
                      setIsPermissionErrorModalOpen(true);
                      return;
                    }
                    toggleConfirmation(voucher);
                  }}
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
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <ExchangeRatesTable
              history={history}
              isLoading={isLoadingRates}
            />
          </div>
        )}
      </div>

      {/* Modals Section */}
      <ModernModal
        isOpen={isPermissionErrorModalOpen}
        onClose={() => setIsPermissionErrorModalOpen(false)}
        title="تنبيه: صلاحيات محدودة"
        icon={<ShieldOff className="w-8 h-8 text-red-500" />}
      >
        <div className="text-center p-2">
          <p className="text-lg font-bold mb-4 opacity-80">
            {permissionErrorType === 'edit' && 'ليس لديك صلاحية تعديل السندات.'}
            {permissionErrorType === 'delete' && 'ليس لديك صلاحية حذف السندات.'}
            {permissionErrorType === 'confirm' && 'ليس لديك صلاحية تأكيد السندات.'}
            {permissionErrorType === 'settlement' && 'ليس لديك صلاحية تحاسب السندات.'}
            {permissionErrorType === 'add' && 'ليس لديك صلاحية إضافة سندات جديدة.'}
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium">
            يرجى مراجعة إدارة النظام لطلب الصلاحيات المطلوبة.
          </div>
        </div>
      </ModernModal>

      {isNewReceiptVoucherModalOpen && (
        <NewReceiptVoucherModal
          isOpen={isNewReceiptVoucherModalOpen}
          onClose={() => setIsNewReceiptVoucherModalOpen(false)}
          settings={settings}
        />
      )}

      {isNewPaymentVoucherModalOpen && (
        <NewPaymentVoucherModal
          isOpen={isNewPaymentVoucherModalOpen}
          onClose={() => setIsNewPaymentVoucherModalOpen(false)}
        />
      )}

      {isEditVoucherModalOpen && selectedVoucherId && editingVoucher && (
        <EditVoucherModal
          isOpen={isEditVoucherModalOpen}
          onClose={() => {
            setIsEditVoucherModalOpen(false);
            setEditingVoucher(null);
          }}
          voucherId={selectedVoucherId}
          settings={settings}
          onVoucherUpdated={() => {
            /* Real-time updates handle this */
          }}
        />
      )}

      {isViewVoucherModalOpen && selectedVoucherId && (
        <ViewVoucherDetailsModal
          isOpen={isViewVoucherModalOpen}
          onClose={() => {
            setIsViewVoucherModalOpen(false);
            setSelectedVoucherId(null);
          }}
          voucherId={selectedVoucherId}
          settings={settings}
        />
      )}

      <ModernModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="هل أنت متأكد من الحذف؟"
        icon={<Trash2 className="w-8 h-8 text-red-600" />}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              تراجع
            </button>
            <button
              onClick={confirmDeleteVoucher}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-black bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد الحذف'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400 font-medium">سيتم نقل السند إلى قائمة المحذوفات. هذا الإجراء لا يمكن التراجع عنه بسهولة.</p>
          {selectedVoucherForDelete && (
            <div className={`p-5 rounded-2xl border-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xl font-black mb-3 text-red-600 dark:text-red-400">{selectedVoucherForDelete.companyName}</div>
              <div className="grid grid-cols-2 gap-4 text-sm font-bold opacity-80">
                <div className="flex flex-col">
                  <span>رقم السند:</span>
                  <span className="font-mono text-base">#{selectedVoucherForDelete.invoiceNumber}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span>المبلغ:</span>
                  <span className="text-base text-gray-900 dark:text-gray-100">{selectedVoucherForDelete.amount.toLocaleString()} {selectedVoucherForDelete.currency}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModernModal>

      <DeletedVouchersModal
        isOpen={isDeletedVouchersModalOpen}
        onClose={() => setIsDeletedVouchersModalOpen(false)}
      />

      <ModernModal
        isOpen={isExchangeRateModalOpen}
        onClose={() => setIsExchangeRateModalOpen(false)}
        title={t('updateExchangeRate')}
        icon={<DollarSign className="w-8 h-8 text-amber-500" />}
      >
        <form onSubmit={handleUpdateRate} className="space-y-6">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
            <span className="font-bold opacity-70">السعر الحالي:</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoadingRates ? '...' : currentRate.toLocaleString()} <span className="text-sm font-bold opacity-60">د.ع</span>
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black opacity-70 px-1">السعر الجديد (لكل 100 دولار)</label>
            <input
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-full h-14 px-4 text-2xl font-black text-center border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 focus:border-amber-500 dark:focus:border-amber-500 outline-none transition-all"
              placeholder="0"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black opacity-70 px-1">ملاحظات التغيير</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 p-4 text-base font-bold border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 focus:border-amber-500 outline-none transition-all resize-none"
              placeholder="اكتب سبب تغيير السعر هنا..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsExchangeRateModalOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newRate}
              className="flex-[2] h-12 rounded-xl font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تحديث السعر الآن'}
            </button>
          </div>
        </form>
      </ModernModal>
    </main>
  );
};

export default Accounts;
