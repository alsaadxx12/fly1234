import React from 'react';
import { Filter, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import VisaSourceSelector from './VisaSourceSelector';
import VisaBeneficiarySelector from './VisaBeneficiarySelector';
import VisaTypeSelector from './VisaTypeSelector';

interface VisaType {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface VisaFiltersProps {
  sourceFilter: string;
  beneficiaryFilter: string;
  typeFilter: string;
  onSourceFilterChange: (value: string) => void;
  onBeneficiaryFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  sources: string[];
  companies: Company[];
  visaTypes: VisaType[];
  onManageTypes: () => void;
  onClearFilters: () => void;
}

export default function VisaFilters({
  sourceFilter,
  beneficiaryFilter,
  typeFilter,
  onSourceFilterChange,
  onBeneficiaryFilterChange,
  onTypeFilterChange,
  sources,
  companies,
  visaTypes,
  onManageTypes,
  onClearFilters
}: VisaFiltersProps) {
  const { theme } = useTheme();

  const hasActiveFilters = sourceFilter || beneficiaryFilter || typeFilter;

  return (
    <div className={`p-6 rounded-2xl border-2 mb-6 ${
      theme === 'dark'
        ? 'bg-gray-900/50 border-gray-800'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-blue-600 to-violet-600'
              : 'bg-gradient-to-br from-blue-500 to-violet-500'
          }`}>
            <Filter className="w-5 h-5 text-white" />
          </div>
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            فلترة الفيزا
          </h3>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              theme === 'dark'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <X className="w-4 h-4" />
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="h-[52px]">
          <VisaSourceSelector
            value={sourceFilter}
            onChange={onSourceFilterChange}
            sources={sources}
            placeholder="فلتر حسب المصدر..."
          />
        </div>

        <div className="h-[52px]">
          <VisaBeneficiarySelector
            value={beneficiaryFilter}
            onChange={onBeneficiaryFilterChange}
            companies={companies}
            placeholder="فلتر حسب المستفيد..."
          />
        </div>

        <div className="h-[52px]">
          <VisaTypeSelector
            value={typeFilter}
            onChange={onTypeFilterChange}
            visaTypes={visaTypes}
            onManageTypes={onManageTypes}
            placeholder="فلتر حسب نوع الفيزا..."
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className={`mt-4 flex flex-wrap gap-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <span className="text-sm font-bold">الفلاتر النشطة:</span>

          {sourceFilter && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${
              theme === 'dark'
                ? 'bg-blue-900/30 text-blue-400'
                : 'bg-blue-50 text-blue-700'
            }`}>
              <span>المصدر: {sourceFilter}</span>
              <button
                onClick={() => onSourceFilterChange('')}
                className="hover:bg-white/20 rounded p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {beneficiaryFilter && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${
              theme === 'dark'
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              <span>المستفيد: {beneficiaryFilter}</span>
              <button
                onClick={() => onBeneficiaryFilterChange('')}
                className="hover:bg-white/20 rounded p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {typeFilter && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${
              theme === 'dark'
                ? 'bg-violet-900/30 text-violet-400'
                : 'bg-violet-50 text-violet-700'
            }`}>
              <span>النوع: {typeFilter}</span>
              <button
                onClick={() => onTypeFilterChange('')}
                className="hover:bg-white/20 rounded p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
