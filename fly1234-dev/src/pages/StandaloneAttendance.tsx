import React from 'react';
import AttendanceCard from './Attendance/components/AttendanceCard';
import { useTheme } from '../contexts/ThemeContext';

const StandaloneAttendance: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
      <AttendanceCard />
    </div>
  );
};

export default StandaloneAttendance;
