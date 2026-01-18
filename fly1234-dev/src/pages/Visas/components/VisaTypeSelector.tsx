import React, { useState, useRef, useEffect } from 'react';
import { Search, FileText, X, ChevronDown, Plus } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface VisaType {
  id: string;
  name: string;
}

interface VisaTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  visaTypes: VisaType[];
  onManageTypes: () => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export default function VisaTypeSelector({
  value,
  onChange,
  visaTypes = [],
  onManageTypes,
  required,
  label = 'نوع الفيزا',
  placeholder = 'اختر نوع الفيزا...'
}: VisaTypeSelectorProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTypes = (visaTypes || []).filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (type: VisaType) => {
    onChange(type.name);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);

    if (newValue.length >= 1 && !isOpen) {
      setIsOpen(true);
    } else if (newValue.length < 1 && isOpen) {
      setIsOpen(false);
    }
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      if (searchTerm.length >= 1 || visaTypes.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredTypes[highlightedIndex]) {
          handleSelect(filteredTypes[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleManageTypes = () => {
    setIsOpen(false);
    onManageTypes();
  };

  return (
    <div ref={containerRef} className="relative h-full">
      <div className="relative h-full">
        <div className={`flex items-center gap-2 w-full h-full px-3 rounded-xl border-2 transition-all ${
          isOpen
            ? theme === 'dark'
              ? 'bg-gray-900/50 border-violet-500 ring-2 ring-violet-500/30'
              : 'bg-white border-violet-500 ring-2 ring-violet-500/20'
            : theme === 'dark'
              ? 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              : 'bg-gray-50 border-gray-300 hover:border-gray-400'
        }`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />

          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : value}
            onChange={handleInputChange}
            onFocus={() => {
              setSearchTerm(value);
              if (value.length >= 1 || visaTypes.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 bg-transparent outline-none text-sm font-bold text-center ${
              theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
            }`}
            required={required}
          />

          <div className="flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className={`p-1 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`p-1 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              } ${isOpen ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={`absolute z-[100] w-full mt-1 rounded-xl border-2 shadow-xl max-h-64 overflow-y-auto ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            {filteredTypes.length > 0 ? (
              <>
                {filteredTypes.map((type, index) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleSelect(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all border-b ${
                      highlightedIndex === index
                        ? theme === 'dark'
                          ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white'
                          : 'bg-gradient-to-r from-violet-500 to-violet-400 text-white'
                        : theme === 'dark'
                          ? 'hover:bg-gray-800 border-gray-800 text-gray-200'
                          : 'hover:bg-violet-50 border-gray-100 text-gray-900'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className={`p-2 rounded-lg ${
                      highlightedIndex === index
                        ? 'bg-white/20'
                        : theme === 'dark'
                          ? 'bg-gray-800'
                          : 'bg-violet-100'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="flex-1 text-right font-bold">{type.name}</div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleManageTypes}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 hover:bg-gray-750 text-violet-400'
                      : 'bg-violet-50 hover:bg-violet-100 text-violet-600'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>إدارة أنواع الفيزا</span>
                </button>
              </>
            ) : (
              <div className="p-4">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">📝</div>
                  <div className={`text-sm font-bold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {searchTerm ? 'لا توجد نتائج' : 'لا توجد أنواع فيزا'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleManageTypes}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-violet-500 hover:bg-violet-600 text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة نوع جديد</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
