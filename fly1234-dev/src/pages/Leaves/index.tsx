import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
    Plus,
    Clock3,
    CalendarDays,
    User,
    Activity,
    DollarSign,
    Send,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock
} from 'lucide-react';
import ArabicDatePicker from '../../components/ArabicDatePicker';
import ModernModal from '../../components/ModernModal';
import { submitLeaveRequest, getEmployeeLeaves, getAllLeaves, updateLeaveStatus } from '../../lib/collections/leaves';
import { LeaveRequest, LeaveType } from './types';
import { toast } from 'sonner';

export default function Leaves() {
    const { user, employee, checkPermission } = useAuth();
    const { theme } = useTheme();
    const { showNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<'request' | 'history' | 'manage'>('request');
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestData, setRequestData] = useState({
        type: 'full_day' as LeaveType,
        startDate: new Date(),
        endDate: new Date(),
        date: new Date(),
        startTime: '08:00',
        endTime: '16:00',
        reason: '',
        deductSalary: true
    });

    const isManager = employee?.permission_group?.permissions?.isAdmin === true ||
        employee?.permission_group?.name?.includes('مدير') ||
        employee?.permission_group?.name?.toLowerCase().includes('manager') ||
        checkPermission('leaves', 'approve');

    useEffect(() => {
        fetchLeaves();
    }, [user]);

    const fetchLeaves = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const employeeLeaves = await getEmployeeLeaves(user.uid);
            setLeaves(employeeLeaves);

            if (isManager) {
                const globalLeaves = await getAllLeaves();
                setAllLeaves(globalLeaves);
            }
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRequest = async () => {
        if (!requestData.reason) {
            toast.error('يرجى ذكر سبب الإجازة');
            return;
        }

        try {
            await submitLeaveRequest({
                employeeId: user!.uid,
                employeeName: user!.displayName || 'موظف',
                departmentId: user!.departmentId || 'general',
                departmentName: user!.departmentName || 'العامة',
                type: requestData.type,
                startDate: requestData.type === 'full_day' ? requestData.startDate : undefined,
                endDate: requestData.type === 'full_day' ? requestData.endDate : undefined,
                date: requestData.type === 'time' ? requestData.date : undefined,
                startTime: requestData.type === 'time' ? requestData.startTime : undefined,
                endTime: requestData.type === 'time' ? requestData.endTime : undefined,
                reason: requestData.reason,
                deductSalary: requestData.deductSalary
            });

            toast.success('تم إرسال طلب الإجازة بنجاح');
            setIsRequestModalOpen(false);
            fetchLeaves();

            // In a real app, we would trigger a notification to the manager here
            showNotification('info', 'طلب إجازة جديد', `تم إرسال طلب إجازة من ${user!.displayName}`);
        } catch (error) {
            console.error(error);
            toast.error('فشل في إرسال الطلب');
        }
    };

    const handleUpdateStatus = async (leaveId: string, status: 'approved' | 'rejected') => {
        try {
            await updateLeaveStatus(leaveId, status, user!.uid, user!.displayName || 'مدير');
            toast.success(status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب');
            fetchLeaves();
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحديث الحالة');
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 lg:max-w-7xl lg:mx-auto text-right" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 backdrop-blur-md shadow-xl">
                <div className="text-right">
                    <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        نظام الإجازات
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold flex items-center justify-start gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        طلب ومتابعة الإجازات الزمنية والكاملة
                    </p>
                </div>
                <button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
                >
                    <Plus className="w-5 h-5" />
                    <span>طلب إجازة جديد</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('request')}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'request' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    طلباتي
                </button>
                {isManager && (
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'manage' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        إدارة الطلبات
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(activeTab === 'request' ? leaves : allLeaves).map((leave) => (
                            <div
                                key={leave.id}
                                className={`p-5 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${leave.type === 'full_day' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        {leave.type === 'full_day' ? 'إجازة كاملة' : 'إجازة زمنية'}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-black ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                                            'bg-amber-100 text-amber-600'
                                        }`}>
                                        {leave.status === 'approved' ? 'مقبولة' :
                                            leave.status === 'rejected' ? 'مرفوضة' : 'قيد الانتظار'}
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${leave.deductSalary ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}>
                                        {leave.deductSalary ? 'خصم من الراتب' : 'بدون خصم'}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {activeTab === 'manage' && (
                                        <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                            <User className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-black text-blue-700 dark:text-blue-300">{leave.employeeName}</span>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold">التاريخ</p>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">
                                                {leave.type === 'full_day' ? (
                                                    `${new Date(leave.startDate!).toLocaleDateString('ar-EG')} - ${new Date(leave.endDate!).toLocaleDateString('ar-EG')}`
                                                ) : (
                                                    new Date(leave.date!).toLocaleDateString('ar-EG')
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {leave.type === 'time' && (
                                        <div className="flex items-start gap-3">
                                            <Clock3 className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold">الوقت</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                                    من {leave.startTime} إلى {leave.endTime}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                        <p className="text-xs text-gray-400 font-bold mb-1">السبب:</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                            {leave.reason}
                                        </p>
                                    </div>

                                    {activeTab === 'manage' && leave.status === 'pending' && (
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleUpdateStatus(leave.id, 'approved')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                موافقة
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-all"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                رفض
                                            </button>
                                        </div>
                                    )}

                                    {leave.status !== 'pending' && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-[10px] text-gray-400 font-bold">
                                                تمت المراجعة بواسطة: {leave.reviewedByName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Request Modal */}
            <ModernModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="طلب إجازة جديد"
                description="يرجى تعبئة تفاصيل الطلب بدقة للمراجعة"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl">
                        <button
                            onClick={() => setRequestData({ ...requestData, type: 'full_day' })}
                            className={`flex-1 py-3 rounded-xl font-black transition-all ${requestData.type === 'full_day' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}
                        >
                            إجازة كاملة
                        </button>
                        <button
                            onClick={() => setRequestData({ ...requestData, type: 'time' })}
                            className={`flex-1 py-3 rounded-xl font-black transition-all ${requestData.type === 'time' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}
                        >
                            إجازة زمنية
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requestData.type === 'full_day' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 mr-2">من تاريخ</label>
                                    <ArabicDatePicker value={requestData.startDate} onChange={(d) => setRequestData({ ...requestData, startDate: d || new Date() })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 mr-2">إلى تاريخ</label>
                                    <ArabicDatePicker value={requestData.endDate} onChange={(d) => setRequestData({ ...requestData, endDate: d || new Date() })} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1 col-span-full">
                                    <label className="text-xs font-black text-gray-500 mr-2">تاريخ الإجازة</label>
                                    <ArabicDatePicker value={requestData.date} onChange={(d) => setRequestData({ ...requestData, date: d || new Date() })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 mr-2">من الساعة</label>
                                    <input
                                        type="time"
                                        value={requestData.startTime}
                                        onChange={(e) => setRequestData({ ...requestData, startTime: e.target.value })}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 mr-2">إلى الساعة</label>
                                    <input
                                        type="time"
                                        value={requestData.endTime}
                                        onChange={(e) => setRequestData({ ...requestData, endTime: e.target.value })}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl font-bold"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${requestData.deductSalary ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 dark:text-white">خصم من الراتب</p>
                                <p className="text-xs text-gray-500 font-bold">تحديد إذا كانت الإجازة مدفوعة أم لا</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRequestData({ ...requestData, deductSalary: !requestData.deductSalary })}
                            className={`w-12 h-6 rounded-full transition-all relative ${requestData.deductSalary ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requestData.deductSalary ? 'right-7' : 'right-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-500 mr-2">السبب</label>
                        <textarea
                            value={requestData.reason}
                            onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold min-h-[100px] focus:border-blue-500 outline-none transition-all"
                            placeholder="اكتب سبب طلب الإجازة هنا..."
                        />
                    </div>

                    <button
                        onClick={handleSubmitRequest}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-all"
                    >
                        <Send className="w-5 h-5" />
                        إرسال الطلب
                    </button>
                </div>
            </ModernModal>
        </div>
    );
}
