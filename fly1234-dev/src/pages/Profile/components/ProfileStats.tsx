import React, { useState, useEffect } from 'react';
import { Employee } from '../../../lib/collections/employees';
import { Department } from '../../../lib/collections/departments';
import { getShiftTimings } from '../../../utils/helpers';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useTheme } from '../../../contexts/ThemeContext';
import { Award, TrendingDown, DollarSign } from 'lucide-react';

interface ProfileStatsProps {
    employee: Employee;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ employee }) => {
    const { theme } = useTheme();
    const [stats, setStats] = useState({ points: 0, deductions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateStats = async () => {
            if (!employee?.id || !employee.departmentId) {
                setLoading(false);
                return;
            }

            try {
                const departmentRef = doc(db, 'departments', employee.departmentId);
                const departmentSnap = await getDoc(departmentRef);
                if (!departmentSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const department = departmentSnap.data() as Department;

                const leavesRef = collection(db, 'leaves');
                const leavesQ = query(leavesRef, where('employeeId', '==', employee.id), where('status', '==', 'approved'));
                const leavesSnapshot = await getDocs(leavesQ);
                const approvedLeaves = leavesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        startDate: data.startDate?.toDate(),
                        endDate: data.endDate?.toDate(),
                        date: data.date?.toDate()
                    } as any;
                });

                const recordsRef = collection(db, 'attendance');
                const q = query(recordsRef, where('employeeId', '==', employee.id));
                const recordsSnapshot = await getDocs(q);
                const records = recordsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        checkInTime: data.checkInTime.toDate(),
                        checkOutTime: data.checkOutTime?.toDate()
                    } as any;
                });

                let points = 0;
                let salaryDeductionDays = 0;
                const shiftTimings = getShiftTimings(employee);
                const isExempt = department.exemptEmployeeIds?.includes(employee.id);

                // Count full-day leaves as deductions
                approvedLeaves.forEach(leave => {
                    if (leave.type === 'full_day') {
                        salaryDeductionDays += 1;
                    }
                });

                records.forEach(record => {
                    const recordDateStr = record.checkInTime.toISOString().split('T')[0];
                    const hasTimeLeave = approvedLeaves.some(l =>
                        l.type === 'time' && l.date?.toISOString().split('T')[0] === recordDateStr
                    );

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

                    // Check for late-absence
                    const absenceLimit = department.absenceLimitMinutes || 480;
                    if (lateMinutes > absenceLimit) {
                        salaryDeductionDays += 1;
                    }

                    const overtimePoints = overtimeMinutes * (department.overtimePointsPerMinute || 0);
                    const lateDeductionPoints = (isExempt || hasTimeLeave) ? 0 : lateMinutes * (department.lateDeductionPointsPerMinute || 0);
                    points += overtimePoints - lateDeductionPoints;
                });

                setStats({ points, deductions: salaryDeductionDays });
            } catch (err) {
                console.error("Error calculating stats:", err);
            } finally {
                setLoading(false);
            }
        };

        calculateStats();
    }, [employee]);

    if (loading) {
        return <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />;
    }

    const pointsInIQD = stats.points * 1000;
    const salaryPerDay = (employee.salary || 0) / 30;
    const totalSalaryDeduction = stats.deductions * salaryPerDay;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Award className="w-6 h-6 text-blue-500" /></div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">إجمالي النقاط</h4>
                        <p className="text-2xl font-bold">{stats.points.toFixed(0)}</p>
                    </div>
                </div>
            </div>
            <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><DollarSign className="w-6 h-6 text-green-500" /></div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">قيمة النقاط (IQD)</h4>
                        <p className="text-2xl font-bold">{pointsInIQD.toLocaleString()} د.ع</p>
                    </div>
                </div>
            </div>
            <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg"><TrendingDown className="w-6 h-6 text-red-500" /></div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400">خصومات الراتب (نقد)</h4>
                        <p className="text-2xl font-bold">{totalSalaryDeduction.toLocaleString()} د.ع</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileStats;
