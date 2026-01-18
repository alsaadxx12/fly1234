import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CreditCard, Plus, Search, Filter, Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface DebtsHeaderProps {
  setIsAddModalOpen: (isOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: 'all' | 'active' | 'paid' | 'overdue';
  setFilterStatus: (status: 'all' | 'active' | 'paid' | 'overdue') => void;
  hasAddPermission: boolean;
  totalDebts: number;
}

const DebtsHeader: React.FC<DebtsHeaderProps> = ({
  setIsAddModalOpen,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  hasAddPermission,
  totalDebts
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="p-6 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary-50 rounded-xl">
            <CreditCard className="w-6 h-6 text-secondary-800" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-800">قائمة الديون</h2>
            <p className="text-sm text-gray-600 mt-1">إجمالي {totalDebts} دين</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 shadow-sm"
              placeholder="البحث في الديون..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex p-1 bg-gray-100 rounded-lg shadow-inner">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>الكل</span>
            </button>
            
            <button
              onClick={() => setFilterStatus('active')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterStatus === 'active' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>نشط</span>
            </button>
            
            <button
              onClick={() => setFilterStatus('paid')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterStatus === 'paid' 
                  ? 'bg-green-50 text-green-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>مسدد</span>
            </button>
            
            <button
              onClick={() => setFilterStatus('overdue')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterStatus === 'overdue' 
                  ? 'bg-red-50 text-red-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>متأخر</span>
            </button>
          </div>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-bold shadow-md text-sm bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasAddPermission}
          >
            <Plus className="w-5 h-5" />
            <span>إضافة دين جديد</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebtsHeader;