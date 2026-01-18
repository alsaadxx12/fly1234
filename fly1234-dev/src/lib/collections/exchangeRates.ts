import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface ExchangeRate {
  id?: string;
  rate: number;
  notes?: string;
  created_at: Date;
  created_by: string;
}

const COLLECTION_NAME = 'exchange_rates';

const exchangeRatesCollection = collection(db, COLLECTION_NAME);

export const addExchangeRate = async (rate: number, notes: string | null, createdBy: string) => {
  try {
    console.log('[exchangeRates] Adding new rate:', { rate, notes, createdBy });

    const docRef = await addDoc(exchangeRatesCollection, {
      rate,
      notes: notes || null,
      created_at: serverTimestamp(),
      created_by: createdBy
    });

    console.log('[exchangeRates] Rate added successfully, ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[exchangeRates] Error adding exchange rate:', error);
    throw error;
  }
};

export const getExchangeRates = async (limit?: number) => {
  try {
    const q = query(
      exchangeRatesCollection,
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    let rates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate()
    })) as ExchangeRate[];

    if (limit) {
      rates = rates.slice(0, limit);
    }

    return rates;
  } catch (error) {
    console.error('Error getting exchange rates:', error);
    throw error;
  }
};

export const getCurrentRate = async (): Promise<number> => {
  try {
    const rates = await getExchangeRates(1);
    return rates[0]?.rate || 3750; // Default rate if no rates exist
  } catch (error) {
    console.error('Error getting current rate:', error);
    return 3750; // Default fallback rate
  }
};