import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useTheme } from '../../../contexts/ThemeContext';

interface AppAd {
    id: string;
    imageUrl: string;
    link?: string;
    title?: string;
    order: number;
}

const AdCarousel: React.FC = () => {
    const { theme } = useTheme();
    const [ads, setAds] = useState<AppAd[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [direction, setDirection] = useState(0); // 1 for right, -1 for left

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'app_ads'),
                where('isActive', '==', true),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);
            const adsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AppAd));
            setAds(adsData);
        } catch (error) {
            console.error('Error fetching dashboard ads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextSlide = useCallback(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, [ads.length]);

    const prevSlide = useCallback(() => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    }, [ads.length]);

    // Auto-play
    useEffect(() => {
        if (ads.length <= 1) return;
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [ads.length, nextSlide]);

    if (isLoading || ads.length === 0) return null;

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.9,
            rotateY: direction > 0 ? 45 : -45
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.9,
            rotateY: direction < 0 ? 45 : -45
        })
    };

    const currentAd = ads[currentIndex];

    return (
        <div className="relative w-full max-w-4xl mx-auto px-4 perspective-1000">
            {/* Sleeker, Integrated Container with Reduced Height */}
            <div className={`relative overflow-hidden rounded-[2.5rem] md:rounded-[3rem] shadow-xl shadow-gray-200/50 dark:shadow-none bg-gradient-to-br transition-all duration-500 aspect-[21/9] md:aspect-[21/8] group ${theme === 'dark' ? 'from-gray-900/40 to-gray-800/20' : 'from-white/80 to-gray-50/50'
                }`}>

                <AnimatePresence initial={false} custom={direction} mode='popLayout'>
                    <motion.div
                        key={currentAd.id}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.5 },
                            scale: { duration: 0.4 },
                            rotateY: { duration: 0.6 }
                        }}
                        className="absolute inset-0 w-full h-full cursor-pointer"
                        onClick={() => currentAd.link && window.open(currentAd.link, '_blank')}
                    >
                        {/* Image Layer - Full Bleed / Fill */}
                        <div className="relative w-full h-full overflow-hidden">
                            <img
                                src={currentAd.imageUrl}
                                alt={currentAd.title || 'Ad'}
                                className="relative w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />

                            {/* Refined Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20 flex flex-col justify-end p-4 md:p-6">
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="space-y-1 max-w-sm"
                                >
                                    {currentAd.title && (
                                        <h2 className="text-lg md:text-xl font-black text-white drop-shadow-md tracking-tight">
                                            {currentAd.title}
                                        </h2>
                                    )}
                                    {currentAd.link && (
                                        <div className="flex items-center gap-2 text-white/90 text-[9px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md w-fit px-3 py-1.5 rounded-lg border border-white/10 transition-all hover:bg-white/20 hover:gap-3">
                                            <span>Explore</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Integration: Minimal Navigation Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2 p-1.5 bg-black/10 backdrop-blur-md rounded-full border border-white/5">
                    {ads.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setDirection(index > currentIndex ? 1 : -1);
                                setCurrentIndex(index);
                            }}
                            className={`transition-all duration-700 rounded-full h-1 ${index === currentIndex ? 'w-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-1 bg-white/30 hover:bg-white/60'
                                }`}
                        />
                    ))}
                </div>

                {/* Subtle Arrow Controls */}
                <div className="hidden md:block">
                    <button
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-black/20 hover:scale-110"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-black/20 hover:scale-110"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Subtle Ambient Glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-white/5 dark:bg-white/2 blur-[100px] rounded-full animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default AdCarousel;
