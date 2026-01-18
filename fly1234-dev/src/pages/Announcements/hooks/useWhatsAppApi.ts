import { useState, useCallback } from 'react';
import axios from 'axios';

const MAX_RETRIES = 2; // Reduced from 3
const INITIAL_RETRY_DELAY = 1500;
const MAX_TIMEOUT = 20000;

export function useWhatsAppApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWhatsAppAccount = useCallback(async (instanceId: string, token: string, retryAttempt = 0): Promise<any> => {
    if (!instanceId || !token) {
      throw new Error('معرف النسخة ورمز الوصول مطلوبان');
    }

    if (!navigator.onLine) {
      const networkError = new Error('لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى');
      setError(networkError.message);
      throw networkError;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const cleanInstanceId = instanceId.startsWith('instance') 
        ? instanceId.substring(8) 
        : instanceId;
      
      if (!cleanInstanceId) {
        throw new Error('معرف النسخة غير صالح');
      }

      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/instance${cleanInstanceId}/instance/me`,
        params: { token, t: Date.now() },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        timeout: MAX_TIMEOUT
      });

      if (response.data) {
        if (response.data.error) {
          console.error('[useWhatsAppApi] API returned an error:', response.data.error);
          throw new Error(response.data.error);
        }
        
        setError(null);
        const accountData = response.data;
        
        return {
          ...accountData,
          name: accountData.name || accountData.pushname || 'حساب واتساب',
          phone: accountData.phone || accountData.id?.split('@')[0] || '',
          profile_picture: accountData.profile_picture || '',
          is_business: accountData.is_business || false
        };
      } else {
        throw new Error('لم يتم العثور على معلومات الحساب');
      }
    } catch (error) {
      console.error(`Error fetching WhatsApp account (Attempt ${retryAttempt + 1}):`, error);
      
      if (retryAttempt < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt);
        console.warn(`[useWhatsAppApi] Retrying account fetch in ${retryDelay}ms... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchWhatsAppAccount(instanceId, token, retryAttempt + 1);
      }
      
      let errorMessage = 'فشل في جلب معلومات الحساب بعد عدة محاولات.';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الاتصال. يرجى التحقق من سرعة الاتصال والمحاولة مرة أخرى';
        } else if (!error.response) {
          errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت وحالة خدمة UltraMsg';
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'غير مصرح بالوصول. يرجى التحقق من صحة رمز الوصول';
        } else if (error.response.status === 404) {
          errorMessage = 'لم يتم العثور على النسخة. يرجى التحقق من معرف النسخة';
        } else {
          errorMessage = `فشل: ${error.response?.data?.error || error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
        
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (instanceId: string, token: string) => {
    if (!instanceId || !token) {
      return { success: false, message: 'معرف النسخة ورمز الوصول مطلوبان' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'لا يوجد اتصال بالإنترنت' };
    }

    try {
      const cleanInstanceId = instanceId.startsWith('instance') ? instanceId.substring(8) : instanceId;
      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/instance${cleanInstanceId}/instance/status`,
        params: { token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000
      });

      if (response.status === 200 && response.data?.status?.account_status === "connected") {
        return { success: true, message: 'تم الاتصال بنجاح' };
      } else {
        return { success: false, message: `فشل الاتصال: ${response.data?.status?.account_status || response.status}` };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') return { success: false, message: 'انتهت مهلة الاتصال' };
        if (!error.response) return { success: false, message: 'فشل الاتصال بالخادم' };
        return { success: false, message: `فشل الاتصال: ${error.response.status}` };
      }
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  }, []);

  return {
    fetchWhatsAppAccount,
    testConnection,
    isLoading,
    error,
  };
}
