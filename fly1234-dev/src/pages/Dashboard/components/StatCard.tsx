import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Coins, Activity } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  subtitle?: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'red' | 'green';
  isLoading?: boolean;
  error?: string | null;
  chart?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  subtitle,
  value,
  icon,
  color,
  isLoading,
  error,
  chart
}) => {
  const { theme } = useTheme();

  const colorStyles = {
    primary: {
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    secondary: {
      gradient: 'from-indigo-500 to-purple-500',
      shadow: 'shadow-indigo-500/20',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
    red: {
      gradient: 'from-red-500 to-rose-500',
      shadow: 'shadow-red-500/20',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    green: {
      gradient: 'from-green-500 to-emerald-500',
      shadow: 'shadow-green-500/20',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    }
  };

  const styles = colorStyles[color];

  return (
    <div className={`relative rounded-2xl p-6 overflow-hidden border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${
      theme === 'dark'
        ? `bg-gray-800/50 border-gray-700 ${styles.shadow}`
        : `bg-white border-gray-200 ${styles.shadow}`
    }`}>
      <div className={`absolute -top-1/3 -right-1/4 w-2/3 h-2/3 bg-gradient-to-br ${styles.gradient} rounded-full opacity-10 blur-3xl`}></div>
      <div className="relative z-10 flex flex-col h-full">

        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl transition-all duration-300 ${styles.iconBg}`}>
            <div className={`w-6 h-6 transition-transform duration-300 ${styles.iconColor}`}>
              {icon}
            </div>
          </div>
          <div>
            <h3 className={`text-base font-bold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
            }`}>{title}</h3>
            {subtitle && <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>{subtitle}</p>}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center text-center">
          {isLoading ? (
            <div className="animate-pulse">
              <div className={`h-12 w-3/4 mx-auto rounded-md ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`}></div>
            </div>
          ) : error ? (
            <div className={`text-sm p-2 rounded-lg ${
              theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
            }`}>{error}</div>
          ) : (
            <p className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${styles.gradient}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default StatCard;
