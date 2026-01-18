import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { DollarSign, TrendingUp } from 'lucide-react';

interface SafesBalanceChartProps {
  safes: {
    id: string;
    name: string;
    balance_usd: number;
    balance_iqd: number;
  }[];
}

const SafesBalanceChart: React.FC<SafesBalanceChartProps> = ({ safes }) => {
  const { theme } = useTheme();

  const totalUSD = safes.reduce((sum, safe) => sum + safe.balance_usd, 0);
  const totalIQD = safes.reduce((sum, safe) => sum + safe.balance_iqd, 0);
  const totalValueInUSD = totalUSD + totalIQD / 1500; // Assuming a fixed rate for summary

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className={`p-6 rounded-2xl border ${
      theme === 'dark'
        ? 'bg-gray-800/30 border-gray-700/50'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2.5 rounded-xl ${
          theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
        }`}>
          <TrendingUp className={`w-5 h-5 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
        </div>
        <h3 className={`text-lg font-bold ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          ملخص الأرصدة
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* USD Balance */}
        <div className={`p-6 rounded-xl border-2 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
          theme === 'dark'
            ? 'bg-gray-900/30 border-emerald-700/50 hover:border-emerald-600'
            : 'bg-white border-gray-200 hover:border-emerald-300'
        }`}>
          <div className="absolute top-0 right-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600"></div>
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>إجمالي الدولار</p>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>الدولار الأمريكي</p>
            </div>
          </div>
          <p className={`text-4xl font-black text-right pr-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ${formatCurrency(totalUSD)}
          </p>
        </div>

        {/* Total Value in USD */}
        <div className={`p-6 rounded-xl border-2 relative overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500'
            : 'bg-gradient-to-br from-blue-500 to-indigo-500 border-blue-400'
        }`}>
           <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full opacity-50 blur-xl"></div>
           <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full opacity-50 blur-xl"></div>

          <p className="text-sm font-bold text-white/80 mb-2">إجمالي القيمة بالدولار</p>
          <p className="text-4xl font-black text-white">
            ${formatCurrency(totalValueInUSD)}
          </p>
           <p className="text-xs text-white/70 mt-2">(تقريبي)</p>
        </div>
        
        {/* IQD Balance */}
        <div className={`p-6 rounded-xl border-2 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
          theme === 'dark'
            ? 'bg-gray-900/30 border-purple-700/50 hover:border-purple-600'
            : 'bg-white border-gray-200 hover:border-purple-300'
        }`}>
           <div className="absolute top-0 right-0 h-full w-1.5 bg-gradient-to-b from-purple-500 to-purple-600"></div>
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>إجمالي الدينار</p>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>الدينار العراقي</p>
            </div>
          </div>
          <p className={`text-4xl font-black text-right pr-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {formatCurrency(totalIQD)} <span className="text-2xl">د.ع</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafesBalanceChart;
