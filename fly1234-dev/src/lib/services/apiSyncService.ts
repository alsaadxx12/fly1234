import { collection, getDocs, updateDoc, doc, addDoc, Timestamp, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';

interface ApiConnection {
  id: string;
  name: string;
  email: string;
  password: string;
  apiUrl: string;
  sourceId: string;
  sourceName: string;
  currency: 'IQD' | 'USD' | 'AED';
  isActive: boolean;
  apiMethod?: 'POST' | 'GET';
  authToken?: string;
}

class ApiSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private syncFrequency: number = 30000;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private syncConfigDoc = 'global_sync_config';
  private unsubscribe: (() => void) | null = null;

  async initializeGlobalSync() {
    console.log('[ApiSyncService] 🚀 Initializing global sync service...');

    const syncConfigRef = doc(db, 'system_config', this.syncConfigDoc);

    this.unsubscribe = onSnapshot(syncConfigRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const config = docSnapshot.data();
        const isEnabled = config.syncEnabled || false;
        const frequency = config.syncFrequency || 30;

        console.log('[ApiSyncService] 🔄 Global sync config updated:', { isEnabled, frequency });

        if (isEnabled) {
          console.log('[ApiSyncService] ✅ Global sync ENABLED - Running in background');
          await this.startContinuousSync(frequency * 1000);
        } else {
          console.log('[ApiSyncService] ⏸️ Global sync DISABLED');
          this.stopContinuousSync();
        }
      } else {
        console.log('[ApiSyncService] 📝 Creating default sync config');
        await setDoc(syncConfigRef, {
          syncEnabled: false,
          syncFrequency: 30,
          lastUpdated: Timestamp.now()
        });
      }
    });
  }

  async startContinuousSync(frequency: number = 30000) {
    this.syncFrequency = frequency;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    console.log(`[ApiSyncService] 🔄 Starting continuous sync - Every ${frequency / 1000} seconds`);

    // تشغيل المزامنة فوراً
    await this.performSync();

    // ثم جدولة المزامنات المستقبلية
    this.syncInterval = setInterval(() => {
      console.log('[ApiSyncService] ⏰ Scheduled sync triggered');
      this.performSync();
    }, this.syncFrequency);

    console.log('[ApiSyncService] ✅ Background sync is now running');
  }

  stopContinuousSync() {
    if (this.syncInterval) {
      console.log('[ApiSyncService] 🛑 Stopping continuous sync');
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async updateGlobalSyncConfig(enabled: boolean, frequency: number) {
    const syncConfigRef = doc(db, 'system_config', this.syncConfigDoc);
    await setDoc(syncConfigRef, {
      syncEnabled: enabled,
      syncFrequency: frequency,
      lastUpdated: Timestamp.now(),
      updatedBy: 'system'
    }, { merge: true });
  }

  async getGlobalSyncConfig(): Promise<{ enabled: boolean; frequency: number }> {
    const syncConfigRef = doc(db, 'system_config', this.syncConfigDoc);
    const docSnapshot = await getDoc(syncConfigRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        enabled: data.syncEnabled || false,
        frequency: data.syncFrequency || 30
      };
    }

    return { enabled: false, frequency: 30 };
  }

  cleanup() {
    console.log('[ApiSyncService] 🧹 Cleaning up sync service');
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.stopContinuousSync();
  }

  addListener(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback);
  }

  removeListener(callback: (status: SyncStatus) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(callback => callback(status));
  }

  private async performSync() {
    if (this.isSyncing) {
      console.log('[ApiSyncService] ⚠️ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      const connectionsRef = collection(db, 'api_connections');
      const snapshot = await getDocs(connectionsRef);

      const activeConnections = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((conn: any) => conn.isActive) as ApiConnection[];

      if (activeConnections.length === 0) {
        console.log('[ApiSyncService] ℹ️ No active connections to sync');
        this.isSyncing = false;
        return;
      }

      console.log(`[ApiSyncService] 🔄 Starting sync for ${activeConnections.length} active connection(s)`);

      this.notifyListeners({
        isRunning: true,
        totalConnections: activeConnections.length,
        syncedCount: 0,
        failedCount: 0
      });

      let syncedCount = 0;
      let failedCount = 0;

      for (const connection of activeConnections) {
        try {
          await this.syncConnection(connection);
          syncedCount++;
          console.log(`[ApiSyncService] ✅ Successfully synced: ${connection.name}`);
        } catch (error) {
          failedCount++;
          console.error(`[ApiSyncService] ❌ Failed to sync ${connection.name}:`, error);
        }

        this.notifyListeners({
          isRunning: true,
          totalConnections: activeConnections.length,
          syncedCount,
          failedCount,
          currentConnection: connection.name
        });
      }

      console.log(`[ApiSyncService] 🎯 Sync completed - Success: ${syncedCount}, Failed: ${failedCount}`);

      this.notifyListeners({
        isRunning: false,
        totalConnections: activeConnections.length,
        syncedCount,
        failedCount,
        lastSyncTime: new Date()
      });

    } catch (error) {
      console.error('[ApiSyncService] Error during sync:', error);
      this.notifyListeners({
        isRunning: false,
        error: 'فشل في تنفيذ المزامنة'
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncConnection(connection: ApiConnection): Promise<void> {
    const config: any = {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    let response;

    if (connection.apiMethod === 'POST') {
      response = await axios.post(connection.apiUrl, {
        email: connection.email,
        password: connection.password,
        type: 'login'
      }, config);
    } else {
      if (connection.authToken) {
        config.headers['Authorization'] = `Bearer ${connection.authToken}`;
      }
      response = await axios.get(connection.apiUrl, config);
    }

    let balance = 0;
    const responseData = response.data?.data || response.data;

    if (responseData?.wallets && Array.isArray(responseData.wallets)) {
      const wallet = responseData.wallets.find((w: any) => w.currency === connection.currency);
      if (wallet && typeof wallet.balance === 'number') {
        balance = wallet.balance;
      } else {
        throw new Error(`لم يتم العثور على محفظة بعملة ${connection.currency}`);
      }
    } else if (responseData?.wallet && typeof responseData.wallet.balance === 'number') {
      if (responseData.wallet.currency === connection.currency) {
        balance = responseData.wallet.balance;
      } else {
        throw new Error(`المحفظة بعملة ${responseData.wallet.currency} والمطلوب ${connection.currency}`);
      }
    } else if (responseData && typeof responseData.balance === 'number') {
      balance = responseData.balance;
    } else if (responseData && typeof responseData.amount === 'number') {
      balance = responseData.amount;
    } else if (responseData && typeof responseData.credit === 'number') {
      balance = responseData.credit;
    } else {
      throw new Error('تنسيق الاستجابة غير صحيح');
    }

    const balancesRef = collection(db, 'balances');
    const balancesSnapshot = await getDocs(balancesRef);
    const existingBalance = balancesSnapshot.docs.find(
      doc => doc.data().sourceId === connection.sourceId
    );

    if (existingBalance) {
      await updateDoc(doc(db, 'balances', existingBalance.id), {
        amount: balance,
        lastUpdated: Timestamp.now(),
        isAutoSync: true,
        apiSource: connection.name
      });
    } else {
      await addDoc(collection(db, 'balances'), {
        sourceId: connection.sourceId,
        sourceName: connection.sourceName,
        amount: balance,
        currency: connection.currency,
        type: 'airline',
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now(),
        isAutoSync: true,
        apiSource: connection.name
      });
    }

    await updateDoc(doc(db, 'api_connections', connection.id), {
      lastSync: Timestamp.now(),
      lastSyncStatus: 'success',
      lastSyncError: null
    });
  }

  async syncNow(): Promise<void> {
    await this.performSync();
  }

  isRunning(): boolean {
    return this.syncInterval !== null;
  }

  getSyncFrequency(): number {
    return this.syncFrequency;
  }
}

export interface SyncStatus {
  isRunning: boolean;
  totalConnections?: number;
  syncedCount?: number;
  failedCount?: number;
  currentConnection?: string;
  lastSyncTime?: Date;
  error?: string;
}

export const apiSyncService = new ApiSyncService();
