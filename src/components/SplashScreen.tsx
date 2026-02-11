import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const { customSettings } = useTheme();
    const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Phase 1: Enter (already showing with animations)
        const showTimer = setTimeout(() => {
            setPhase('show');
        }, 200);

        // Phase 2: Start exit animation
        const exitTimer = setTimeout(() => {
            setPhase('exit');
        }, 2800);

        // Phase 3: Remove from DOM
        const finishTimer = setTimeout(() => {
            onFinish();
        }, 3600);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(exitTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div
            ref={containerRef}
            className={`splash-screen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden
        ${phase === 'exit' ? 'splash-exit' : 'splash-enter'}`}
        >
            {/* Animated Background Layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d1033] to-[#0a0a1a]" />

            {/* Aurora Effect */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="splash-aurora splash-aurora-1" />
                <div className="splash-aurora splash-aurora-2" />
                <div className="splash-aurora splash-aurora-3" />
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="splash-particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${Math.random() * 4 + 3}s`,
                            opacity: Math.random() * 0.6 + 0.2,
                        }}
                    />
                ))}
            </div>

            {/* Grid Lines */}
            <div className="absolute inset-0 splash-grid opacity-[0.03]" />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center text-center">

                {/* Logo Container with Glow */}
                <div className={`splash-logo-container ${phase !== 'enter' ? 'splash-logo-visible' : ''}`}>
                    {/* Outer glow rings */}
                    <div className="splash-ring splash-ring-1" />
                    <div className="splash-ring splash-ring-2" />
                    <div className="splash-ring splash-ring-3" />

                    {/* Logo */}
                    <div className="splash-logo-wrapper">
                        {customSettings.logoUrl ? (
                            <img
                                src={customSettings.logoUrl}
                                alt="Logo"
                                className="splash-logo-img"
                                onError={(e: any) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="splash-logo-fallback">
                                <svg viewBox="0 0 48 48" fill="none" className="w-20 h-20">
                                    <path d="M24 4L8 14v20l16 10 16-10V14L24 4z" fill="url(#splash-grad)" fillOpacity="0.9" />
                                    <path d="M24 4L8 14v20l16 10 16-10V14L24 4z" stroke="url(#splash-grad)" strokeWidth="1.5" fill="none" />
                                    <defs>
                                        <linearGradient id="splash-grad" x1="8" y1="4" x2="40" y2="44">
                                            <stop stopColor="#818cf8" />
                                            <stop offset="1" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* App Name / Welcome Text */}
                <div className={`splash-text mt-10 ${phase !== 'enter' ? 'splash-text-visible' : ''}`}>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight splash-text-glow">
                        مرحباً بك
                    </h1>
                    <div className="splash-divider mx-auto mt-4" />
                    <p className="splash-subtitle text-sm md:text-base text-blue-200/70 mt-4 font-medium">
                        جاري تحضير لوحة التحكم...
                    </p>
                </div>

                {/* Progress Bar */}
                <div className={`splash-progress-container mt-12 ${phase !== 'enter' ? 'splash-progress-visible' : ''}`}>
                    <div className="splash-progress-track">
                        <div className="splash-progress-bar" />
                    </div>
                </div>
            </div>

            {/* Bottom branding */}
            <div className={`absolute bottom-8 left-0 right-0 text-center splash-bottom ${phase !== 'enter' ? 'splash-bottom-visible' : ''}`}>
                <p className="text-[10px] font-black text-white/20 tracking-[0.4em] uppercase">
                    Exclusive System
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
