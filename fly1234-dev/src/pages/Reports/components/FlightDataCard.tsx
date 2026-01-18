import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ArrowRight, Plane, Calendar, Clock, Edit, Save, X, Repeat, User, Settings, Key, Link2, Loader2, Search, Eye, EyeOff, Brain, Filter, Layers, Check, Copy, MessageCircle } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNotification } from '../../../contexts/NotificationContext';
import { BookingFilters } from '../hooks/useBookingReports';
import CustomDatePicker from '../../../components/CustomDatePicker';
import { ExtractedData } from '../../../lib/services/smartTicketExtractor';

interface FlightDataCardProps {
  extractedData: ExtractedData | null;
  onDataChange: (data: any) => void;
  onSearch: (filters: BookingFilters) => void;
  isSearching: boolean;
}

const notificationTypes: { [key: string]: { label: string; color: string } } = {
  delay: { label: 'تأخير', color: 'orange' },
  advance: { label: 'تقديم', color: 'blue' },
  cancel: { label: 'إلغاء', color: 'red' },
  number_change: { label: 'تغيير رقم الرحلة', color: 'purple' },
  number_time_delay: { label: 'تغيير الرقم والوقت', color: 'purple' },
  number_time_advance: { label: 'تغيير الرقم والوقت', color: 'purple' },
};

const FlightDataCard: React.FC<FlightDataCardProps> = ({ extractedData, onDataChange, onSearch, isSearching }) => {
  const { theme } = useTheme();
  
  const flightData = extractedData || {
    airline: '',
    flightNumber: '',
    from: '',
    to: '',
    date: '',
    oldTime: '',
    newTime: '',
    notificationType: 'delay',
    newFlightNumber: '',
    newAirline: '',
    signature: 'fly4all team',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onDataChange({ ...flightData, [name]: value });
  };
  
  const handleDateChange = (date: string) => {
    onDataChange({ ...flightData, date: date });
  };

  const handleSearch = () => {
    onSearch({
      airline: flightData.airline,
      flightNumber: flightData.flightNumber,
      dateFrom: flightData.date,
      dateTo: flightData.date,
      origin: flightData.from,
      destination: flightData.to,
    });
  };

  const renderField = (label: string, value: string, name: keyof typeof flightData, icon: React.ReactNode, type: 'text' | 'time' | 'date' | 'select' = 'text', options: {value: string; label: string}[] = []) => (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1`}>{icon}{label}</label>
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 rounded-lg outline-none h-[40px]`}
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : type === 'date' ? (
         <div className="h-[40px]">
          <CustomDatePicker
            value={value}
            onChange={(date) => handleDateChange(date)}
            placeholder="اختر التاريخ"
          />
        </div>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleInputChange}
          dir={type === 'time' || name === 'flightNumber' || name === 'newFlightNumber' ? 'ltr' : undefined}
          className={`w-full px-3 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 rounded-lg outline-none text-center h-[40px]`}
        />
      )}
    </div>
  );

  return (
    <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Plane className="w-5 h-5 text-blue-500" />
          بيانات الرحلة
        </h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {renderField('شركة الطيران', flightData.airline, 'airline', <Plane className="w-3 h-3" />)}
          {renderField('رقم الرحلة', flightData.flightNumber, 'flightNumber', <Plane className="w-3 h-3" />)}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {renderField('التاريخ (ميلادي)', flightData.date, 'date', <Calendar className="w-3 h-3" />, 'date')}
        </div>
        <div className="flex items-center gap-3">
          {renderField('من', flightData.from, 'from', <ArrowRight className="w-3 h-3" />)}
          <div className="pt-5">
            <Repeat className="w-5 h-5 text-gray-400" />
          </div>
          {renderField('إلى', flightData.to, 'to', <ArrowRight className="w-3 h-3" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {renderField('الوقت القديم', flightData.oldTime, 'oldTime', <Clock className="w-3 h-3" />, 'time')}
          {renderField('الوقت الجديد', flightData.newTime, 'newTime', <Clock className="w-3 h-3" />, 'time')}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {renderField('نوع التبليغ', flightData.notificationType, 'notificationType', <Plane className="w-3 h-3" />, 'select', Object.entries(notificationTypes).map(([value, {label}]) => ({value, label})))}
          {renderField('التوقيع', flightData.signature, 'signature', <User className="w-3 h-3" />)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3">
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400">
          {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {isSearching ? 'جاري البحث...' : 'بحث وتصفية'}
        </button>
      </div>
    </div>
  );
};

export default FlightDataCard;
