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
            <div className={`group p-8 rounded-[32px] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
                }`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-blue-500/10 rounded-2xl shadow-lg ring-4 ring-blue-500/5 group-hover:scale-110 transition-transform">
                        <Award className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي النقاط</h4>
                        <p className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.points.toFixed(0)}</p>
                    </div>
                </div>
            </div>

            <div className={`group p-8 rounded-[32px] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
                }`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl shadow-lg ring-4 ring-emerald-500/5 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">قيمة النقاط المتوقعة</h4>
                        <p className={`text-3xl font-black ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{pointsInIQD.toLocaleString()} <span className="text-sm">د.ع</span></p>
                    </div>
                </div>
            </div>

            <div className={`group p-8 rounded-[32px] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
                }`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-rose-500/10 rounded-2xl shadow-lg ring-4 ring-rose-500/5 group-hover:scale-110 transition-transform">
                        <TrendingDown className="w-8 h-8 text-rose-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">خصومات الراتب</h4>
                        <p className={`text-3xl font-black ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{totalSalaryDeduction.toLocaleString()} <span className="text-sm">د.ع</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileStats;
