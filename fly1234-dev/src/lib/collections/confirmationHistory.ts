import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface VoucherDetail {
  id: string;
  companyName: string;
  section: string;
  amount: number;
  currency: string;
  type: 'receipt' | 'payment';
}

export interface ConfirmationRecord {
  id?: string;
  safeId: string;
  safeName: string;
  unconfirmedBalanceUSD: number;
  unconfirmedBalanceIQD: number;
  vouchersConfirmed: number;
  voucherIds: string[];
  voucherDetails?: VoucherDetail[];
  confirmedBy: string;
  confirmedByEmail: string;
  confirmedAt: Date;
}

const COLLECTION_NAME = 'confirmation_history';

export const addConfirmationRecord = async (
  record: Omit<ConfirmationRecord, 'id' | 'confirmedBy' | 'confirmedByEmail' | 'confirmedAt'>,
  employeeName?: string,
  employeeEmail?: string
) => {
  try {
    const confirmationRef = collection(db, COLLECTION_NAME);

    const confirmedBy = employeeName || auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown';
    const confirmedByEmail = employeeEmail || auth.currentUser?.email || 'Unknown';

    const dataToSave = {
      ...record,
      confirmedBy,
      confirmedByEmail,
      confirmedAt: Timestamp.now()
    };

    console.log('📝 Attempting to save confirmation record:', {
      collection: COLLECTION_NAME,
      data: dataToSave
    });

    const docRef = await addDoc(confirmationRef, dataToSave);

    console.log('✅ Confirmation record saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding confirmation record:', error);
    throw error;
  }
};

export const getConfirmationHistory = async (safeId?: string) => {
  try {
    const confirmationRef = collection(db, COLLECTION_NAME);
    let q;

    console.log('📖 Fetching confirmation history...', { safeId });

    if (safeId) {
      q = query(
        confirmationRef,
        where('safeId', '==', safeId)
      );
    } else {
      q = confirmationRef;
    }

    const snapshot = await getDocs(q);

    console.log(`📚 Found ${snapshot.docs.length} confirmation records`);

    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📄 Record data:', {
        id: doc.id,
        safeName: data.safeName,
        vouchersConfirmed: data.vouchersConfirmed,
        hasVoucherDetails: !!data.voucherDetails,
        voucherDetailsCount: data.voucherDetails?.length || 0
      });

      return {
        id: doc.id,
        ...data,
        confirmedAt: data.confirmedAt?.toDate() || new Date()
      };
    }) as ConfirmationRecord[];

    const sortedRecords = records.sort((a, b) =>
      new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime()
    );

    return sortedRecords;
  } catch (error) {
    console.error('❌ Error getting confirmation history:', error);
    throw error;
  }
};

export const clearConfirmationHistory = async (safeId?: string) => {
  try {
    const confirmationRef = collection(db, COLLECTION_NAME);
    let q;

    console.log('🗑️ Clearing confirmation history...', { safeId });

    if (safeId) {
      q = query(
        confirmationRef,
        where('safeId', '==', safeId)
      );
    } else {
      q = confirmationRef;
    }

    const snapshot = await getDocs(q);

    console.log(`📚 Found ${snapshot.docs.length} records to delete`);

    if (snapshot.empty) {
      console.log('ℹ️ No records to delete');
      return 0;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();

    console.log(`✅ Successfully deleted ${snapshot.docs.length} records`);
    return snapshot.docs.length;
  } catch (error) {
    console.error('❌ Error clearing confirmation history:', error);
    throw error;
  }
};
