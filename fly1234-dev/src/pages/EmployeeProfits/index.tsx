import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, DollarSign, FileText, Users, Award, BarChart3, PieChart, Calendar, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CustomDatePicker from '../../components/CustomDatePicker';
import EmployeeOfTheMonthBanner from '../../components/EmployeeOfTheMonthBanner';
import ProfitSettingsModal from './components/ProfitSettingsModal';
import { getProfitSettings, calculateEmployeeProfit } from '../../lib/services/profitSettingsService';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
}

interface Ticket {
  id: string;
  pnr: string;
  passengers: Array<{
    purchasePrice: number;
    salePrice: number;
  }>;
  type: 'entry' | 'refund' | 'change';
  createdBy: string;
  createdAt: Date;
  currency: string;
}

interface Visa {
  id: string;
  name: string;
  passportNumber: string;
  salePrice: number;
  purchasePrice: number;
  createdBy: string;
  createdAt: Date;
}

interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  usdPurchase: number;
  usdSale: number;
  usdProfit: number;
  usdEmployeeProfit: number;
  usdCompanyProfit: number;
  iqdPurchase: number;
  iqdSale: number;
  iqdProfit: number;
  iqdEmployeeProfit: number;
  iqdCompanyProfit: number;
  pnrCount: number;
  ticketCount: number;
  visaCount: number;
  changeCount: number;
  refundCount: number;
  profitMargin: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function EmployeeProfits() {
  const { theme } = useTheme();
  const { currentUser, employee, checkPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allVisas, setAllVisas] = useState<Visa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [canFilter, setCanFilter] = useState(false);
  const [activeView, setActiveView] = useState<'cards' | 'charts'>('cards');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profitPercentage, setProfitPercentage] = useState<number>(10);

  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(firstDay);
  const [dateTo, setDateTo] = useState<Date | undefined>(lastDay);

  useEffect(() => {
    const hasFilterPermission = checkPermission('الأرباح', 'filter') || checkPermission('profits', 'filter');
    setCanFilter(hasFilterPermission);
    loadData(hasFilterPermission);
    loadProfitSettings();
  }, [currentUser, employee, checkPermission]);

  const loadProfitSettings = async () => {
    try {
      const settings = await getProfitSettings();
      setProfitPercentage(settings.employeeProfitPercentage);
    } catch (error) {
      console.error('Error loading profit settings:', error);
    }
  };

  const loadData = async (hasFilterPermission: boolean) => {
    setLoading(true);
    try {
      if (hasFilterPermission) {
        await loadAllEmployeesAndTickets();
      } else if (currentUser && employee) {
        const emp: Employee = {
          id: currentUser.uid,
          name: employee.name || '',
          email: employee.email || ''
        };
        setEmployees([emp]);
        await loadEmployeeTickets(currentUser.uid);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllEmployeesAndTickets = async () => {
    const employeesRef = collection(db, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    const employeesList = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];
    setEmployees(employeesList);

    const ticketsRef = collection(db, 'tickets');
    const ticketsSnapshot = await getDocs(ticketsRef);
    const ticketsList = ticketsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        pnr: data.pnr || '',
        passengers: data.passengers || [],
        type: data.type || 'entry',
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        currency: data.currency || 'IQD'
      };
    }) as Ticket[];
    setAllTickets(ticketsList);

    const visasRef = collection(db, 'visas');
    const visasSnapshot = await getDocs(visasRef);
    const visasList = visasSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        passportNumber: data.passportNumber || '',
        salePrice: data.salePrice || 0,
        purchasePrice: data.purchasePrice || 0,
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toDate() || new Date()
      };
    }) as Visa[];
    setAllVisas(visasList);
  };

  const loadEmployeeTickets = async (employeeId: string) => {
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('createdBy', '==', employeeId));
    const snapshot = await getDocs(q);
    const ticketsList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        pnr: data.pnr || '',
        passengers: data.passengers || [],
        type: data.type || 'entry',
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        currency: data.currency || 'IQD'
      };
    }) as Ticket[];
    setAllTickets(ticketsList);

    const visasRef = collection(db, 'visas');
    const visasQuery = query(visasRef, where('createdBy', '==', employeeId));
    const visasSnapshot = await getDocs(visasQuery);
    const visasList = visasSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        passportNumber: data.passportNumber || '',
        salePrice: data.salePrice || 0,
        purchasePrice: data.purchasePrice || 0,
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toDate() || new Date()
      };
    }) as Visa[];
    setAllVisas(visasList);
  };

  const filteredTickets = useMemo(() => {
    let filtered = allTickets;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(ticket => ticket.createdAt >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ticket => ticket.createdAt <= toDate);
    }

    return filtered;
  }, [allTickets, dateFrom, dateTo]);

  const filteredVisas = useMemo(() => {
    let filtered = allVisas;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(visa => visa.createdAt >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(visa => visa.createdAt <= toDate);
    }

    return filtered;
  }, [allVisas, dateFrom, dateTo]);

  const employeeStatsData = useMemo(() => {
    const statsMap = new Map<string, EmployeeStats>();

    employees.forEach(emp => {
      statsMap.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        usdPurchase: 0,
        usdSale: 0,
        usdProfit: 0,
        usdEmployeeProfit: 0,
        usdCompanyProfit: 0,
        iqdPurchase: 0,
        iqdSale: 0,
        iqdProfit: 0,
        iqdEmployeeProfit: 0,
        iqdCompanyProfit: 0,
        pnrCount: 0,
        ticketCount: 0,
        visaCount: 0,
        changeCount: 0,
        refundCount: 0,
        profitMargin: 0
      });
    });

    const pnrCountMap = new Map<string, Set<string>>();

    // حساب إحصائيات التذاكر
    filteredTickets.forEach(ticket => {
      const stats = statsMap.get(ticket.createdBy);
      if (!stats) return;

      if (!pnrCountMap.has(ticket.createdBy)) {
        pnrCountMap.set(ticket.createdBy, new Set());
      }
      pnrCountMap.get(ticket.createdBy)!.add(ticket.pnr);

      ticket.passengers.forEach(passenger => {
        const purchase = passenger.purchasePrice || 0;
        const sale = passenger.salePrice || 0;
        const profit = sale - purchase;

        if (ticket.currency === 'USD') {
          stats.usdPurchase += purchase;
          stats.usdSale += sale;
          stats.usdProfit += profit;
        } else {
          stats.iqdPurchase += purchase;
          stats.iqdSale += sale;
          stats.iqdProfit += profit;
        }

        // عد التذاكر حسب نوعها
        if (ticket.type === 'entry') {
          stats.ticketCount++;
        } else if (ticket.type === 'change') {
          stats.changeCount++;
        } else if (ticket.type === 'refund') {
          stats.refundCount++;
        }
      });
    });

    // حساب إحصائيات الفيزا
    filteredVisas.forEach(visa => {
      const stats = statsMap.get(visa.createdBy);
      if (!stats) return;

      const purchase = visa.purchasePrice || 0;
      const sale = visa.salePrice || 0;
      const profit = sale - purchase;

      // الفيزا دائماً بالدولار
      stats.usdPurchase += purchase;
      stats.usdSale += sale;
      stats.usdProfit += profit;
      stats.visaCount++;
    });

    pnrCountMap.forEach((pnrSet, employeeId) => {
      const stats = statsMap.get(employeeId);
      if (stats) {
        stats.pnrCount = pnrSet.size;
      }
    });

    // حساب نسبة الربح وتوزيع الأرباح
    statsMap.forEach(stats => {
      const totalSale = stats.usdSale + stats.iqdSale;
      const totalProfit = stats.usdProfit + stats.iqdProfit;
      stats.profitMargin = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;

      stats.usdEmployeeProfit = calculateEmployeeProfit(stats.usdProfit, profitPercentage);
      stats.usdCompanyProfit = stats.usdProfit - stats.usdEmployeeProfit;

      stats.iqdEmployeeProfit = calculateEmployeeProfit(stats.iqdProfit, profitPercentage);
      stats.iqdCompanyProfit = stats.iqdProfit - stats.iqdEmployeeProfit;
    });

    return Array.from(statsMap.values()).sort((a, b) =>
      (b.usdEmployeeProfit + b.iqdEmployeeProfit) - (a.usdEmployeeProfit + a.iqdEmployeeProfit)
    );
  }, [employees, filteredTickets, filteredVisas, profitPercentage]);

  const filteredEmployeeStats = useMemo(() => {
    if (!searchTerm) return employeeStatsData;
    const term = searchTerm.toLowerCase();
    return employeeStatsData.filter(stat =>
      stat.employeeName.toLowerCase().includes(term) ||
      stat.employeeEmail.toLowerCase().includes(term)
    );
  }, [employeeStatsData, searchTerm]);

  const totalStats = useMemo(() => {
    return filteredEmployeeStats.reduce((acc, stat) => ({
      usdPurchase: acc.usdPurchase + stat.usdPurchase,
      usdSale: acc.usdSale + stat.usdSale,
      usdProfit: acc.usdProfit + stat.usdProfit,
      iqdPurchase: acc.iqdPurchase + stat.iqdPurchase,
      iqdSale: acc.iqdSale + stat.iqdSale,
      iqdProfit: acc.iqdProfit + stat.iqdProfit,
      pnrCount: acc.pnrCount + stat.pnrCount,
      ticketCount: acc.ticketCount + stat.ticketCount
    }), {
      usdPurchase: 0,
      usdSale: 0,
      usdProfit: 0,
      iqdPurchase: 0,
      iqdSale: 0,
      iqdProfit: 0,
      pnrCount: 0,
      ticketCount: 0
    });
  }, [filteredEmployeeStats]);

  const chartData = useMemo(() => {
    return filteredEmployeeStats.slice(0, 10).map(stat => ({
      name: stat.employeeName.split(' ')[0],
      'الربح USD': Math.round(stat.usdProfit),
      'المبيع USD': Math.round(stat.usdSale),
      'الشراء USD': Math.round(stat.usdPurchase),
      ticketCount: stat.ticketCount
    }));
  }, [filteredEmployeeStats]);

  const pieChartData = useMemo(() => {
    return filteredEmployeeStats.slice(0, 8).map((stat, index) => ({
      name: stat.employeeName.split(' ')[0],
      value: Math.round(stat.usdProfit + (stat.iqdProfit / 1450)),
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredEmployeeStats]);

  const performanceData = useMemo(() => {
    return filteredEmployeeStats.slice(0, 10).map(stat => ({
      name: stat.employeeName.split(' ')[0],
      'نسبة الربح %': stat.profitMargin.toFixed(1),
      'عدد التذاكر': stat.ticketCount
    }));
  }, [filteredEmployeeStats]);

  const topPerformer = useMemo(() => {
    if (filteredEmployeeStats.length === 0) return null;
    return filteredEmployeeStats[0];
  }, [filteredEmployeeStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            أرباح الموظفين
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            تحليل شامل للأداء المالي والإنتاجية
          </p>
        </div>

        {/* View Toggle */}
        <div className={`flex gap-2 p-1 rounded-xl ${
          theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setActiveView('cards')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeView === 'cards'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white shadow-md'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            البطاقات
          </button>
          <button
            onClick={() => setActiveView('charts')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
              activeView === 'charts'
                ? theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white shadow-md'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            المخططات
          </button>
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            theme === 'dark'
              ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          إعدادات الأرباح ({profitPercentage}%)
        </button>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/30'
          : 'bg-white'
      } shadow-sm`}>
        <div className={`grid gap-4 ${canFilter ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {canFilter && (
            <div className="relative h-[52px]">
              <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث عن موظف..."
                className={`w-full h-full pr-10 pl-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
              />
            </div>
          )}

          <div className="h-[52px]">
            <CustomDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              label=""
              placeholder="من تاريخ"
            />
          </div>

          <div className="h-[52px]">
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              label=""
              placeholder="إلى تاريخ"
            />
          </div>
        </div>
      </div>

      {/* Employee of the Month Banner */}
      <EmployeeOfTheMonthBanner />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-emerald-900/40 to-emerald-950/20'
            : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50'
        } shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              theme === 'dark' ? 'bg-emerald-900/60' : 'bg-emerald-200/60'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
              }`} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wide ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              إجمالي الربح
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className={`text-2xl font-black ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              ${formatCurrency(totalStats.usdProfit)}
            </div>
            <div className={`text-base font-bold ${
              theme === 'dark' ? 'text-emerald-300/70' : 'text-emerald-600/90'
            }`}>
              {formatCurrency(totalStats.iqdProfit)} د.ع
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-blue-900/40 to-blue-950/20'
            : 'bg-gradient-to-br from-blue-50 to-blue-100/50'
        } shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              theme === 'dark' ? 'bg-blue-900/60' : 'bg-blue-200/60'
            }`}>
              <DollarSign className={`w-5 h-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
              }`} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wide ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              إجمالي المبيعات
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className={`text-2xl font-black ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
            }`}>
              ${formatCurrency(totalStats.usdSale)}
            </div>
            <div className={`text-base font-bold ${
              theme === 'dark' ? 'text-blue-300/70' : 'text-blue-600/90'
            }`}>
              {formatCurrency(totalStats.iqdSale)} د.ع
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/20'
            : 'bg-gradient-to-br from-purple-50 to-purple-100/50'
        } shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              theme === 'dark' ? 'bg-purple-900/60' : 'bg-purple-200/60'
            }`}>
              <FileText className={`w-5 h-5 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-700'
              }`} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wide ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              عدد الحجوزات
            </h3>
          </div>
          <div className={`text-2xl font-black ${
            theme === 'dark' ? 'text-purple-400' : 'text-purple-700'
          }`}>
            {totalStats.pnrCount}
          </div>
        </div>

        <div className={`rounded-xl p-5 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-orange-900/40 to-orange-950/20'
            : 'bg-gradient-to-br from-orange-50 to-orange-100/50'
        } shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              theme === 'dark' ? 'bg-orange-900/60' : 'bg-orange-200/60'
            }`}>
              <Users className={`w-5 h-5 ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-700'
              }`} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wide ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              عدد التذاكر
            </h3>
          </div>
          <div className={`text-2xl font-black ${
            theme === 'dark' ? 'text-orange-400' : 'text-orange-700'
          }`}>
            {totalStats.ticketCount}
          </div>
        </div>
      </div>

      {/* Top Performer Badge */}
      {topPerformer && (
        <div className={`rounded-2xl p-6 ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-amber-900/30'
            : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50'
        } border-2 ${
          theme === 'dark' ? 'border-amber-700/50' : 'border-amber-300'
        } shadow-lg`}>
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
                <div className={`text-sm font-bold mb-1 ${
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  🏆 أفضل موظف في الفترة
                </div>
                <div className={`text-2xl font-black ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {topPerformer.employeeName}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className={`text-3xl font-black ${
                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
              }`}>
                ${formatCurrency(topPerformer.usdProfit)}
              </div>
              <div className={`text-sm font-bold ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ربح إجمالي
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards View */}
      {activeView === 'cards' && (
        <div className="grid grid-cols-1 gap-4">
          {filteredEmployeeStats.map((stat, index) => (
            <div
              key={stat.employeeId}
              className={`rounded-2xl p-6 ${
                theme === 'dark'
                  ? 'bg-gray-800/30 hover:bg-gray-800/50'
                  : 'bg-white hover:bg-gray-50'
              } shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-center justify-between gap-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4 min-w-[280px]">
                  <div className="relative">
                    {index < 3 && (
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        'bg-orange-600 text-white'
                      } shadow-lg z-10`}>
                        {index + 1}
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    } shadow-lg`}>
                      {stat.employeeName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold text-lg mb-0.5 truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stat.employeeName}
                    </div>
                    <div className={`text-sm truncate ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {stat.employeeEmail}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-6 gap-3">
                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-gray-900/40' : 'bg-gray-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      المالية
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>شراء:</span>
                        <span className={`font-bold text-sm ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          ${formatCurrency(stat.usdPurchase)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${
                          theme === 'dark' ? 'text-blue-500/70' : 'text-blue-600/70'
                        }`}>مبيع:</span>
                        <span className={`font-bold text-sm ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          ${formatCurrency(stat.usdSale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold ${
                          stat.usdEmployeeProfit >= 0
                            ? theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600/70'
                            : theme === 'dark' ? 'text-red-500/70' : 'text-red-600/70'
                        }`}>ربح:</span>
                        <span className={`font-bold text-sm ${
                          stat.usdEmployeeProfit >= 0
                            ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                            : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        }`}>
                          ${formatCurrency(stat.usdEmployeeProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-purple-950/20' : 'bg-purple-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-purple-500/70' : 'text-purple-600/70'
                    }`}>
                      PNR
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {stat.pnrCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-orange-950/20' : 'bg-orange-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-orange-500/70' : 'text-orange-600/70'
                    }`}>
                      التذاكر
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                      {stat.ticketCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-cyan-950/20' : 'bg-cyan-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-cyan-500/70' : 'text-cyan-600/70'
                    }`}>
                      الفيزا
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'
                    }`}>
                      {stat.visaCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-yellow-950/20' : 'bg-yellow-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-yellow-500/70' : 'text-yellow-600/70'
                    }`}>
                      التغيير
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      {stat.changeCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-red-950/20' : 'bg-red-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-red-500/70' : 'text-red-600/70'
                    }`}>
                      الاسترجاع
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {stat.refundCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-green-950/20' : 'bg-green-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-green-500/70' : 'text-green-600/70'
                    }`}>
                      التدقيق
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {stat.ticketCount + stat.visaCount}
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 ${
                    theme === 'dark' ? 'bg-indigo-950/20' : 'bg-indigo-50'
                  }`}>
                    <div className={`text-xs font-bold mb-2 uppercase tracking-wide ${
                      theme === 'dark' ? 'text-indigo-500/70' : 'text-indigo-600/70'
                    }`}>
                      الإدخال
                    </div>
                    <div className={`font-black text-xl ${
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    }`}>
                      {stat.ticketCount + stat.visaCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredEmployeeStats.length === 0 && (
            <div className={`rounded-2xl p-16 ${
              theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
            } shadow-sm`}>
              <div className="flex flex-col items-center gap-3">
                <FileText className={`w-16 h-16 ${
                  theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                }`} />
                <p className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  لا توجد بيانات لعرضها
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts View */}
      {activeView === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className={`rounded-2xl p-6 ${
            theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
          } shadow-sm`}>
            <h3 className={`text-lg font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              مقارنة الأرباح والمبيعات (أعلى 10 موظفين)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#F3F4F6' : '#111827'
                  }}
                />
                <Legend />
                <Bar dataKey="الربح USD" fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="المبيع USD" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className={`rounded-2xl p-6 ${
            theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
          } shadow-sm`}>
            <h3 className={`text-lg font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              توزيع الأرباح بين الموظفين
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Chart */}
          <div className={`rounded-2xl p-6 ${
            theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
          } shadow-sm lg:col-span-2`}>
            <h3 className={`text-lg font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              نسبة الربح وعدد التذاكر
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis yAxisId="left" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis yAxisId="right" orientation="right" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#F3F4F6' : '#111827'
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="نسبة الربح %"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="عدد التذاكر"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ProfitSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={loadProfitSettings}
      />
    </div>
  );
}
