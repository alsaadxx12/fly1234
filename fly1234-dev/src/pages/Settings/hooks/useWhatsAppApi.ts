import { useState, useCallback } from 'react';
import axios from 'axios';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useWhatsAppApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch WhatsApp account info with retry mechanism
  const fetchWhatsAppAccount = useCallback(async (instanceId: string, token: string, retryAttempt = 0) => {
    if (!instanceId || !token) {
      throw new Error('معرف النسخة ورمز الوصول مطلوبان');
    }

    // Enhanced network check with more detailed error message
    if (!navigator.onLine) {
      const networkError = new Error('لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى');
      setError(networkError.message);
      throw networkError;
    }
    
    setIsLoading(true);
    setError(null);
    setRetryCount(retryAttempt);
    
    try {
      // Format instance ID correctly - remove 'instance' prefix if it exists
      const cleanInstanceId = instanceId.startsWith('instance') 
        ? instanceId.substring(8) 
        : instanceId;
      
      if (!cleanInstanceId) {
        throw new Error('معرف النسخة غير صالح');
      }

      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/instance${cleanInstanceId}/instance/me`,
        params: { token },
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status === 200 // Only accept 200 status
      });
      
      if (response.data) {
        setError(null);
        return response.data;
      } else {
        throw new Error('لم يتم العثور على معلومات الحساب');
      }
    } catch (error) {
      console.error('Error fetching WhatsApp account:', error);
      
      // Check if we should retry
      if (retryAttempt < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryAttempt);
        console.log(`Retrying in ${retryDelay}ms... (Attempt ${retryAttempt + 1}/${MAX_RETRIES})`);
        
        await delay(retryDelay);
        return fetchWhatsAppAccount(instanceId, token, retryAttempt + 1);
      }
      
      // Enhanced error handling with more specific messages
      if (axios.isAxiosError(error)) {
        let errorMessage: string;
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'انتهت مهلة الاتصال. يرجى التحقق من سرعة الاتصال والمحاولة مرة أخرى';
        } else if (!error.response) {
          errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت وحالة خدمة UltraMsg';
        } else if (error.response.status === 403) {
          errorMessage = 'غير مصرح بالوصول. يرجى التحقق من صحة رمز الوصول';
        } else if (error.response.status === 404) {
          errorMessage = 'لم يتم العثور على النسخة. يرجى التحقق من معرف النسخة';
        } else {
          errorMessage = `فشل في جلب معلومات الحساب (${error.response?.status || 'خطأ'}). يرجى التحقق من صحة المعرف والرمز`;
        }
        
        setError(errorMessage);
        throw new Error(errorMessage);
      } else {
        const unexpectedError = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
        setError(unexpectedError);
        throw new Error(unexpectedError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test connection to the WhatsApp API
  const testConnection = useCallback(async (instanceId: string, token: string) => {
    if (!instanceId || !token) {
      return { success: false, message: 'معرف النسخة ورمز الوصول مطلوبان' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'لا يوجد اتصال بالإنترنت' };
    }

    try {
      // Format instance ID correctly
      const cleanInstanceId = instanceId.startsWith('instance') 
        ? instanceId.substring(8) 
        : instanceId;

      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/instance${cleanInstanceId}/instance/status`,
        params: { token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 8000
      });

      if (response.status === 200) {
        return { success: true, message: 'تم الاتصال بنجاح' };
      } else {
        return { success: false, message: `فشل الاتصال: ${response.status}` };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { success: false, message: 'انتهت مهلة الاتصال' };
        } else if (!error.response) {
          return { success: false, message: 'فشل الاتصال بالخادم' };
        } else {
          return { success: false, message: `فشل الاتصال: ${error.response.status}` };
        }
      }
      
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  }, []);

  return {
    fetchWhatsAppAccount,
    testConnection,
    isLoading,
    error,
    retryCount
  };
}