import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectivityManager: React.FC = () => {
    useEffect(() => {
        const handleOnline = () => {
            toast.success('تم استعادة الاتصال بالإنترنت', {
                icon: <Wifi className="w-4 h-4" />,
                duration: 4000
            });
        };

        const handleOffline = () => {
            toast.error('انقطع الاتصال بالإنترنت', {
                icon: <WifiOff className="w-4 h-4" />,
                description: 'يرجى التحقق من الشبكة الخاصة بك',
                duration: Infinity,
                action: {
                    label: 'إعادة محاولة',
                    onClick: () => window.location.reload()
                }
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return null;
};

export default ConnectivityManager;
