import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface CustomDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label: string;
  placeholder?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CustomDatePicker({ value, onChange, label, placeholder }: CustomDatePickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  const validDate = value ? new Date(value) : null;
  const initialDate = (validDate && !isNaN(validDate.getTime())) ? validDate : new Date();

  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formattedDate = newDate.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);
    const weeks = [];
    let week = [];
    const selectedDate = value ? new Date(value) : null;


    for (let i = 0; i < firstDay; i++) {
      week.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= days; day++) {
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();

      const isToday = new Date().getDate() === day &&
        new Date().getMonth() === currentMonth.getMonth() &&
        new Date().getFullYear() === currentMonth.getFullYear();

      week.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`h-10 w-full rounded-lg font-bold text-sm
            ${isSelected
              ? 'bg-blue-600 text-white shadow-lg'
              : isToday
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                : 'bg-blue-100 text-blue-600 border-2 border-blue-500'
              : theme === 'dark'
              ? 'text-gray-300 hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
          {day}
        </button>
      );

      if (week.length === 7) {
        weeks.push(
          <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1">
            {week}
          </div>
        );
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<div key={`empty-end-${week.length}`} className="h-10" />);
      }
      weeks.push(
        <div key={`week-${weeks.length}`} className="grid grid-cols-7 gap-1">
          {week}
        </div>
      );
    }

    return weeks;
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={`block text-xs font-black mb-1.5 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 rounded-lg border text-sm font-bold text-center flex items-center justify-between ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500/50 outline-none`}
        >
          <Calendar className="w-4 h-4" />
          <span className="flex-1">{formatDate(value ? new Date(value) : null) || placeholder || 'Select date'}</span>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1 rounded ${
                theme === 'dark'
                  ? 'hover:bg-gray-600 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>

        {isOpen && (
          <div className={`absolute z-50 mt-2 p-4 rounded-xl shadow-2xl border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`} style={{ minWidth: '280px' }}>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={previousMonth}
                className={`p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <h3 className={`font-black text-lg ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>

              <button
                type="button"
                onClick={nextMonth}
                className={`p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className={`h-8 flex items-center justify-center text-xs font-black ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {renderCalendar()}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                handleDateSelect(today.getDate());
              }}
              className={`w-full mt-4 py-2 rounded-lg font-bold text-sm ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Today
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
