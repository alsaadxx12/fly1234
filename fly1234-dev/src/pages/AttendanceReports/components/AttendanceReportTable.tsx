import React, { useMemo } from 'react';
import { Loader2, User, MapPin, Clock } from 'lucide-react';
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
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <User className="w-4 h-4 inline-block ml-2" />
                الموظف
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <MapPin className="w-4 h-4 inline-block ml-2" />
                الفرع
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Clock className="w-4 h-4 inline-block ml-2" />
                وقت الحضور
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Clock className="w-4 h-4 inline-block ml-2" />
                وقت الانصراف
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                وقت التأخير (د)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                وقت إضافي (د)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                صافي النقاط
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {records.map(record => (
              <tr key={record.id} className={theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{record.employeeName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">{record.branchName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {record.checkInTime.toLocaleString('ar-EG')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {record.checkOutTime ? record.checkOutTime.toLocaleString('ar-EG') : 'لم يسجل خروج بعد'}
                  </div>
                </td>
                 <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${record.lateMinutes > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {record.lateMinutes}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${record.overtimeMinutes > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                  {record.overtimeMinutes}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    record.netPoints > 0 ? 'text-green-500' : record.netPoints < 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {record.netPoints.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceReportTable;
