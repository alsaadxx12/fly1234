import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Loader2, Eye, EyeOff, User, Mail, Shield, CheckCircle, Zap, Key, Paperclip, Plane } from 'lucide-react';
import { collection, getDocs, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import './styles.css';
import { useTheme } from '../../contexts/ThemeContext';

interface EmployeeData {
  email: string;
  name: string;
  permissions: string[];
  permissionGroupId?: string;
  permissionGroupName?: string;
}

function Landing() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, error: authError, loading, user } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const { customSettings } = useTheme();

  useEffect(() => {
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  const loadEmployeeByEmail = async (emailToSearch: string) => {
    if (!emailToSearch || emailToSearch.trim().length === 0) {
      setEmployeeData(null);
      return;
    }

    setIsLoadingEmployee(true);

    try {
      const employeesRef = collection(db, 'employees');
      const allSnapshot = await getDocs(employeesRef);

      const searchEmail = emailToSearch.toLowerCase().trim();
      const matchedDoc = allSnapshot.docs.find(doc => {
        const docEmail = doc.data().email?.toLowerCase().trim();
        return docEmail === searchEmail;
      });

      if (matchedDoc) {
        const data = matchedDoc.data();
        let permissionGroupName = '';
        if (data.role) {
          const groupDoc = await getDoc(doc(db, 'permissions', data.role));
          if (groupDoc.exists()) {
            permissionGroupName = groupDoc.data().name;
          }
        }
        
        setEmployeeData({
          email: data.email,
          name: data.name,
          permissions: data.permissions || [],
          permissionGroupId: data.role,
          permissionGroupName
        });
      } else {
        setEmployeeData(null);
      }
    } catch (err) {
      console.error('Error loading employee:', err);
      setEmployeeData(null);
    } finally {
      setIsLoadingEmployee(false);
    }
  };
  
  const handleEmailFocus = () => {
    if (email) {
      loadEmployeeByEmail(email);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShakeError(false);

    try {
      await signIn(email.trim(), password);
      setSuccess('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500); // Reset shake animation
    }
  };

  return (
    <div className="min-h-screen bg-white flex landing-page">
      {/* Right side with the form - now on the right for RTL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-right mb-12">
            <h1 className="text-4xl font-black text-gray-900 mb-2">مرحباً بعودتك</h1>
            <p className="text-gray-600">سجل دخولك للمتابعة إلى لوحة التحكم</p>
          </div>

          <form onSubmit={handleLogin} className={`space-y-6 ${shakeError ? 'animate-shake' : ''}`}>
            {(error || authError) && (
              <div className="flex items-center gap-3 p-4 text-red-700 bg-red-50 rounded-xl border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error || authError}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-4 text-green-700 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{success}</p>
              </div>
            )}

            <div>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleEmailFocus}
                  onBlur={() => { if(!email) setEmployeeData(null); loadEmployeeByEmail(email); }}
                  className="w-full pl-5 pr-12 py-4 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-gray-900 placeholder-gray-400 text-right transition-all group-hover:border-blue-300"
                  placeholder="البريد الإلكتروني"
                  dir="ltr"
                  required
                  disabled={loading}
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
              </div>
            </div>

            <div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white text-gray-900 placeholder-gray-400 text-right transition-all group-hover:border-blue-300"
                  placeholder="كلمة المرور"
                  dir="ltr"
                  required
                  disabled={loading}
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Left side with brand info */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center p-12">
        <div className="relative z-10 text-right max-w-lg">
          <img 
            src={customSettings.logoUrl} 
            alt="FLY4ALL Logo" 
            className="h-16 w-auto mb-8 drop-shadow-2xl"
          />
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">
            نظام متكامل لإدارة الطيران
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            تحكم كامل في جميع عملياتك، من الحسابات إلى إدارة الموظفين، كل ذلك في منصة واحدة قوية وسهلة الاستخدام.
          </p>
          <div className="mt-8 flex items-center justify-end gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm shadow-lg">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm shadow-lg">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm shadow-lg">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
