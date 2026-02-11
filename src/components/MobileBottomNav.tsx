import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, UserCheck, Building2, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState, useRef } from 'react';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
    { path: '/accounts', icon: Wallet, label: 'الحسابات' },
    { path: '/attendance', icon: UserCheck, label: 'الحضور', isCenter: true },
    { path: '/companies', icon: Building2, label: 'الشركات' },
    { path: '/profile', icon: User, label: 'حسابي' },
];

export default function MobileBottomNav() {
    const { theme } = useTheme();
    const location = useLocation();
    const [bouncingIndex, setBouncingIndex] = useState<number | null>(null);
    const prevPathRef = useRef(location.pathname);

    // Trigger bounce animation on route change
    useEffect(() => {
        if (prevPathRef.current !== location.pathname) {
            const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.path));
            if (activeIndex !== -1) {
                setBouncingIndex(activeIndex);
                const timer = setTimeout(() => setBouncingIndex(null), 500);
                prevPathRef.current = location.pathname;
                return () => clearTimeout(timer);
            }
            prevPathRef.current = location.pathname;
        }
    }, [location.pathname]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
            {/* Floating pill container */}
            <div
                className={`mx-3 mb-3 rounded-[28px] border shadow-2xl ${theme === 'dark'
                        ? 'bg-gray-900/90 border-white/[0.08] shadow-black/40'
                        : 'bg-white/90 border-gray-200/60 shadow-gray-300/50'
                    }`}
                style={{
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                }}
            >
                <nav className="flex items-center justify-around px-2 h-[68px] relative">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        const isBouncing = bouncingIndex === index;

                        if (item.isCenter) {
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className="relative flex items-center justify-center -mt-6"
                                >
                                    <div
                                        className={`w-[60px] h-[60px] rounded-[22px] flex items-center justify-center transition-all duration-500 press-scale ${isActive
                                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_4px_20px_rgba(16,185,129,0.4)] center-btn-glow'
                                                : theme === 'dark'
                                                    ? 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg'
                                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg'
                                            } ${isBouncing ? 'nav-bounce' : ''}`}
                                    >
                                        <Icon
                                            className={`w-6 h-6 transition-all duration-300 ${isActive
                                                    ? 'text-white'
                                                    : theme === 'dark'
                                                        ? 'text-gray-400'
                                                        : 'text-gray-500'
                                                }`}
                                        />
                                    </div>
                                    {/* Label below center button */}
                                    <span
                                        className={`absolute -bottom-4 text-[9px] font-black tracking-tight transition-all duration-300 ${isActive
                                                ? 'text-emerald-500 dark:text-emerald-400 opacity-100'
                                                : 'opacity-0'
                                            }`}
                                    >
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        }

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="flex flex-col items-center justify-center relative py-2 px-3 group press-scale"
                            >
                                {/* Active indicator dot */}
                                <div
                                    className={`absolute top-1 w-1 h-1 rounded-full transition-all duration-500 ${isActive
                                            ? 'bg-indigo-500 dark:bg-indigo-400 scale-100 opacity-100'
                                            : 'scale-0 opacity-0'
                                        }`}
                                />

                                {/* Icon container */}
                                <div
                                    className={`p-2 rounded-2xl transition-all duration-300 ${isActive
                                            ? theme === 'dark'
                                                ? 'bg-indigo-500/15'
                                                : 'bg-indigo-50'
                                            : ''
                                        } ${isBouncing ? 'nav-bounce' : ''}`}
                                >
                                    <Icon
                                        className={`w-5 h-5 transition-all duration-300 ${isActive
                                                ? 'text-indigo-500 dark:text-indigo-400'
                                                : theme === 'dark'
                                                    ? 'text-gray-500 group-hover:text-gray-300'
                                                    : 'text-gray-400 group-hover:text-gray-600'
                                            }`}
                                    />
                                </div>

                                {/* Label */}
                                <span
                                    className={`text-[9px] font-bold mt-0.5 transition-all duration-300 ${isActive
                                            ? 'text-indigo-500 dark:text-indigo-400 opacity-100 translate-y-0'
                                            : 'opacity-0 translate-y-1'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
