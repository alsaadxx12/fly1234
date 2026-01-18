import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ColumnVisibilitySettings {
  userId: string;
  visibleColumns: {
    receipt: string[];
    payment: string[];
  };
  updatedAt: Date;
}

export default function useColumnVisibility(voucherType: 'receipt' | 'payment') {
  const { user } = useAuth();
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load column visibility settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to get user-specific settings
        const settingsRef = doc(db, 'user_column_settings', user.uid);
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ColumnVisibilitySettings;
          setVisibleColumns(data.visibleColumns[voucherType] || []);
        } else {
          // If no settings exist, create default settings
          // First try to get default columns from account_settings
          const accountSettingsRef = doc(db, 'account_settings', 'global');
          const accountSettingsSnap = await getDoc(accountSettingsRef);
          
          let defaultColumns: string[] = [];
          
          if (accountSettingsSnap.exists() && accountSettingsSnap.data().visibleColumns) {
            defaultColumns = accountSettingsSnap.data().visibleColumns;
          } else {
            // Fallback default columns if no global settings exist
            defaultColumns = [
              'settlement', 'confirmation', 'invoiceNumber', 'companyName', 
              'currency', 'amount', 'phone', 'details', 'createdAt', 
              'employeeName', 'safeName', 'actions'
            ];
            
            // Add distribution columns for receipt vouchers
            if (voucherType === 'receipt') {
              defaultColumns.push('gates', 'internal', 'external', 'fly');
            }
          }
          
          // Create new settings document
          const newSettings: ColumnVisibilitySettings = {
            userId: user.uid,
            visibleColumns: {
              receipt: voucherType === 'receipt' ? defaultColumns : [],
              payment: voucherType === 'payment' ? defaultColumns : []
            },
            updatedAt: new Date()
          };
          
          await setDoc(settingsRef, newSettings);
          setVisibleColumns(defaultColumns);
        }
      } catch (error) {
        console.error('Error loading column visibility settings:', error);
        setError('فشل في تحميل إعدادات عرض الأعمدة');
        
        // Fallback to default columns
        const defaultColumns = [
          'settlement', 'confirmation', 'invoiceNumber', 'companyName', 
          'currency', 'amount', 'phone', 'details', 'createdAt', 
          'employeeName', 'safeName', 'actions'
        ];
        
        // Add distribution columns for receipt vouchers
        if (voucherType === 'receipt') {
          defaultColumns.push('gates', 'internal', 'external', 'fly');
        }
        
        setVisibleColumns(defaultColumns);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [user?.uid, voucherType]);

  // Save column visibility settings to Firestore
  const saveVisibleColumns = useCallback(async (columns: string[]) => {
    if (!user?.uid) return;
    
    setError(null);
    
    try {
      const settingsRef = doc(db, 'user_column_settings', user.uid);
      const docSnap = await getDoc(settingsRef);
      
      if (docSnap.exists()) {
        // Update existing settings
        const data = docSnap.data() as ColumnVisibilitySettings;
        const updatedVisibleColumns = {
          ...data.visibleColumns,
          [voucherType]: columns
        };
        
        await updateDoc(settingsRef, {
          visibleColumns: updatedVisibleColumns,
          updatedAt: new Date()
        });
      } else {
        // Create new settings
        const newSettings: ColumnVisibilitySettings = {
          userId: user.uid,
          visibleColumns: {
            receipt: voucherType === 'receipt' ? columns : [],
            payment: voucherType === 'payment' ? columns : []
          },
          updatedAt: new Date()
        };
        
        await setDoc(settingsRef, newSettings);
      }
      
      // Update local state
      setVisibleColumns(columns);
    } catch (error) {
      console.error('Error saving column visibility settings:', error);
      setError('فشل في حفظ إعدادات عرض الأعمدة');
    }
  }, [user?.uid, voucherType]);

  return {
    visibleColumns,
    setVisibleColumns: saveVisibleColumns,
    isLoading,
    error
  };
}