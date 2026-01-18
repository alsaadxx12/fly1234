import React from 'react';
import { CreditCard, DollarSign, Filter, MessageCircle, X, Building2, Search, SlidersHorizontal, User, Briefcase } from 'lucide-react';

interface CompanyFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPaymentType: 'all' | 'cash' | 'credit';
  setFilterPaymentType: (type: 'all' | 'cash' | 'credit') => void;
  filterWhatsApp: boolean;
  setFilterWhatsApp: (filter: boolean) => void;
  filterEntityType: 'all' | 'company' | 'client' | 'expense';
  setFilterEntityType: (type: 'all' | 'company' | 'client' | 'expense') => void;
}

export default function CompanyFilters({
  searchQuery,
  setSearchQuery,
  filterPaymentType,
  setFilterPaymentType,
  filterWhatsApp,
  setFilterWhatsApp,
  filterEntityType,
  setFilterEntityType
}: CompanyFiltersProps) {

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-md group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث عن شركة..."
            className="w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900 group-hover:border-primary-300 transition-colors"
          />
          <div className="absolute right-3 top-2.5">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => setFilterEntityType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterEntityType === 'all' 
                  ? 'bg-white text-secondary-800 font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              الكل
            </button>
            
            <button
              onClick={() => setFilterEntityType('company')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterEntityType === 'company' 
                  ? 'bg-white text-primary font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>شركات</span>
            </button>
            
            <button
              onClick={() => setFilterEntityType('client')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterEntityType === 'client' 
                  ? 'bg-white text-primary font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>عملاء</span>
            </button>
            
            <button
              onClick={() => setFilterEntityType('expense')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterEntityType === 'expense' 
                  ? 'bg-white text-primary font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>مصاريف</span>
            </button>
          </div>
          
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => setFilterPaymentType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterPaymentType === 'all' 
                  ? 'bg-white text-secondary-800 font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              الكل
            </button>
            
            <button
              onClick={() => setFilterPaymentType('cash')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterPaymentType === 'cash' 
                  ? 'bg-white text-primary font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>نقدي</span>
            </button>
            
            <button
              onClick={() => setFilterPaymentType('credit')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                filterPaymentType === 'credit' 
                  ? 'bg-white text-primary font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>آجل</span>
            </button>
          </div>
          
          <button
            onClick={() => setFilterWhatsApp(!filterWhatsApp)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-all ${
              filterWhatsApp 
                ? 'bg-primary-50 text-primary font-medium border-primary-200 shadow-sm' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>مجموعات واتساب</span>
            {filterWhatsApp && <X className="w-3.5 h-3.5 ml-1" onClick={(e) => {
              e.stopPropagation();
              setFilterWhatsApp(false);
            }} />}
          </button>
        </div>
      </div>
    </div>
  );
}