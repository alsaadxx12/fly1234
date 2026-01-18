import React from 'react';
import { Link } from 'react-router-dom';
import AttendanceCard from './Attendance/components/AttendanceCard';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard } from 'lucide-react';

const StandaloneAttendance: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <AttendanceCard />
      <Link
        to="/dashboard"
        className={`mt-8 flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
          theme === 'dark'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>الذهاب إلى لوحة التحكم</span>
      </Link>
    </div>
  );
};

export default StandaloneAttendance;
