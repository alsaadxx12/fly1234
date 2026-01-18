import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, where, doc, updateDoc, getDoc, onSnapshot, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Debt, DebtFormData, PaymentFormData } from '../types';

export default function useDebts(
  searchQuery: string = '',
  filterStatus: 'all' | 'active' | 'paid' | 'overdue' = 'all'
) {
  const { employee } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch debts
  useEffect(() => {
    const fetchDebts = async () => {
      setIsLoading(true);
      setError(null);
      
      // Create query
      const debtsRef = collection(db, 'debts');
      const q = query(debtsRef, orderBy('createdAt', 'desc'));
      
      // Use onSnapshot for real-time updates
      const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
          try {
            // Process debts
            const debtsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined
              } as Debt;
            });
            
            // Fetch payments for each debt
            const debtsWithPayments = await Promise.all(
              debtsData.map(async (debt) => {
                const paymentsRef = collection(db, 'debt_payments');
                const paymentsQuery = query(paymentsRef, where('debtId', '==', debt.id));
                const paymentsSnapshot = await getDocs(paymentsQuery);
                
                const payments = paymentsSnapshot.docs.map(doc => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    ...data,
                    paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
                  };
                }).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()); // Sort on client side
                
                // Calculate paid and remaining amounts
                const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
                const remainingAmount = debt.amount - paidAmount;
                
                // Determine status
                let status: 'active' | 'paid' | 'overdue' = 'active';
                if (remainingAmount <= 0) {
                  status = 'paid';
                } else if (debt.dueDate < new Date()) {
                  status = 'overdue';
                }
                
                return {
                  ...debt,
                  payments,
                  paidAmount,
                  remainingAmount,
                  status
                };
              })
            );
            
            setDebts(debtsWithPayments);
            setIsLoading(false);
          } catch (error) {
            console.error('Error processing debts:', error);
            setError('فشل في معالجة بيانات الديون');
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching debts:', error);
          setError('فشل في تحميل الديون');
          setIsLoading(false);
        }
      );
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    };
    
    fetchDebts();
  }, []);

  // Filter debts based on search query and status
  const filteredDebts = useMemo(() => {
    let result = [...debts];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(debt => 
        debt.companyName.toLowerCase().includes(query) ||
        debt.debtType.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(debt => debt.status === filterStatus);
    }
    
    return result;
  }, [debts, searchQuery, filterStatus]);

  // Add new debt
  const addDebt = async (formData: DebtFormData) => {
    if (!employee) {
      throw new Error('لم يتم العثور على بيانات الموظف');
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if company exists
      if (!formData.companyId) {
        throw new Error('يجب اختيار شركة موجودة في النظام');
      }
      
      // Check if company already has a debt
      const existingDebtsRef = collection(db, 'debts');
      const existingDebtsQuery = query(
        existingDebtsRef, 
        where('companyId', '==', formData.companyId)
      );
      const existingDebtsSnapshot = await getDocs(existingDebtsQuery);
      
      if (!existingDebtsSnapshot.empty) {
        throw new Error('هذه الشركة لديها دين مسجل بالفعل. لا يمكن إضافة دين آخر لنفس الشركة');
      }
      
      // Create debt object
      const amount = parseFloat(formData.amount);
      const debtData = {
        companyId: formData.companyId,
        companyName: formData.companyName,
        debtType: formData.debtType,
        amount: amount,
        paidAmount: 0,
        remainingAmount: amount,
        currency: formData.currency,
        dueDate: formData.dueDate,
        status: 'active',
        notes: formData.notes,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || '',
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'debts'), debtData);
      
      // The debt will be added to the state automatically via the onSnapshot listener
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding debt:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add payment to debt
  const addPayment = async (debtId: string, formData: PaymentFormData) => {
    if (!employee) {
      throw new Error('لم يتم العثور على بيانات الموظف');
    }
    
    setIsSubmitting(true);
    
    try {
      // Get debt data
      const debtRef = doc(db, 'debts', debtId);
      const debtDoc = await getDoc(debtRef);
      
      if (!debtDoc.exists()) {
        throw new Error('الدين غير موجود');
      }
      
      const debtData = debtDoc.data() as Debt;
      
      // Create payment object
      const paymentData = {
        debtId,
        amount: parseFloat(formData.amount),
        currency: debtData.currency,
        paymentDate: formData.paymentDate,
        notes: formData.notes,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'debt_payments'), paymentData);
      
      // Update debt with new paid amount
      const paidAmount = (debtData.paidAmount || 0) + parseFloat(formData.amount);
      const remainingAmount = debtData.amount - paidAmount;
      const status = remainingAmount <= 0 ? 'paid' : debtData.status;
      
      await updateDoc(debtRef, {
        paidAmount,
        remainingAmount,
        status,
        updatedAt: serverTimestamp(),
        updatedBy: employee.name,
        updatedById: employee.id || ''
      });
      
      // The debt will be updated in the state automatically via the onSnapshot listener
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh debts - now just a placeholder since we're using real-time updates
  const refreshDebts = async () => {
    // No need to do anything here as we're using onSnapshot
    // But we keep the function for API compatibility
  };

  return {
    debts,
    filteredDebts,
    isLoading,
    error,
    isSubmitting,
    addDebt,
    addPayment,
    refreshDebts
  };
}