import React from 'react';
import AttendanceCard from './components/AttendanceCard';

const AttendanceContent: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700" />

      <div className="relative z-10 w-full flex justify-center py-4 sm:py-8">
        <AttendanceCard />
      </div>
    </div>
  );
};

export default AttendanceContent;
