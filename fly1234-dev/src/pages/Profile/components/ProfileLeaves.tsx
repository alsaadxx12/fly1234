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
        <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                طلبات الإجازة
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {loading ? (
                    <p className="text-center py-4">جاري التحميل...</p>
                ) : leaves.length > 0 ? (
                    leaves.map(leave => (
                        <div key={leave.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(leave.status)}`}>
                                            {getStatusText(leave.status)}
                                        </span>
                                        <span className="text-[10px] opacity-60">
                                            {leave.type === 'full_day' ? 'إجازة كاملة' : 'إجازة زمنية'}
                                        </span>
                                    </div>
                                    <div className="text-sm font-bold">
                                        {leave.type === 'full_day' ? (
                                            `${leave.startDate?.toLocaleDateString('ar-EG')} - ${leave.endDate?.toLocaleDateString('ar-EG')}`
                                        ) : (
                                            `${leave.date?.toLocaleDateString('ar-EG')} (${leave.startTime} - ${leave.endTime})`
                                        )}
                                    </div>
                                </div>
                                {getStatusIcon(leave.status)}
                            </div>
                            <p className="text-xs opacity-70 line-clamp-2">{leave.reason}</p>
                            {leave.status === 'rejected' && leave.rejectionReason && (
                                <div className="mt-2 p-2 rounded bg-red-500/5 text-[10px] text-red-500 border border-red-500/10">
                                    سبب الرفض: {leave.rejectionReason}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">لا توجد طلبات إجازة.</p>
                )}
            </div>
        </div>
    );
};

export default ProfileLeaves;
