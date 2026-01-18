import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, User, X, ChevronDown, DollarSign } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface Company {
  id: string;
  name: string;
  entityType?: 'client' | 'company';
  currency: 'IQD' | 'USD';
}

interface BeneficiarySelectorProps {
  value: string;
  onChange: (value: string, currency?: 'IQD' | 'USD') => void;
  beneficiaries: Company[];
  required?: boolean;
  label?: string;
}

export default function BeneficiarySelector({ value, onChange, beneficiaries = [], required, label = 'المستفيد' }: BeneficiarySelectorProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = (beneficiaries || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
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

  const handleSelect = (company: Company) => {
    onChange(company.name, company.currency);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    // فتح القائمة فقط عند كتابة 3 أحرف أو أكثر
    if (newValue.length >= 3 && !isOpen) {
      setIsOpen(true);
    } else if (newValue.length < 3 && isOpen) {
      setIsOpen(false);
    }
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredCompanies.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCompanies[highlightedIndex]) {
          handleSelect(filteredCompanies[highlightedIndex]);
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

  return (
    <div ref={containerRef} className="relative">
      <label className={`block text-xs font-bold mb-1.5 ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all ${
          isOpen
            ? theme === 'dark'
              ? 'bg-gray-800 border-blue-500 ring-2 ring-blue-500/50'
              : 'bg-white border-blue-500 ring-2 ring-blue-500/20'
            : theme === 'dark'
              ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
              : 'bg-white border-gray-300 hover:border-gray-400'
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
              if (value.length >= 3) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن الشركة أو العميل..."
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
                <X className="w-4 h-4" />
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
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isOpen && searchTerm.length >= 3 && filteredCompanies.length > 0 && (
          <div
            ref={dropdownRef}
            className={`absolute z-[100] w-full mt-1 rounded-lg border shadow-xl max-h-64 overflow-y-auto ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            {filteredCompanies.map((company, index) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold transition-all border-b last:border-b-0 ${
                  highlightedIndex === index
                    ? theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : theme === 'dark'
                      ? 'hover:bg-gray-700 border-gray-700 text-gray-200'
                      : 'hover:bg-blue-50 border-gray-100 text-gray-900'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className={`p-2 rounded-lg ${
                  highlightedIndex === index
                    ? 'bg-white/20'
                    : theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                }`}>
                  {company.entityType === 'company' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 text-right">
                  <div className="font-bold text-sm">{company.name}</div>
                  <div className={`flex items-center justify-end gap-1 text-xs font-bold mt-0.5 ${
                    highlightedIndex === index
                      ? 'text-white/70'
                      : theme === 'dark'
                        ? 'text-gray-500'
                        : 'text-gray-500'
                  }`}>
                    <DollarSign className="w-3 h-3" />
                    {company.currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && searchTerm.length >= 3 && filteredCompanies.length === 0 && (
          <div className={`absolute z-[100] w-full mt-1 rounded-lg border shadow-xl p-4 text-center ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className={`text-4xl mb-3`}>🔍</div>
            <div className={`text-base font-bold ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              لا توجد نتائج مطابقة
            </div>
            <div className={`text-sm font-bold mt-1 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              جرب البحث بكلمات مختلفة
            </div>
          </div>
        )}
      </div>

      {value && !isOpen && (
        <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${
          theme === 'dark'
            ? 'bg-blue-900/30 text-blue-400'
            : 'bg-blue-50 text-blue-700'
        }`}>
          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-blue-800/50' : 'bg-blue-100'
          }`}>
            {(beneficiaries || []).find(c => c.name === value)?.entityType === 'company' ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <span>المحدد: {value}</span>
        </div>
      )}
    </div>
  );
}
