import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Subscription, Payment, SubscriptionFormData, PaymentFormData } from '../types';

export default function useSubscriptions(
  searchQuery: string = '',
  filterStatus: 'all' | 'active' | 'expired' | 'upcoming' = 'all'
) {
  const { employee } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create query
        const subscriptionsRef = collection(db, 'subscriptions');
        const q = query(subscriptionsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        // Process subscriptions
        const subscriptionsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
            endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined
          } as Subscription;
        });
        
        // Fetch payments for each subscription
        const subscriptionsWithPayments = await Promise.all(
          subscriptionsData.map(async (subscription) => {
            const paymentsRef = collection(db, 'subscription_payments');
            const paymentsQuery = query(paymentsRef, where('subscriptionId', '==', subscription.id), orderBy('paymentDate', 'desc'));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            
            const payments = paymentsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
              } as Payment;
            });
            
            return {
              ...subscription,
              payments
            };
          })
        );
        
        setSubscriptions(subscriptionsWithPayments);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setError('فشل في تحميل الاشتراكات');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, []);

  // Filter subscriptions based on search query and status
  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(subscription => 
        subscription.companyName.toLowerCase().includes(query) ||
        subscription.serviceType.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      const now = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      
      switch (filterStatus) {
        case 'active':
          result = result.filter(subscription => 
            subscription.startDate <= now && subscription.endDate >= now
          );
          break;
        case 'expired':
          result = result.filter(subscription => 
            subscription.endDate < now
          );
          break;
        case 'upcoming':
          result = result.filter(subscription => 
            subscription.endDate >= now && subscription.endDate <= twoWeeksFromNow
          );
          break;
      }
    }
    
    return result;
  }, [subscriptions, searchQuery, filterStatus]);

  // Add new subscription
  const addSubscription = async (formData: SubscriptionFormData) => {
    if (!employee) {
      throw new Error('لم يتم العثور على بيانات الموظف');
    }
    
    setIsSubmitting(true);
    
    try {
      // Create subscription object
      const subscriptionData = {
        companyId: formData.companyId,
        companyName: formData.companyName,
        serviceType: formData.serviceType,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'subscriptions'), subscriptionData);
      
      // Update local state
      const newSubscription: Subscription = {
        id: docRef.id,
        ...subscriptionData,
        createdAt: new Date(),
        payments: []
      };
      
      setSubscriptions(prev => [newSubscription, ...prev]);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding subscription:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add payment to subscription
  const addPayment = async (subscriptionId: string, formData: PaymentFormData) => {
    if (!employee) {
      throw new Error('لم يتم العثور على بيانات الموظف');
    }
    
    setIsSubmitting(true);
    
    try {
      // Create payment object
      const paymentData = {
        subscriptionId,
        amount: parseFloat(formData.amount),
        currency: 'USD', // Default to USD
        paymentDate: formData.paymentDate,
        notes: formData.notes,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'subscription_payments'), paymentData);
      
      // Update local state
      const newPayment: Payment = {
        id: docRef.id,
        ...paymentData,
        createdAt: new Date()
      };
      
      setSubscriptions(prev => 
        prev.map(subscription => {
          if (subscription.id === subscriptionId) {
            return {
              ...subscription,
              payments: [...(subscription.payments || []), newPayment]
            };
          }
          return subscription;
        })
      );
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh subscriptions
  const refreshSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create query
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      // Process subscriptions
      const subscriptionsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined
        } as Subscription;
      });
      
      // Fetch payments for each subscription
      const subscriptionsWithPayments = await Promise.all(
        subscriptionsData.map(async (subscription) => {
          const paymentsRef = collection(db, 'subscription_payments');
          const paymentsQuery = query(paymentsRef, where('subscriptionId', '==', subscription.id), orderBy('paymentDate', 'desc'));
          const paymentsSnapshot = await getDocs(paymentsQuery);
          
          const payments = paymentsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            } as Payment;
          });
          
          return {
            ...subscription,
            payments
          };
        })
      );
      
      setSubscriptions(subscriptionsWithPayments);
    } catch (error) {
      console.error('Error refreshing subscriptions:', error);
      setError('فشل في تحديث الاشتراكات');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscriptions,
    filteredSubscriptions,
    isLoading,
    error,
    isSubmitting,
    addSubscription,
    addPayment,
    refreshSubscriptions
  };
}