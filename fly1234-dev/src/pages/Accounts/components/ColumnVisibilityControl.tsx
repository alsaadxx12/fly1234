import React, { useState, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';
import useColumnVisibility from '../hooks/useColumnVisibility';

interface ColumnVisibilityControlProps {
  columnDefs: any[];
  onColumnVisibilityChanged: (visibleColumns: string[]) => void;
  voucherType: 'receipt' | 'payment';
}

const ColumnVisibilityControl: React.FC<ColumnVisibilityControlProps> = ({
  columnDefs,
  onColumnVisibilityChanged,
  voucherType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { visibleColumns, setVisibleColumns, isLoading } = useColumnVisibility(voucherType);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Notify parent component when visibleColumns change
  useEffect(() => {
    if (!isLoading && visibleColumns.length > 0) {
      onColumnVisibilityChanged(visibleColumns);
    }
  }, [visibleColumns, isLoading, onColumnVisibilityChanged]);

  const toggleColumn = (field: string) => {
    const newVisibleColumns = visibleColumns.includes(field)
      ? visibleColumns.filter(col => col !== field)
      : [...visibleColumns, field];
    
    // Always keep actions column visible
    if (field === 'actions' && newVisibleColumns.includes('actions')) {
      return;
    }
    
    setVisibleColumns(newVisibleColumns);
  };

  const toggleAllColumns = () => {
    const allFields = columnDefs.map(col => col.field);
    const newVisibleColumns = visibleColumns.length === allFields.length ? [] : allFields;
    
    // Always keep actions column visible
    if (!newVisibleColumns.includes('actions')) {
      newVisibleColumns.push('actions');
    }
    
    setVisibleColumns(newVisibleColumns);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)} 
        className={`p-2 ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors border ${isOpen ? 'border-indigo-200' : 'border-gray-200'}`}
        title="إعدادات الأعمدة"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-gray-50 rounded-lg shadow-lg z-50 border border-gray-200 column-visibility-dropdown">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="font-medium text-indigo-600 text-sm">إظهار/إخفاء الأعمدة</h3>
            <button
              onClick={toggleAllColumns} 
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              {visibleColumns.length === columnDefs.length ? 'إخفاء الكل' : 'إظهار الكل'}
            </button>
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto bg-gray-50 divide-y divide-gray-100">
            {columnDefs.map((column) => (
              <div
                key={column.field}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors column-item ${
                  visibleColumns.includes(column.field) ? 'bg-indigo-50 column-item-active' : ''
                }`}
                onClick={() => toggleColumn(column.field)}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center ${
                  visibleColumns.includes(column.field) 
                    ? 'bg-indigo-600' 
                    : 'border border-gray-300'
                }`}>
                  {visibleColumns.includes(column.field) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className={`text-sm ${
                  visibleColumns.includes(column.field) 
                    ? 'text-indigo-600 font-medium' 
                    : 'text-gray-600'
                }`}>
                  {column.headerName}
                </span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
            سيتم حفظ إعداداتك تلقائياً
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityControl;