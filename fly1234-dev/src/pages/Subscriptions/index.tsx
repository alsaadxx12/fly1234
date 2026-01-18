import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import SubscriptionsHeader from './components/SubscriptionsHeader';
import DebtsTable from './components/DebtsTable';
import AddDebtModal from './components/AddDebtModal';
import AddPaymentModal from './components/AddPaymentModal';
import DeleteDebtModal from './components/DeleteDebtModal';
import DebtHistoryModal from './components/DebtHistoryModal';
import useDebts from './hooks/useDebts';
import { Debt } from './types';

const SubscriptionsPage: React.FC = () => {
  const { t } = useLanguage();
  const { checkPermission } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paid' | 'overdue'>('all');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const { 
    debts,
    filteredDebts,
    isLoading,
    error,
    addDebt,
    addPayment,
    refreshDebts
  } = useDebts(searchQuery, filterStatus);

  // Check if user has permission to view debts
  const hasViewPermission = checkPermission('accounts', 'view');
  const hasAddPermission = checkPermission('accounts', 'add');
  const hasDeletePermission = checkPermission('accounts', 'delete');
  
  // Log debts for debugging
  useEffect(() => {
    console.log('Current debts:', debts);
  }, [debts]);

  // Handle payment button click
  const handleAddPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsPaymentModalOpen(true);
  };
  
  // Handle delete button click
  const handleDeleteDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsDeleteModalOpen(true);
  };
  
  // Handle debt deleted
  const handleDebtDeleted = () => {
    // No need to manually refresh since we're using onSnapshot
    // Just close the modal
    setIsDeleteModalOpen(false);
    setSelectedDebt(null);
  };
  
  // Handle history button click
  const handleViewHistory = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsHistoryModalOpen(true);
  };

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
        {/* Header */}
        <SubscriptionsHeader 
          setIsAddModalOpen={setIsAddModalOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          hasAddPermission={hasAddPermission}
          totalDebts={filteredDebts.length}
        />
        
        {/* Content */}
        <DebtsTable 
          debts={filteredDebts}
          isLoading={isLoading}
          error={error}
          onAddPayment={handleAddPayment}
          onDelete={handleDeleteDebt}
          onViewHistory={handleViewHistory}
          hasDeletePermission={hasDeletePermission}
        />
      </div>

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDebtAdded={refreshDebts}
      />
      
      {/* Delete Debt Modal */}
      <DeleteDebtModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        debt={selectedDebt}
        onDebtDeleted={handleDebtDeleted}
      />
      
      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        debt={selectedDebt}
        onPaymentAdded={refreshDebts}
      />
      
      {/* Debt History Modal */}
      <DebtHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        debt={selectedDebt}
      />
    </main>
  );
};

export default SubscriptionsPage;