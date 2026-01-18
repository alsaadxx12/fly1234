import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Loader2, AlertTriangle, ArrowRight, ArrowLeft, CreditCard } from 'lucide-react';
import { Debt } from '../types';
import DebtCard from './DebtCard';

interface DebtsTableProps {
  debts: Debt[];
  isLoading: boolean;
  error: string | null;
  onAddPayment: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onViewHistory: (debt: Debt) => void;
  hasDeletePermission: boolean;
}

const DebtsTable: React.FC<DebtsTableProps> = ({
  debts,
  isLoading,
  error,
  onAddPayment,
  onDelete,
  onViewHistory,
  hasDeletePermission
}) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Calculate pagination for cards view
  const totalPages = Math.ceil(debts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = debts.slice(indexOfFirstItem, indexOfLastItem);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-gray-600">جاري تحميل الديون...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-200 m-4">
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200 m-4">
        <div className="flex justify-center mb-6">
          <div className="p-5 bg-gray-50 rounded-full shadow-md">
            <CreditCard className="w-14 h-14 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد ديون</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          لم يتم العثور على أي ديون. قم بإضافة دين جديد للبدء.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.map((debt) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            onAddPayment={onAddPayment}
            onDelete={onDelete}
            onViewHistory={onViewHistory}
            hasDeletePermission={hasDeletePermission}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="px-4 py-2 font-medium text-gray-700">
              {currentPage} / {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtsTable;