import React from 'react';
import axios from 'axios';
import { MessageCircle, RefreshCw, AlertCircle, Smartphone, Wifi, Loader2, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getWhatsAppSettings, updateWhatsAppSettings, addWhatsAppSettings } from '../../../lib/collections/whatsapp';
import { useWhatsAppApi } from '../hooks/useWhatsAppApi';
import { useLanguage } from '../../../contexts/LanguageContext';

interface WhatsAppAccount {
  id?: string;
  instance_id: string;
  token: string;
  name?: string;
  is_active?: boolean;
}

interface WhatsAppAccountSelectorProps {
  onAccountSelected: (account: { instance_id: string; token: string }) => void;
  initialAccount?: { instance_id: string; token: string } | null;
  showLabel?: boolean;
}

export function WhatsAppAccountSelector({ onAccountSelected, initialAccount, showLabel = false }: WhatsAppAccountSelectorProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { fetchWhatsAppAccount } = useWhatsAppApi();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accountInfo, setAccountInfo] = React.useState<{
    name: string;
    phone?: string;
    profile_picture?: string; 
    is_business?: boolean; 
  } | null>(null);
  const [isAccountInfoLoading, setIsAccountInfoLoading] = React.useState(false);
  const [activeAccount, setActiveAccount] = React.useState<{ 
    id?: string;
    instance_id: string;
    token: string;
    name: string;
  } | null>(initialAccount ? {
    instance_id: initialAccount.instance_id,
    token: initialAccount.token,
    name: 'حساب واتساب'
  } : null);
  
  // Cache for account info to prevent unnecessary API calls
  const accountInfoCache = React.useRef<{[key: string]: any}>({});

  // Function to fetch account info directly
  const fetchAccountInfo = async (instanceId: string, token: string) => {
    try {
      if (isAccountInfoLoading) {
        console.log('Account info already loading, skipping duplicate request');
        return null; // Prevent multiple simultaneous requests
      }
      
      // Check if we have cached info for this account
      const cacheKey = `${instanceId}:${token}`;
      if (accountInfoCache.current[cacheKey]) {
        setAccountInfo(accountInfoCache.current[cacheKey]);
        
        // Update connected account name
        if (activeAccount) {
          setActiveAccount({
            ...activeAccount,
            name: accountInfoCache.current[cacheKey].name || 'حساب واتساب'
          });
        }
        
        return accountInfoCache.current[cacheKey];
      }
      
      setIsAccountInfoLoading(true);
      setIsLoading(true);
      
      const info = await fetchWhatsAppAccount(instanceId, token);
      setAccountInfo(info);
      
      // Cache the account info
      accountInfoCache.current[cacheKey] = info;
      
      // Update connected account name
      if (activeAccount) {
        setActiveAccount({
          ...activeAccount,
          name: info.name || 'حساب واتساب'
        });
      }
      
      setIsLoading(false);
      
      return info;
    } catch (error) {
      console.error('Error fetching account info:', error);
      setIsLoading(false);
      return null;
    } finally {
      setIsAccountInfoLoading(false);
    }
  };

  // Set default account for demo
  React.useEffect(() => {
    // Only set if no account is selected yet
    if (initialAccount) {
      setActiveAccount(initialAccount);
      fetchAccountInfo(initialAccount.instance_id, initialAccount.token);
      onAccountSelected(initialAccount);
    }
  }, [initialAccount]);

  // Fetch account info when component mounts or when connected account changes
  React.useEffect(() => {
    if (activeAccount) {
      // Check if we have cached info for this account
      const cacheKey = `${activeAccount.instance_id}:${activeAccount.token}`;
      
      // Only fetch if we don't already have the info in cache or if the account changed
      if (!accountInfoCache.current[cacheKey]) {
        fetchAccountInfo(activeAccount.instance_id, activeAccount.token);
      } else if (!accountInfo || accountInfo.name !== accountInfoCache.current[cacheKey].name) {
        // If we have cached info but it's not set in state
        setAccountInfo(accountInfoCache.current[cacheKey]);
      }
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.instance_id, activeAccount?.token]);

  // Render a simple account display
  return (
    <div className={`${showLabel ? 'mb-4' : ''}`}>
      {showLabel && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
          <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span>حساب الواتساب</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-400">جاري تحميل الحساب...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">فشل الاتصال</span>
          </div>
        ) : accountInfo ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-green-50 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800">
              {accountInfo.profile_picture ? (
                <img src={accountInfo.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{accountInfo.name}</span>
                {accountInfo.is_business && (
                  <BadgeCheck className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Wifi className="w-3 h-3 text-green-500 dark:text-green-400" />
                <span className="text-xs text-green-600 dark:text-green-400">متصل</span>
              </div>
            </div>
            <button
              onClick={() => fetchAccountInfo(activeAccount?.instance_id || '', activeAccount?.token || '')}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">لم يتم اختيار حساب واتساب</span>
          </div>
        )}
      </div>
    </div>
  );
}

