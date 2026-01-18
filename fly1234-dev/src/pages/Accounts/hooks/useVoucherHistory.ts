import { useState, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { deepEqual, formatValueForDisplay } from '../utils/objectUtils';

interface VoucherChange {
  field: string;
  oldValue: any;
  newValue: any;
  displayName?: string;
}

interface VoucherHistoryEntry {
  id: string;
  voucherId: string;
  updatedAt: Date;
  updatedBy: string;
  updatedById: string;
  changes: VoucherChange[];
}

export default function useVoucherHistory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VoucherHistoryEntry[]>([]);

  // Add a new history entry
  const addHistoryEntry = useCallback(async (
    voucherId: string,
    updatedBy: string,
    updatedById: string,
    changes: VoucherChange[]
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Only record history if there are actual changes
      if (changes.length === 0) {
        console.log('No changes detected, skipping history entry');
        return null;
      }
      
      // Filter out any changes with undefined values
      const validChanges = changes.filter(change => 
        change.field !== undefined && 
        (change.oldValue !== undefined || change.newValue !== undefined)
      );
      
      if (validChanges.length === 0) {
        console.log('No valid changes after filtering undefined values');
        return null;
      }
      
      const historyData = {
        voucherId,
        updatedAt: serverTimestamp(),
        updatedBy,
        updatedById,
        changes: validChanges
      };
      
      const historyRef = collection(db, 'voucher_history');
      const docRef = await addDoc(historyRef, historyData);
      
      console.log('Voucher history entry added successfully');
      return docRef.id;
    } catch (error) {
      console.error('Error adding voucher history entry:', error);
      setError('فشل في تسجيل التعديلات');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get history for a specific voucher
  const getVoucherHistory = useCallback(async (voucherId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const historyRef = collection(db, 'voucher_history');
      const q = query(
        historyRef,
        where('voucherId', '==', voucherId),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const historyData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          voucherId: data.voucherId,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy,
          updatedById: data.updatedById,
          changes: data.changes || []
        };
      });
      
      setHistory(historyData);
      return historyData;
    } catch (error) {
      console.error('Error fetching voucher history:', error);
      setError('فشل في تحميل سجل التعديلات');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Compare old and new voucher data to detect changes
  const detectChanges = useCallback((oldData: any, newData: any): VoucherChange[] => {
    const changes: VoucherChange[] = [];
    // Expanded list of fields to track
    const fieldsToTrack = [
      'companyName', 'amount', 'currency', 'gates', 'internal', 
      'external', 'fly', 'phone', 'details', 'safeName', 'exchangeRate', 
      'safeId', 'whatsAppGroupId', 'whatsAppGroupName', 'status', 
      'employeeName', 'employeeId', 'settlement', 'confirmation'
    ];
    
    // Field display names mapping
    const fieldDisplayNames: Record<string, string> = {
      'companyName': 'اسم الشركة',
      'amount': 'المبلغ',
      'currency': 'العملة',
      'gates': 'العمود الأول',
      'internal': 'العمود الثاني',
      'external': 'العمود الثالث',
      'fly': 'العمود الرابع',
      'phone': 'رقم الهاتف',
      'details': 'التفاصيل',
      'safeName': 'اسم الصندوق',
      'safeId': 'معرف الصندوق',
      'exchangeRate': 'سعر الصرف',
      'whatsAppGroupId': 'معرف مجموعة الواتساب',
      'whatsAppGroupName': 'اسم مجموعة الواتساب',
      'status': 'الحالة',
      'employeeName': 'اسم الموظف',
      'employeeId': 'معرف الموظف',
      'settlement': 'التحاسب',
      'confirmation': 'التأكيد'
    };
    
    fieldsToTrack.forEach(field => {
      // Get the old and new values, ensuring they're not undefined
      const oldValue = oldData[field] !== undefined ? oldData[field] : null;
      const newValue = newData[field] !== undefined ? newData[field] : null;

      // Skip if both values are undefined or null
      if ((oldValue === undefined && newValue === undefined) || 
          (oldValue === null && newValue === null)) {
        return;
      }

      // For objects, check deep equality
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        if (oldValue === null && newValue === null) return;
        if ((oldValue === null && newValue !== null) || 
            (oldValue !== null && newValue === null) || 
            !deepEqual(oldValue, newValue)) {
          changes.push({
            field: field,
            oldValue: oldValue === undefined ? null : oldValue,
            newValue: newValue === undefined ? null : newValue,
            displayName: fieldDisplayNames[field] || field
          });
        }
        return;
      }

      // For primitive values, compare directly
      if (oldValue !== newValue) {
        changes.push({
          field: field,
          oldValue: oldValue === undefined ? null : oldValue,
          newValue: newValue === undefined ? null : newValue,
          displayName: fieldDisplayNames[field] || field
        });
      }
    });
    
    return changes;
  }, []);

  return {
    isLoading,
    error,
    history,
    addHistoryEntry,
    getVoucherHistory,
    detectChanges
  };
}