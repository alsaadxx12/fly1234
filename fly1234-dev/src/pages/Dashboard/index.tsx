import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, query, orderBy, limit, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Company } from '../Companies/hooks/useCompanies';
import StatisticsGrid from './components/StatisticsGrid';
import ExchangeRateChart from './components/ExchangeRateChart';
import RecentVouchers from './components/RecentVouchers';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
import EmployeeOfTheMonthBanner from '../../components/EmployeeOfTheMonthBanner';
import { Issue } from '../PendingIssues/types';
import { MastercardIssue } from '../MastercardIssues/types';
import { Employee } from '../../lib/collections/employees';

interface TopPerformer {
  name: string;
  count: number;
  image?: string;
}

export default function DashboardContent() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    credit: 0,
    cash: 0,
    history: [] as any[]
  });
  const [issueStats, setIssueStats] = useState<{
    topIssuesAdded: TopPerformer[];
    topIssuesResolved: TopPerformer[];
  }>({ topIssuesAdded: [], topIssuesResolved: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentRate, history: rateHistory, isLoading: isLoadingRate } = useExchangeRate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      setIsLoading(true);
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

        const history = Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            total: Math.floor(Math.random() * 10) + 100 - i,
            credit: Math.floor(Math.random() * 5) + 30 - Math.floor(i / 2),
            cash: Math.floor(Math.random() * 5) + 70 - Math.floor(i / 2),
          };
        }).reverse();

        setStats({ total, credit, cash, history });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("فشل في تحميل الإحصائيات");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchIssueStats = async () => {
      if (!user) return;
      setIsLoadingIssues(true);
      try {
        const employeesSnapshot = await getDocs(collection(db, 'employees'));
        const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        
        const employeeImageMap = new Map<string, string | undefined>();
        employees.forEach(emp => {
            let imageUrl = emp.image;
            if (!imageUrl && emp.files && Array.isArray(emp.files)) {
                const profilePicFile = emp.files.find((file: any) => file.name === 'صورة شخصية');
                if (profilePicFile) {
                    imageUrl = profilePicFile.url;
                }
            }
            if (emp.name) {
                employeeImageMap.set(emp.name, imageUrl);
            }
        });

        const issuesSnapshot = await getDocs(collection(db, 'issues'));
        const mastercardIssuesSnapshot = await getDocs(collection(db, 'mastercard_issues'));
        
        const issues = issuesSnapshot.docs.map(doc => doc.data() as Issue);
        const mastercardIssues = mastercardIssuesSnapshot.docs.map(doc => doc.data() as MastercardIssue);

        const allIssues = [...issues, ...mastercardIssues];

        const addedCounts: { [name: string]: number } = {};
        const resolvedCounts: { [name: string]: number } = {};

        allIssues.forEach(issue => {
          if (issue.createdByName) {
            addedCounts[issue.createdByName] = (addedCounts[issue.createdByName] || 0) + 1;
          }
          if (issue.status === 'resolved' && issue.resolvedByName) {
            resolvedCounts[issue.resolvedByName] = (resolvedCounts[issue.resolvedByName] || 0) + 1;
          }
        });

        const sortedAdded = Object.entries(addedCounts).sort((a, b) => b[1] - a[1]);
        const sortedResolved = Object.entries(resolvedCounts).sort((a, b) => b[1] - a[1]);

        setIssueStats({
          topIssuesAdded: sortedAdded.slice(0, 3).map(([name, count]) => ({ name, count, image: employeeImageMap.get(name) })),
          topIssuesResolved: sortedResolved.slice(0, 3).map(([name, count]) => ({ name, count, image: employeeImageMap.get(name) })),
        });

      } catch (err) {
        console.error("Error fetching issue stats:", err);
      } finally {
        setIsLoadingIssues(false);
      }
    };

    fetchStats();
    fetchIssueStats();
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
      <StatisticsGrid 
        stats={stats}
        issueStats={issueStats}
        currentRate={currentRate}
        isLoadingRate={isLoadingRate}
      />
      <EmployeeOfTheMonthBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExchangeRateChart
            data={formattedRateHistory}
            currentRate={currentRate}
            isLoading={isLoadingRate}
          />
        </div>
        <div className="h-full">
          <RecentVouchers />
        </div>
      </div>
    </div>
  );
}
