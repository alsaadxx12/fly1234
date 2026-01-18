import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Ticket, TicketType } from '../types';

interface TicketsStatsProps {
  tickets: Ticket[];
  currency: 'all' | 'IQD' | 'USD';
  activeTab: TicketType;
}

export default function TicketsStats({ tickets, currency, activeTab }: TicketsStatsProps) {
  const { theme } = useTheme();

  // Get profit title based on active tab
  const getProfitTitle = () => {
    switch (activeTab) {
      case 'entry':
        return 'أرباح التذاكر';
      case 'refund':
        return 'أرباح الاسترجاعات';
      case 'change':
        return 'أرباح التغييرات';
      default:
        return 'إجمالي الربح';
    }
  };

  const calculateTotals = () => {
    let purchaseUSD = 0;
    let saleUSD = 0;
    let purchaseIQD = 0;
    let saleIQD = 0;

    tickets.forEach(ticket => {
      ticket.passengers.forEach(passenger => {
        if (ticket.currency === 'USD') {
          purchaseUSD += passenger.purchasePrice || 0;
          saleUSD += passenger.salePrice || 0;
        } else if (ticket.currency === 'IQD') {
          purchaseIQD += passenger.purchasePrice || 0;
          saleIQD += passenger.salePrice || 0;
        }
      });
    });

    const profitUSD = saleUSD - purchaseUSD;
    const profitIQD = saleIQD - purchaseIQD;

    return {
      purchaseUSD,
      saleUSD,
      profitUSD,
      purchaseIQD,
      saleIQD,
      profitIQD
    };
  };

  const { purchaseUSD, saleUSD, profitUSD, purchaseIQD, saleIQD, profitIQD } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* الشراء - Purchases */}
      <div className={`relative overflow-hidden rounded-xl border-2 p-4 ${
        theme === 'dark'
          ? 'bg-orange-950/30 border-orange-700/50 shadow-lg shadow-orange-900/20'
          : 'bg-orange-50/80 border-orange-300 shadow-xl shadow-orange-200/50'
      }`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-500/10'
            }`}>
              <ShoppingCart className={`w-5 h-5 ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
              }`} />
            </div>
            <h3 className={`text-sm font-bold ${
              theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
            }`}>
              إجمالي الشراء
            </h3>
          </div>

          <div className="space-y-2">
            {/* USD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
              }`} dir="ltr">
                ${formatCurrency(purchaseUSD)}
              </div>
            </div>

            {/* IQD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
              }`} dir="ltr">
                {formatCurrency(purchaseIQD)} د.ع
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* المبيع - Sales */}
      <div className={`relative overflow-hidden rounded-xl border-2 p-4 ${
        theme === 'dark'
          ? 'bg-blue-950/30 border-blue-700/50 shadow-lg shadow-blue-900/20'
          : 'bg-blue-50/80 border-blue-300 shadow-xl shadow-blue-200/50'
      }`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
            }`}>
              <DollarSign className={`w-5 h-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <h3 className={`text-sm font-bold ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              إجمالي المبيع
            </h3>
          </div>

          <div className="space-y-2">
            {/* USD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} dir="ltr">
                ${formatCurrency(saleUSD)}
              </div>
            </div>

            {/* IQD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} dir="ltr">
                {formatCurrency(saleIQD)} د.ع
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* الربح - Profit */}
      <div className={`relative overflow-hidden rounded-xl border-2 p-4 ${
        theme === 'dark'
          ? 'bg-emerald-950/30 border-emerald-700/50 shadow-lg shadow-emerald-900/20'
          : 'bg-emerald-50/80 border-emerald-300 shadow-xl shadow-emerald-200/50'
      }`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              }`} />
            </div>
            <h3 className={`text-sm font-bold ${
              theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
            }`}>
              {getProfitTitle()}
            </h3>
          </div>

          <div className="space-y-2">
            {/* USD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                profitUSD >= 0
                  ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  : theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} dir="ltr">
                ${formatCurrency(Math.abs(profitUSD))}
              </div>
            </div>

            {/* IQD */}
            <div className={`text-center p-2 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-900/30 border-gray-700/50' : 'bg-white/70 border-gray-200'
            }`}>
              <div className={`text-2xl font-black ${
                profitIQD >= 0
                  ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  : theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} dir="ltr">
                {formatCurrency(Math.abs(profitIQD))} د.ع
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
