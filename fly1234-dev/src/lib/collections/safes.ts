import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Timestamp, serverTimestamp, writeBatch, getDoc, onSnapshot, getDocs as firestoreGetDocs, setDoc } from 'firebase/firestore';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';

interface Safe {
  id?: string;
  name: string;
  balance_usd: number;
  balance_iqd: number;
  created_at: Date;
  updated_at: Date;
  unconfirmed_balance_usd?: number;
  unconfirmed_balance_iqd?: number;
  total_balance_usd?: number;
  total_balance_iqd?: number;
  is_main?: boolean;
  custodian_name?: string;
  custodian_image?: string;
}

interface ResetHistory {
  id?: string;
  safe_id: string;
  safe_name: string;
  reset_type: 'usd' | 'iqd' | 'both';
  previous_balance_usd: number | null;
  previous_balance_iqd: number | null;
  target_safe_id?: string;
  target_safe_name?: string;
  reset_by: string;
  created_at: Date;
}

const COLLECTION_NAME = 'safes';
const RESET_HISTORY_COLLECTION = 'safe_reset_history';
const DELETED_VOUCHERS_COLLECTION = 'deleted_vouchers';

const safesCollection = collection(db, COLLECTION_NAME);
const resetHistoryCollection = collection(db, RESET_HISTORY_COLLECTION);
const deletedVouchersCollection = collection(db, DELETED_VOUCHERS_COLLECTION);

// Function to calculate total balance from all vouchers for a safe
export const calculateSafeBalance = async (safeId: string) => {
  try {
    // Get all vouchers for this safe without ordering initially
    const vouchersRef = collection(db, 'vouchers');
    const q = query(
      vouchersRef,
      where('safeId', '==', safeId),
    );
    
    const snapshot = await getDocs(q);
    
    let totalUsd = 0;
    let totalIqd = 0;
    
    // Calculate total from all vouchers
    snapshot.docs.forEach(doc => {
      const voucher = doc.data();
      const amount = typeof voucher.amount === 'number' ? voucher.amount : parseFloat(voucher.amount) || 0;
      const factor = voucher.type === 'receipt' ? 1 : -1;
      const isConfirmed = voucher.confirmation === true;
      
      // Only include confirmed vouchers in the balance calculation
      if (isConfirmed) {
        if (voucher.currency === 'USD') {
          totalUsd += amount * factor;
        } else {
          totalIqd += amount * factor;
        }
      }
    });
    
    // Update the safe with calculated balances
    console.log(`Updating safe ${safeId} with balances: USD=${totalUsd}, IQD=${totalIqd}`);
    const safeRef = doc(db, COLLECTION_NAME, safeId);
    await updateDoc(safeRef, {
      balance_usd: totalUsd,
      balance_iqd: totalIqd,
      updated_at: new Date()
    });
    
    return { balance_usd: totalUsd, balance_iqd: totalIqd };
  } catch (error) {
    console.error('Error calculating safe balance:', error);
    throw error;
  }
};

// Get safes with their total balances calculated from vouchers
export const getSafesWithTotalBalances = async () => {
  try {
    // Get all safes first
    const safes = await getSafes();
    
    // For each safe, calculate the total balance from vouchers
    for (const safe of safes) {
      if (!safe.id) continue;
      
      // Get all vouchers for this safe
      const vouchersRef = collection(db, 'vouchers');
      const q = query(
        vouchersRef,
        where('safeId', '==', safe.id)
      );
      
      const snapshot = await firestoreGetDocs(q);
      
      let totalUsd = 0;
      let totalIqd = 0;
      
      // Calculate total from all vouchers
      snapshot.docs.forEach(doc => {
        const voucher = doc.data();
        const amount = typeof voucher.amount === 'number' ? voucher.amount : parseFloat(voucher.amount) || 0;
        const factor = voucher.type === 'receipt' ? 1 : -1;
        const isConfirmed = voucher.confirmation === true;
        
        // Only include confirmed vouchers in the balance calculation
        if (isConfirmed) {
          if (voucher.currency === 'USD') {
            totalUsd += amount * factor;
          } else {
            totalIqd += amount * factor;
          }
        }
      });
      
      // Update the safe object with calculated balances
      safe.balance_usd = totalUsd;
      safe.balance_iqd = totalIqd;
      
      // Update the safe in the database
      const safeRef = doc(db, COLLECTION_NAME, safe.id);
      await updateDoc(safeRef, {
        balance_usd: totalUsd,
        balance_iqd: totalIqd,
        updated_at: new Date()
      });
    }
    
    return safes;
  } catch (error) {
    console.error('Error getting safes with total balances:', error);
    throw error;
  }
};

// Get safes with unconfirmed balances
export const getSafesWithUnconfirmedBalances = async (): Promise<Safe[]> => {
  try {
    // Get all safes first
    const safes = await getSafes();
    
    // Get all vouchers
    const vouchersRef = collection(db, 'vouchers');
    const q = query(vouchersRef, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    
    // Group vouchers by safe and confirmation status
    const vouchersBySafe: Record<string, { 
      confirmed_usd: number, 
      confirmed_iqd: number,
      unconfirmed_usd: number, 
      unconfirmed_iqd: number 
    }> = {};
    
    // Initialize with all safes
    safes.forEach(safe => {
      vouchersBySafe[safe.id] = { 
        confirmed_usd: 0, 
        confirmed_iqd: 0,
        unconfirmed_usd: 0, 
        unconfirmed_iqd: 0 
      };
    });
    
    // Process all vouchers
    snapshot.docs.forEach(doc => {
      const voucher = doc.data();
      if (!voucher.safeId) return; // Skip vouchers without safeId

      const safeId = voucher.safeId;

      if (!vouchersBySafe[safeId]) {
        vouchersBySafe[safeId] = { 
          confirmed_usd: 0, 
          confirmed_iqd: 0,
          unconfirmed_usd: 0, 
          unconfirmed_iqd: 0 
        };
      }
      
      const amount = typeof voucher.amount === 'number' ? voucher.amount : parseFloat(voucher.amount) || 0;
      // Always use the factor based on voucher type
      const factor = voucher.type === 'receipt' ? 1 : -1;
      
      // For payment vouchers, only affect the balance when confirmed
      // For receipt vouchers, always affect the balance (confirmed or unconfirmed)
      if (voucher.confirmation === true) {
        // Confirmed vouchers affect confirmed balance
        if (voucher.currency === 'USD') {
          vouchersBySafe[safeId].confirmed_usd += amount * factor;
        } else {
          vouchersBySafe[safeId].confirmed_iqd += amount * factor;
        }
      } else if (voucher.type === 'receipt') {
        // Only unconfirmed RECEIPT vouchers affect unconfirmed balance
        // Payment vouchers don't affect any balance until confirmed
        if (voucher.currency === 'USD') {
          vouchersBySafe[safeId].unconfirmed_usd += amount * factor;
        } else {
          vouchersBySafe[safeId].unconfirmed_iqd += amount * factor;
        }
      }
    });
    
    // Add unconfirmed balances to safes
    const safesWithUnconfirmed = safes.map(safe => ({
      ...safe,
      balance_usd: vouchersBySafe[safe.id]?.confirmed_usd || 0,
      balance_iqd: vouchersBySafe[safe.id]?.confirmed_iqd || 0,
      unconfirmed_balance_usd: vouchersBySafe[safe.id]?.unconfirmed_usd || 0,
      unconfirmed_balance_iqd: vouchersBySafe[safe.id]?.unconfirmed_iqd || 0,
      total_balance_usd: (vouchersBySafe[safe.id]?.confirmed_usd || 0) + (vouchersBySafe[safe.id]?.unconfirmed_usd || 0),
      total_balance_iqd: (vouchersBySafe[safe.id]?.confirmed_iqd || 0) + (vouchersBySafe[safe.id]?.unconfirmed_iqd || 0)
    }));
    
    return safesWithUnconfirmed;
  } catch (error) {
    console.error('Error getting safes with unconfirmed balances:', error);
    throw error;
  } 
};

// Function to get deleted vouchers
const getDeletedVouchers = async () => {
  try {
    const deletedVouchersRef = collection(db, DELETED_VOUCHERS_COLLECTION);
    const q = query(
      deletedVouchersRef,
      orderBy('deletedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      deletedAt: doc.data().deletedAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting deleted vouchers:', error);
    throw error;
  }
};

// Function to add a voucher to deleted vouchers collection
export const addDeletedVoucher = async (voucherData: any) => {
  try {
    const deletedVoucherRef = collection(db, DELETED_VOUCHERS_COLLECTION);
    const docRef = await addDoc(deletedVoucherRef, {
      ...voucherData,
      deletedAt: serverTimestamp(),
      deletedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding deleted voucher:', error);
    throw error;
  }
};

// Function to confirm a voucher and update safe balance
export const confirmMultipleVouchers = async (voucherIds: string[], employeeName: string, employeeId: string, safeId: string) => {
  try {
    const batch = writeBatch(db);
    let totalUSD = 0;
    let totalIQD = 0;

    for (const voucherId of voucherIds) {
      const voucherRef = doc(db, 'vouchers', voucherId);
      const voucherDoc = await getDoc(voucherRef);

      if (!voucherDoc.exists()) continue;

      const voucherData = voucherDoc.data();
      const factor = voucherData.type === 'receipt' ? 1 : -1;
      const amount = typeof voucherData.amount === 'number' ? voucherData.amount : parseFloat(voucherData.amount) || 0;

      batch.update(voucherRef, {
        confirmation: true,
        confirmedAt: serverTimestamp(),
        confirmedBy: employeeName,
        confirmedById: employeeId
      });

      if (!voucherData.isTransfer) {
        if (voucherData.currency === 'USD') {
          totalUSD += amount * factor;
        } else {
          totalIQD += amount * factor;
        }
      }
    }

    const safeRef = doc(db, COLLECTION_NAME, safeId);
    const safeDoc = await getDoc(safeRef);

    if (safeDoc.exists()) {
      const safeData = safeDoc.data();
      batch.update(safeRef, {
        balance_usd: safeData.balance_usd + totalUSD,
        balance_iqd: safeData.balance_iqd + totalIQD,
        updated_at: serverTimestamp()
      });
    }

    await batch.commit();

    return {
      success: true,
      safeId,
      totalUSD,
      totalIQD
    };
  } catch (error) {
    console.error('Error confirming multiple vouchers:', error);
    throw error;
  }
};

export const confirmVoucher = async (voucherId: string, employeeName: string, employeeId: string) => {
  try {
    // Get voucher data
    const voucherRef = doc(db, 'vouchers', voucherId);
    const voucherDoc = await getDoc(voucherRef);

    if (!voucherDoc.exists()) {
      throw new Error('السند غير موجود');
    }

    const voucherData = voucherDoc.data();
    
    // Get safe data
    const safeRef = doc(db, COLLECTION_NAME, voucherData.safeId);
    const safeDoc = await getDoc(safeRef);
    
    if (!safeDoc.exists()) {
      throw new Error('الصندوق غير موجود');
    }
    
    const safeData = safeDoc.data();
    
    // Calculate amount to add/subtract
    const factor = voucherData.type === 'receipt' ? 1 : -1; 
    const amount = typeof voucherData.amount === 'number' ? voucherData.amount : parseFloat(voucherData.amount) || 0;
    
    // Create batch
    const batch = writeBatch(db);
    
    // Update voucher
    batch.update(voucherRef, {
      confirmation: true,
      confirmedAt: serverTimestamp(),
      confirmedBy: employeeName,
      confirmedById: employeeId
    });
    
    // Handle transfer vouchers differently
    if (voucherData.isTransfer) {
      // For transfer vouchers, we don't update the safe balance here
      // as it was already updated during the transfer operation
      await batch.commit();
      
      return {
        success: true,
        safeId: voucherData.safeId,
        currency: voucherData.currency,
        amount: 0 // No change to balance for transfer vouchers
      };
    }
    
    // Update safe
    if (voucherData.currency === 'USD') {
      batch.update(safeRef, {
        balance_usd: safeData.balance_usd + (amount * factor),
        updated_at: serverTimestamp()
      });
    } else {
      batch.update(safeRef, {
        balance_iqd: safeData.balance_iqd + (amount * factor),
        updated_at: serverTimestamp()
      });
    }
    
    // Commit batch
    await batch.commit();
    
    return {
      success: true,
      safeId: voucherData.safeId,
      currency: voucherData.currency,
      amount: amount * factor
    };
  } catch (error) {
    console.error('Error confirming voucher:', error);
    throw error;
  }
};

export const addSafe = async (safe: Omit<Safe, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Create the safe with initial balances and is_main flag
    const safeData = {
      ...safe,
      is_main: safe.is_main || false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    const docRef = await addDoc(safesCollection, safeData);
    
    // Calculate initial balance from existing vouchers
    await calculateSafeBalance(docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding safe:', error);
    throw error;
  }
};

export const getSafes = async () => {
  try {
    // Get all safes ordered by name
    const q = query(safesCollection, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    
    const safes = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        is_main: data.is_main || false,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(),
        updated_at: data.updated_at?.toDate() || new Date()
      };
    }) as Safe[];
    
    return safes;
  } catch (error) {
    console.error('Error getting safes:', error);
    throw error;
  }
};

// Get safes with real-time updates
export const getSafesWithRealTimeUpdates = (callback: (safes: Safe[]) => void) => {
  try {
    const q = query(safesCollection);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const safes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          is_main: data.is_main || false,
          created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(),
          updated_at: data.updated_at?.toDate() || new Date()
        };
      }) as Safe[];
      
      callback(safes);
    });
    
    // Return unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up real-time safes listener:', error);
    throw error;
  }
};

// Get all vouchers for a specific safe
export const getVouchersForSafe = async (safeId: string) => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    const q = query(
      vouchersRef,
      where('safeId', '==', safeId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting vouchers for safe:', error);
    throw error;
  }
};

// Get all vouchers
const getAllVouchers = async () => {
  try {
    const vouchersRef = collection(db, 'vouchers');
    const q = query(
      vouchersRef,
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all vouchers:', error);
    throw error;
  }
};

export const updateSafe = async (id: string, data: Partial<Safe>) => {
  try {
    const safeRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(safeRef, {
      ...data,
      updated_at: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating safe:', error);
    throw error;
  }
};

export const deleteSafe = async (id: string) => {
  try {
    const safeRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(safeRef);
  } catch (error) {
    console.error('Error deleting safe:', error);
    throw error;
  }
};

export const getSafeResetHistory = async (safeId: string): Promise<ResetHistory[]> => {
  try {
    const q = query(
      resetHistoryCollection,
      where('safe_id', '==', safeId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date()
    })) as ResetHistory[];
  } catch (error) {
    console.error('Error getting safe reset history:', error);
    throw error;
  }
};

// Recalculate all safes balances
export const recalculateAllSafesBalances = async () => {
  try {
    console.log('Recalculating all safes balances from vouchers...');
    const safes = await getSafes();
    
    for (const safe of safes) {
      if (safe.id) {
        console.log(`Recalculating balance for safe: ${safe.name} (${safe.id})`);
        await calculateSafeBalance(safe.id);
      }
    } 
    
    return true;
  } catch (error) {
    console.error('Error recalculating all safes balances:', error);
    throw error;
  }
};