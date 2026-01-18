import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Filter, X } from 'lucide-react';
import CustomDatePicker from '../../../components/CustomDatePicker';
import BeneficiarySelector from './BeneficiarySelector';

interface AccountsFiltersProps {
  beneficiaryFilter: string;
  setBeneficiaryFilter: (filter: string) => void;
  currencyFilter: 'all' | 'USD' | 'IQD';
  setCurrencyFilter: (filter: 'all' | 'USD' | 'IQD') => void;
  dateFrom?: Date;
  setDateFrom: (date?: Date) => void;
  dateTo?: Date;
  setDateTo: (date?: Date) => void;
  onReset: () => void;
  beneficiaries: string[];
  companies: any[]; // Add companies prop for BeneficiarySelector
}

const AccountsFilters: React.FC<AccountsFiltersProps> = ({
  beneficiaryFilter,
  setBeneficiaryFilter,
  currencyFilter,
  setCurrencyFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onReset,
  beneficiaries,
  companies
}) => {
  const { theme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="h-[52px]">
        <BeneficiarySelector
            value={beneficiaryFilter}
            onChange={(value) => setBeneficiaryFilter(value)}
            companies={companies}
            placeholder="فلترة حسب المستفيد..."
        />
      </div>
      <select
        value={currencyFilter}
        onChange={(e) => setCurrencyFilter(e.target.value as any)}
        className={`w-full h-[52px] px-4 rounded-xl border-2 font-bold transition-all ${
          theme === 'dark'
            ? 'bg-gray-900/50 border-gray-700 text-white'
            : 'bg-gray-50 border-gray-300 text-gray-900'
        } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none`}
      >
        <option value="all">كل العملات</option>
        <option value="USD">دولار</option>
        <option value="IQD">دينار</option>
      </select>
      <div className="h-[52px]">
        <CustomDatePicker
          value={dateFrom}
          onChange={(d) => setDateFrom(d || undefined)}
          placeholder="من تاريخ"
        />
      </div>
      <div className="h-[52px]">
        <CustomDatePicker
          value={dateTo}
          onChange={(d) => setDateTo(d || undefined)}
          placeholder="إلى تاريخ"
        />
      </div>
      <button onClick={onReset} className="w-full h-[52px] bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold">
        إعادة تعيين الفلاتر
      </button>
    </div>
  );
};

export default AccountsFilters;
