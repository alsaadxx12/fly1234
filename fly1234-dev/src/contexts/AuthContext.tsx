import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getEmployeeByUserId, updateEmployee } from '../lib/collections/employees';

interface AuthContextType {
  user: any;
  employee: any;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateEmployeeProfile: (employeeId: string, data: Partial<any>) => Promise<void>;
  checkPermission: (page: string, action: string) => boolean;
  permissionLoading: boolean; // Add this
  currentUser: User | null; // Add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  // Check if employee has permission to login
  const checkEmployeePermissions = (employeeData: any) => {
    // First check if employee data exists
    if (!employeeData) {
      console.log('No employee data found');
      throw new Error('لم يتم العثور على بيانات الموظف');
    }

    // Check if permission_group exists
    if (!employeeData.permission_group) {
      console.log('No permission group assigned to employee');
      console.warn('لم يتم تعيين مجموعة صلاحيات لهذا الحساب');
      return true; // Allow login even without permission group
    }

    // Check if permissions object exists
    if (!employeeData.permission_group.permissions) {
      console.log('No permissions object found in permission group');
      console.warn('لم يتم تعيين صلاحيات لهذا الحساب');
      return true; // Allow login even without permissions object
    }

    // Check if permission_group has isAdmin flag
    if (employeeData.permission_group.permissions?.isAdmin === true) {
      console.log('User is admin, allowing access');
      return true;
    }

    // For non-admin users, check specific permissions
    const permissions = employeeData.permission_group.permissions;

    // Allow login if the employee has any permission at all
    let hasAnyPermission = false;

    // Check all permission keys
    for (const key in permissions) {
      if (key === 'isAdmin') continue; // Skip isAdmin check as it was done above

      const value = permissions[key];
      if (Array.isArray(value) && value.length > 0) {
        console.log(`User has permissions for ${key}:`, value);
        hasAnyPermission = true;
        break;
      }
    }

    if (!hasAnyPermission) {
      console.log('Employee has no specific permissions, but allowing login');
      console.warn('الموظف ليس لديه أي صلاحيات محددة، ولكن سيتم السماح بالدخول');
      return true; // Allow login even without specific permissions
    }

    return true;
  };

  const handleAuthStateChange = async (user: User | null) => {
    setLoading(true);
    setPermissionLoading(true);
    setCurrentUser(user);

    // If a user is creating another user, don't change the current admin's state.
    const isCreatingUser = localStorage.getItem('isCreatingUser') === 'true';
    if (isCreatingUser && employee) {
      setLoading(false);
      setPermissionLoading(false);
      return;
    }

    if (user) {
      try {
        const employeeData = await getEmployeeByUserId(user.uid);

        if (!employeeData) {
          // This path can be hit if the employee document is not yet created.
          // We will not immediately sign out, especially during registration.
          // If a non-admin tries to log in without an employee doc, other checks will prevent access.
          console.warn(`No employee document found for user UID: ${user.uid}`);
          // Don't sign out immediately. Let other logic handle it.
        }

        if (employeeData && !employeeData.isActive) {
          await signOut();
          setUser(null);
          setEmployee(null);
          setError('تم تعطيل حسابك. يرجى التواصل مع المسؤول');
          return;
        }

        if (employeeData) {
          try {
            checkEmployeePermissions(employeeData);
            setUser(user);
            setEmployee(employeeData);
          } catch (permError) {
            await signOut();
            setUser(null);
            setEmployee(null);
            setError(permError instanceof Error ? permError.message : 'خطأ في الصلاحيات');
            return;
          }
        } else {
          // If no employeeData and it's not a new user registration flow,
          // it's likely an invalid login. We clear the state but avoid a full sign-out loop.
          setUser(user); // Keep user object to avoid login loops, but no employee data
          setEmployee(null);
        }

      } catch (error) {
        console.error('Error in auth state change:', error);
        await signOut();
        setUser(null);
        setEmployee(null);
        setError('حدث خطأ أثناء التحقق من بيانات الموظف');
      } finally {
        setAuthInitialized(true);
        setPermissionLoading(false);
      }
    } else {
      setUser(null);
      setEmployee(null);
      setAuthInitialized(true);
      setPermissionLoading(false);
    }
    setLoading(false);
  };


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    // تأكد من أن الجلسة محفوظة دائمًا
    setPersistence(auth, browserLocalPersistence)
      .catch(error => {
        console.error("Error setting persistence:", error);
      });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // Validate inputs
      if (!email || !password) {
        throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      }

      // Set persistence to LOCAL to keep the user logged in
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check employee status and permissions
      const employeeData = await getEmployeeByUserId(userCredential.user.uid);
      if (!employeeData) {
        await firebaseSignOut(auth);
        throw new Error('لم يتم العثور على بيانات الموظف');
      }

      if (!employeeData.isActive) {
        await firebaseSignOut(auth);
        throw new Error('تم تعطيل حسابك. يرجى التواصل مع المسؤول');
      }

      // Check permissions
      try {
        checkEmployeePermissions(employeeData);
      } catch (permError) {
        await firebaseSignOut(auth);
        throw permError;
      }

      setUser(userCredential.user);
      setEmployee(employeeData);

      // Get the redirect path from location state or default to the standalone attendance page
      const from = (location as any).state?.from?.pathname || '/attendance-standalone';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Error signing in:', error);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';

      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          errorMessage = 'البريد الإلكتروني غير مسجل';
        } else if (error.message.includes('wrong-password')) {
          errorMessage = 'كلمة المرور غير صحيحة';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = 'البريد الإلكتروني غير صالح';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Sign out from Firebase first
      await firebaseSignOut(auth);

      // Clear state
      setUser(null);
      setEmployee(null);
      setError(null);

      // Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeProfile = async (employeeId: string, data: Partial<any>) => {
    try {
      if (!employeeId) throw new Error('Employee ID is required');

      // Update employee in Firestore
      await updateEmployee(employeeId, data);

      // Update local state
      setEmployee((prev: any) => {
        if (!prev) return null;
        return { ...prev, ...data };
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Error updating employee profile:', error);
      return Promise.reject(error);
    }
  };

  // Function to check if the current employee has a specific permission
  const checkPermission = (page: string, action: string): boolean => {
    if (!employee) return false;

    // Check if employee has permission group
    if (!employee.permission_group) return false;

    const permissions = employee.permission_group.permissions;

    // Admin has access to everything
    if (permissions?.isAdmin === true) return true;

    // Define mapping between English and Arabic page names
    const pageNameMap: Record<string, string> = {
      'accounts': 'الحسابات',
      'الحسابات': 'accounts',
      'companies': 'الشركات',
      'الشركات': 'companies',
      'employees': 'الموظفين',
      'الموظفين': 'employees',
      'safes': 'الصناديق',
      'الصناديق': 'safes',
      'announcements': 'اعلان',
      'اعلان': 'announcements',
      'reports': 'التبليغات',
      'التبليغات': 'reports',
      'settings': 'الاعدادات',
      'الاعدادات': 'settings',
      'dashboard': 'لوحة التحكم',
      'لوحة التحكم': 'dashboard',
      'tickets': 'التذاكر',
      'التذاكر': 'tickets',
      'audit': 'التدقيق',
      'التدقيق': 'audit',
      'balances': 'الأرصدة',
      'الأرصدة': 'balances',
      'api': 'API',
      'API': 'api',
      'profits': 'الأرباح',
      'الأرباح': 'profits',
      'pending-issues': 'المشاكل المعلقة',
      'المشاكل المعلقة': 'pending-issues',
      'mastercard-issues': 'مشاكل بوابة الماستر',
      'مشاكل بوابة الماستر': 'mastercard-issues',
      'attendance': 'تسجيل الحضور',
      'تسجيل الحضور': 'attendance',
      'attendance-reports': 'تقارير الحضور',
      'تقارير الحضور': 'attendance-reports',
      'branches': 'الفروع',
      'الفروع': 'branches',
      'leaves': 'الإجازات',
      'الإجازات': 'leaves',
    };

    // Check both the English and Arabic page names
    let pagePermissions: string[] = [];
    const alternatePageName = pageNameMap[page];

    // Check primary page name
    if (Array.isArray(permissions?.[page])) {
      pagePermissions = permissions[page] as string[];
    }
    // Check alternate page name if available
    else if (alternatePageName && Array.isArray(permissions?.[alternatePageName])) {
      pagePermissions = permissions[alternatePageName] as string[];
    }

    // Special case for 'read' action - map it to 'view' permission
    if (action === 'read' && pagePermissions.includes('view')) {
      return true;
    }

    return pagePermissions.includes(action);
  };

  const value = {
    user,
    employee,
    loading: loading || !authInitialized,
    permissionLoading,
    currentUser,
    error,
    signIn,
    signOut,
    updateEmployeeProfile,
    checkPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
