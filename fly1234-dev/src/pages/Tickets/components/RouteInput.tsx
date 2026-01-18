import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Sparkles, ArrowRight, Plane, Plus, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface RouteInputProps {
  routes: string[];
  onRoutesChange: (routes: string[]) => void;
}

type RouteType = 'one-way' | 'round-trip' | 'multi-stop';

const AIRPORT_SUGGESTIONS = [
  { code: 'BGW', name: 'Baghdad', country: 'Iraq' },
  { code: 'BSR', name: 'Basra', country: 'Iraq' },
  { code: 'EBL', name: 'Erbil', country: 'Iraq' },
  { code: 'NJF', name: 'Najaf', country: 'Iraq' },
  { code: 'ISU', name: 'Sulaymaniyah', country: 'Iraq' },
  { code: 'DXB', name: 'Dubai', country: 'UAE' },
  { code: 'AUH', name: 'Abu Dhabi', country: 'UAE' },
  { code: 'DOH', name: 'Doha', country: 'Qatar' },
  { code: 'KWI', name: 'Kuwait', country: 'Kuwait' },
  { code: 'RUH', name: 'Riyadh', country: 'Saudi Arabia' },
  { code: 'JED', name: 'Jeddah', country: 'Saudi Arabia' },
  { code: 'CAI', name: 'Cairo', country: 'Egypt' },
  { code: 'IST', name: 'Istanbul', country: 'Turkey' },
  { code: 'SAW', name: 'Sabiha Gokcen', country: 'Turkey' },
  { code: 'BEY', name: 'Beirut', country: 'Lebanon' },
  { code: 'AMM', name: 'Amman', country: 'Jordan' },
  { code: 'LHR', name: 'London Heathrow', country: 'UK' },
  { code: 'CDG', name: 'Paris CDG', country: 'France' },
  { code: 'FRA', name: 'Frankfurt', country: 'Germany' },
  { code: 'AMS', name: 'Amsterdam', country: 'Netherlands' },
];

export default function RouteInput({ routes, onRoutesChange }: RouteInputProps) {
  const { theme } = useTheme();
  const [routeType, setRouteType] = useState<RouteType>('one-way');
  const [departureStops, setDepartureStops] = useState<string[]>(['', '']);
  const [returnFrom, setReturnFrom] = useState('');
  const [returnTo, setReturnTo] = useState('');
  const [activeField, setActiveField] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<typeof AIRPORT_SUGGESTIONS>([]);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parse routes on mount
    if (routes.length > 0 && routes[0]) {
      const parts = routes[0].split(' | ');

      if (parts.length === 1) {
        // One way or multi-stop
        const stops = parts[0].split(' - ').filter(r => r.trim());
        if (stops.length === 2) {
          setRouteType('one-way');
          setDepartureStops([stops[0], stops[1]]);
        } else if (stops.length > 2) {
          setRouteType('multi-stop');
          setDepartureStops(stops);
        }
      } else if (parts.length === 2) {
        // Round trip
        setRouteType('round-trip');
        const depStops = parts[0].split(' - ').filter(r => r.trim());
        const retStops = parts[1].split(' - ').filter(r => r.trim());

        setDepartureStops(depStops.length > 0 ? depStops : ['', '']);
        setReturnFrom(retStops[0] || '');
        setReturnTo(retStops[1] || '');
      }
    }
  }, []);

  useEffect(() => {
    // Update parent whenever routes change
    let fullRoute = '';

    if (routeType === 'one-way') {
      const depStops = departureStops.slice(0, 2).filter(s => s.trim());
      fullRoute = depStops.join(' - ');
    } else if (routeType === 'multi-stop') {
      const depStops = departureStops.filter(s => s.trim());
      fullRoute = depStops.join(' - ');
    } else if (routeType === 'round-trip') {
      const depStops = departureStops.slice(0, 2).filter(s => s.trim());
      const retStops = [returnFrom, returnTo].filter(s => s.trim());
      const depString = depStops.join(' - ');
      const retString = retStops.join(' - ');
      fullRoute = retString ? `${depString} | ${retString}` : depString;
    }

    onRoutesChange([fullRoute]);
  }, [routeType, departureStops, returnFrom, returnTo]);

  const updateField = (field: string, index: number | null, value: string) => {
    const upperValue = value.toUpperCase();

    if (field === 'departure' && index !== null) {
      const newStops = [...departureStops];
      newStops[index] = upperValue;
      setDepartureStops(newStops);
    } else if (field === 'returnFrom') {
      setReturnFrom(upperValue);
    } else if (field === 'returnTo') {
      setReturnTo(upperValue);
    }

    if (value.length > 0) {
      const filtered = AIRPORT_SUGGESTIONS.filter(
        airport =>
          airport.code.toLowerCase().includes(value.toLowerCase()) ||
          airport.name.toLowerCase().includes(value.toLowerCase()) ||
          airport.country.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setActiveField(field + (index !== null ? index : ''));
    } else {
      setSuggestions([]);
      setActiveField(null);
    }
  };

  const selectSuggestion = (field: string, index: number | null, code: string) => {
    if (field === 'departure' && index !== null) {
      const newStops = [...departureStops];
      newStops[index] = code;
      setDepartureStops(newStops);
    } else if (field === 'returnFrom') {
      setReturnFrom(code);
    } else if (field === 'returnTo') {
      setReturnTo(code);
    }

    setSuggestions([]);
    setActiveField(null);
  };

  const addDepartureStop = () => {
    setDepartureStops([...departureStops, '']);
  };

  const removeDepartureStop = (index: number) => {
    if (departureStops.length > 2) {
      setDepartureStops(departureStops.filter((_, i) => i !== index));
    }
  };

  const handleRouteTypeChange = (type: RouteType) => {
    setRouteType(type);

    // Reset values based on type
    if (type === 'one-way') {
      setDepartureStops([departureStops[0] || '', departureStops[1] || '']);
      setReturnFrom('');
      setReturnTo('');
    } else if (type === 'round-trip') {
      setDepartureStops([departureStops[0] || '', departureStops[1] || '']);
    } else if (type === 'multi-stop') {
      if (departureStops.length < 3) {
        setDepartureStops([departureStops[0] || '', departureStops[1] || '', '']);
      }
      setReturnFrom('');
      setReturnTo('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeField) {
        const clickedInput = Object.values(inputRefs.current).some(ref => ref?.contains(event.target as Node));
        const clickedSuggestions = suggestionsRef.current?.contains(event.target as Node);

        if (!clickedInput && !clickedSuggestions) {
          setSuggestions([]);
          setActiveField(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeField]);

  const renderInput = (
    field: string,
    index: number | null,
    value: string,
    placeholder: string,
    label: string
  ) => {
    const fieldKey = field + (index !== null ? index : '');

    return (
      <div className="relative flex-1">
        <label className={`block text-xs font-bold mb-1.5 text-center ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {label}
        </label>

        <div className="relative">
          <input
            ref={el => inputRefs.current[fieldKey] = el}
            value={value}
            onChange={(e) => updateField(field, index, e.target.value)}
            onFocus={() => {
              if (value.length > 0) {
                const filtered = AIRPORT_SUGGESTIONS.filter(
                  airport =>
                    airport.code.toLowerCase().includes(value.toLowerCase()) ||
                    airport.name.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(filtered);
                setActiveField(fieldKey);
              }
            }}
            placeholder={placeholder}
            lang="en"
            inputMode="text"
            className={`w-full px-4 py-3.5 rounded-xl text-base font-bold text-center transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-[#16213e] border border-[#2d2d44] text-white placeholder-gray-500 hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
            } outline-none`}
            required
          />

          {activeField === fieldKey && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className={`absolute z-[100] w-full mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`px-2 py-1.5 border-b ${
                theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span className={`text-xs font-black ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    اقتراحات ({suggestions.length})
                  </span>
                </div>
              </div>

              {suggestions.map((airport) => (
                <button
                  key={airport.code}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(field, index, airport.code);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs transition-colors border-b last:border-b-0 ${
                    theme === 'dark'
                      ? 'hover:bg-gray-700 border-gray-700 text-gray-200'
                      : 'hover:bg-blue-50 border-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                        {airport.code}
                      </span>
                      <span className={`mr-1.5 font-bold ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {airport.name}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {airport.country}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const buildFullRoute = () => {
    if (routeType === 'one-way') {
      const stops = departureStops.slice(0, 2).filter(s => s.trim());
      return stops.join(' - ');
    } else if (routeType === 'multi-stop') {
      const stops = departureStops.filter(s => s.trim());
      return stops.join(' - ');
    } else if (routeType === 'round-trip') {
      const depStops = departureStops.slice(0, 2).filter(s => s.trim());
      const retStops = [returnFrom, returnTo].filter(s => s.trim());
      const depString = depStops.join(' - ');
      const retString = retStops.join(' - ');
      return retString ? `${depString} | ${retString}` : depString;
    }
    return '';
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <label className={`text-sm font-black ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          الروت (المسار) *
        </label>
      </div>

      {/* Route Type Selector */}
      <div className={`flex gap-2 mb-4 p-1 rounded-lg ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        <button
          type="button"
          onClick={() => handleRouteTypeChange('one-way')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            routeType === 'one-way'
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
              : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          ذهاب فقط
        </button>

        <button
          type="button"
          onClick={() => handleRouteTypeChange('round-trip')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            routeType === 'round-trip'
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
              : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          ذهاب وعودة
        </button>

        <button
          type="button"
          onClick={() => handleRouteTypeChange('multi-stop')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            routeType === 'multi-stop'
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
              : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          رحلة متعددة المحطات
        </button>
      </div>

      <div className="space-y-3">
        {/* Departure Route */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-blue-900/10 border-blue-800/50'
            : 'bg-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${
              theme === 'dark' ? 'bg-blue-800/50' : 'bg-blue-100'
            }`}>
              <Plane className={`w-4 h-4 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <span className={`text-xs font-black ${
              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              {routeType === 'multi-stop' ? 'مسار الرحلة' : 'الذهاب'}
            </span>
          </div>

          {routeType === 'one-way' || routeType === 'round-trip' ? (
            <div className="flex items-center gap-2">
              {renderInput('departure', 0, departureStops[0] || '', 'BGW', 'من')}

              <div className={`pt-6 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <ArrowRight className="w-5 h-5" />
              </div>

              {renderInput('departure', 1, departureStops[1] || '', 'DXB', 'إلى')}
            </div>
          ) : (
            <div className="space-y-2">
              {departureStops.map((stop, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                    theme === 'dark'
                      ? 'bg-blue-800/50 text-blue-300'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    {renderInput('departure', index, stop, index === 0 ? 'BGW' : index === departureStops.length - 1 ? 'DXB' : 'IST', `المحطة ${index + 1}`)}
                  </div>

                  {departureStops.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeDepartureStop(index)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-red-900/30 text-red-400'
                          : 'hover:bg-red-50 text-red-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addDepartureStop}
                className={`w-full px-3 py-2 rounded-lg border-2 border-dashed text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'border-blue-700 text-blue-400 hover:bg-blue-900/20'
                    : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-1" />
                إضافة محطة توقف
              </button>
            </div>
          )}
        </div>

        {/* Return Route - Only for round-trip */}
        {routeType === 'round-trip' && (
          <div className={`p-4 rounded-lg border ${
            theme === 'dark'
              ? 'bg-green-900/10 border-green-800/50'
              : 'bg-green-50/50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${
                theme === 'dark' ? 'bg-green-800/50' : 'bg-green-100'
              }`}>
                <Plane className={`w-4 h-4 rotate-180 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <span className={`text-xs font-black ${
                theme === 'dark' ? 'text-green-300' : 'text-green-700'
              }`}>
                العودة
              </span>
            </div>

            <div className="flex items-center gap-2">
              {renderInput('returnFrom', null, returnFrom, 'DXB', 'من')}

              <div className={`pt-6 ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                <ArrowRight className="w-5 h-5" />
              </div>

              {renderInput('returnTo', null, returnTo, 'BGW', 'إلى')}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {buildFullRoute() && (
        <div className={`mt-3 p-3 rounded-lg text-sm font-bold text-center ${
          theme === 'dark'
            ? 'bg-gray-800 text-gray-300 border border-gray-700'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          <div className="flex items-center justify-center gap-2 text-xs font-black mb-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>المسار الكامل</span>
          </div>
          <div className="font-mono">
            {buildFullRoute()}
          </div>
        </div>
      )}
    </div>
  );
}
