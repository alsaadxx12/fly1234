import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LeaveRequest } from '../../Leaves/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { ClipboardList, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface ProfileLeavesProps {
    employeeId: string;
}

const ProfileLeaves: React.FC<ProfileLeavesProps> = ({ employeeId }) => {
    const { theme } = useTheme();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!employeeId) return;

        setLoading(true);
        const q = query(
            collection(db, 'leaves'),
            where('employeeId', '==', employeeId),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leavesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    submittedAt: (data.submittedAt as Timestamp).toDate(),
                    startDate: data.startDate ? (data.startDate as Timestamp).toDate() : undefined,
                    endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
                    date: data.date ? (data.date as Timestamp).toDate() : undefined,
                    reviewedAt: data.reviewedAt ? (data.reviewedAt as Timestamp).toDate() : undefined,
                } as LeaveRequest;
            });
            setLeaves(leavesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [employeeId]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'approved': return 'مقبولة';
            case 'rejected': return 'مرفوضة';
            default: return 'قيد الانتظار';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-500/10 text-green-500';
            case 'rejected': return 'bg-red-500/10 text-red-500';
            default: return 'bg-yellow-500/10 text-yellow-500';
        }
    };

    return (
        <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                ) : leaves.length > 0 ? (
                    leaves.map(leave => (
                        <div key={leave.id} className={`group p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                            }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${getStatusColor(leave.status)}`}>
                                        {getStatusIcon(leave.status)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest opacity-60`}>
                                                {leave.type === 'full_day' ? 'إجازة كاملة' : 'إجازة زمنية'}
                                            </span>
                                        </div>
                                        <div className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {leave.type === 'full_day' ? (
                                                `${leave.startDate?.toLocaleDateString('ar-EG')} - ${leave.endDate?.toLocaleDateString('ar-EG')}`
                                            ) : (
                                                `${leave.date?.toLocaleDateString('ar-EG')} (${leave.startTime} - ${leave.endTime})`
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${getStatusColor(leave.status)}`}>
                                    {getStatusText(leave.status)}
                                </span>
                            </div>

                            <div className={`p-3 rounded-xl text-xs leading-relaxed ${theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                                {leave.reason}
                            </div>

                            {leave.status === 'rejected' && leave.rejectionReason && (
                                <div className="mt-3 p-3 rounded-xl bg-rose-500/10 text-[10px] text-rose-500 border border-rose-500/20 font-bold">
                                    <span className="opacity-60">سبب الرفض:</span> {leave.rejectionReason}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className={`col-span-full p-12 rounded-3xl border-2 border-dashed flex flex-col items-center gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'
                        }`}>
                        <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
                            <ClipboardList className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-bold">لا توجد طلبات إجازة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileLeaves;
