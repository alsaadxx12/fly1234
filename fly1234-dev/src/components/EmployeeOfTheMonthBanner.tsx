import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getEmployeeOfTheMonth, checkAndCalculateEmployeeOfTheMonth } from '../lib/services/employeeOfTheMonthService';

interface EmployeeOfTheMonth {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  totalProfit: number;
  usdProfit: number;
  iqdProfit: number;
  ticketCount: number;
  visaCount: number;
  changeCount: number;
  refundCount: number;
  month: number;
  year: number;
  createdAt: Date;
}

export default function EmployeeOfTheMonthBanner() {
  const { theme } = useTheme();
  const [currentMonthEmployee, setCurrentMonthEmployee] = useState<EmployeeOfTheMonth | null>(null);
  const [lastMonthEmployee, setLastMonthEmployee] = useState<EmployeeOfTheMonth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeesOfTheMonth();
    checkAndCalculateEmployeeOfTheMonth();
  }, []);

  const loadEmployeesOfTheMonth = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const [current, last] = await Promise.all([
        getEmployeeOfTheMonth(currentMonth, currentYear),
        getEmployeeOfTheMonth(lastMonth, lastYear)
      ]);

      setCurrentMonthEmployee(current);
      setLastMonthEmployee(last);
    } catch (error) {
      console.error('Error loading employees of the month:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  };

  if (loading) {
    return null;
  }

  const displayEmployee = currentMonthEmployee || lastMonthEmployee;

  if (!displayEmployee) {
    return null;
  }

  const isCurrentMonth = displayEmployee === currentMonthEmployee;

  return (
    <div className={`rounded-2xl p-6 ${
      theme === 'dark'
        ? 'bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30'
        : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50'
    } border-2 ${
      theme === 'dark' ? 'border-amber-700/50' : 'border-amber-300'
    } shadow-lg mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-amber-600 to-amber-700'
              : 'bg-gradient-to-br from-amber-400 to-amber-500'
          } shadow-lg`}>
            <Award className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className={`flex items-center gap-2 mb-1`}>
              <Calendar className={`w-4 h-4 ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              }`} />
              <div className={`text-sm font-bold ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              }`}>
                {isCurrentMonth ? '🏆 موظف الشهر الحالي' : '🏆 موظف الشهر الماضي'} - {getMonthName(displayEmployee.month)} {displayEmployee.year}
              </div>
            </div>
            <div className={`text-2xl font-black ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {displayEmployee.employeeName}
            </div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {displayEmployee.employeeEmail}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-left">
            <div className={`flex items-center gap-2 mb-1`}>
              <TrendingUp className={`w-5 h-5 ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
              }`} />
              <div className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                الربح الإجمالي
              </div>
            </div>
            <div className={`text-3xl font-black ${
              theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
            }`}>
              ${formatCurrency(displayEmployee.usdProfit)}
            </div>
            {displayEmployee.iqdProfit > 0 && (
              <div className={`text-base font-bold ${
                theme === 'dark' ? 'text-amber-300/70' : 'text-amber-500'
              }`}>
                {formatCurrency(displayEmployee.iqdProfit)} د.ع
              </div>
            )}
          </div>

          <div className={`grid grid-cols-2 gap-3`}>
            <div className={`rounded-xl p-3 text-center ${
              theme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-100/60'
            }`}>
              <div className={`text-xs font-bold mb-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                التذاكر
              </div>
              <div className={`text-xl font-black ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              }`}>
                {displayEmployee.ticketCount}
              </div>
            </div>

            <div className={`rounded-xl p-3 text-center ${
              theme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-100/60'
            }`}>
              <div className={`text-xs font-bold mb-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                الفيزا
              </div>
              <div className={`text-xl font-black ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
              }`}>
                {displayEmployee.visaCount}
              </div>
            </div>

            {displayEmployee.changeCount > 0 && (
              <div className={`rounded-xl p-3 text-center ${
                theme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-100/60'
              }`}>
                <div className={`text-xs font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  التغيير
                </div>
                <div className={`text-xl font-black ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  {displayEmployee.changeCount}
                </div>
              </div>
            )}

            {displayEmployee.refundCount > 0 && (
              <div className={`rounded-xl p-3 text-center ${
                theme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-100/60'
              }`}>
                <div className={`text-xs font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  الاسترجاع
                </div>
                <div className={`text-xl font-black ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  {displayEmployee.refundCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
