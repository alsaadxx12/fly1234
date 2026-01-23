import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ExchangeRateChart from './components/ExchangeRateChart';
import RecentVouchers from './components/RecentVouchers';
import StatCard from './components/StatCard';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
import EmployeeOfTheMonthBanner from '../../components/EmployeeOfTheMonthBanner';
import { Building2, TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    credit: 0,
    cash: 0,
  });
  const { currentRate, history: rateHistory, isLoading: isLoadingRate } = useExchangeRate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const companiesRef = collection(db, 'companies');

        const totalSnapshot = await getCountFromServer(companiesRef);
        const total = totalSnapshot.data().count;

        const creditQuery = query(collection(db, 'companies'), where('paymentType', '==', 'credit'));
        const cashQuery = query(collection(db, 'companies'), where('paymentType', '==', 'cash'));

        const [creditSnapshot, cashSnapshot] = await Promise.all([
          getCountFromServer(creditQuery),
          getCountFromServer(cashQuery)
        ]);

        const credit = creditSnapshot.data().count;
        const cash = cashSnapshot.data().count;

        setStats({ total, credit, cash });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
  }, [user]);

  const formattedRateHistory = useMemo(() => {
    if (!rateHistory) return [];
    return rateHistory
      .map(h => ({
        date: new Date(h.created_at).toLocaleDateString('en-CA'),
        rate: h.rate
      }))
      .slice(0, 30)
      .reverse();
  }, [rateHistory]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي الكيانات"
          value={stats.total}
          icon={<Building2 className="w-6 h-6" />}
          color="primary"
        />
        <StatCard
          title="الشركات النقد"
          value={stats.cash}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="الشركات الآجل"
          value={stats.credit}
          icon={<TrendingDown className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Exchange Rate Chart */}
      <ExchangeRateChart
        data={formattedRateHistory}
        currentRate={currentRate}
        isLoading={isLoadingRate}
      />

      <EmployeeOfTheMonthBanner />
      
      {/* Recent Vouchers */}
      <RecentVouchers />
    </div>
  );
}
