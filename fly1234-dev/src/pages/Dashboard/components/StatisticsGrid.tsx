import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Building2, TrendingUp, TrendingDown, Users, UserPlus, UserCheck, Activity, Trophy, Star } from 'lucide-react';
import ReactDOM from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

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
}

const StatNode = ({
  data,
  isOverlay = false,
  isDragging = false
}: {
  data: NodeData,
  isOverlay?: boolean,
  isDragging?: boolean
}) => {
  const { theme } = useTheme();

  return (
    <motion.div
      layoutId={isOverlay ? `overlay-${data.id}` : data.id}
      className={`
        relative rounded-full transition-all duration-300 flex flex-col justify-center items-center text-center p-4 cursor-grab active:cursor-grabbing
        ${data.size === 'lg' ? 'h-48 w-48' : 'h-40 w-40'}
        ${isDragging ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}
        ${isOverlay ? 'shadow-2xl scale-105 z-50' : 'hover:shadow-xl hover:-translate-y-1'}
      `}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)`,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: isOverlay
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1
      }}
    >
      {/* Dynamic Background Gradient Blob */}
      <div className={`absolute inset-0 rounded-full opacity-20 ${data.colorClass.replace('bg-gradient-to-br', 'bg-gradient-to-tr')}`} />

      {/* Glass Shine Effect */}
      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />

      <div className="flex flex-col items-center gap-2 relative z-10">
        <div className={`p-3 rounded-full shadow-lg ${data.colorClass} text-white ring-4 ring-white/10`}>
          {data.icon}
        </div>

        <div className="flex flex-col items-center">
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.title}
          </p>
          <p className={`font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-800'
            } ${data.size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
            {data.value}
          </p>
        </div>
      </div>

      {data.count !== undefined && (
        <div className="mt-2 text-center relative z-10">
          <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {data.count}
          </span>
          <span className={`text-[9px] font-bold mr-1 opacity-70 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.countLabel || 'مشكلة'}
          </span>
        </div>
      )}
    </motion.div>
  );
};

const SortableStatNode = ({ data }: { data: NodeData }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: data.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 40,
        opacity: { duration: 0.2 }
      }}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <StatNode data={data} isDragging={isDragging} />
    </motion.div>
  );
};

// Placeholder component to maintain layout structure when slot is empty (optional safety)
const EmptySlot = ({ size = 'md' }: { size?: 'md' | 'lg' }) => (
  <div className={`rounded-full border-2 border-dashed border-gray-300/20 flex items-center justify-center ${size === 'lg' ? 'h-48 w-48' : 'h-40 w-40'}`}>
    <span className="text-gray-400 text-xs">Slot</span>
  </div>
);

const StatisticsGrid: React.FC<StatisticsGridProps> = ({
  stats,
  issueStats,
  currentRate,
  isLoadingRate
}) => {
  const { theme } = useTheme();
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [items, setItems] = useState<NodeData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const topThreeResolved = issueStats.topIssuesResolved.slice(0, 3);
  const mostIssuesAdded = issueStats.topIssuesAdded[0] || null;
  const mostIssuesResolved = issueStats.topIssuesResolved[0] || null;

  // Initial Data Mapping
  useEffect(() => {
    const initialItems: NodeData[] = [
      {
        id: 'rate',
        title: 'سعر الصرف',
        value: isLoadingRate ? '...' : `${currentRate.toLocaleString()}`,
        icon: <Activity className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        size: 'lg'
      },
      {
        id: 'total',
        title: 'إجمالي الكيانات',
        value: stats.total,
        icon: <Building2 className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      },
      {
        id: 'credit',
        title: 'الشركات الآجل',
        value: stats.credit,
        icon: <TrendingDown className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-red-500 to-rose-600',
      },
      {
        id: 'cash',
        title: 'الشركات النقد',
        value: stats.cash,
        icon: <TrendingUp className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-green-500 to-emerald-600',
      },
      {
        id: 'performance',
        title: 'أداء الموظفين',
        value: 'المشاكل',
        icon: <Users className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-slate-500 to-gray-600',
      },
      {
        id: 'issues_added',
        title: 'الأكثر إضافة',
        value: mostIssuesAdded?.name || '-',
        count: mostIssuesAdded?.count,
        countLabel: 'مشكلة',
        icon: <UserPlus className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-orange-500 to-amber-600',
      },
      {
        id: 'issues_resolved',
        title: 'الأكثر إنجازاً',
        value: mostIssuesResolved?.name || '-',
        count: mostIssuesResolved?.count,
        countLabel: 'مشكلة',
        icon: <UserCheck className="w-6 h-6" />,
        colorClass: 'bg-gradient-to-br from-teal-500 to-emerald-600',
      },
    ];

    // Only set initial items if empty or if we want to sync data updates while keeping order
    setItems((prevItems) => {
      if (prevItems.length === 0) return initialItems;

      // Update values but keep order
      return prevItems.map(item => {
        const newItem = initialItems.find(i => i.id === item.id);
        return newItem ? { ...newItem, size: item.size } : item; // Keep current size/position info if we had it
      });
    });
  }, [stats, issueStats, currentRate, isLoadingRate]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Swap visual properties like size to adapt to new slot?
        // Actually, let's just swap the data. The Slots determine the size visually?
        // But here the component *is* the node.
        // Let's swap the data in the array.

        // Optional: Swap sizes if we want the big center node to ALWAYS be big
        // For now, let's keep the size attached to the data node itself as defined in state

        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  // Helper to get item by index safely
  const getNode = (index: number) => items[index] ? <SortableStatNode data={items[index]} /> : <EmptySlot />;

  return (
    <div className={`relative py-12 select-none ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
      {/* Achievement Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAchievementsOpen(true)}
        className="absolute top-0 left-4 z-40 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 text-white"
      >
        <Trophy className="w-7 h-7" />
      </motion.button>

      {/* Achievements Modal (Portal) */}
      <AnimatePresence>
        {isAchievementsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: 'box-none' }}>
            {/* Invisible clickable backdrop to close */}
            <div
              className="absolute inset-0 z-40"
              onClick={() => setIsAchievementsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 100, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 100, rotateX: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-50 w-full max-w-sm"
              style={{ overflow: 'visible' }}
            >
              {/* 1. The Floating Trophy (Completely Outside the Card) */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-2xl">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-28 h-28 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-full flex items-center justify-center border-[6px] border-white/20 text-white shadow-inner"
                >
                  <Trophy className="w-14 h-14 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]" />
                </motion.div>
                {/* Glow effect under trophy */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-amber-500/50 blur-3xl -z-10"></div>
              </div>

              {/* 2. The Glass Card Body */}
              <div
                className="relative z-10 w-full rounded-[3rem] overflow-hidden"
                style={{
                  background: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.6)'
                }}
              >
                {/* Decorative sheen */}
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-white/30 via-white/5 to-transparent pointer-events-none" />

                {/* Content Container - Increased Padding for Height */}
                <div className="px-8 pt-24 pb-12 relative flex flex-col items-center">

                  <h3 className={`text-center text-3xl font-black mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    ملخص الإنجازات
                  </h3>

                  <div className="w-full space-y-4">
                    {topThreeResolved.map((employee, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (index * 0.1) }}
                        className={`flex items-center gap-4 p-4 rounded-3xl border transition-all hover:scale-[1.02] hover:shadow-lg ${theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-white/60 bg-white/40 hover:bg-white/50'
                          }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 flex items-center justify-center overflow-hidden ring-4 ring-white/40 shadow-sm">
                            {employee.image ? (
                              <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-gray-500 text-xl">{employee.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ring-4 ring-white/40 shadow-xl ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600' : index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-600' : 'bg-gradient-to-br from-orange-400 to-red-600'
                            }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-lg truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{employee.name}</p>
                          <p className={`text-sm font-medium opacity-80 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{employee.count} تذكرة منجزة</p>
                        </div>
                        {index === 0 && (
                          <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                            <Star className="w-6 h-6 text-amber-500 fill-amber-500 animate-pulse drop-shadow-sm" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          {/* Tree Structure Layout */}
          <div className="flex flex-col items-center relative w-full lg:min-w-[800px] py-4 lg:py-10">

            {/* Connecting Network Grid (SVG) - Desktop Only */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="mainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={theme === 'dark' ? '#60a5fa' : '#3b82f6'} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={theme === 'dark' ? '#f472b6' : '#ec4899'} stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={theme === 'dark' ? '#4b5563' : '#9ca3af'} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={theme === 'dark' ? '#6b7280' : '#d1d5db'} stopOpacity="0.1" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {(() => {
                const nodes = [
                  { x: 50, y: 15 }, // 0: Rate (Root)
                  { x: 25, y: 45 }, // 1: Left Parent
                  { x: 15, y: 80 }, // 2: Left Child 1
                  { x: 35, y: 80 }, // 3: Left Child 2
                  { x: 75, y: 45 }, // 4: Right Parent
                  { x: 65, y: 80 }, // 5: Right Child 1
                  { x: 85, y: 80 }  // 6: Right Child 2
                ];

                const meshLines = [];
                const treePaths = [];

                for (let i = 0; i < nodes.length; i++) {
                  for (let j = i + 1; j < nodes.length; j++) {
                    meshLines.push(
                      <line
                        key={`mesh-${i}-${j}`}
                        x1={nodes[i].x} y1={nodes[i].y}
                        x2={nodes[j].x} y2={nodes[j].y}
                        stroke="url(#meshGradient)"
                        strokeWidth="0.5"
                        className="opacity-20"
                      />
                    );
                  }
                }

                treePaths.push(<path key="tree-0-1" d={`M ${nodes[0].x} ${nodes[0].y} C ${nodes[0].x} ${nodes[0].y + 15}, ${nodes[1].x} ${nodes[1].y - 15}, ${nodes[1].x} ${nodes[1].y}`} />);
                treePaths.push(<path key="tree-0-4" d={`M ${nodes[0].x} ${nodes[0].y} C ${nodes[0].x} ${nodes[0].y + 15}, ${nodes[4].x} ${nodes[4].y - 15}, ${nodes[4].x} ${nodes[4].y}`} />);
                treePaths.push(<path key="tree-1-2" d={`M ${nodes[1].x} ${nodes[1].y} C ${nodes[1].x} ${nodes[1].y + 15}, ${nodes[2].x} ${nodes[2].y - 15}, ${nodes[2].x} ${nodes[2].y}`} />);
                treePaths.push(<path key="tree-1-3" d={`M ${nodes[1].x} ${nodes[1].y} C ${nodes[1].x} ${nodes[1].y + 15}, ${nodes[3].x} ${nodes[3].y - 15}, ${nodes[3].x} ${nodes[3].y}`} />);
                treePaths.push(<path key="tree-4-5" d={`M ${nodes[4].x} ${nodes[4].y} C ${nodes[4].x} ${nodes[4].y + 15}, ${nodes[5].x} ${nodes[5].y - 15}, ${nodes[5].x} ${nodes[5].y}`} />);
                treePaths.push(<path key="tree-4-6" d={`M ${nodes[4].x} ${nodes[4].y} C ${nodes[4].x} ${nodes[4].y + 15}, ${nodes[6].x} ${nodes[6].y - 15}, ${nodes[6].x} ${nodes[6].y}`} />);

                return (
                  <>
                    <g className="animate-pulse-slow">{meshLines}</g>
                    <g stroke="url(#mainGradient)" strokeWidth="3" fill="none" filter="url(#glow)" strokeLinecap="round">
                      {treePaths}
                    </g>
                  </>
                );
              })()}
            </svg>

            {/* Mobile View: Vertical Grid */}
            <div className="lg:hidden w-full px-4 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex justify-center mb-4 z-10">{getNode(0)}</div>
              <div className="flex flex-col gap-4">
                <div className="z-10 mx-auto">{getNode(1)}</div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="z-10 mx-auto transform scale-90">{getNode(2)}</div>
                  <div className="z-10 mx-auto transform scale-90">{getNode(3)}</div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="z-10 mx-auto">{getNode(4)}</div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="z-10 mx-auto transform scale-90">{getNode(5)}</div>
                  <div className="z-10 mx-auto transform scale-90">{getNode(6)}</div>
                </div>
              </div>
            </div>

            {/* Desktop View: Tree Layout */}
            <div className="hidden lg:flex flex-col items-center w-full h-full">
              {/* Level 0: Root */}
              <div className="z-10 mb-20">
                {getNode(0)}
              </div>

              {/* Level 1: Main Branches */}
              <div className="flex w-full px-[10%] justify-between gap-10">
                {/* Left Branch Group */}
                <div className="flex flex-col items-center flex-1">
                  <div className="z-10 mb-20">
                    {getNode(1)}
                  </div>

                  {/* Level 2: Children */}
                  <div className="flex w-full justify-around gap-4 px-8">
                    <div className="z-10">{getNode(2)}</div>
                    <div className="z-10">{getNode(3)}</div>
                  </div>
                </div>

                {/* Right Branch Group */}
                <div className="flex flex-col items-center flex-1">
                  <div className="z-10 mb-20">
                    {getNode(4)}
                  </div>

                  {/* Level 2: Children */}
                  <div className="flex w-full justify-around gap-4 px-8">
                    <div className="z-10">{getNode(5)}</div>
                    <div className="z-10">{getNode(6)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <StatNode
              data={items.find(i => i.id === activeId)!}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default StatisticsGrid;
