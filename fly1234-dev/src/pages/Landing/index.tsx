import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import './styles.css';
import { useTheme } from '../../contexts/ThemeContext';
import WelcomeOverlay from '../../components/WelcomeOverlay';

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
  const { customSettings } = useTheme();

  // State for animations and interactivity
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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
    setIsEmailFocused(true);
    if (email) {
      loadEmployeeByEmail(email);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await signIn(email.trim(), password);
      setSuccess('تم تسجيل الدخول بنجاح!');
      setShowWelcome(true);
      // Timeout is now handled by onFinish of WelcomeOverlay or kept here as fallback
      setTimeout(() => {
        if (!showWelcome) { // If for some reason overlay isn't showing
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white dark:bg-gray-900 font-['Tajawal']">
      <WelcomeOverlay
        isVisible={showWelcome}
        userName={employeeData?.name}
        onFinish={() => {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }}
      />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] relative z-10 flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="w-full max-w-sm mx-auto space-y-8 animate-slideInRight">

          {/* Header */}
          <div className="text-center lg:text-right space-y-2">
            <div className="inline-flex items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FLY4ALL
              </span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              مرحباً بعودتك! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              يرجى إدخال بياناتك للدخول إلى لوحة التحكم
            </p>
          </div>

          {/* Employee Avatar (if found) */}
          {employeeData && (
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 animate-fadeIn">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {employeeData.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">{employeeData.name}</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {employeeData.permissionGroupName || 'موظف'}
                </p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-1">
                البريد الإلكتروني
              </label>
              <div className={`relative group transition-all duration-300 ${isEmailFocused ? 'scale-[1.02]' : ''}`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-20 transition-opacity duration-300 ${isEmailFocused ? 'opacity-100' : 'opacity-0'}`} />
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={handleEmailFocus}
                    onBlur={() => { setIsEmailFocused(false); if (!email) setEmployeeData(null); loadEmployeeByEmail(email); }}
                    className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 text-right transition-all font-medium"
                    placeholder="name@company.com"
                    dir="ltr"
                    required
                    disabled={loading}
                  />
                  {isLoadingEmployee ? (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <Mail className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${isEmailFocused ? 'text-blue-500' : 'text-gray-400'}`} />
                  )}
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mr-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  كلمة المرور
                </label>
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className={`relative group transition-all duration-300 ${isPasswordFocused ? 'scale-[1.02]' : ''}`}>
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl blur opacity-20 transition-opacity duration-300 ${isPasswordFocused ? 'opacity-100' : 'opacity-0'}`} />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 text-right transition-all font-medium"
                    placeholder="••••••••"
                    dir="ltr"
                    required
                    disabled={loading}
                  />
                  <Lock className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${isPasswordFocused ? 'text-blue-500' : 'text-gray-400'}`} />
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error & Success Messages */}
            {(error || authError) && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-bold">{error || authError}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-800 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-bold">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-xl text-white font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <div className="absolute inset-0 rounded-xl bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out opacity-0 group-hover:opacity-100 overflow-hidden" />
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 z-10">
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </div>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              محمية بواسطة نظام أمان
              <span className="text-blue-600 dark:text-blue-400 font-bold mx-1">FLY4ALL Secure™</span>
            </p>
          </div>
        </div>
      </div>

      {/* Left Side - Brand Display */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">

        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 opacity-90" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Content */}
        <div className="relative z-10 max-w-xl text-right animate-fadeIn">
          <div className="mb-12 relative flex flex-col items-end gap-6 group">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-110 group-hover:bg-blue-500/30 transition-all duration-500" />
              <img
                src={customSettings.logoUrl}
                alt="FLY4ALL Logo"
                className="h-28 w-auto drop-shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Simple Explanation Section */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl transform transition-all duration-500 hover:bg-white/10 text-right max-w-md">
              <h3 className="text-xl font-bold text-blue-400 mb-2">أهلاً بك في منصة FLY4ALL</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                بوابتك المتكاملة لإدارة عمليات الطيران بكل احترافية. نسعى لتوفير أدوات ذكية تضمن لك الكفاءة، السرعة، والأمان في كل خطوة من رحلتك الإدارية.
              </p>
            </div>
          </div>

          <h2 className="text-6xl font-black text-white mb-8 leading-tight drop-shadow-lg">
            نظام متكامل <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              لإدارة الطيران
            </span>
          </h2>

          <p className="text-slate-300 text-xl leading-relaxed mb-12 font-medium max-w-lg mr-auto">
            تجربة رقمية فريدة تجمع بين قوة الأداء وسهولة الاستخدام. تحكم في حجوزاتك، حساباتك، وفريق عملك من مكان واحد.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Zap, text: 'سرعة فائقة في الأداء', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
              { icon: ShieldCheck, text: 'أمان وتشفير متكامل', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { icon: CheckCircle2, text: 'دقة في الحسابات', color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { icon: Loader2, text: 'دعم فني متواصل', color: 'text-purple-400', bg: 'bg-purple-400/10' }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors duration-300">
                <div className={`p-3 rounded-lg ${feature.bg}`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <span className="text-white font-bold text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <div className="absolute bottom-12 right-12 text-slate-500 text-sm font-medium">
            © 2024 جميع الحقوق محفوظة لشركة FLY4ALL
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
