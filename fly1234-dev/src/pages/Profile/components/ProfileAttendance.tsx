import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { AttendanceRecord } from '../../Attendance/types';
import { useTheme } from '../../../contexts/ThemeContext';
import { Calendar } from 'lucide-react';


interface ProfileAttendanceProps {
  employeeId: string;
}

const ProfileAttendance: React.FC<ProfileAttendanceProps> = ({ employeeId }) => {
  const { theme } = useTheme();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;

    setLoading(true);
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employeeId),
      orderBy('checkInTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkInTime: data.checkInTime.toDate(),
          checkOutTime: data.checkOutTime ? data.checkOutTime.toDate() : null,
        } as AttendanceRecord;
      });
      setRecords(recordsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [employeeId]);

  return (
    <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : records.length > 0 ? (
          records.map(record => (
            <div key={record.id} className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {record.checkInTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>دخول: {record.checkInTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {record.checkOutTime && (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>خروج: {record.checkOutTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-full p-12 rounded-3xl border-2 border-dashed flex flex-col items-center gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'
            }`}>
            <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-bold">لا يوجد سجل حضور مسجل</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileAttendance;
