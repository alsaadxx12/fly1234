import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requiredPermissions: {
    page: string;
    actions: string[];
  };
}

export default function PermissionGuard({ children, requiredPermissions }: Props) {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const location = useLocation();
  const { employee, checkPermission, permissionLoading } = useAuth();

  React.useEffect(() => {
    const checkPermissions = async () => {
      console.log("PermissionGuard: Checking permissions for:", requiredPermissions);
      try {
        if (!employee) {
          console.log("PermissionGuard: No employee found, denying access");
          setHasPermission(false);
          setError("لم يتم العثور على بيانات الموظف");
          return;
        }

        // Check if employee has permission group
        if (!employee.permission_group) {
          console.log("PermissionGuard: Employee has no permission group, denying access");
          setHasPermission(false);
          setError("لم يتم تعيين مجموعة صلاحيات لهذا الحساب");
          return;
        }

        // Use the checkPermission function from AuthContext
        const hasRequiredPermission = checkPermission(requiredPermissions.page, requiredPermissions.actions[0]);
        console.log(`PermissionGuard: Permission check result for ${requiredPermissions.page}:${requiredPermissions.actions[0]} = ${hasRequiredPermission}`);

        if (hasRequiredPermission) {
          console.log("PermissionGuard: User has required permission, granting access");
          setHasPermission(true);
          return;
        }
        console.log("PermissionGuard: User does not have required permission, denying access");
        setHasPermission(false);
        setError("ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة");
      } catch (error) {
        console.error('PermissionGuard: Error checking permissions:', error);
        setHasPermission(false);
        setError("حدث خطأ أثناء التحقق من الصلاحيات");
      }
    };

    if (!permissionLoading) {
      checkPermissions();
    }
  }, [requiredPermissions, employee, checkPermission, permissionLoading]);

  if (permissionLoading || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    console.log("Permission denied, redirecting to dashboard");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <Shield className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            {error || "ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة"}
          </p>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700 text-right">
              إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مدير النظام للتحقق من صلاحياتك.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  console.log("Permission granted, rendering children");
  return children;
}
