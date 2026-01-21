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
    ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import WelcomeOverlay from '../../components/WelcomeOverlay';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, error: authError, loading, user } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const [showWelcome, setShowWelcome] = useState(false);
    const { customSettings } = useTheme();

    useEffect(() => {
        if (user && !loading) {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }
    }, [user, loading, navigate, location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await signIn(email.trim(), password);
            setShowWelcome(true);
        } catch (err: any) {
            setError(err.message || 'بيانات الدخول غير صحيحة');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 font-['Tajawal'] p-4 md:p-6 overflow-hidden relative">
            <WelcomeOverlay
                isVisible={showWelcome}
                userName={email.split('@')[0]}
                onFinish={() => {
                    const from = location.state?.from?.pathname || '/dashboard';
                    navigate(from, { replace: true });
                }}
            />

            {/* Premium Mesh Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[140px]"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, -60, 0],
                        scale: [1, 1.3, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[140px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="w-full max-w-md md:max-w-lg relative z-10"
            >
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] md:rounded-[48px] p-6 md:p-14 shadow-2xl relative overflow-hidden group">
                    {/* Interior Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                    <div className="text-center mb-8 md:mb-12">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            className="inline-block p-6 md:p-6 bg-white/5 rounded-[32px] md:rounded-[40px] border border-white/10 mb-6 shadow-2xl"
                        >
                            <img src={customSettings.logoUrl} alt="Logo" className="w-28 h-28 md:w-28 md:h-28 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        </motion.div>
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight">بوابة الدخول</h1>
                        <p className="text-slate-400 font-medium text-sm md:text-lg">منظومة FLY4ALL v4.0</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
                        <div className="space-y-4 md:space-y-6">
                            <div className="relative group">
                                <label className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1 md:mb-2 block mr-2">البريد الإلكتروني</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-5 pr-12 md:pr-14 py-4 md:py-5 bg-white/5 border border-white/10 rounded-[16px] md:rounded-[24px] focus:outline-none focus:border-blue-500 text-white text-right transition-all font-black text-base md:text-lg placeholder:text-slate-700 focus:bg-white/10"
                                        placeholder="user@fly4all.com"
                                        dir="ltr"
                                        required
                                    />
                                    <Mail className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1 md:mb-2 block mr-2">كلمة المرور</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 md:pl-14 pr-12 md:pr-14 py-4 md:py-5 bg-white/5 border border-white/10 rounded-[16px] md:rounded-[24px] focus:outline-none focus:border-blue-500 text-white text-center transition-all font-black text-xl md:text-2xl tracking-[0.2em] md:tracking-[0.3em] focus:bg-white/10"
                                        placeholder="••••••••"
                                        dir="ltr"
                                        required
                                    />
                                    <Lock className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <button
                                        type="button"
                                        className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5 md:w-6 md:h-6" /> : <Eye className="w-5 h-5 md:w-6 md:h-6" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {(error || authError) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20"
                            >
                                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                                <p className="text-xs md:text-sm font-bold leading-relaxed">{error || authError}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-5 md:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[16px] md:rounded-[24px] font-black text-lg md:text-xl hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            {loading ? <Loader2 className="w-7 h-7 md:w-8 md:h-8 animate-spin" /> : <span className="relative z-10">دخول آمن للمنظومة</span>}
                        </button>
                    </form>
                </div>

                <div className="mt-8 md:mt-10 text-center flex flex-col items-center gap-4 md:gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="text-slate-500 hover:text-blue-400 font-bold transition-all text-sm md:text-base flex items-center gap-2 md:gap-3 group"
                    >
                        <span>العودة للرئيسية</span>
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center gap-2 opacity-30">
                        <div className="h-px w-6 md:w-8 bg-slate-600" />
                        <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                        <div className="h-px w-6 md:w-8 bg-slate-600" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
