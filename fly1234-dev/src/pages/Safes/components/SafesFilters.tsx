import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Filter, X } from 'lucide-react';

interface SafesFiltersProps {
  onFiltersChange: (filters: { type: string; status: string; currency: string }) => void;
  onReset: () => void;
}

const SafesFilters: React.FC<SafesFiltersProps> = ({ onFiltersChange, onReset }) => {
  const { theme } = useTheme();

  return (
    <div className={`p-4 rounded-xl border ${
      theme === 'dark'
        ? 'bg-gray-800/30 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <Filter className={`w-5 h-5 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`} />
        <h3 className={`text-base font-bold ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          الفلاتر
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Filter by Type */}
        <select
          onChange={(e) => onFiltersChange({ type: e.target.value, status: 'all', currency: 'all' })}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          <option value="all">كل الأنواع</option>
          <option value="main">رئيسي</option>
          <option value="secondary">ثانوي</option>
        </select>

        {/* Filter by Status */}
        <select
          onChange={(e) => onFiltersChange({ type: 'all', status: e.target.value, currency: 'all' })}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          <option value="all">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="clean">نظيف</option>
        </select>

        {/* Filter by Currency */}
        <select
          onChange={(e) => onFiltersChange({ type: 'all', status: 'all', currency: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          <option value="all">كل العملات</option>
          <option value="usd">دولار</option>
          <option value="iqd">دينار</option>
        </select>

        <button
          onClick={onReset}
          className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <X className="w-4 h-4" />
          إعادة تعيين
        </button>
      </div>
    </div>
  );
};

export default SafesFilters;