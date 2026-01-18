import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// تعريف الواجهة للخصائص
interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  // عرض حالة التحميل
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-gray-600">جاري التحقق من تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول، قم بتوجيهه إلى صفحة تسجيل الدخول
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // إذا كان المستخدم مسجل الدخول، اعرض المحتوى المطلوب
  return children;
}