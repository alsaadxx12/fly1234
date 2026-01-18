import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentRate, getExchangeRates, addExchangeRate, type ExchangeRate } from '../lib/collections/exchangeRates';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

interface ExchangeRateContextType {
  currentRate: number;
  history: ExchangeRate[];
  updateRate: (rate: number, notes: string | null, createdBy: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshRates: () => Promise<void>;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
  const [currentRate, setCurrentRate] = useState(1417.5);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const previousRateRef = useRef<number>(1417.5);

  const loadRates = useCallback(async () => {
    try {
      console.log('[ExchangeRateContext] Loading exchange rates...');
      setIsLoading(true);
      setError(null);

      const [rate, rateHistory] = await Promise.all([
        getCurrentRate(),
        getExchangeRates()
      ]);

      console.log('[ExchangeRateContext] Loaded current rate:', rate);
      console.log('[ExchangeRateContext] Loaded history count:', rateHistory.length);

      setCurrentRate(rate);
      setHistory(rateHistory);
      previousRateRef.current = rate;
    } catch (error) {
      console.error('[ExchangeRateContext] Error loading exchange rates:', error);
      setError('فشل في تحميل سعر الصرف');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeRealTimeUpdates = useCallback(() => {
    try {
      console.log('[ExchangeRateContext] Initializing real-time updates from Firestore...');

      const ratesRef = collection(db, 'exchange_rates');
      const q = query(ratesRef, orderBy('created_at', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('[ExchangeRateContext] ✅ Firestore snapshot received, docs count:', snapshot.docs.length);

        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          const latestRate = latestDoc.data().rate;

          console.log('[ExchangeRateContext] Latest rate from Firestore:', latestRate);
          console.log('[ExchangeRateContext] Previous rate:', previousRateRef.current);

          const updatedHistory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate() || new Date()
          })) as ExchangeRate[];

          setHistory(updatedHistory);

          if (previousRateRef.current !== latestRate) {
            const oldRate = previousRateRef.current;
            console.log('[ExchangeRateContext] Rate changed! Dispatching event...');
            console.log('[ExchangeRateContext] Old:', oldRate, 'New:', latestRate);

            setCurrentRate(latestRate);

            if (oldRate !== 1417.5) { // Avoid notification on initial load
              const notificationsEnabled = localStorage.getItem('exchangeRateNotifications') !== 'false';
              if (notificationsEnabled) {
                const event = new CustomEvent('exchange-rate-changed', {
                  detail: {
                    oldRate: oldRate,
                    newRate: latestRate,
                    timestamp: new Date()
                  }
                });
                window.dispatchEvent(event);
                console.log('[ExchangeRateContext] Event dispatched successfully');
              }
            }
            previousRateRef.current = latestRate;
          }
        }
      }, (error) => {
        console.error('[ExchangeRateContext] Error in Firestore listener:', error);
        if (error.code === 'permission-denied') {
          console.warn('[ExchangeRateContext] Firestore permission denied, likely due to logout.');
        } else {
          setError('حدث خطأ في تحديث سعر الصرف');
        }
      });

      console.log('[ExchangeRateContext] ✅ Firestore real-time listener setup completed successfully');
      return unsubscribe;
    } catch (error) {
      console.error('[ExchangeRateContext] ❌ Error setting up real-time updates:', error);
      setError('فشل في إعداد التحديثات المباشرة');
      return undefined;
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        loadRates();
      } else {
        setError(null); // Clear error on logout
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [loadRates]);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    if (isAuthenticated) {
      unsubscribeFirestore = initializeRealTimeUpdates();
    }

    return () => {
      if (unsubscribeFirestore) {
        console.log('[ExchangeRateContext] Cleaning up Firestore listener due to auth state change.');
        unsubscribeFirestore();
      }
    };
  }, [isAuthenticated, initializeRealTimeUpdates]);

  const updateRate = async (rate: number, notes: string | null, createdBy: string) => {
    console.log('[ExchangeRateContext] updateRate called:', { rate, notes, createdBy });

    if (!isAuthenticated) {
      console.error('[ExchangeRateContext] User not authenticated!');
      throw new Error('يجب تسجيل الدخول لتحديث سعر الصرف');
    }

    try {
      console.log('[ExchangeRateContext] Adding rate to Firestore...');
      await addExchangeRate(rate, notes, createdBy);
      console.log('[ExchangeRateContext] Rate added to Firestore successfully');
      // The real-time listener will handle the state updates.
    } catch (error) {
      console.error('Error updating rate:', error);
      throw new Error('فشل في تحديث سعر الصرف');
    }
  };

  return (
    <ExchangeRateContext.Provider value={{
      currentRate,
      history,
      updateRate,
      isLoading,
      error,
      refreshRates: loadRates
    }}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  const context = useContext(ExchangeRateContext);
  if (context === undefined) {
    throw new Error('useExchangeRate must be used within an ExchangeRateProvider');
  }
  return context;
}
