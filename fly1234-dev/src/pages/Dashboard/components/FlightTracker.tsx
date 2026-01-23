import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Plane, Loader2, RefreshCw, MapPin, TrendingUp, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom plane icon
const createPlaneIcon = (heading: number, theme: 'dark' | 'light') => {
  const color = theme === 'dark' ? '#60a5fa' : '#3b82f6';
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(${heading} 12 12)"/>
  </svg>`;
  return new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svgString),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface Aircraft {
  icao24: string;
  callsign: string | null;
  latitude: number | null;
  longitude: number | null;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  altitude: number | null;
  onGround: boolean;
}

interface FlightTrackerProps {
  className?: string;
}

const MapUpdater = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const FlightTracker: React.FC<FlightTrackerProps> = ({ className = '' }) => {
  const { theme } = useTheme();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.3152, 44.3661]); // Baghdad, Iraq
  const [mapZoom, setMapZoom] = useState(6);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFlights = async () => {
    try {
      setError(null);
      const response = await fetch('https://opensky-network.org/api/states/all');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.states && Array.isArray(data.states)) {
        const processedAircraft: Aircraft[] = data.states
          .filter((state: any[]) => 
            state[5] !== null && state[6] !== null && // Has latitude and longitude
            state[5] >= -90 && state[5] <= 90 && // Valid latitude
            state[6] >= -180 && state[6] <= 180 && // Valid longitude
            !state[8] // Not on ground
          )
          .slice(0, 100) // Limit to 100 aircraft for performance
          .map((state: any[]) => ({
            icao24: state[0] || 'UNKNOWN',
            callsign: state[1]?.trim() || null,
            latitude: state[6],
            longitude: state[5],
            velocity: state[9] || null,
            heading: state[10] || null,
            verticalRate: state[11] || null,
            altitude: state[7] || null,
            onGround: state[8] || false,
          }));
        
        setAircraft(processedAircraft);
        setLastUpdate(new Date());
        setLoading(false);
      } else {
        throw new Error('Invalid data format from API');
      }
    } catch (err: any) {
      console.error('Error fetching flights:', err);
      setError(err.message || 'فشل في جلب بيانات الطيران');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
    
    // Update every 10 seconds
    intervalRef.current = setInterval(() => {
      fetchFlights();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatAltitude = (alt: number | null) => {
    if (alt === null) return 'غير معروف';
    return `${Math.round(alt / 0.3048)} قدم`; // Convert meters to feet
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null) return 'غير معروف';
    return `${Math.round(speed * 1.94384)} عقدة`; // Convert m/s to knots
  };

  return (
    <div className={`relative w-full rounded-[2.5rem] overflow-hidden ${theme === 'dark' ? 'bg-slate-900/40 border border-white/10' : 'bg-white/90 border border-gray-100'} ${className}`} style={{ height: '520px' }}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-[100] p-4 ${theme === 'dark' ? 'bg-gradient-to-b from-slate-900/95 to-transparent' : 'bg-gradient-to-b from-white/95 to-transparent'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Plane className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                تتبع الطيران المباشر
              </h3>
              <p className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {aircraft.length} طائرة نشطة
                {lastUpdate && ` • آخر تحديث: ${lastUpdate.toLocaleTimeString('ar-IQ')}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchFlights}
              disabled={loading}
              className={`p-2 rounded-xl transition-all ${theme === 'dark' 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-full relative">
        {loading && aircraft.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                جاري تحميل بيانات الطيران...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className={`text-center p-6 rounded-2xl ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <p className="text-sm font-bold">{error}</p>
              <button
                onClick={fetchFlights}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
            className="rounded-[2.5rem]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={theme === 'dark' 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            {aircraft.map((plane, index) => {
              if (plane.latitude === null || plane.longitude === null) return null;
              
              const heading = plane.heading || 0;
              const planeIcon = createPlaneIcon(heading, theme);
              
              return (
                <Marker
                  key={`${plane.icao24}-${index}`}
                  position={[plane.latitude, plane.longitude]}
                  icon={planeIcon}
                >
                  <Popup>
                    <div className={`p-2 min-w-[200px] ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="font-black text-sm mb-2">
                        {plane.callsign || plane.icao24}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 opacity-60" />
                          <span>الارتفاع: {formatAltitude(plane.altitude)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gauge className="w-3 h-3 opacity-60" />
                          <span>السرعة: {formatSpeed(plane.velocity)}</span>
                        </div>
                        {plane.heading !== null && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 opacity-60" />
                            <span>الاتجاه: {Math.round(plane.heading)}°</span>
                          </div>
                        )}
                        <div className="text-[10px] opacity-60 mt-2 pt-2 border-t">
                          ICAO: {plane.icao24}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Stats Footer */}
      {aircraft.length > 0 && (
        <div className={`absolute bottom-0 left-0 right-0 z-[100] p-4 ${theme === 'dark' ? 'bg-gradient-to-t from-slate-900/95 to-transparent' : 'bg-gradient-to-t from-white/95 to-transparent'}`}>
          <div className="flex items-center justify-center gap-6 text-xs font-bold">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{aircraft.length} طائرة نشطة</span>
            </div>
            {lastUpdate && (
              <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                آخر تحديث: {lastUpdate.toLocaleTimeString('ar-IQ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightTracker;
