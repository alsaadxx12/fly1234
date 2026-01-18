import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Building2, User, X, ChevronDown, DollarSign, Briefcase } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface Company {
  id: string;
  name: string;
  entityType?: 'client' | 'company' | 'expense';
  currency?: 'IQD' | 'USD';
  phone?: string;
  whatsAppGroupId?: string | null;
  whatsAppGroupName?: string | null;
}

interface BeneficiarySelectorProps {
  value: string;
  onChange: (name: string, id: string, phone: string, whatsAppGroupId: string | null, whatsAppGroupName: string | null, entityType: 'company' | 'client' | 'expense') => void;
  companies: Company[];
  required?: boolean;
  placeholder?: string;
}

const BeneficiarySelector: React.FC<BeneficiarySelectorProps> = ({
  value,
  onChange,
  companies = [],
  required,
  placeholder = 'ابحث عن المستفيد...'
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies || [];
    const lowerSearch = searchTerm.toLowerCase();
    return (companies || []).filter(c =>
      c.name.toLowerCase().includes(lowerSearch)
    );
  }, [companies, searchTerm]);

  const visibleCompanies = useMemo(() => {
    return filteredCompanies.slice(0, visibleCount);
  }, [filteredCompanies, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    if (bottom) {
      setVisibleCount(prevCount => Math.min(prevCount + 10, filteredCompanies.length));
    }
  };

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

  const handleSelect = (company: Company) => {
    onChange(company.name, company.id, company.phone || '', company.whatsAppGroupId || null, company.whatsAppGroupName || null, company.entityType || 'company');
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue, '', '', null, null, 'company');
    if (newValue.length > 0 && !isOpen) {
        setIsOpen(true);
    }
    setHighlightedIndex(-1);
    setVisibleCount(10);
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
          prev < visibleCompanies.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && visibleCompanies[highlightedIndex]) {
          handleSelect(visibleCompanies[highlightedIndex]);
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
    onChange('', '', '', null, null, 'company');
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="relative">
        <div className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 transition-all ${
          isOpen
            ? theme === 'dark'
              ? 'bg-gray-900/50 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-white border-purple-500 ring-2 ring-purple-500/20'
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
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 bg-transparent outline-none text-sm font-bold text-center h-full ${
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
            onMouseDown={(e) => e.preventDefault()}
            onScroll={handleScroll}
          >
            {visibleCompanies.length > 0 ? visibleCompanies.map((company, index) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all border-b last:border-b-0 ${
                  highlightedIndex === index
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-purple-400 text-white'
                    : theme === 'dark'
                      ? 'hover:bg-gray-800 border-gray-800 text-gray-200'
                      : 'hover:bg-purple-50 border-gray-100 text-gray-900'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className={`p-2 rounded-lg ${
                  highlightedIndex === index
                    ? 'bg-white/20'
                    : theme === 'dark'
                      ? 'bg-gray-800'
                      : 'bg-purple-100'
                }`}>
                  {company.entityType === 'client' ? <User className="w-4 h-4" /> :
                   company.entityType === 'expense' ? <Briefcase className="w-4 h-4" /> :
                   <Building2 className="w-4 h-4" />}
                </div>

                <div className="flex-1 text-right font-bold">{company.name}</div>
              </button>
            )) : (
              <div className="p-4 text-center text-sm text-gray-500">
                لا توجد نتائج
              </div>
            )}
            {visibleCount < filteredCompanies.length && (
              <div className={`px-4 py-2 text-xs text-center font-bold ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                استمر في التمرير لعرض المزيد...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiarySelector;
