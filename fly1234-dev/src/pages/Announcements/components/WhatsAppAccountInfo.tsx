import React from 'react';
import { MessageCircle, Loader2, AlertCircle, Smartphone, BadgeCheck, Phone, Wifi, RefreshCw } from 'lucide-react';

interface WhatsAppAccountInfoProps {
  accountInfo: any;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const WhatsAppAccountInfo: React.FC<WhatsAppAccountInfoProps> = ({ 
  accountInfo,
  isLoading,
  error,
  onRefresh
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          <span className="text-gray-500 text-sm">جاري تحميل معلومات الحساب...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-600 text-sm">فشل الاتصال بالواتساب</span>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : !accountInfo ? (
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-600 text-sm">لم يتم اختيار حساب واتساب</span>
        </div>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-green-200 flex-shrink-0 bg-green-50">
            {accountInfo.profile_picture ? (
              <img src={accountInfo.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-gray-800 font-bold text-sm">{accountInfo.name}</h4>
              {accountInfo.is_business && (
                <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  <BadgeCheck className="w-2.5 h-2.5 inline-block mr-1" />
                  <span>Business</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-mono" dir="ltr">{accountInfo.phone || accountInfo.id?.split('@')[0]}</span>
              </div>
              
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full text-xs whitespace-nowrap">
                <Wifi className="w-2.5 h-2.5" />
                <span className="font-bold text-[9px]">متصل</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsAppAccountInfo;