import { useEffect } from 'react';
import { apiSyncService } from '../lib/services/apiSyncService';

/**
 * مكون المزامنة العالمية - يعمل في الخلفية طوال الوقت
 * يتم تحميله مرة واحدة عند بدء التطبيق ويستمر في العمل
 */
export function GlobalApiSync() {
  useEffect(() => {
    console.log('[GlobalApiSync] Initializing global API sync service...');

    // تهيئة خدمة المزامنة العالمية
    apiSyncService.initializeGlobalSync();

    // التنظيف عند إلغاء التحميل
    return () => {
      console.log('[GlobalApiSync] Cleaning up global API sync service...');
      apiSyncService.cleanup();
    };
  }, []); // يتم التشغيل مرة واحدة فقط

  // هذا المكون لا يعرض أي شيء - يعمل في الخلفية فقط
  return null;
}

export default GlobalApiSync;
