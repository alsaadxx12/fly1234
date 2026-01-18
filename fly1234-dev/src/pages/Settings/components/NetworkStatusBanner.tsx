import React from 'react';
import { WifiOff, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showBanner, setShowBanner] = React.useState(!navigator.onLine);

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show the online banner briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`px-4 py-3 flex items-center justify-center gap-2 transition-all duration-300 animate-fadeIn mb-4 ${  
      isOnline 
        ? 'bg-green-50 border border-green-100 shadow-sm rounded-lg' 
        : 'bg-yellow-50 border border-yellow-100 shadow-sm rounded-lg'
    }`}>
      {isOnline ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-green-700 text-sm font-medium">تم استعادة الاتصال بالإنترنت</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 rounded-full border border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-yellow-700 text-sm font-medium">لا يوجد اتصال بالإنترنت. بعض الميزات قد لا تعمل بشكل صحيح.</span>
        </div>
      )}
    </div>
  );
}