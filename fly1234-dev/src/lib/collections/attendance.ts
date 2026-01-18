import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, Timestamp, getDoc, limit, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { AttendanceRecord, AttendanceStatus } from '../../pages/Attendance/types';

const ATTENDANCE_COLLECTION = 'attendance';

// Add a new attendance record (check-in)
export const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'checkOutTime' | 'status'>): Promise<string> => {
  try {
    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const docRef = await addDoc(attendanceRef, {
      ...record,
      status: 'checked-in',
      checkOutTime: null,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding attendance record:', error);
    throw new Error('Failed to add attendance record');
  }
};

// Update an attendance record (check-out)
export const updateAttendanceRecord = async (recordId: string, checkOutTime: Date): Promise<void> => {
  try {
    const recordRef = doc(db, ATTENDANCE_COLLECTION, recordId);
    await updateDoc(recordRef, {
      checkOutTime: Timestamp.fromDate(checkOutTime),
      status: 'checked-out',
    });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    throw new Error('Failed to update attendance record');
  }
};

// Get the latest attendance record for an employee
export const getLatestAttendanceRecord = async (employeeId: string): Promise<AttendanceRecord | null> => {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('employeeId', '==', employeeId),
      orderBy('checkInTime', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      checkInTime: data.checkInTime.toDate(),
      checkOutTime: data.checkOutTime ? data.checkOutTime.toDate() : null,
    } as AttendanceRecord;
  } catch (error) {
    console.error('Error getting latest attendance record:', error);
    throw error;
  }
};

// Get all attendance records
export const getAllAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
    try {
      const q = query(collection(db, ATTENDANCE_COLLECTION), orderBy('checkInTime', 'desc'));
      const snapshot = await getDocs(q);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkInTime: data.checkInTime.toDate(),
          checkOutTime: data.checkOutTime ? data.checkOutTime.toDate() : null,
        } as AttendanceRecord;
      });
      
      return records;
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      throw error;
    }
};

export const clearAllAttendanceRecords = async (): Promise<void> => {
  try {
    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const snapshot = await getDocs(attendanceRef);
    
    if (snapshot.empty) {
      console.log('No attendance records to delete.');
      return;
    }
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Successfully deleted ${snapshot.size} attendance records.`);
  } catch (error) {
    console.error('Error clearing attendance records:', error);
    throw new Error('Failed to clear attendance records');
  }
};
