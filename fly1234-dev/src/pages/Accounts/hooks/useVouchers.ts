import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp, deleteDoc, doc, addDoc, serverTimestamp, getDoc, updateDoc, setDoc, onSnapshot, limit, startAfter, endBefore, limitToLast, DocumentData, QueryDocumentSnapshot, or } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { addDeletedVoucher } from '../../../lib/collections/safes';
import { useAuth } from '../../../contexts/AuthContext';
import { Ticket, TicketType, Passenger } from '../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface EmployeeCache {
  [uid: string]: string;
}

interface UseVouchersProps {
  type: 'payment' | 'receipt' | 'exchange';
  searchTerm?: string;
  invoiceNumberFilter?: string;
  beneficiaryFilter?: string;
  currencyFilter?: 'all' | 'USD' | 'IQD';
  dateFrom?: Date;
  dateTo?: Date;
  itemsPerPage?: number;
}

export default function useVouchers({
  type,
  searchTerm: appliedSearchTerm = '',
  invoiceNumberFilter: appliedInvoiceNumber = '',
  beneficiaryFilter = '',
  currencyFilter = 'all',
  dateFrom,
  dateTo,
  itemsPerPage = 15,
}: UseVouchersProps) {
  const { user, employee, checkPermission } = useAuth();
  const { showNotification } = useNotification();
  const [vouchers, setVouchers] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string | null>(null);
  const [isLoadingInvoiceNumber, setIsLoadingInvoiceNumber] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [hasNextPage, setHasNextPage] = useState(false);

  const employeeCache = useRef<EmployeeCache>({});

  const getEmployeeNameFromCache = useCallback(async (employeeId: string): Promise<string> => {
    if (!employeeId) return 'غير معروف';
    if (employeeCache.current[employeeId]) {
      return employeeCache.current[employeeId];
    }
    try {
      const employeeRef = doc(db, 'employees', employeeId);
      const docSnap = await getDoc(employeeRef);

      if (docSnap.exists()) {
        const employeeData = docSnap.data();
        const name = employeeData.name || employeeId;
        employeeCache.current[employeeId] = name;
        return name;
      }

      employeeCache.current[employeeId] = employeeId;
      return employeeId;
    } catch (error) {
      console.error("Error fetching employee name:", error);
      employeeCache.current[employeeId] = employeeId;
      return employeeId;
    }
  }, []);

  const buildQuery = useCallback((startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
    let q = query(collection(db, 'vouchers'), where('type', '==', type));

    if (appliedInvoiceNumber) {
      q = query(q, where('invoiceNumber', '==', parseInt(appliedInvoiceNumber)));
    }
    if (beneficiaryFilter) {
      q = query(q, where('companyName', '==', beneficiaryFilter));
    }
    if (currencyFilter !== 'all') {
      q = query(q, where('currency', '==', currencyFilter));
    }
    if (dateFrom) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(dateFrom)));
    }
    if (dateTo) {
      const adjustedDateTo = new Date(dateTo);
      adjustedDateTo.setHours(23, 59, 59, 999);
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(adjustedDateTo)));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    // Increased limit when searching to allow client-side filter to work on more records
    const searchLimit = appliedSearchTerm ? 1000 : itemsPerPage;
    q = query(q, limit(searchLimit));

    return q;
  }, [type, appliedInvoiceNumber, beneficiaryFilter, currencyFilter, dateFrom, dateTo, itemsPerPage, appliedSearchTerm]);


  const fetchVouchersPage = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    setError(null);
    if (!user) {
      setVouchers([]);
      setIsLoading(false);
      return;
    }

    try {
      let currentCursor: QueryDocumentSnapshot<DocumentData> | null = null;
      if (direction === 'first') {
        setCurrentPage(1);
        setPageHistory([null]);
      } else if (direction === 'next') {
        currentCursor = lastVisible;
        setPageHistory(prev => [...prev, lastVisible]);
        setCurrentPage(prev => prev + 1);
      } else if (direction === 'prev' && currentPage > 1) {
        const newPageHistory = [...pageHistory];
        newPageHistory.pop();
        currentCursor = newPageHistory[newPageHistory.length - 1] || null;
        setPageHistory(newPageHistory);
        setCurrentPage(prev => prev - 1);
      }

      const q = buildQuery(currentCursor);
      const snapshot = await getDocs(q);

      let vouchersData = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdById || data.createdBy || data.employeeId || '',
        } as Ticket;
      });

      const employeeIds = [...new Set(vouchersData.map(v => v.createdBy).filter(Boolean))];
      const namesMap: Record<string, string> = {};
      for (const id of employeeIds) {
        namesMap[id] = await getEmployeeNameFromCache(id);
      }

      let finalVouchers = vouchersData.map(v => ({
        ...v,
        createdByName: namesMap[v.createdBy] || v.createdBy
      }));

      if (appliedSearchTerm && !appliedInvoiceNumber) {
        const term = appliedSearchTerm.toLowerCase();
        finalVouchers = finalVouchers.filter((v: any) =>
          v.companyName.toLowerCase().includes(term) ||
          (v.details && v.details.toLowerCase().includes(term)) ||
          (v.createdByName && v.createdByName.toLowerCase().includes(term))
        );
      }

      setVouchers(finalVouchers);

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc || null);

      if (snapshot.docs.length === (appliedSearchTerm ? 1000 : itemsPerPage)) {
        const nextQuery = buildQuery(lastDoc);
        const nextSnapshot = await getDocs(query(nextQuery, limit(1)));
        setHasNextPage(!nextSnapshot.empty);
      } else {
        setHasNextPage(false);
      }

    } catch (err) {
      console.error("Error fetching vouchers:", err);
      setError("فشل في جلب البيانات. قد تحتاج إلى إنشاء فهرس في Firestore. تحقق من console المتصفح للحصول على الرابط.");
    } finally {
      setIsLoading(false);
    }
  }, [user, buildQuery, getEmployeeNameFromCache, lastVisible, pageHistory, currentPage, appliedSearchTerm, itemsPerPage, appliedInvoiceNumber]);

  useEffect(() => {
    fetchVouchersPage('first');
  }, [buildQuery]);

  const nextPage = () => {
    if (hasNextPage) {
      fetchVouchersPage('next');
    }
  };

  const prevPage = () => {
    fetchVouchersPage('prev');
  };

  useEffect(() => {
    const getNextInvoiceNumber = async () => {
      setIsLoadingInvoiceNumber(true);
      try {
        const settingsRef = doc(db, 'account_settings', 'global');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data();
          const nextNumber = settingsData.nextInvoiceNumber ? settingsData.nextInvoiceNumber.toString() : '1000';
          setNextInvoiceNumber(nextNumber);
          return nextNumber;
        } else {
          await setDoc(settingsRef, {
            nextInvoiceNumber: '1000',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          setNextInvoiceNumber('1000');
          return '1000';
        }
      } catch (error) {
        console.error('Error getting next invoice number:', error);
        return '1000';
      } finally {
        setIsLoadingInvoiceNumber(false);
      }
    };

    getNextInvoiceNumber();
  }, []);

  const incrementInvoiceNumber = useCallback(async () => {
    if (!nextInvoiceNumber) return;

    try {
      const settingsRef = doc(db, 'account_settings', 'global');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const currentNumber = parseInt(nextInvoiceNumber);
        const newNumber = (currentNumber + 1).toString();

        await updateDoc(settingsRef, {
          nextInvoiceNumber: newNumber,
          updatedAt: new Date()
        });

        setNextInvoiceNumber(newNumber);
      }
    } catch (error) {
      console.error('Error incrementing invoice number:', error);
    }
  }, [nextInvoiceNumber]);

  const createVoucher = useCallback(async (voucherData: any) => {
    try {
      if (!nextInvoiceNumber) {
        throw new Error('رقم الفاتورة غير متوفر');
      }

      const voucherWithInvoiceNumber = {
        ...voucherData,
        confirmation: false,
        invoiceNumber: parseInt(nextInvoiceNumber) || 1000,
        createdAt: serverTimestamp(),
        settlement: false
      };

      const vouchersRef = collection(db, 'vouchers');
      const docRef = await addDoc(vouchersRef, voucherWithInvoiceNumber);

      await incrementInvoiceNumber();
      fetchVouchersPage('first');
      return { id: docRef.id, ...voucherWithInvoiceNumber, createdAt: new Date() } as Ticket;
    } catch (error) {
      console.error('Error creating voucher:', error);
      throw error;
    }
  }, [nextInvoiceNumber, incrementInvoiceNumber, fetchVouchersPage]);

  const deleteVoucher = useCallback(async (id: string) => {
    try {
      const voucherRef = doc(db, 'vouchers', id);
      const voucherDoc = await getDoc(voucherRef);

      if (voucherDoc.exists()) {
        await addDeletedVoucher({
          ...voucherDoc.data(),
          originalId: id
        });
        await deleteDoc(voucherRef);
        fetchVouchersPage('first');
      }

    } catch (error) {
      console.error('Error deleting voucher:', error);
      throw new Error('فشل في حذف السند');
    }
  }, [fetchVouchersPage]);

  const toggleSettlement = useCallback(async (voucher: Ticket) => {
    if (!checkPermission('accounts', 'settlement')) {
      showNotification('error', 'ليس لديك صلاحية لتغيير حالة التحاسب.');
      return;
    }

    const voucherRef = doc(db, 'vouchers', voucher.id);
    await updateDoc(voucherRef, { settlement: !voucher.settlement });
    fetchVouchersPage('first');
  }, [checkPermission, showNotification, fetchVouchersPage]);

  const toggleConfirmation = useCallback(async (voucher: Ticket) => {
    if (!checkPermission('accounts', 'confirm')) {
      showNotification('error', 'ليس لديك صلاحية لتغيير حالة التأكيد.');
      return;
    }

    const voucherRef = doc(db, 'vouchers', voucher.id);
    await updateDoc(voucherRef, { confirmation: !voucher.confirmation });
    fetchVouchersPage('first');
  }, [checkPermission, showNotification, fetchVouchersPage]);

  return {
    vouchers: vouchers,
    isLoading,
    error,
    nextInvoiceNumber,
    isLoadingInvoiceNumber,
    deleteVoucher,
    createVoucher,
    toggleSettlement,
    toggleConfirmation,
    nextPage,
    prevPage,
    currentPage,
    hasNextPage,
    hasPreviousPage: currentPage > 1,
    totalVouchers: vouchers.length,
    fetchVouchersPage,
  };
}


