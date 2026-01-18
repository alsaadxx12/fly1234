import React, { useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { DollarSign, User, Calendar, Info, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExchangeRateHistory {
  id?: string;
  rate: number;
  created_at: Date;
  created_by: string;
  notes?: string;
}

interface ExchangeRatesTableProps {
  history: ExchangeRateHistory[];
  isLoading: boolean;
}

const ExchangeRatesTable: React.FC<ExchangeRatesTableProps> = ({ history, isLoading }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();


  const displayedHistory = history.slice(0, 15);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري تحميل السجل...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <DollarSign className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">لا يوجد سجل لعرضه</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ابدأ بتحديث سعر الصرف لإضافة سجل جديد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-3">
          {displayedHistory.map((item, index) => (
            <div key={item.id} className="bg-white dark:bg-gray-900/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">

                {/* Rate */}
                <div className="flex items-center gap-3 md:col-span-1">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">السعر</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{item.rate.toLocaleString('en-US')}</p>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="flex items-center gap-3 md:col-span-1">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">التاريخ والوقت</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200" dir="ltr">{item.created_at.toLocaleDateString('en-GB')} - {item.created_at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {/* Created By */}
                <div className="flex items-center gap-3 md:col-span-1">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">بواسطة</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.created_by}</p>
                  </div>
                </div>

                {/* Notes */}
                <div className="flex items-start gap-3 md:col-span-1">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ملاحظات</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{item.notes || 'لا توجد ملاحظات'}</p>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExchangeRatesTable;
