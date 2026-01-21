import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, arrayRemove } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject } from "firebase/storage";

interface PermissionGroup {
  id: string;
  name: string;
  permissions: Record<string, string[] | boolean>;
}

export interface EmployeeFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface Employee {
  id?: string;
  userId: string; // Firebase Auth UID
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role: string; // Permission group ID
  permission_group?: PermissionGroup;
  salary: number;
  startDate: Date;
  isActive: boolean;
  departmentId?: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
  profitSettings?: {
    enableChangeProfit: boolean;
    enableIssuanceProfit: boolean;
  };
  files?: EmployeeFile[];
  shift?: 'morning' | 'evening' | 'night';
  startTime?: string;
  endTime?: string;
  biometricsEnabled?: boolean;
  biometricCredentialId?: string;
  password?: string;
}

const COLLECTION_NAME = 'employees';

const employeesCollection = collection(db, COLLECTION_NAME);

export const getEmployeeByUserId = async (userId: string) => {
  try {
    const q = query(employeesCollection, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const employeeDoc = snapshot.docs[0];
    const employeeData = employeeDoc.data();

    // Only attempt to fetch permission group if role exists
    let permissionGroup: PermissionGroup | undefined;
    if (employeeData.role) {
      try {
        const permissionGroupRef = doc(db, 'permissions', employeeData.role);
        const permissionGroupSnap = await getDoc(permissionGroupRef);

        if (permissionGroupSnap.exists()) {
          permissionGroup = {
            id: permissionGroupSnap.id,
            ...permissionGroupSnap.data()
          } as PermissionGroup;
        } else {
          console.warn(`Permission group ${employeeData.role} not found for employee ${employeeDoc.id}`);
        }
      } catch (error) {
        console.error('Error fetching permission group:', error);
      }
    }

    let imageUrl = employeeData.image;
    if (!imageUrl && employeeData.files && Array.isArray(employeeData.files)) {
      const profilePicFile = employeeData.files.find((file: any) => file.name === 'صورة شخصية');
      if (profilePicFile) {
        imageUrl = profilePicFile.url;
      }
    }

    const employee = {
      id: employeeDoc.id,
      ...employeeData,
      image: imageUrl,
      permission_group: permissionGroup
    } as Employee;

    return employee;
  } catch (error) {
    console.error('Error getting employee by user ID:', error);
    throw error;
  }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'permission_group'>) => {
  try {
    const docRef = await addDoc(employeesCollection, {
      ...employeeData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
};


export const getEmployees = async () => {
  try {
    const snapshot = await getDocs(employeesCollection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];
  } catch (error) {
    console.error('Error getting employees:', error);
    throw error;
  }
};

export const updateEmployee = async (id: string, data: Partial<Employee>) => {
  try {
    const employeeRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(employeeRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

export const deleteEmployeeFile = async (employeeId: string, fileId: string) => {
  const employeeRef = doc(db, 'employees', employeeId);
  const employeeDoc = await getDoc(employeeRef);

  if (!employeeDoc.exists()) {
    throw new Error("Employee not found");
  }

  const employeeData = employeeDoc.data() as Employee;
  const fileToDelete = employeeData.files?.find(f => f.id === fileId);

  if (!fileToDelete) {
    console.warn("File not found in employee document.");
    return;
  }

  try {
    // 1. Delete from Storage if URL is valid
    if (fileToDelete.url && fileToDelete.url.includes('firebasestorage.googleapis.com')) {
      const fileRef = ref(storage, fileToDelete.url);
      await deleteObject(fileRef);
    }

    // 2. Delete from Firestore
    await updateDoc(employeeRef, {
      files: arrayRemove(fileToDelete)
    });
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File not found in Storage, but removing from Firestore anyway.');
      await updateDoc(employeeRef, {
        files: arrayRemove(fileToDelete)
      });
    } else {
      console.error("Error deleting file: ", error);
      throw error;
    }
  }
};

export const deleteEmployee = async (id: string) => {
  try {
    const employeeRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(employeeRef);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

export const getEmployeesByRole = async (role: string) => {
  try {
    const q = query(employeesCollection, where("role", "==", role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];
  } catch (error) {
    console.error('Error getting employees by role:', error);
    throw error;
  }
};

export const getActiveEmployees = async () => {
  try {
    const q = query(employeesCollection, where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Employee[];
  } catch (error) {
    console.error('Error getting active employees:', error);
    throw error;
  }
};
