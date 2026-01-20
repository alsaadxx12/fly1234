import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface Department {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  createdAt: Date;
  branchId?: string;
  branchName?: string;
  incentive?: number;
  foodAllowance?: number;
  overtimePointsPerMinute?: number;
  lateDeductionPointsPerMinute?: number;
  salaryIncrementAmount?: number;
  salaryIncrementPeriodMonths?: number;
  attendanceGracePeriod?: number;
  absenceLimitMinutes?: number;
  exemptEmployeeIds?: string[];
}

const DEPARTMENTS_COLLECTION = 'departments';

export const addDepartment = async (departmentData: Omit<Department, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, DEPARTMENTS_COLLECTION), {
      ...departmentData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding department:', error);
    throw new Error('Failed to add department');
  }
};

export const getDepartments = async (): Promise<Department[]> => {
  try {
    const q = query(collection(db, DEPARTMENTS_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Department));
  } catch (error) {
    console.error('Error getting departments:', error);
    throw new Error('Failed to get departments');
  }
};

export const updateDepartment = async (departmentId: string, updates: Partial<Omit<Department, 'id'>>): Promise<void> => {
  try {
    const departmentRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await updateDoc(departmentRef, updates);
  } catch (error) {
    console.error('Error updating department:', error);
    throw new Error('Failed to update department');
  }
};

export const deleteDepartment = async (departmentId: string): Promise<void> => {
  try {
    const departmentRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await deleteDoc(departmentRef);
  } catch (error) {
    console.error('Error deleting department:', error);
    throw new Error('Failed to delete department');
  }
};
