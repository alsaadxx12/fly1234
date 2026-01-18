import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomDatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  label
}: CustomDatePickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const validDate = value ? new Date(value) : null;
  const initialDate = (validDate && !isNaN(validDate.getTime())) ? validDate : new Date();

  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const today = new Date();
    const selectedDate = value ? new Date(value) : null;

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();

      const isToday = today.getDate() === day &&
        today.getMonth() === currentMonth.getMonth() &&
        today.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
            isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
              : isToday
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50'
                : 'bg-blue-100 text-blue-600 ring-2 ring-blue-400/50'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-300 hover:scale-105'
              : 'hover:bg-gray-100 text-gray-700 hover:scale-105'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div ref={pickerRef} className="relative h-full">
      {label && <label className={`block text-xs font-bold mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)}
        className={`w-full h-full px-4 rounded-xl border-2 transition-all flex items-center justify-between font-bold group cursor-pointer ${
          theme === 'dark'
            ? 'bg-gray-900/50 border-gray-700 text-white hover:border-blue-500'
            : 'bg-gray-50 border-gray-300 text-gray-900 hover:border-blue-400'
        } focus:ring-2 focus:ring-blue-500 outline-none shadow-sm hover:shadow-md text-sm h-[52px]`}
      >
        <span className={`flex items-center gap-2 ${value ? '' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          <Calendar className={`w-4 h-4 ${
            theme === 'dark' ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-blue-500'
          } transition-colors`} />
          {value ? formatDate(value) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className={`p-1 rounded-lg transition-colors z-10 ${
              theme === 'dark'
                ? 'hover:bg-red-500/20 text-red-400'
                : 'hover:bg-red-50 text-red-600'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 p-5 rounded-2xl border shadow-2xl backdrop-blur-sm ${
          theme === 'dark'
            ? 'bg-gray-800/95 border-gray-700'
            : 'bg-white/95 border-gray-200'
        }`} style={{ width: '340px', left: '0' }}>
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-2.5 rounded-xl transition-all ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300 hover:scale-110'
                  : 'hover:bg-gray-100 text-gray-600 hover:scale-110'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className={`font-bold text-lg ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-2.5 rounded-xl transition-all ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300 hover:scale-110'
                  : 'hover:bg-gray-100 text-gray-600 hover:scale-110'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className={`text-center text-xs font-bold py-2 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {renderCalendar()}
          </div>
          <div className="pt-4 border-t flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                handleDateSelect(today.getDate());
              }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-105'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:scale-105'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
