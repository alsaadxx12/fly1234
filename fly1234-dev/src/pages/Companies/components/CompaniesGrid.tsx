import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { ChevronLeft, ChevronRight, Grid3x3 as Grid3X3, LayoutGrid, LayoutList, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';
import { Company } from '../hooks/useCompanies';
import CompanyCard from './CompanyCard';
import CompanyListItem from './CompanyListItem';

interface CompaniesGridProps {
  filteredCompanies: Company[];
  sortBy: 'name' | 'paymentType' | 'createdAt';
  setSortBy: (sortBy: 'name' | 'paymentType' | 'createdAt') => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalCount: number;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  gridView?: 'grid' | 'compact' | 'list';
  setGridView?: (view: 'grid' | 'compact' | 'list') => void;
}

export default function CompaniesGrid({
  filteredCompanies,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  currentPage,
  setCurrentPage,
  totalPages,
  totalCount,
  onEdit,
  onDelete,
  gridView = 'grid',
  setGridView = () => {},
}: CompaniesGridProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [setCurrentPage, totalPages]);
  
  const getPaginationItems = useMemo(() => {
    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
  
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }
  
    let l: number | null = null;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
  
    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-3">
        <div className={`text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <span className={`font-bold text-lg ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>{totalCount}</span>
          <span className="mr-2">كيان</span>
        </div>
        <div className="flex items-center gap-3">
          
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setGridView('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                gridView === 'grid' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50'
              }`}
              title="عرض شبكي"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridView('compact')}
              className={`p-1.5 rounded-md transition-colors ${
                gridView === 'compact' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50'
              }`}
              title="عرض مدمج"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridView('list')}
              className={`p-1.5 rounded-md transition-colors ${
                gridView === 'list' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-500 hover:bg-white/50'
              }`}
              title="عرض قائمة"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <SlidersHorizontal className="w-4 h-4 text-gray-500 mx-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'paymentType' | 'createdAt')}
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 py-1.5"
            >
              <option value="createdAt">تاريخ الإضافة</option>
              <option value="name">الاسم</option>
              <option value="paymentType">نوع التعامل</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
              title={sortDirection === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-gray-600" /> : <ArrowDown className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>
      </div>
      
      <div className={`grid grid-cols-1 ${
        gridView === 'grid' ? 'md:grid-cols-2 lg:grid-cols-4 gap-4' :
        gridView === 'compact' ? 'md:grid-cols-3 lg:grid-cols-4 gap-3' :
        'md:grid-cols-1 gap-3'
      }`}>
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="h-auto"
          >
            {gridView === 'list' ? (
              <CompanyListItem 
                company={company}
                onEdit={() => onEdit(company)}
                onDelete={() => onDelete(company)}
              />
            ) : (
              <CompanyCard 
                company={company}
                gridView={gridView}
                onEdit={() => onEdit(company)}
                onDelete={() => onDelete(company)}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between mt-6 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-3 md:mb-0">
            صفحة {currentPage} من {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {getPaginationItems.map((item, index) =>
                item === '...' ? (
                  <span key={index} className="px-2 text-gray-500">...</span>
                ) : (
                  <button
                    key={index}
                    onClick={() => handlePageChange(item as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md ${
                      currentPage === item
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
