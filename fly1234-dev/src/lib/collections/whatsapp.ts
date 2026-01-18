import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface WhatsAppAccount {
  id?: string;
  name?: string;
  instance_id: string;
  token: string;
  is_active?: boolean;
  phoneNumber?: string;
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WhatsAppSettings {
  currentAccountId?: string;
  accounts?: WhatsAppAccount[];
  instance_id?: string;
  token?: string;
  name?: string;
  is_active?: boolean;
}

export const getWhatsAppSettings = async (userId: string): Promise<any> => {
  try {
    return await getGlobalWhatsAppSettings();
  } catch (error) {
    console.error('Error getting WhatsApp settings:', error);
    return [];
  }
};

export const getGlobalWhatsAppSettings = async (): Promise<any[]> => {
  try {
    const settingsRef = collection(db, 'whatsapp_settings');
    const q = query(settingsRef, where('is_global', '==', true));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Fallback for older structure
    const oldSettingsRef = doc(db, 'settings', 'whatsapp');
    const oldSettingsSnap = await getDoc(oldSettingsRef);

    if (oldSettingsSnap.exists()) {
      const data = oldSettingsSnap.data();
      if (data.accounts && Array.isArray(data.accounts)) {
        return data.accounts;
      }
      if (data.instance_id && data.token) {
        return [{
          id: 'global_default',
          instance_id: data.instance_id,
          token: data.token,
          name: data.name || 'Default Global',
          is_active: true,
          is_global: true
        }];
      }
    }

    return [];
  } catch (error) {
    console.error('Error getting global WhatsApp settings:', error);
    return [];
  }
};

export const saveWhatsAppSettings = async (userId: string, settings: WhatsAppSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, 'whatsappSettings', userId);
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving WhatsApp settings:', error);
    throw error;
  }
};

export const saveGlobalWhatsAppSettings = async (settings: WhatsAppSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, 'settings', 'whatsapp');
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving global WhatsApp settings:', error);
    throw error;
  }
};

export const ensureDefaultAccount = async (userId: string): Promise<any> => {
  try {
    const accounts = await getWhatsAppSettings(userId);

    if (!accounts || accounts.length === 0) {
      return null;
    }

    return accounts[0];
  } catch (error) {
    console.error('Error ensuring default account:', error);
    return null;
  }
};

export const addWhatsAppAccount = async (userId: string, account: Omit<WhatsAppAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const settings = await getWhatsAppSettings(userId) || { currentAccountId: '', accounts: [] };

    const newAccount: WhatsAppAccount = {
      ...account,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    settings.accounts.push(newAccount);

    if (!settings.currentAccountId || settings.accounts.length === 1) {
      settings.currentAccountId = newAccount.id;
    }

    await saveWhatsAppSettings(userId, settings);
  } catch (error) {
    console.error('Error adding WhatsApp account:', error);
    throw error;
  }
};

export const updateWhatsAppAccount = async (userId: string, accountId: string, updates: Partial<WhatsAppAccount>): Promise<void> => {
  try {
    const settings = await getWhatsAppSettings(userId);

    if (!settings) return;

    const accountIndex = settings.accounts.findIndex(acc => acc.id === accountId);

    if (accountIndex === -1) return;

    settings.accounts[accountIndex] = {
      ...settings.accounts[accountIndex],
      ...updates,
      updatedAt: new Date()
    };

    await saveWhatsAppSettings(userId, settings);
  } catch (error) {
    console.error('Error updating WhatsApp account:', error);
    throw error;
  }
};

export const deleteWhatsAppAccount = async (userId: string, accountId: string): Promise<void> => {
  try {
    const settings = await getWhatsAppSettings(userId);

    if (!settings) return;

    settings.accounts = settings.accounts.filter(acc => acc.id !== accountId);

    if (settings.currentAccountId === accountId) {
      settings.currentAccountId = settings.accounts.length > 0 ? settings.accounts[0].id : '';
    }

    await saveWhatsAppSettings(userId, settings);
  } catch (error) {
    console.error('Error deleting WhatsApp account:', error);
    throw error;
  }
};

export const setCurrentAccount = async (userId: string, accountId: string): Promise<void> => {
  try {
    const settings = await getWhatsAppSettings(userId);

    if (!settings) return;

    const accountExists = settings.accounts.some(acc => acc.id === accountId);

    if (!accountExists) return;

    settings.currentAccountId = accountId;

    await saveWhatsAppSettings(userId, settings);
  } catch (error) {
    console.error('Error setting current account:', error);
    throw error;
  }
};

export const getCurrentAccount = async (userId: string): Promise<WhatsAppAccount | null> => {
  try {
    const settings = await getWhatsAppSettings(userId);

    if (!settings || !settings.currentAccountId) return null;

    return settings.accounts.find(acc => acc.id === settings.currentAccountId) || null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};
