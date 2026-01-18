import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  isActive: boolean;
  userId?: string;
  shift?: 'morning' | 'evening' | 'night';
  createdAt: Date;
  image?: string;
}

export interface EmployeeWithPermissionGroup extends Employee {
  permissionGroupName?: string;
}

export interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  salary: number;
  shift: 'morning' | 'evening' | 'night';
  permissionGroupId: string;
  safeId: string;
}

export default function useEmployees(searchQuery: string, filterRole: string) {
  const { employee } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithPermissionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all permission groups
        const permissionsRef = collection(db, 'permissions');
        const permissionsSnapshot = await getDocs(permissionsRef);
        const permissionGroups = new Map(
          permissionsSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        // Fetch all employees
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, orderBy('name', 'asc'));
        const employeesSnapshot = await getDocs(q);

        const employeesData = employeesSnapshot.docs.map(doc => {
          const data = doc.data() as Employee;
          return {
            ...data,
            id: doc.id,
            permissionGroupName: permissionGroups.get(data.role) || 'غير محدد'
          };
        });

        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching employees:', error);
        setError('فشل في تحميل الموظفين');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    let result = [...employees];
    
    // Apply role filter
    if (filterRole !== 'all') {
      result = result.filter(employee => employee.role === filterRole);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(employee =>
        employee.name.toLowerCase().includes(query) ||
        (employee.email && employee.email.toLowerCase().includes(query)) ||
        (employee.permissionGroupName && employee.permissionGroupName.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [employees, searchQuery, filterRole]);

  return {
    employees: filteredEmployees,
    isLoading,
    error,
    // Add other functions if needed
  };
}
