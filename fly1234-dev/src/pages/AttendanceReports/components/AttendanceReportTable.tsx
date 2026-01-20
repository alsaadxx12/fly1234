import React from 'react';
import { Loader2, User, MapPin, Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface AttendanceReportTableProps {
  records: any[];
  loading: boolean;
  error: string | null;
}

const AttendanceReportTable: React.FC<AttendanceReportTableProps> = ({ records, loading, error }) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800">{error}</div>;
  }

  if (records.length === 0) {
    return (
      <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold">لا توجد سجلات حضور حالياً</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {records.map(record => (
        <div
          key={record.id}
          className={`group p-5 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-xl ${theme === 'dark'
            ? 'bg-gray-800/40 border-gray-700 hover:bg-gray-800/60'
            : 'bg-white border-gray-100 hover:border-emerald-100'
            }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 dark:text-white">{record.employeeName}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {record.branchName}
                </div>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${record.netPoints >= 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
              }`}>
              {record.netPoints >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {record.netPoints.toFixed(2)} نقطة
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">وقت الحضور</span>
              </div>
              <span className="text-xs font-black text-gray-900 dark:text-white">
                {record.checkInTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">وقت الانصراف</span>
              </div>
              <span className="text-xs font-black text-gray-900 dark:text-white">
                {record.checkOutTime
                  ? record.checkOutTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-900/20">
                <span className="block text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase mb-1">تأخير</span>
                <span className="text-sm font-black text-rose-700 dark:text-rose-300">{record.lateMinutes} دقيقة</span>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20">
                <span className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">إضافي</span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-300">{record.overtimeMinutes} دقيقة</span>
              </div>
            </div>

            {(record.salaryDeductionDays > 0 || record.isAbsent || record.hasFullDayLeave || record.hasTimeLeave) && (
              <div className="flex flex-wrap gap-2">
                {record.salaryDeductionDays > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-black">
                    خصم راتب: {record.salaryDeductionDays} يوم
                  </div>
                )}
                {record.hasFullDayLeave && (
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black">
                    إجازة كاملة
                  </div>
                )}
                {record.hasTimeLeave && (
                  <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-black">
                    إجازة زمنية
                  </div>
                )}
                {record.isAbsent && !record.hasFullDayLeave && (
                  <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black">
                    تغيب (تجاوز الحد)
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 text-[10px] text-gray-400 font-bold">
              <Calendar className="w-3 h-3" />
              {record.checkInTime.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttendanceReportTable;
