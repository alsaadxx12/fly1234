import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Building2, TrendingUp, TrendingDown, Users, UserPlus, UserCheck, Activity, Trophy, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopPerformer {
  name: string;
  count: number;
  image?: string;
}

interface StatisticsGridProps {
  stats: {
    total: number;
    credit: number;
    cash: number;
  };
  issueStats: {
    topIssuesAdded: TopPerformer[];
    topIssuesResolved: TopPerformer[];
  };
  currentRate: number;
  isLoadingRate: boolean;
}

interface NodeData {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  count?: number;
  countLabel?: string;
  size?: 'md' | 'lg';
  orbitRadius: number; // Distance from center
  orbitAngle: number; // Starting angle in degrees
  orbitSpeed: number; // Rotation speed (degrees per second)
}

const StatNode = ({
  data,
  angle,
  isDragging = false
}: {
  data: NodeData;
  angle: number;
  isDragging?: boolean;
}) => {
  const { theme } = useTheme();
  const size = data.size === 'lg' ? 100 : 80; // Smaller sizes

  return (
    <motion.div
      layoutId={data.id}
      whileHover={!isDragging ? {
        scale: 1.08,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : undefined}
      className="absolute rounded-full flex flex-col justify-center items-center text-center cursor-pointer"
      style={{
        width: size,
        height: size,
        transform: `rotate(${angle}deg) translateX(${data.orbitRadius}px) rotate(-${angle}deg)`,
        zIndex: isDragging ? 60 : 10,
      }}
    >
      <div
        className="relative rounded-full flex flex-col justify-center items-center text-center p-3 w-full h-full"
        style={{
          background: theme === 'dark'
            ? `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 100%)`,
          backdropFilter: 'blur(16px)',
          border: theme === 'dark' ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(15, 23, 42, 0.08)',
          boxShadow: theme === 'dark'
            ? '0 12px 32px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05) inset'
            : '0 12px 35px -20px rgba(2, 6, 23, 0.3), 0 0 0 1px rgba(255,255,255,0.9) inset'
        }}
      >
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 rounded-full ${data.colorClass.replace('bg-gradient-to-br', 'bg-gradient-to-tr')} opacity-25`} />

        {/* Soft outer glow */}
        <div className={`absolute -inset-3 rounded-full blur-xl ${data.colorClass} opacity-12`} />

        {/* Glass shine */}
        <div className={`absolute top-0 inset-x-0 h-1/2 rounded-t-full pointer-events-none ${theme === 'dark' ? 'bg-gradient-to-b from-white/12 to-transparent' : 'bg-gradient-to-b from-white/60 to-transparent'}`} />

        <div className="flex flex-col items-center gap-1.5 relative z-10">
          <div className={`p-2 rounded-full shadow-md ${data.colorClass} text-white ring-2 ${theme === 'dark' ? 'ring-white/10' : 'ring-black/5'}`}>
            {React.isValidElement(data.icon) ? React.cloneElement(data.icon as React.ReactElement, { className: 'w-4 h-4' }) : data.icon}
          </div>

          <div className="flex flex-col items-center">
            <p className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {data.title}
            </p>
            <p className={`font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-800'} ${data.size === 'lg' ? 'text-lg' : 'text-base'}`}>
              {data.value}
            </p>
          </div>
        </div>

        {data.count !== undefined && (
          <div className="mt-1 text-center relative z-10">
            <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {data.count}
            </span>
            <span className={`text-[7px] font-bold mr-0.5 opacity-70 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {data.countLabel || 'مشكلة'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const StatisticsGrid: React.FC<StatisticsGridProps> = ({
  stats,
  issueStats,
  currentRate,
  isLoadingRate
}) => {
  const { theme } = useTheme();
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [orbitAngles, setOrbitAngles] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const topThreeResolved = issueStats.topIssuesResolved.slice(0, 3);
  const mostIssuesAdded = issueStats.topIssuesAdded[0] || null;
  const mostIssuesResolved = issueStats.topIssuesResolved[0] || null;

  // Define nodes with orbit parameters
  const items: NodeData[] = useMemo(() => [
    {
      id: 'rate',
      title: 'سعر الصرف',
      value: isLoadingRate ? '...' : `${currentRate.toLocaleString()}`,
      icon: <Activity className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-indigo-600 to-sky-500',
      size: 'lg',
      orbitRadius: 0, // Center
      orbitAngle: 0,
      orbitSpeed: 0
    },
    {
      id: 'total',
      title: 'إجمالي الكيانات',
      value: stats.total,
      icon: <Building2 className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-violet-600 to-indigo-600',
      orbitRadius: 140,
      orbitAngle: 0,
      orbitSpeed: 0.3
    },
    {
      id: 'credit',
      title: 'الشركات الآجل',
      value: stats.credit,
      icon: <TrendingDown className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-rose-600 to-orange-500',
      orbitRadius: 140,
      orbitAngle: 120,
      orbitSpeed: 0.3
    },
    {
      id: 'cash',
      title: 'الشركات النقد',
      value: stats.cash,
      icon: <TrendingUp className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-emerald-600 to-teal-500',
      orbitRadius: 140,
      orbitAngle: 240,
      orbitSpeed: 0.3
    },
    {
      id: 'performance',
      title: 'أداء الموظفين',
      value: 'المشاكل',
      icon: <Users className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-slate-600 to-slate-800',
      orbitRadius: 220,
      orbitAngle: 60,
      orbitSpeed: 0.2
    },
    {
      id: 'issues_added',
      title: 'الأكثر إضافة',
      value: mostIssuesAdded?.name || '-',
      count: mostIssuesAdded?.count,
      countLabel: 'مشكلة',
      icon: <UserPlus className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
      orbitRadius: 220,
      orbitAngle: 180,
      orbitSpeed: 0.2
    },
    {
      id: 'issues_resolved',
      title: 'الأكثر إنجازاً',
      value: mostIssuesResolved?.name || '-',
      count: mostIssuesResolved?.count,
      countLabel: 'مشكلة',
      icon: <UserCheck className="w-4 h-4" />,
      colorClass: 'bg-gradient-to-br from-cyan-600 to-emerald-500',
      orbitRadius: 220,
      orbitAngle: 300,
      orbitSpeed: 0.2
    },
  ], [stats, issueStats, currentRate, isLoadingRate, mostIssuesAdded, mostIssuesResolved]);

  // Initialize orbit angles
  useEffect(() => {
    const initial: Record<string, number> = {};
    items.forEach(item => {
      initial[item.id] = item.orbitAngle;
    });
    setOrbitAngles(initial);
  }, [items]);

  // Animate orbits
  useEffect(() => {
    const animate = () => {
      setOrbitAngles(prev => {
        const next = { ...prev };
        items.forEach(item => {
          if (item.orbitSpeed > 0) {
            next[item.id] = (prev[item.id] || item.orbitAngle) + item.orbitSpeed;
            if (next[item.id] >= 360) next[item.id] -= 360;
          }
        });
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [items]);

  return (
    <div className={`relative py-8 select-none ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      {/* Achievement Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAchievementsOpen(true)}
        className="absolute top-0 left-4 z-40 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 text-white"
      >
        <Trophy className="w-6 h-6" />
      </motion.button>

      {/* Container with Financial Grid Background */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-[2.5rem] overflow-hidden ${theme === 'dark' ? 'bg-slate-900/40 border border-white/10' : 'bg-white/90 border border-gray-100'}`}
        style={{ 
          height: '520px',
          backgroundImage: theme === 'dark'
            ? `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 0'
        }}
      >
        {/* Subtle gradient overlays */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className={`absolute top-0 left-0 w-64 h-64 rounded-full blur-[80px] ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-200/40'}`} />
          <div className={`absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[80px] ${theme === 'dark' ? 'bg-fuchsia-500/15' : 'bg-fuchsia-200/30'}`} />
        </div>

        {/* Center point indicator (subtle) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500/20" />

        {/* Orbit rings (subtle guides) */}
        {[140, 220].map((radius) => (
          <div
            key={radius}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed pointer-events-none"
            style={{
              width: radius * 2,
              height: radius * 2,
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
              opacity: 0.5
            }}
          />
        ))}

        {/* Nodes positioned on orbits */}
        <div className="absolute inset-0" style={{ transform: 'translate(50%, 50%)' }}>
          {items.map(item => (
            <StatNode
              key={item.id}
              data={item}
              angle={orbitAngles[item.id] || item.orbitAngle}
            />
          ))}
        </div>
      </div>

      {/* Achievements Modal */}
      {isAchievementsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsAchievementsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-50 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-2xl font-black mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              ملخص الإنجازات
            </h3>
            <div className="space-y-4">
              {topThreeResolved.map((employee, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 flex items-center justify-center overflow-hidden ring-2 ring-white/40">
                      {employee.image ? (
                        <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500">{employee.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ring-2 ring-white/40 ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600' :
                      index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                      'bg-gradient-to-br from-orange-400 to-red-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{employee.name}</p>
                    <p className={`text-sm font-medium opacity-80 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{employee.count} تذكرة منجزة</p>
                  </div>
                  {index === 0 && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StatisticsGrid;
