import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { addAttendanceRecord, updateAttendanceRecord } from '../../../lib/collections/attendance';
import { AttendanceRecord } from '../types';
import { Branch } from '../../Branches/types';
import { Department } from '../../../lib/collections/departments';
import { doc, getDoc, onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getShiftTimings } from '../../../utils/helpers';

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export default function useAttendance() {
  const { employee } = useAuth();
  const [latestRecord, setLatestRecord] = useState<AttendanceRecord | null>(null);
  const [assignedBranch, setAssignedBranch] = useState<Branch | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExempt, setIsExempt] = useState(false);

  useEffect(() => {
    if (!employee?.id) {
      setLoading(false);
      return;
    }

    const loadStaticData = async () => {
      setLoading(true);
      setError(null);
      try {
        const deptId = employee.departmentId || employee.department_id;

        if (deptId) {
          const departmentRef = doc(db, 'departments', deptId);
          const departmentSnap = await getDoc(departmentRef);

          if (departmentSnap.exists()) {
            const departmentData = departmentSnap.data();
            const dept = { id: departmentSnap.id, ...departmentData } as Department;
            setAssignedDepartment(dept);

            const exempt = dept.exemptEmployeeIds?.includes(employee.id) || false;
            setIsExempt(exempt);

            const branchId = departmentData.branchId || departmentData.branch_id || employee.branchId || employee.branch_id;

            if (branchId) {
              const branchRef = doc(db, 'branches', branchId);
              const branchSnap = await getDoc(branchRef);
              if (branchSnap.exists()) {
                setAssignedBranch({ id: branchSnap.id, ...branchSnap.data() } as Branch);
              } else if (!exempt) {
                setError("الفرع المرتبط بالقسم غير موجود.");
              }
            } else if (!exempt) {
              setError("القسم غير مرتبط بأي فرع.");
            }
          } else {
            setError("القسم المسجل به غير موجود.");
          }
        } else {
          setError("أنت غير مسجل في قسم. يرجى التواصل مع الإدارة.");
        }
      } catch (err) {
        console.error("Error fetching static data:", err);
        setError("فشل في تحميل بيانات القسم والفرع.");
      }
    };

    loadStaticData();

    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', employee.id),
      orderBy('checkInTime', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setLatestRecord(null);
      } else {
        const doc = snapshot.docs[0];
        const data = doc.data();
        setLatestRecord({
          id: doc.id,
          ...data,
          checkInTime: data.checkInTime.toDate(),
          checkOutTime: data.checkOutTime ? data.checkOutTime.toDate() : null,
        } as AttendanceRecord);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error with snapshot listener:", err);
      setError("فشل في تحديث حالة الحضور.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [employee?.id]);


  const checkIn = useCallback(async (): Promise<void> => {
    if (!employee?.id) {
      setError("الموظف غير معروف.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!assignedDepartment) {
        throw new Error("بيانات القسم غير متوفرة. لا يمكن تسجيل الحضور.");
      }

      if (!isExempt) {
        // Check time before location for better user experience
        const shiftTimings = getShiftTimings(employee);
        const gracePeriod = assignedDepartment.attendanceGracePeriod || 0; // in minutes
        const checkinDeadline = new Date(shiftTimings.start.getTime() + gracePeriod * 60000);
        const now = new Date();

        if (now > checkinDeadline) {
          throw new Error(
            `لقد تجاوزت فترة السماح (${gracePeriod} دقيقة). لا يمكنك تسجيل الحضور الآن.`
          );
        }

        if (!assignedBranch) {
          throw new Error("لا يمكنك تسجيل الحضور: القسم غير مرتبط بفرع.");
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        const { latitude, longitude } = position.coords;
        const distance = getDistance(
          latitude,
          longitude,
          assignedBranch.location.latitude,
          assignedBranch.location.longitude
        );

        if (distance > assignedBranch.radius) {
          throw new Error(
            `أنت خارج النطاق المسموح به لفرع "${assignedBranch.name}". المسافة الحالية: ${Math.round(distance)} متر.`
          );
        }
      }

      const newRecord = {
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: assignedBranch?.id || 'N/A',
        branchName: assignedBranch?.name || 'معفي',
        checkInTime: new Date(),
      };

      await addAttendanceRecord(newRecord);
      // The onSnapshot listener will handle UI updates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الحضور');
    } finally {
      setLoading(false);
    }
  }, [employee, assignedBranch, assignedDepartment, isExempt]);

  const checkOut = useCallback(async (): Promise<void> => {
    if (!latestRecord || latestRecord.status === 'checked-out') {
      setError("لم يتم العثور على تسجيل دخول نشط");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateAttendanceRecord(latestRecord.id, new Date());
      // The onSnapshot listener will handle UI updates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  }, [latestRecord]);

  return {
    latestRecord,
    loading,
    error,
    checkIn,
    checkOut,
    assignedBranch,
    assignedDepartment,
    isExempt,
  };
}
