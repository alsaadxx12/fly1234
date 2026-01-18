import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { TicketFilters } from '../types';
import CustomDatePicker from './CustomDatePicker';

interface TicketsFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
}

export default function TicketsFilters({ filters, onFiltersChange }: TicketsFiltersProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReset = () => {
    onFiltersChange({
      searchTerm: '',
      showAuditChecked: true,
      showAuditUnchecked: true,
      showEntryChecked: true,
      showEntryUnchecked: true,
      dateFrom: undefined,
      dateTo: undefined,
      currency: 'all'
    });
  };

  const hasActiveFilters =
    filters.searchTerm ||
    !filters.showAuditChecked ||
    !filters.showAuditUnchecked ||
    !filters.showEntryChecked ||
    !filters.showEntryUnchecked ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.currency && filters.currency !== 'all');

  return (
    <div className={`rounded-xl border ${
      theme === 'dark'
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              placeholder="بحث في PNR، اسم المسافر، أو رقم الجواز..."
              className={`w-full pr-10 pl-4 py-2.5 rounded-lg border text-sm font-bold ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-blue-500/20 outline-none`}
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-black text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            فلتر
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className={`p-2.5 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
              title="إعادة تعيين الفلاتر"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className={`px-4 pb-4 space-y-4 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Audit Filter */}
            <div>
              <label className={`block text-xs font-black mb-1.5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                المدقق
              </label>
              <select
                value={
                  filters.showAuditChecked && filters.showAuditUnchecked
                    ? 'all'
                    : filters.showAuditChecked
                    ? 'checked'
                    : filters.showAuditUnchecked
                    ? 'unchecked'
                    : 'all'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  onFiltersChange({
                    ...filters,
                    showAuditChecked: value === 'all' || value === 'checked',
                    showAuditUnchecked: value === 'all' || value === 'unchecked',
                  });
                }}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-center ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/50 outline-none`}
              >
                <option value="all">الكل</option>
                <option value="checked">✓ تم التدقيق</option>
                <option value="unchecked">✗ لم يتم التدقيق</option>
              </select>
            </div>

            {/* Entry Filter */}
            <div>
              <label className={`block text-xs font-black mb-1.5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                الإدخال
              </label>
              <select
                value={
                  filters.showEntryChecked && filters.showEntryUnchecked
                    ? 'all'
                    : filters.showEntryChecked
                    ? 'checked'
                    : filters.showEntryUnchecked
                    ? 'unchecked'
                    : 'all'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  onFiltersChange({
                    ...filters,
                    showEntryChecked: value === 'all' || value === 'checked',
                    showEntryUnchecked: value === 'all' || value === 'unchecked',
                  });
                }}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-center ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/50 outline-none`}
              >
                <option value="all">الكل</option>
                <option value="checked">✓ تم الإدخال</option>
                <option value="unchecked">✗ لم يتم الإدخال</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <label className={`block text-xs font-black mb-1.5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                العملة
              </label>
              <select
                value={filters.currency || 'all'}
                onChange={(e) => onFiltersChange({ ...filters, currency: e.target.value as any })}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-center ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/50 outline-none`}
              >
                <option value="all">الكل</option>
                <option value="IQD">💵 دينار عراقي</option>
                <option value="USD">💵 دولار</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <CustomDatePicker
                value={filters.dateFrom}
                onChange={(date) => onFiltersChange({ ...filters, dateFrom: date || undefined })}
                label="من تاريخ"
                placeholder="اختر تاريخ البداية"
              />
            </div>

            <div>
              <CustomDatePicker
                value={filters.dateTo}
                onChange={(date) => onFiltersChange({ ...filters, dateTo: date || undefined })}
                label="إلى تاريخ"
                placeholder="اختر تاريخ النهاية"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
