import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Activity, Calendar, BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { useTheme } from '../../../contexts/ThemeContext';
import { rtdb } from '../../../lib/firebase';

interface ExchangeRateData {
  date: string;
  rate: number;
}

interface ExchangeRateChartProps {
  data: ExchangeRateData[];
  currentRate: number;
  isLoading?: boolean;
  error?: string | null;
}

const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({
  data,
  currentRate,
  isLoading,
  error
}) => {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'pie'>('area');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const rateRef = ref(rtdb, 'exchangeRate/current');
    const unsubscribeRate = onValue(rateRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.timestamp) {
        const date = new Date(data.timestamp);
        setLastUpdate(date.toLocaleString('ar-IQ'));
      }
    });

    return () => {
      unsubscribeRate();
    };
  }, []);

  const calculateTrend = () => {
    if (data.length < 2) return { percentage: '0.00', isPositive: true };
    const oldRate = data[0].rate;
    const newRate = data[data.length - 1].rate;
    if (oldRate === 0) return { percentage: '0.00', isPositive: true };
    const change = ((newRate - oldRate) / oldRate) * 100;
    return {
      percentage: Math.abs(change).toFixed(2),
      isPositive: change >= 0
    };
  };

  const trend = calculateTrend();

  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return ['auto', 'auto'];
    const rates = data.map(d => d.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const padding = (max - min) * 0.1 || 10;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [data]);
  
  const pieChartData = useMemo(() => {
    if (data.length < 2) return [];
    const latest = data[data.length-1];
    const previous = data[data.length-2];
    return [
      { name: `السعر السابق (${previous.date})`, value: previous.rate, color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' },
      { name: `السعر الحالي (${latest.date})`, value: latest.rate, color: theme === 'dark' ? '#60a5fa' : '#3b82f6' }
    ]
  }, [data, theme]);

  if (isLoading) {
    return (
      <div className={`rounded-2xl shadow-lg border p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>جاري تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl shadow-lg border p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <Activity className={`w-8 h-8 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} />
            </div>
            <p className={`mb-4 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            }`}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-lg border overflow-hidden ${
      theme === 'dark'
        ? 'bg-gray-800/60 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b ${
        theme === 'dark'
          ? 'border-gray-700 bg-gradient-to-r from-indigo-900/20 to-gray-800'
          : 'border-gray-200 bg-gradient-to-r from-indigo-50 to-white'
      }`}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              theme === 'dark'
                ? 'bg-indigo-500/20'
                : 'bg-indigo-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>سعر الصرف المعتمد</h3>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>سعر الصرف الرسمي للدولار الأمريكي</p>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${
            theme === 'dark'
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded-lg transition-all ${
                chartType === 'area'
                  ? theme === 'dark'
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-indigo-500 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title="مخطط منطقة"
            >
              <AreaChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-lg transition-all ${
                chartType === 'line'
                  ? theme === 'dark'
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-indigo-500 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title="مخطط خطي"
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-lg transition-all ${
                chartType === 'bar'
                  ? theme === 'dark'
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-indigo-500 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title="مخطط أعمدة"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-lg transition-all ${
                chartType === 'pie'
                  ? theme === 'dark'
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-indigo-500 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
              title="مخطط دائري"
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Rate Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-bold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
            }`}>
              {currentRate.toLocaleString()}
            </span>
            <span className={`text-lg ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>د.ع / دولار</span>
          </div>

          {/* Trend Indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
            trend.isPositive
              ? theme === 'dark'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-green-100 text-green-700'
              : theme === 'dark'
                ? 'bg-red-900/30 text-red-400'
                : 'bg-red-100 text-red-700'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            <span className="font-bold text-lg">
              {trend.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        <div className={`rounded-xl p-4 ${
          theme === 'dark'
            ? 'bg-gray-900/50'
            : 'bg-white/50'
        }`}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                 <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                          background: theme === 'dark' ? '#1f2937' : '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                          padding: '12px'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} د.ع`, 'السعر']}
                      />
                    <Legend />
                  </RechartsPieChart>
              ) : chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                  />
                  <YAxis
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    domain={yAxisDomain}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'dark' ? '#1f2937' : '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                      padding: '12px'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} د.ع`, 'سعر الصرف']}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <ReferenceLine
                    y={currentRate}
                    stroke={theme === 'dark' ? '#8b5cf6' : '#6366f1'}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="rate"
                    fill="url(#barGradient)"
                    name="سعر الصرف"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                  />
                  <YAxis
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    domain={yAxisDomain}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'dark' ? '#1f2937' : '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                      padding: '12px'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} د.ع`, 'سعر الصرف']}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <ReferenceLine
                    y={currentRate}
                    stroke={theme === 'dark' ? '#8b5cf6' : '#6366f1'}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                    name="سعر الصرف"
                  />
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                  />
                  <YAxis
                    stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                    tickLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    domain={yAxisDomain}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'dark' ? '#1f2937' : '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                      padding: '12px'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} د.ع`, 'سعر الصرف']}
                    labelFormatter={(label) => `التاريخ: ${label}`}
                  />
                  <ReferenceLine
                    y={currentRate}
                    stroke={theme === 'dark' ? '#8b5cf6' : '#6366f1'}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="سعر الصرف"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: theme === 'dark' ? '#1f2937' : '#ffffff',
                      stroke: '#8b5cf6'
                    }}
                    activeDot={{
                      r: 6,
                      stroke: '#8b5cf6',
                      strokeWidth: 2,
                      fill: theme === 'dark' ? '#1f2937' : '#ffffff'
                    }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between mt-6">
          <div className={`flex items-center gap-2 text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Calendar className="w-4 h-4" />
            <span>آخر تحديث: {lastUpdate || data[data.length - 1]?.date || 'غير متوفر'}</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            theme === 'dark'
              ? 'bg-gray-700/50 text-gray-300'
              : 'bg-gray-100 text-gray-700'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">{data.length} نقطة بيانات</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateChart;
