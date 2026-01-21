import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeOverlayProps {
    isVisible: boolean;
    onFinish?: () => void;
    userName?: string;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ isVisible, onFinish, userName }) => {
    const { customSettings } = useTheme();
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [animationClass, setAnimationClass] = useState('');

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setAnimationClass('animate-welcome-in');

            const timer = setTimeout(() => {
                setAnimationClass('animate-welcome-out');
                setTimeout(() => {
                    setShouldRender(false);
                    if (onFinish) onFinish();
                }, 800); // Duration of fade-out
            }, 2500); // Time to show the welcome message

            return () => clearTimeout(timer);
        }
    }, [isVisible, onFinish]);

    if (!shouldRender) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-900 ${animationClass}`}>
            {/* Premium Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 opacity-90" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-8 px-6">
                {/* Logo Animation */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-2xl opacity-40 animate-pulse group-hover:opacity-60 transition-opacity" />
                    <img
                        src={customSettings.logoUrl}
                        alt="Logo"
                        className="h-32 w-auto relative drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-float"
                    />
                </div>

                {/* Text Animation */}
                <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight animate-slide-up">
                        مرحباً {userName ? `، ${userName}` : ''}
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto rounded-full animate-width-stretch" />
                    <p className="text-xl md:text-2xl text-blue-200 font-medium opacity-0 animate-fade-in-delayed">
                        جاري تهيئة لوحة التحكم الخاصة بك...
                    </p>
                </div>
            </div>

            <style>{`
        @keyframes welcomeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes welcomeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes widthStretch {
          from { width: 0; opacity: 0; }
          to { width: 96px; opacity: 1; }
        }

        .animate-welcome-in { animation: welcomeIn 0.8s ease-out forwards; }
        .animate-welcome-out { animation: welcomeOut 0.8s ease-in forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-delayed { animation: fadeIn 1s ease-out 0.5s forwards; }
        .animate-width-stretch { animation: widthStretch 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
        </div>
    );
};

export default WelcomeOverlay;
