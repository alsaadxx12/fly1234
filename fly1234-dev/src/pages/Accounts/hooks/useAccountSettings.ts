import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface AccountSettings {
  id?: string;
  userId: string;
  useCustomColumns: boolean; 
  showGatesColumn: boolean;
  showInternalColumn: boolean;
  showExternalColumn: boolean;
  showFlyColumn: boolean;
  visibleColumns: string[];
  gatesColumnLabel: string;
  internalColumnLabel: string;
  externalColumnLabel: string;
  flyColumnLabel: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useAccountSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccountSettings>({
    userId: user?.uid || '',
    useCustomColumns: false,
    showGatesColumn: true,
    showInternalColumn: true,
    showExternalColumn: true,
    showFlyColumn: true,
    visibleColumns: [],
    gatesColumnLabel: 'جات',
    internalColumnLabel: 'داخلي',
    externalColumnLabel: 'خارجي',
    flyColumnLabel: 'فلاي'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to get global settings
        const globalSettingsRef = doc(db, 'account_settings', 'global');
        const globalDocSnap = await getDoc(globalSettingsRef);
        
        if (globalDocSnap.exists()) {
          const data = globalDocSnap.data() as AccountSettings;
          setSettings({
            id: 'global',
            userId: 'global',
            useCustomColumns: data.useCustomColumns ?? false,
            showGatesColumn: data.showGatesColumn ?? true,
            showInternalColumn: data.showInternalColumn ?? true,
            showExternalColumn: data.showExternalColumn ?? true,
            showFlyColumn: data.showFlyColumn ?? true,
            visibleColumns: data.visibleColumns ?? [],
            gatesColumnLabel: data.gatesColumnLabel ?? 'جات',
            internalColumnLabel: data.internalColumnLabel ?? 'داخلي',
            externalColumnLabel: data.externalColumnLabel ?? 'خارجي',
            flyColumnLabel: data.flyColumnLabel ?? 'فلاي'
          });
        } else {
          // Use default settings if neither global nor user settings exist
          const defaultSettings = {
            userId: 'global',
            useCustomColumns: false,
            showGatesColumn: true,
            showInternalColumn: true,
            showExternalColumn: true,
            showFlyColumn: true,
            visibleColumns: [],
            gatesColumnLabel: 'جات',
            internalColumnLabel: 'داخلي',
            externalColumnLabel: 'خارجي',
            flyColumnLabel: 'فلاي'
          };
          
          // Create global settings
          await setDoc(globalSettingsRef, {
            ...defaultSettings,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading account settings:', error);
        setError('فشل في تحميل إعدادات الحسابات');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    error
  };
}

export default useAccountSettings;