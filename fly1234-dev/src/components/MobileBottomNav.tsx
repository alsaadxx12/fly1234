import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Fingerprint, Wallet, Building2, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const MobileBottomNav: React.FC = () => {
    const { theme } = useTheme();
    const location = useLocation();

    const navItems = [
        {
            path: '/dashboard',
            icon: LayoutDashboard,
            label: 'الرئيسية'
        },
        {
            path: '/accounts',
            icon: Wallet,
            label: 'الحسابات'
        },
        {
            path: '/attendance',
            icon: Fingerprint,
            label: 'الحضور',
            isCenter: true
        },
        {
            path: '/companies',
            icon: Building2,
            label: 'الشركات'
        },
        {
            path: '/profile',
            icon: User,
            label: 'الملف'
        }
    ];

    return (
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-3 pt-2 backdrop-blur-2xl border-t transition-colors duration-200 ${theme === 'dark'
            ? 'bg-gray-950/90 border-white/10'
            : 'bg-white/90 border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'
            }`}>
            <div className="flex justify-around items-end max-w-lg mx-auto relative">
                {navItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    if (item.isCenter) {
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="relative -top-6"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isActive
                                    ? 'bg-emerald-600 text-white rotate-12 scale-110 shadow-emerald-500/40'
                                    : theme === 'dark'
                                        ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                    <Icon className="w-8 h-8" strokeWidth={2.5} />
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
                                    )}
                                </div>
                            </NavLink>
                        );
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 pb-1 px-2 transition-all duration-300 ${isActive
                                ? 'text-emerald-500 translate-y-[-2px]'
                                : theme === 'dark'
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }`}
                        >
                            <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`} />
                            <span className="text-[9px] font-black tracking-tighter">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
