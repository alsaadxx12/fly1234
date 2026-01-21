import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileHeader from './components/ProfileHeader';
import ProfileStats from './components/ProfileStats';
import ProfileDocuments from './components/ProfileDocuments';
import ProfileAttendance from './components/ProfileAttendance';
import ProfileLeaves from './components/ProfileLeaves';
import { Loader2, Calendar, FileText, History } from 'lucide-react';
import MobileSystemNav from '../../components/MobileSystemNav';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileContent() {
  const { employee, loading } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'docs'>('docs');

  if (loading || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'docs', label: 'المستمسكات', icon: FileText },
    { id: 'attendance', label: 'سجل الحضور', icon: History },
    { id: 'leaves', label: 'طلبات الإجازة', icon: Calendar },
  ] as const;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-4">
      <div className="md:hidden">
        <MobileSystemNav />
      </div>

      <ProfileHeader employee={employee} />

      <ProfileStats employee={employee} />

      <div className="space-y-4">
        {/* Modern Tab Switcher */}
        <div className={`p-1.5 rounded-2xl flex gap-1 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200/50'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'docs' && <ProfileDocuments employee={employee} />}
          {activeTab === 'attendance' && <ProfileAttendance employeeId={employee.id!} />}
          {activeTab === 'leaves' && <ProfileLeaves employeeId={employee.id!} />}
        </div>
      </div>
    </div>
  );
}
