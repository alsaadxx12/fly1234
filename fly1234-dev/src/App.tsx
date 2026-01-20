import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExchangeRateProvider } from './contexts/ExchangeRateContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { GlobalModalsProvider } from './contexts/GlobalModalsContext';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import LandingPage from './pages/Landing';
import AuthGuard from './components/AuthGuard';
import PermissionGuard from './components/PermissionGuard';
import GlobalApiSync from './components/GlobalApiSync';
import { checkAndCalculateEmployeeOfTheMonth } from './lib/services/employeeOfTheMonthService';
import Subscriptions from './pages/Subscriptions';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const Employees = lazy(() => import('./pages/Employees'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Safes = lazy(() => import('./pages/Safes'));
const Balances = lazy(() => import('./pages/Balances'));
const ApiIntegrations = lazy(() => import('./pages/ApiIntegrations'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Settings = lazy(() => import('./pages/Settings'));
const PublicVoucher = lazy(() => import('./pages/PublicVoucher'));
const PendingIssues = lazy(() => import('./pages/PendingIssues'));
const MastercardIssues = lazy(() => import('./pages/MastercardIssues'));
const Attendance = lazy(() => import('./pages/Attendance'));
const StandaloneAttendance = lazy(() => import('./pages/StandaloneAttendance'));
const AttendanceReports = lazy(() => import('./pages/AttendanceReports'));
const Branches = lazy(() => import('./pages/Branches'));
const Departments = lazy(() => import('./pages/Departments'));
const Reports = lazy(() => import('./pages/Reports'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const Leaves = lazy(() => import('./pages/Leaves'));

const LoadingFallback = () => {
  const { theme } = useTheme();

  return (
    <div className={`flex items-center justify-center h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>جاري التحميل...</p>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    checkAndCalculateEmployeeOfTheMonth();
  }, []);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/attendance-standalone" /> : <LandingPage />} />
      <Route path="/" element={user ? <Navigate to="/attendance-standalone" /> : <LandingPage />} />
      <Route path="/voucher/:voucherId" element={<Suspense fallback={<LoadingFallback />}><PublicVoucher /></Suspense>} />

      <Route
        path="/attendance-standalone"
        element={
          <AuthGuard>
            <Suspense fallback={<LoadingFallback />}>
              <StandaloneAttendance />
            </Suspense>
          </AuthGuard>
        }
      />

      <Route
        path="/*"
        element={
          <AuthGuard>
            <ExchangeRateProvider>
              <Layout>
                <PageTransition>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/dashboard" element={<PermissionGuard requiredPermissions={{ page: 'dashboard', actions: ['view'] }}><Dashboard /></PermissionGuard>} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/companies" element={<PermissionGuard requiredPermissions={{ page: 'companies', actions: ['view'] }}><Companies /></PermissionGuard>} />
                      <Route path="/employees" element={<PermissionGuard requiredPermissions={{ page: 'employees', actions: ['view'] }}><Employees /></PermissionGuard>} />
                      <Route path="/departments" element={<PermissionGuard requiredPermissions={{ page: 'departments', actions: ['view'] }}><Departments /></PermissionGuard>} />
                      <Route path="/accounts" element={<PermissionGuard requiredPermissions={{ page: 'accounts', actions: ['view'] }}><Accounts /></PermissionGuard>} />
                      <Route path="/safes" element={<PermissionGuard requiredPermissions={{ page: 'safes', actions: ['view'] }}><Safes /></PermissionGuard>} />
                      <Route path="/balances" element={<PermissionGuard requiredPermissions={{ page: 'الأرصدة', actions: ['view'] }}><Balances /></PermissionGuard>} />
                      <Route path="/api-integrations" element={<PermissionGuard requiredPermissions={{ page: 'API', actions: ['view'] }}><ApiIntegrations /></PermissionGuard>} />
                      <Route path="/subscriptions" element={<PermissionGuard requiredPermissions={{ page: 'subscriptions', actions: ['view'] }}><Subscriptions /></PermissionGuard>} />
                      <Route path="/announcements" element={<PermissionGuard requiredPermissions={{ page: 'announcements', actions: ['view'] }}><Announcements /></PermissionGuard>} />
                      <Route path="/reports" element={<PermissionGuard requiredPermissions={{ page: 'التبليغات', actions: ['view'] }}><Reports /></PermissionGuard>} />
                      <Route path="/settings" element={<PermissionGuard requiredPermissions={{ page: 'settings', actions: ['view'] }}><Settings /></PermissionGuard>} />
                      <Route path="/pending-issues" element={<PermissionGuard requiredPermissions={{ page: 'المشاكل المعلقة', actions: ['view'] }}><PendingIssues /></PermissionGuard>} />
                      <Route path="/mastercard-issues" element={<PermissionGuard requiredPermissions={{ page: 'مشاكل بوابة الماستر', actions: ['view'] }}><MastercardIssues /></PermissionGuard>} />
                      <Route path="/attendance" element={<PermissionGuard requiredPermissions={{ page: 'تسجيل الحضور', actions: ['view'] }}><Attendance /></PermissionGuard>} />
                      <Route path="/attendance-reports" element={<PermissionGuard requiredPermissions={{ page: 'تقارير الحضور', actions: ['view'] }}><AttendanceReports /></PermissionGuard>} />
                      <Route path="/branches" element={<PermissionGuard requiredPermissions={{ page: 'الفروع', actions: ['view'] }}><Branches /></PermissionGuard>} />
                      <Route path="/leaves" element={<Leaves />} />
                      <Route path="*" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </Suspense>
                </PageTransition>
              </Layout>
            </ExchangeRateProvider>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

import { Toaster } from 'sonner';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <NotificationProvider>
              <GlobalModalsProvider>
                <Toaster position="top-center" richColors />
                <GlobalApiSync />
                <AppRoutes />
              </GlobalModalsProvider>
            </NotificationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

