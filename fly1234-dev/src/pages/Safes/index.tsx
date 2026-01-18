import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, ShieldOff } from 'lucide-react';
import SafesList from './components/SafesList';
import SafesEmptyState from './components/SafesEmptyState';
import AddSafeModal from './components/AddSafeModal';
import EditSafeModal from './components/EditSafeModal';
import DeleteSafeModal from './components/DeleteSafeModal';
import useSafes from './hooks/useSafes';
import { Safe } from './types';
import ConfirmationHistoryModal from './components/ConfirmationHistoryModal';

const Safes: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { checkPermission } = useAuth();
  const hasViewPermission = checkPermission('safes', 'view');
  const hasAddPermission = checkPermission('safes', 'add');
  const hasEditPermission = checkPermission('safes', 'edit');
  const hasDeletePermission = checkPermission('safes', 'delete');

  const [filters, setFilters] = useState({ type: 'all', status: 'all', currency: 'all' });

  const {
    safes,
    unconfirmedVouchers,
    isLoading,
    error,
    selectedSafe,
    setSelectedSafe,
    editingSafe,
    setEditingSafe,
    newSafe,
    setNewSafe,
    isSubmitting,
    handleAddSafe,
    handleEdit,
    handleDelete,
    confirmVoucher
  } = useSafes(searchQuery, 'name', 'asc');

  const [confirmationHistoryModalOpen, setConfirmationHistoryModalOpen] = useState(false);
  const [selectedSafeForHistory, setSelectedSafeForHistory] = useState<Safe | null>(null);

  const filteredSafes = useMemo(() => {
    return safes.filter(safe => {
      let matches = true;
      if (filters.type !== 'all') {
        matches = matches && (filters.type === 'main' ? !!safe.is_main : !safe.is_main);
      }
      if (filters.status !== 'all') {
        const hasPending = unconfirmedVouchers.some(v => v.safeId === safe.id);
        matches = matches && (filters.status === 'pending' ? hasPending : !hasPending);
      }
      if (filters.currency !== 'all') {
        matches = matches && (filters.currency === 'usd' ? safe.balance_usd > 0 : safe.balance_iqd > 0);
      }
      return matches;
    });
  }, [safes, filters, unconfirmedVouchers]);

  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <ShieldOff className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mt-2">ليس لديك الصلاحية لعرض هذه الصفحة.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <div className="text-center sm:text-right">
          <h1 className={`text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent`}>
            الصناديق
          </h1>
          <p className={`text-sm mt-1 font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            إدارة الصناديق والأرصدة والمعاملات المعلقة
          </p>
        </div>
        {hasAddPermission && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة</span>
          </button>
        )}
      </div>

      <div className="bg-white/40 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث عن صندوق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pr-10 pl-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right font-bold text-sm transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="h-11 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-black text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="all">كل الأنواع</option>
            <option value="main">رئيسي</option>
            <option value="sub">فرعي</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-11 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-black text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="all">كل الحالة</option>
            <option value="pending">معلق</option>
            <option value="stable">مستقر</option>
          </select>
        </div>
      </div>



      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">جاري تحميل الصناديق...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-600">{error}</div>
      ) : filteredSafes.length === 0 ? (
        <SafesEmptyState searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      ) : (
        <>
          <SafesList
            safes={filteredSafes}
            unconfirmedVouchers={unconfirmedVouchers}
            isLoadingVouchers={isLoading}
            onEdit={(safe) => {
              setEditingSafe({
                id: safe.id,
                name: safe.name,
                balance_usd: safe.balance_usd,
                balance_iqd: safe.balance_iqd,
                is_main: safe.is_main,
                custodian_name: safe.custodian_name,
                custodian_image: safe.custodian_image
              });
              setIsEditModalOpen(true);
            }}
            onDelete={(safeId) => {
              setSelectedSafe(safeId);
              setIsDeleteModalOpen(true);
            }}
            hasEditPermission={hasEditPermission}
            hasDeletePermission={hasDeletePermission}
            onConfirmVoucher={confirmVoucher}
            onViewHistory={(safe) => {
              setSelectedSafeForHistory(safe);
              setConfirmationHistoryModalOpen(true);
            }}
          />
        </>
      )}

      {/* Modals */}
      <AddSafeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        newSafe={newSafe}
        setNewSafe={setNewSafe}
        isSubmitting={isSubmitting}
        onSubmit={handleAddSafe}
      />
      <EditSafeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingSafe={editingSafe}
        setEditingSafe={setEditingSafe}
        isSubmitting={isSubmitting}
        onSubmit={handleEdit}
      />
      <DeleteSafeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        selectedSafe={selectedSafe}
        safes={safes}
        onDelete={handleDelete}
      />
      {selectedSafeForHistory && (
        <ConfirmationHistoryModal
          isOpen={confirmationHistoryModalOpen}
          onClose={() => setConfirmationHistoryModalOpen(false)}
          safeId={selectedSafeForHistory.id}
          safeName={selectedSafeForHistory.name}
        />
      )}
    </div>
  );
};

export default Safes;
