import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Database, ShieldOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AccountSettingsManager from './components/AccountSettingsManager';

export default function AccountSettings() {
  const { employee } = useAuth();
  const isAdmin = employee?.permission_group?.permissions?.isAdmin === true;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto text-center">
        <div className="w-full">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-100 rounded-full">
              <ShieldOff className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">غير مصرح بالوصول</h2>
          <p className="text-gray-600 mb-6">
            ليس لديك الصلاحيات الكافية للوصول إلى إعدادات الحسابات. هذه الصفحة متاحة فقط لمدير النظام.
          </p>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 mb-6 flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700">
              يرجى التواصل مع مدير النظام للحصول على الصلاحيات المطلوبة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-gray-800">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl shadow-inner">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">إعدادات الحسابات</h3>
              <p className="text-sm text-gray-500 mt-1">تخصيص أعمدة سندات القبض والدفع</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <AccountSettingsManager />
        </div>
      </div>
    </div>
  );
}