import React, { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface DateRangePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (range: [Date | null, Date | null]) => void;
    placeholder?: string;
    maxDate?: Date;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DateRangePicker({
    startDate,
    endDate,
    onChange,
    placeholder = 'Select date range',
    maxDate = new Date()
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(startDate || endDate || new Date());
    const [selectingStart, setSelectingStart] = useState(true);
    const [tempStart, setTempStart] = useState<Date | null>(startDate);
    const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

    useEffect(() => {
        setTempStart(startDate);
        setTempEnd(endDate);
    }, [startDate, endDate]);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handlePrevYear = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
    };

    const handleNextYear = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
    };

    const handleDateSelect = (e: React.MouseEvent, day: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (!tempStart || (tempStart && tempEnd)) {
            // Start new selection
            setTempStart(selectedDate);
            setTempEnd(null);
            setSelectingStart(false);
        } else if (tempStart && !tempEnd) {
            // Complete the range
            let finalStart = tempStart;
            let finalEnd = selectedDate;
            
            if (selectedDate < tempStart) {
                // If selected date is before start, swap them
                finalStart = selectedDate;
                finalEnd = tempStart;
            }
            
            setTempStart(finalStart);
            setTempEnd(finalEnd);
            onChange([finalStart, finalEnd]);
            setIsOpen(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTempStart(null);
        setTempEnd(null);
        setSelectingStart(true);
        onChange([null, null]);
    };

    const isDateInRange = (day: number) => {
        if (!tempStart) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        
        if (tempEnd) {
            const start = tempStart < tempEnd ? tempStart : tempEnd;
            const end = tempStart < tempEnd ? tempEnd : tempStart;
            return date >= start && date <= end && date.getTime() !== start.getTime() && date.getTime() !== end.getTime();
        }
        return false;
    };

    const isDateStart = (day: number) => {
        if (!tempStart) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        return date.getTime() === tempStart.getTime();
    };

    const isDateEnd = (day: number) => {
        if (!tempEnd) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        return date.getTime() === tempEnd.getTime();
    };

    const isDateDisabled = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > maxDate;
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear()
        );
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Previous month's days
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            days.push(
                <div key={`prev-${day}`} className="aspect-square flex items-center justify-center">
                    <span className="text-xs text-slate-300">{day}</span>
                </div>
            );
        }

        // Days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const disabled = isDateDisabled(day);
            const inRange = isDateInRange(day);
            const isStart = isDateStart(day);
            const isEnd = isDateEnd(day);
            const today = isToday(day);

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={(e) => !disabled && handleDateSelect(e, day)}
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`
                        aspect-square rounded-lg text-sm font-bold transition-all
                        ${disabled 
                            ? 'text-slate-300 cursor-not-allowed opacity-50' 
                            : 'hover:bg-indigo-100 cursor-pointer active:scale-95'
                        }
                        ${inRange && !isStart && !isEnd 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : ''
                        }
                        ${isStart 
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-l-lg shadow-lg font-black' 
                            : ''
                        }
                        ${isEnd 
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-r-lg shadow-lg font-black' 
                            : ''
                        }
                        ${isStart && isEnd 
                            ? 'rounded-lg' 
                            : ''
                        }
                        ${!inRange && !isStart && !isEnd && !disabled 
                            ? 'text-slate-700 hover:text-indigo-700' 
                            : ''
                        }
                        ${today && !isStart && !isEnd 
                            ? 'ring-2 ring-indigo-400 font-black' 
                            : ''
                        }
                    `}
                >
                    {day}
                </button>
            );
        }

        // Next month's days to fill the grid
        const totalCells = days.length;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42
        for (let day = 1; day <= remainingCells && day <= 14; day++) {
            days.push(
                <div key={`next-${day}`} className="aspect-square flex items-center justify-center">
                    <span className="text-xs text-slate-300">{day}</span>
                </div>
            );
        }

        return days;
    };

    const displayText = () => {
        if (startDate && endDate) {
            return `${format(startDate, 'yyyy-MM-dd')} → ${format(endDate, 'yyyy-MM-dd')}`;
        } else if (startDate) {
            return `${format(startDate, 'yyyy-MM-dd')} → ...`;
        }
        return placeholder;
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className="w-full bg-white border-2 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 rounded-lg px-4 py-2.5 text-left flex items-center justify-between font-bold text-sm text-slate-700 transition-all focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className={startDate || endDate ? 'text-slate-800' : 'text-slate-400'}>
                            {displayText()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {(startDate || endDate) && (
                            <X
                                className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear(e);
                                }}
                            />
                        )}
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-[9999] min-w-[320px]"
                    sideOffset={4}
                    align="start"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            {/* Previous Year */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handlePrevYear();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                            </button>
                            
                            {/* Previous Month */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handlePrevMonth();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                            </button>
                        </div>
                        
                        {/* Month and Year Display */}
                        <div className="flex items-center gap-2 px-4">
                            <span className="text-base font-black text-slate-800 uppercase tracking-wide">
                                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Next Month */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNextMonth();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group active:scale-95"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                            </button>
                            
                            {/* Next Year */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNextYear();
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group active:scale-95"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS.map(day => (
                            <div key={day} className="text-center text-xs font-black text-slate-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>

                    {/* Footer */}
                    {(tempStart || tempEnd) && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-xs font-bold text-slate-600">
                                {tempStart && (
                                    <span>From: <span className="text-indigo-600">{format(tempStart, 'MMM dd, yyyy')}</span></span>
                                )}
                                {tempEnd && (
                                    <span className="ml-4">To: <span className="text-indigo-600">{format(tempEnd, 'MMM dd, yyyy')}</span></span>
                                )}
                            </div>
                            <button
                                onClick={handleClear}
                                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
