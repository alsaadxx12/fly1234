import React from 'react';
import { Link } from 'react-router-dom';
import {
    DollarSign,
    Users,
    Briefcase,
    MapPin,
    FileClock,
    Box,
    AlertTriangle,
    Megaphone,
    LogOut,
    Settings,
    ChevronLeft,
    Bell,
    Zap,
    CreditCard,
    Shield,
    LayoutGrid
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const MobileSystemNav: React.FC = () => {
    const { theme } = useTheme();
    const { signOut } = useAuth();

    const systemLinks = [
        { path: '/departments', icon: Briefcase, label: 'الأقسام', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { path: '/employees', icon: Users, label: 'الموظفين', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { path: '/balances', icon: DollarSign, label: 'الأرصدة', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { path: '/safes', icon: Box, label: 'الصناديق', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        { path: '/attendance-reports', icon: FileClock, label: 'تقارير الحضور', color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { path: '/branches', icon: MapPin, label: 'الفروع', color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { path: '/notification-settings', icon: Bell, label: 'الإشعارات', color: 'text-blue-600', bg: 'bg-blue-600/10' },
        { path: '/reports', icon: Megaphone, label: 'التبليغات', color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { path: '/pending-issues', icon: AlertTriangle, label: 'المشاكل', color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { path: '/api-integrations', icon: Zap, label: 'API', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { path: '/mastercard-issues', icon: CreditCard, label: 'مشاكل الماستر', color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { path: '/data-fly', icon: LayoutGrid, label: 'داتا فلاي', color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
        { path: '/security', icon: Shield, label: 'الأمان والحماية', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { path: '/settings', icon: Settings, label: 'إعدادات النظام', color: 'text-slate-500', bg: 'bg-slate-500/10' },
    ];

    return (
        <div className="md:hidden space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>داتا فلاي</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Fly</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {systemLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`flex flex-col items-center gap-3 p-4 rounded-[24px] border transition-all active:scale-95 ${theme === 'dark'
                            ? 'bg-white/5 border-white/5 hover:bg-white/10'
                            : 'bg-white border-gray-100 shadow-sm'
                            }`}
                    >
                        <div className={`p-3 rounded-2xl ${link.bg} ${link.color}`}>
                            <link.icon className="w-6 h-6" />
                        </div>
                        <span className={`text-[11px] font-black text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {link.label}
                        </span>
                    </Link>
                ))}
            </div>

            <button
                onClick={() => signOut()}
                className={`w-full flex items-center justify-between p-5 rounded-[24px] border mt-10 transition-all active:scale-[0.98] ${theme === 'dark'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-red-50 border-red-100 text-red-600'
                    }`}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-red-500/20' : 'bg-white shadow-sm'}`}>
                        <LogOut className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                        <div className="font-black text-sm">تسجيل الخروج</div>
                        <div className="text-[10px] opacity-60 font-bold uppercase tracking-wider">Secure Terminate</div>
                    </div>
                </div>
                <ChevronLeft className="w-5 h-5 opacity-40" />
            </button>
        </div>
    );
};

export default MobileSystemNav;
