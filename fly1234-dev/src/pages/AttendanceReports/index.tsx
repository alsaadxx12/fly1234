import React, { useState, useMemo, useEffect } from 'react';
import AttendanceReportTable from './components/AttendanceReportTable';
import { clearAllAttendanceRecords } from '../../lib/collections/attendance';
import { Trash2, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import ModernModal from '../../components/ModernModal';
import { getAllAttendanceRecords } from '../../lib/collections/attendance';
import { getDepartments, Department } from '../../lib/collections/departments';
import { getEmployees, Employee } from '../../lib/collections/employees';
import { AttendanceRecord } from '../Attendance/types';
import { getShiftTimings } from '../../utils/helpers';
import { getAllLeaves } from '../../lib/collections/leaves';
import { LeaveRequest } from '../Leaves/types';
import * as XLSX from 'xlsx';

const AttendanceReportsContent: React.FC = () => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { showNotification } = useNotification();
  const [refreshKey, setRefreshKey] = useState(0);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [recordsData, employeesData, departmentsData, leavesData] = await Promise.all([
          getAllAttendanceRecords(),
          getEmployees(),
          getDepartments(),
          getAllLeaves()
        ]);
        setRecords(recordsData);
        setEmployees(employeesData);
        setDepartments(departmentsData);
        setLeaves(leavesData || []);
      } catch (err) {
        setError('فشل في تحميل البيانات');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const enrichedRecords = useMemo(() => {
    return records.map(record => {
      const employee = employees.find(e => e.id === record.employeeId);
      const department = departments.find(d => d.id === employee?.departmentId);

      if (!employee || !department) {
        return {
          ...record,
          lateMinutes: 0,
          overtimeMinutes: 0,
          netPoints: 0,
          salaryDeductionDays: 0,
          isAbsent: false
        };
      }

      const shiftTimings = getShiftTimings(employee);
      const isExempt = employee.id ? department.exemptEmployeeIds?.includes(employee.id) : false;
      const recordDate = record.checkInTime.toISOString().split('T')[0];

      // Check for approved leaves on this day
      const dayLeaves = leaves.filter(l =>
        l.employeeId === record.employeeId &&
        l.status === 'approved' &&
        (
          (l.type === 'full_day' && l.startDate && l.endDate &&
            record.checkInTime >= l.startDate && record.checkInTime <= l.endDate) ||
          (l.type === 'time' && l.date && l.date.toISOString().split('T')[0] === recordDate)
        )
      );

      const hasFullDayLeave = dayLeaves.some(l => l.type === 'full_day');
      const hasTimeLeave = dayLeaves.some(l => l.type === 'time');

      let lateMinutes = 0;
      if (!isExempt && !hasTimeLeave && shiftTimings.start && record.checkInTime > shiftTimings.start) {
        const rawLateMinutes = Math.round((record.checkInTime.getTime() - shiftTimings.start.getTime()) / 60000);
        const gracePeriod = department.attendanceGracePeriod || 0;
        lateMinutes = Math.max(0, rawLateMinutes - gracePeriod);
      }

      let overtimeMinutes = 0;
      if (record.checkOutTime && shiftTimings.end && record.checkOutTime > shiftTimings.end) {
        overtimeMinutes = Math.round((record.checkOutTime.getTime() - shiftTimings.end.getTime()) / 60000);
      }

      // Absence policy: exceeding limit or full-day leave
      // Full-day leave = 1 day salary deduction, 0 points impact
      // Lateness > absence limit = 1 day salary deduction, points might still apply or not
      const absenceLimit = department.absenceLimitMinutes || 480; // Default to 8 hours if not set
      const isLateAbsent = lateMinutes > absenceLimit;
      const isAbsent = isLateAbsent || hasFullDayLeave;

      let salaryDeductionDays = 0;
      if (hasFullDayLeave) salaryDeductionDays = 1;
      else if (isLateAbsent) salaryDeductionDays = 1;

      const overtimePoints = overtimeMinutes * (department.overtimePointsPerMinute || 0);
      // If absent, maybe points shouldn't be deducted further? Or they should. Let's stick to points for lateness unless absent.
      const lateDeductionPoints = (isExempt || hasTimeLeave || hasFullDayLeave) ? 0 : lateMinutes * (department.lateDeductionPointsPerMinute || 0);
      const netPoints = overtimePoints - lateDeductionPoints;

      return {
        ...record,
        lateMinutes: (isExempt || hasTimeLeave) ? 0 : lateMinutes,
        overtimeMinutes,
        netPoints,
        salaryDeductionDays,
        isAbsent,
        hasFullDayLeave,
        hasTimeLeave
      };
    });
  }, [records, employees, departments, leaves]);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await clearAllAttendanceRecords();
      showNotification('success', 'نجاح', 'تم تفريغ سجل الحضور بنجاح');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      showNotification('error', 'خطأ', 'فشل في تفريغ سجل الحضور');
      console.error(error);
    } finally {
      setIsClearing(false);
      setIsClearModalOpen(false);
    }
  };

  const handleExportToExcel = () => {
    const dataToExport = enrichedRecords.map(record => ({
      'الموظف': record.employeeName,
      'الفرع': record.branchName,
      'وقت الحضور': record.checkInTime.toLocaleString('ar-EG'),
      'وقت الانصراف': record.checkOutTime ? record.checkOutTime.toLocaleString('ar-EG') : 'لم يسجل خروج',
      'وقت التأخير (د)': record.lateMinutes,
      'وقت إضافي (د)': record.overtimeMinutes,
      'بخصم راتب (يوم)': record.salaryDeductionDays,
      'الحالة': record.isAbsent ? 'غائب/متأخر' : 'حاضر',
      'صافي النقاط': record.netPoints.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقارير الحضور");

    const wscols = [
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, "AttendanceReports.xlsx");
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            تقارير الحضور
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold">عرض سجلات الحضور والانصراف ومتابعة الالتزام</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
          >
            <Download className="w-5 h-5" />
            <span>تصدير</span>
          </button>
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl font-black shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-all"
          >
            <Trash2 className="w-5 h-5" />
            <span>تفريغ</span>
          </button>
        </div>
      </div>
      <AttendanceReportTable records={enrichedRecords} loading={loading} error={error} />

      <ModernModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="تأكيد تفريغ السجل"
        icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
        iconColor="red"
      >
        <p className="text-gray-600 dark:text-gray-300">
          هل أنت متأكد من رغبتك في تفريغ سجل الحضور بالكامل؟ سيتم حذف جميع سجلات الحضور والانصراف نهائياً. هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsClearModalOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg"
          >
            إلغاء
          </button>
          <button
            onClick={handleClearHistory}
            disabled={isClearing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:bg-red-400"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isClearing ? 'جاري الحذف...' : 'نعم، قم بالحذف'}
          </button>
        </div>
      </ModernModal>
    </div>
  );
};

export default AttendanceReportsContent;


