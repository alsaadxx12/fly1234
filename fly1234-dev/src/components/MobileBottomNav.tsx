import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Wallet, Building2, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const MobileBottomNav: React.FC = () => {
    const { theme } = useTheme();
    const location = useLocation();

    const navItems = [
        {
            path: '/dashboard',
            icon: LayoutDashboard,
            label: 'لوحة التحكم'
        },
        {
            path: '/attendance',
            icon: UserCheck,
            label: 'الحضور'
        },
        {
            path: '/accounts',
            icon: Wallet,
            label: 'الحسابات'
        },
        {
            path: '/companies',
            icon: Building2,
            label: 'الشركات'
        },
        {
            path: '/profile',
            icon: User,
            label: 'الملف الشخصي'
        }
    ];

    return (
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-6 pt-2 backdrop-blur-xl border-t transition-colors duration-200 ${theme === 'dark'
            ? 'bg-gray-950/80 border-white/10'
            : 'bg-white/80 border-gray-200'
            }`}>
            <div className="flex justify-around items-center max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${isActive
                                ? 'text-blue-500 scale-110'
                                : theme === 'dark'
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }`}
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 ${isActive
                                ? 'bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                : ''
                                }`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black tracking-tighter uppercase">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
