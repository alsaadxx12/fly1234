import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Building2, Plus, User, Briefcase, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CompaniesGrid from './Companies/components/CompaniesGrid';
import CompanyFilters from './Companies/components/CompanyFilters';
import AddCompanyModal from './Companies/components/AddCompanyModal';
import AddClientModal from './Accounts/components/AddClientModal';
import AddExpenseModal from './Companies/components/AddExpenseModal';
import NewEditCompanyModal from './Companies/components/NewEditCompanyModal';
import DeleteCompanyModal from './Companies/components/DeleteCompanyModal';
import ImportCompaniesModal from './Companies/components/ImportCompaniesModal';
import EmptyCompaniesState from './Companies/components/EmptyCompaniesState';
import useCompanies from './Companies/hooks/useCompanies';

const Companies = () => {
  const { theme } = useTheme();
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState<'all' | 'cash' | 'credit'>('all');
  const [filterWhatsApp, setFilterWhatsApp] = useState(false);
  const [filterEntityType, setFilterEntityType] = useState<'all' | 'company' | 'client' | 'expense'>('all');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [gridView, setGridView] = useState<'grid' | 'compact' | 'list'>('grid');

  const {
    filteredCompanies,
    isLoading,
    error,
    selectedCompany,
    setSelectedCompany,
    formData,
    setFormData,
    isSubmitting,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    currentPage,
    totalPages,
    totalCount,
    handleEditCompany,
    handleDeleteCompany,
    importFile,
    setImportFile,
    importPreview,
    setImportPreview,
    isImporting,
    importSuccess,
    handleImportCompanies,
    downloadExcelTemplate,
    fetchData
  } = useCompanies(searchQuery, filterPaymentType, filterWhatsApp, filterEntityType);

  const handleClientAdded = () => {
    fetchData(1);
    setIsAddClientModalOpen(false);
  };

  const handleExpenseAdded = () => {
    fetchData(1);
    setIsAddExpenseModalOpen(false);
  };

  return (
    <main className={`p-4 md:p-6 min-h-screen w-full lg:max-w-7xl lg:mx-auto pb-24 md:pb-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      {/* Header - Hidden on mobile */}
      <div className="hidden md:block mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 backdrop-blur-md shadow-xl shadow-gray-200/20 dark:shadow-none">
          <div className="flex items-center gap-4 text-right">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                دليل الحسابات
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                إدارة الشركات والعملاء والمصاريف
              </p>
            </div>
          </div>
          <div className="relative add-menu-container self-center sm:self-auto">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center justify-center gap-2 h-12 px-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
              <span>إضافة</span>
            </button>

            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className={`absolute left-0 mt-2 w-64 rounded-2xl shadow-2xl border z-50 overflow-hidden ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
                  }`}>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setIsAddCompanyModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-3 w-full px-5 py-4 transition-all text-sm text-right ${theme === 'dark'
                        ? 'text-gray-200 hover:bg-blue-900/40 rounded-lg'
                        : 'text-gray-700 hover:bg-blue-50 rounded-lg'
                        }`}
                    >
                      <Building2 className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      <div className="flex-1 text-right">
                        <p className="font-bold">إضافة شركة</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddClientModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-3 w-full px-5 py-4 transition-all text-sm text-right ${theme === 'dark'
                        ? 'text-gray-200 hover:bg-green-900/40 rounded-lg'
                        : 'text-gray-700 hover:bg-green-50 rounded-lg'
                        }`}
                    >
                      <User className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      <div className="flex-1 text-right">
                        <p className="font-bold">إضافة عميل</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddExpenseModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-3 w-full px-5 py-4 transition-all text-sm text-right ${theme === 'dark'
                        ? 'text-gray-200 hover:bg-red-900/40 rounded-lg'
                        : 'text-gray-700 hover:bg-red-50 rounded-lg'
                        }`}
                    >
                      <Briefcase className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                      <div className="flex-1 text-right">
                        <p className="font-bold">إضافة مصروف</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="mb-6">
        <CompanyFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterPaymentType={filterPaymentType}
          setFilterPaymentType={setFilterPaymentType}
          filterWhatsApp={filterWhatsApp}
          setFilterWhatsApp={setFilterWhatsApp}
          filterEntityType={filterEntityType}
          setFilterEntityType={setFilterEntityType}
        />
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mx-4" />
      </div>

      {/* Content */}
      <div className="p-0 md:p-0">
        {error && (
          <div className={`mb-6 p-5 rounded-xl flex items-center gap-3 border ${theme === 'dark'
            ? 'bg-red-900/30 text-red-400 border-red-700/50'
            : 'bg-red-50 text-red-600 border-red-100'
            }`}>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className={`flex items-center justify-center min-h-[500px] rounded-xl`}>
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 border-4 rounded-full animate-spin ${theme === 'dark'
                ? 'border-gray-700 border-t-blue-500'
                : 'border-gray-200 border-t-blue-600'
                }`}></div>
              <p className={`animate-pulse font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>جاري تحميل البيانات...</p>
            </div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <EmptyCompaniesState
            searchQuery={searchQuery}
            filterPaymentType={filterPaymentType}
            setSearchQuery={setSearchQuery}
            setFilterPaymentType={setFilterPaymentType}
            filterEntityType={filterEntityType}
            setFilterEntityType={setFilterEntityType}
          />
        ) : (
          <CompaniesGrid
            filteredCompanies={filteredCompanies}
            sortBy={sortBy}
            setSortBy={setSortBy}
            currentPage={currentPage}
            setCurrentPage={fetchData}
            totalPages={totalPages}
            totalCount={totalCount}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
            gridView={gridView}
            setGridView={setGridView}
            onEdit={(company) => {
              setSelectedCompany(company);
              setFormData({
                name: company.name,
                paymentType: company.paymentType,
                companyId: company.companyId || '',
                whatsAppGroupId: company.whatsAppGroupId || null,
                whatsAppGroupName: company.whatsAppGroupName || null,
                phone: company.phone || '',
                website: company.website || '',
                details: company.details || ''
              });
              setIsEditModalOpen(true);
            }}
            onDelete={(company) => {
              setSelectedCompany(company);
              setIsDeleteModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        isSubmitting={isSubmitting}
        onCompanyAdded={() => fetchData(1)}
      />

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onClientAdded={handleClientAdded}
      />

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onExpenseAdded={handleExpenseAdded}
      />

      <NewEditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        onSubmit={handleEditCompany}
        selectedCompany={selectedCompany}
      />

      <DeleteCompanyModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteCompany}
        selectedCompany={selectedCompany}
      />

      <ImportCompaniesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importFile={importFile}
        setImportFile={setImportFile}
        importPreview={importPreview}
        setImportPreview={setImportPreview}
        isImporting={isImporting}
        importSuccess={importSuccess}
        onImport={handleImportCompanies}
        downloadTemplate={downloadExcelTemplate}
      />

      {/* Mobile Floating Action Button - Portal to body */}
      {typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed bottom-[7.5rem] left-6 z-[9999] add-menu-container">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full shadow-[0_10px_40px_-10px_rgba(37,99,235,0.6)] flex items-center justify-center transform active:scale-95 transition-all border-4 border-white dark:border-gray-800"
          >
            <Plus className={`w-8 h-8 transition-transform duration-300 ${showAddMenu ? 'rotate-[135deg]' : ''}`} />
          </button>

          <AnimatePresence>
            {showAddMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
                  onClick={() => setShowAddMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 40 }}
                  className={`fixed bottom-[13rem] left-6 w-64 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border z-50 overflow-hidden ${theme === 'dark'
                    ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-2xl text-white'
                    : 'bg-white border-gray-100 shadow-blue-500/10 text-gray-900'
                    }`}
                >
                  <div className="p-3 flex flex-col gap-1.5" dir="rtl">
                    <div className="px-5 py-3 mb-1 border-b border-gray-100 dark:border-gray-700/50">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>خيارات الإضافة</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAddCompanyModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-4 w-full px-5 py-4 transition-all rounded-2xl text-sm text-right ${theme === 'dark'
                        ? 'hover:bg-blue-600/20'
                        : 'hover:bg-blue-50'
                        }`}
                    >
                      <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-black">إضافة شركة</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddClientModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-4 w-full px-5 py-4 transition-all rounded-2xl text-sm text-right ${theme === 'dark'
                        ? 'hover:bg-emerald-600/20'
                        : 'hover:bg-emerald-50'
                        }`}
                    >
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="font-black">إضافة عميل</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddExpenseModalOpen(true);
                        setShowAddMenu(false);
                      }}
                      className={`flex items-center gap-4 w-full px-5 py-4 transition-all rounded-2xl text-sm text-right ${theme === 'dark'
                        ? 'hover:bg-amber-600/20'
                        : 'hover:bg-amber-50'
                        }`}
                    >
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="font-black">إضافة مصروف</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </main>
  );
};

export default Companies;
