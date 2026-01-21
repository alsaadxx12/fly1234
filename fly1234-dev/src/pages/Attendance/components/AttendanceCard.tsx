import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Briefcase,
  MapPin,
  Shield,
  Loader2,
  Navigation,
  User,
  History,
  LogIn,
  LogOut as LogOutIcon,
  CircleX,
  LayoutDashboard
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import useAttendance from '../hooks/useAttendance';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';


const AttendanceCard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const { employee, loading: authLoading } = useAuth();
  const {
    latestRecord,
    loading: attendanceLoading,
    error,
    checkIn,
    checkOut,
    assignedBranch,
    assignedDepartment,
    isExempt
  } = useAttendance();

  const loading = authLoading || attendanceLoading;
  const isCheckedIn = latestRecord && latestRecord.status === 'checked-in';

  const handleAction = async () => {
    if (employee?.biometricsEnabled && employee.biometricCredentialId) {
      try {
        const { verifyBiometrics } = await import('../../../utils/biometrics');
        await verifyBiometrics(employee.biometricCredentialId);
      } catch (err: any) {
        console.error('Biometric verification error:', err);
        if (err.name !== 'NotAllowedError') {
          showNotification('error', 'فشل التحقق الحيوي', 'يرجى المحاولة مرة أخرى أو التأكد من إعدادات جهازك');
        }
        return;
      }
    }

    if (isCheckedIn) {
      checkOut();
    } else {
      checkIn();
    }
  };




  if (loading && !employee) {
    return (
      <div className={`w-full max-w-md rounded-3xl p-8 flex flex-col items-center justify-center animate-pulse ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
        }`}>
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className={`w-full max-w-sm relative overflow-hidden transition-all duration-500 rounded-[2rem] shadow-2xl border ${theme === 'dark'
      ? 'bg-gray-900/80 border-gray-800 backdrop-blur-xl text-white'
      : 'bg-white border-blue-50 text-gray-900'
      }`}>
      {/* Dynamic Background Gradient */}
      <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all duration-700 ${isCheckedIn ? 'bg-rose-500' : 'bg-emerald-500'
        }`} />
      <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all duration-700 ${isCheckedIn ? 'bg-orange-500' : 'bg-blue-500'
        }`} />

      {/* Header Info */}
      <div className="relative px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105 active:scale-95"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة التحكم</span>
          </button>

          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${isCheckedIn
            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCheckedIn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            {isCheckedIn ? 'مسجل' : 'غير مسجل'}
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-20 group-hover:opacity-40 animate-pulse ${isCheckedIn ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
            <div className={`relative w-20 h-20 rounded-full p-1 border-2 transition-all duration-500 ${isCheckedIn ? 'border-rose-500/50' : 'border-emerald-500/50'
              }`}>
              <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-transparent shadow-inner">
                {employee?.image ? (
                  <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 opacity-20" />
                )}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-black mt-2 tracking-tight">{employee?.name}</h2>
          <p className="text-[10px] font-bold opacity-40 mt-0.5 max-w-[200px] truncate">{employee?.email}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative px-4 pb-4 pt-2 space-y-3">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-2xl border transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-blue-50/50 border-blue-100/50'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[9px] font-black uppercase tracking-tight opacity-50">القسم</span>
            </div>
            <p className="text-xs font-bold truncate leading-none">{assignedDepartment?.name || '---'}</p>
          </div>

          <div className={`p-3 rounded-2xl border transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-purple-50/50 border-purple-100/50'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[9px] font-black uppercase tracking-tight opacity-50">الفرع</span>
            </div>
            <p className="text-xs font-bold truncate leading-none">{assignedBranch?.name || '---'}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className={`p-3 rounded-[1.5rem] border ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-gray-50/50 border-gray-200/50'
          }`}>
          {isCheckedIn ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black opacity-40 uppercase tracking-widest mb-1">وقت تسجيل الدخول</span>
                <span className="text-xl font-black tracking-tighter">
                  {latestRecord?.checkInTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Navigation className="w-3 h-3 text-rose-500" />
                  <span className="text-[10px] font-bold opacity-60">موقع التسجيل: {latestRecord?.branchName}</span>
                </div>
              </div>
            </div>
          ) : latestRecord ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-500 border border-gray-500/20 shadow-lg shadow-gray-500/5">
                <LogOutIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-0.5">آخر تسجيل خروج</span>
                <span className="text-lg font-black tracking-tighter">
                  {latestRecord?.checkOutTime?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                <History className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black leading-tight">جاهز للعمل؟</span>
                <span className="text-[11px] font-bold opacity-50">اضغط على البصمة لتسجيل حضورك</span>
              </div>
            </div>
          )}
        </div>

        {/* Warnings / Infos */}
        {error && (
          <div className="animate-shake p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3">
            <CircleX className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-bold leading-tight">{error}</span>
          </div>
        )}

        {isExempt && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-3">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-bold leading-tight">أنت معفي من قيود الموقع الجغرافي.</span>
          </div>
        )}

        {/* Action Button Container */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative group">
            {/* Animated Ring */}
            <div className={`absolute -inset-4 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-all duration-700 animate-pulse ${isCheckedIn ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />

            <button
              onClick={handleAction}
              disabled={loading || !employee}
              className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-2xl ${isCheckedIn
                ? 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 shadow-rose-500/40'
                : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 shadow-emerald-500/40'
                }`}
              title={isCheckedIn ? 'تسجيل الخروج' : 'تسجيل الحضور'}
            >
              {loading ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Fingerprint className="w-12 h-12 text-white mb-1" />
              )}
            </button>
          </div>

        </div>

        <div className="mt-2 flex flex-col items-center">
          <span className={`text-sm font-black tracking-tight ${isCheckedIn ? 'text-rose-500' : 'text-emerald-500'}`}>
            {loading ? '...' : isCheckedIn ? 'تسجيل الخروج' : 'تسجيل الحضور'}
          </span>
          {!loading && (
            <span className="text-[9px] font-bold opacity-30 mt-0.5 uppercase tracking-[0.2em]">
              {isCheckedIn ? 'اضغط للمغادرة' : 'اضغط للبدء'}
            </span>
          )}
        </div>
      </div>



      {/* Footer Branding */}
      <div className={`px-8 py-4 text-center border-t ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'
        }`}>
        <p className="text-[10px] font-black opacity-30 tracking-[0.3em] uppercase">Fly4All Attendance System</p>
      </div>
    </div >
  );
};

export default AttendanceCard;
