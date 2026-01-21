import React, { useState } from 'react';
import { CreditCard, DollarSign, Filter, MessageCircle, X, Building2, Search, User, Briefcase, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    filterEntityType !== 'all',
    filterPaymentType !== 'all',
    filterWhatsApp,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Row 1: Search & Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative group flex-1">
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Search className={`w-5 h-5 transition-colors ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} group-focus-within:text-blue-500`} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسم، رقم، أو تفاصيل..."
            className={`w-full px-5 py-3.5 pr-12 text-base font-black rounded-2xl border transition-all text-right shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
              : 'bg-white border-gray-100 text-gray-900 placeholder-gray-400 focus:border-blue-600 shadow-gray-200/20'
              }`}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-3.5 rounded-2xl border transition-all duration-300 transform active:scale-95 ${showFilters
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
            : theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              : 'bg-white border-gray-100 text-gray-500 hover:text-blue-600 shadow-md shadow-gray-200/20'
            }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFiltersCount > 0 && !showFilters && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Row 2: Secondary Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`mt-2 p-4 rounded-3xl border shadow-xl flex flex-col gap-5 ${theme === 'dark'
              ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-2xl'
              : 'bg-white/95 border-gray-200/50 backdrop-blur-2xl'
              }`}>

              {/* Entity Type Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">تصنيف الحساب</span>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                  {[
                    { id: 'all', label: 'الكل', icon: Filter, activeClass: 'bg-blue-600 text-white shadow-blue-500/20' },
                    { id: 'company', label: 'شركات', icon: Building2, activeClass: 'bg-indigo-600 text-white shadow-indigo-500/20' },
                    { id: 'client', label: 'عملاء', icon: User, activeClass: 'bg-emerald-600 text-white shadow-emerald-500/20' },
                    { id: 'expense', label: 'مصاريف', icon: Briefcase, activeClass: 'bg-amber-600 text-white shadow-amber-500/20' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFilterEntityType(item.id as any)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black transition-all ${filterEntityType === item.id
                        ? `${item.activeClass} shadow-md scale-[1.02]`
                        : 'text-gray-500 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row: Payment & Other */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">طريقة التعامل</span>
                  <div className="flex items-center gap-1.5 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                    {[
                      { id: 'all', label: 'الكل', icon: DollarSign, activeClass: 'bg-gray-600 text-white shadow-gray-500/20' },
                      { id: 'cash', label: 'نقدي', icon: DollarSign, activeClass: 'bg-teal-600 text-white shadow-teal-500/20' },
                      { id: 'credit', label: 'آجل', icon: CreditCard, activeClass: 'bg-rose-600 text-white shadow-rose-500/20' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFilterPaymentType(item.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-[11px] font-black transition-all ${filterPaymentType === item.id
                          ? `${item.activeClass} shadow-md scale-[1.02]`
                          : 'text-gray-500 hover:bg-white dark:hover:bg-gray-800'
                          }`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">خيارات إضافية</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilterWhatsApp(!filterWhatsApp)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black border transition-all ${filterWhatsApp
                        ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20'
                        : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>مجموعات واتساب</span>
                    </button>

                    {(searchQuery || filterEntityType !== 'all' || filterPaymentType !== 'all' || filterWhatsApp) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterEntityType('all');
                          setFilterPaymentType('all');
                          setFilterWhatsApp(false);
                        }}
                        className="p-3 rounded-2xl text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                        title="تفريغ الفلاتر"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
