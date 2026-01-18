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
    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="w-5 h-5"/>سجل الحضور</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p>جاري التحميل...</p> : records.length > 0 ? (
          records.map(record => (
            <div key={record.id} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold">{record.checkInTime.toLocaleDateString('ar-EG')}</span>
                <div>
                  <span className="text-green-500">حضور: {record.checkInTime.toLocaleTimeString('ar-EG')}</span>
                  {record.checkOutTime && <span className="text-red-500 ml-4">انصراف: {record.checkOutTime.toLocaleTimeString('ar-EG')}</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">لا يوجد سجل حضور.</p>
        )}
      </div>
    </div>
  );
}

export default ProfileAttendance;
