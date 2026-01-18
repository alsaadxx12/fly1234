import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ArabicDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  label?: string;
  showHijri?: boolean;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Hijri conversion (approximation - for exact conversion, use a library)
function gregorianToHijri(date: Date) {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  // Simple approximation formula
  const totalDays = Math.floor((gYear - 622) * 365.25 + (gMonth - 1) * 30.5 + gDay);
  const hYear = Math.floor(totalDays / 354.36) + 1;
  const remainingDays = totalDays % 354.36;
  const hMonth = Math.floor(remainingDays / 29.5) + 1;
  const hDay = Math.floor(remainingDays % 29.5) + 1;

  return {
    year: hYear,
    month: Math.min(hMonth, 12),
    day: Math.min(hDay, 30)
  };
}

export default function ArabicDatePicker({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  label,
  showHijri = false
}: ArabicDatePickerProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? value.getMonth() : new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(value ? value.getFullYear() : new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentMonth(value.getMonth());
      setCurrentYear(value.getFullYear());
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onChange(newDate);
    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = value &&
        value.getDate() === day &&
        value.getMonth() === currentMonth &&
        value.getFullYear() === currentYear;

      const isToday = new Date().getDate() === day &&
        new Date().getMonth() === currentMonth &&
        new Date().getFullYear() === currentYear;

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`p-2 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'bg-blue-600 text-white'
              : isToday
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-blue-100 text-blue-600'
              : theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div ref={pickerRef} className="relative">
      {label && (
        <label className={`block text-sm font-medium mb-2 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {label}
        </label>
      )}

      {/* Input Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 rounded-xl border transition-all flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        } focus:ring-2 focus:ring-blue-500/20 outline-none`}
      >
        <span className={`flex-1 text-center font-bold text-base ${value ? '' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          {value ? formatDate(value) : placeholder}
        </span>
        <Calendar className={`w-5 h-5 ml-auto ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`} />
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className={`absolute z-50 bottom-full mb-2 p-4 rounded-xl border shadow-2xl ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`} style={{ width: '320px' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className={`font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {ARABIC_MONTHS[currentMonth]} {currentYear}
              </div>
            </div>

            <button
              onClick={handleNextMonth}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div
                key={day}
                className={`text-center text-xs font-medium p-2 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t flex gap-2">
            <button
              onClick={() => {
                onChange(new Date());
                setIsOpen(false);
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
