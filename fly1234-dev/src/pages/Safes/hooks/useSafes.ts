import { useState, useEffect, useMemo } from 'react';
import { addSafe, updateSafe, deleteSafe, getSafeResetHistory, confirmVoucher as confirmVoucherApi, calculateSafeBalance } from '../../../lib/collections/safes';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Safe, ResetHistory, UnconfirmedVoucher } from '../types';

export default function useSafes(
  searchQuery: string,
  sortBy: 'name' | 'balance_usd' | 'balance_iqd' | 'updated_at',
  sortDirection: 'asc' | 'desc'
) {
  const { employee } = useAuth();
  const [safes, setSafes] = useState<Safe[]>([]);
  const [unconfirmedVouchers, setUnconfirmedVouchers] = useState<UnconfirmedVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [resetHistory, setResetHistory] = useState<ResetHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSafe, setSelectedSafe] = useState<string | null>(null);
  const [newSafe, setNewSafe] = useState<{
    name: string;
    balance_usd: number;
    balance_iqd: number;
    is_main?: boolean;
    custodian_name?: string;
    custodian_image?: string;
  }>({
    name: '',
    balance_usd: 0,
    balance_iqd: 0,
    is_main: false,
    custodian_name: '',
    custodian_image: ''
  });
  const [editingSafe, setEditingSafe] = useState<{
    id: string;
    name: string;
    balance_usd: number;
    balance_iqd: number;
    is_main?: boolean;
    custodian_name?: string;
    custodian_image?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const safesQuery = query(collection(db, 'safes'), orderBy('name', 'asc'));
    const vouchersQuery = query(
      collection(db, 'vouchers'),
      where('confirmation', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeSafes = onSnapshot(safesQuery, (snapshot) => {
      const safesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          is_main: data.is_main || false,
          created_at: data.created_at?.toDate ? data.created_at.toDate() : new Date(),
          updated_at: data.updated_at?.toDate() || new Date()
        } as Safe;
      });
      setSafes(safesData);
      if (!snapshot.metadata.hasPendingWrites) setIsLoading(false);
    }, (err) => {
      console.error("Error fetching safes:", err);
      setError("فشل في تحميل الصناديق");
      setIsLoading(false);
    });

    const unsubscribeVouchers = onSnapshot(vouchersQuery, (snapshot) => {
      const unconfirmedData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          safeId: data.safeId,
          safeName: data.safeName || '',
          amount: data.amount,
          currency: data.currency || 'USD',
          type: data.type || 'receipt',
          confirmation: data.confirmation || false,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          companyName: data.companyName || data.client || 'غير محدد',
          section: data.section || data.category || 'غير محدد'
        };
      });
      setUnconfirmedVouchers(unconfirmedData);
    }, (err) => {
      console.error("Error fetching unconfirmed vouchers:", err);
    });

    return () => {
      unsubscribeSafes();
      unsubscribeVouchers();
    };
  }, []);


  const filteredSafes = useMemo(() => {
    let result = [...safes];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(safe =>
        safe.name.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'balance_usd':
          comparison = a.balance_usd - b.balance_usd;
          break;
        case 'balance_iqd':
          comparison = a.balance_iqd - b.balance_iqd;
          break;
        case 'updated_at':
          comparison = a.updated_at.getTime() - b.updated_at.getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [safes, searchQuery, sortBy, sortDirection]);


  const handleViewHistory = async (safeId: string) => {
    setSelectedSafe(safeId);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setResetHistory([]);

    try {
      const history = await getSafeResetHistory(safeId);
      const formattedHistory = history.map(item => ({
        ...item,
        created_at: item.created_at instanceof Date ? item.created_at : new Date(item.created_at),
        id: item.id || ''
      }));
      setResetHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading reset history:', error);
      setError('فشل في تحميل سجل التصفير');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAddSafe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!newSafe.name.trim()) throw new Error('يرجى إدخال اسم الصندوق');
      if (newSafe.balance_usd < 0 || newSafe.balance_iqd < 0) throw new Error('يجب أن تكون الأرصدة قيم موجبة');

      /* const id = */ await addSafe({
        name: newSafe.name,
        balance_usd: newSafe.balance_usd,
        balance_iqd: newSafe.balance_iqd,
        is_main: newSafe.is_main,
        custodian_name: newSafe.custodian_name,
        custodian_image: newSafe.custodian_image
      });

      // Reset form - real-time listener will update the UI.
      setNewSafe({ name: '', balance_usd: 0, balance_iqd: 0, is_main: false, custodian_name: '', custodian_image: '' });
    } catch (error) {
      console.error('Error adding safe:', error);
      setError('فشل في إضافة الصندوق');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSafe) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await updateSafe(editingSafe.id, {
        name: editingSafe.name,
        is_main: editingSafe.is_main,
        custodian_name: editingSafe.custodian_name,
        custodian_image: editingSafe.custodian_image
      });
      setEditingSafe(null);
    } catch (error) {
      console.error('Error updating safe:', error);
      setError('فشل في تحديث الصندوق');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSafe) return;
    setError(null);

    try {
      await deleteSafe(selectedSafe);
      setSelectedSafe(null);
    } catch (error) {
      console.error('Error deleting safe:', error);
      setError('فشل في حذف الصندوق');
    }
  };

  const confirmVoucher = async (voucherId: string) => {
    if (!employee) return false;

    try {
      const result = await confirmVoucherApi(voucherId, employee.name, employee.id || '');
      if (result.success) {
        await calculateSafeBalance(result.safeId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error confirming voucher:', error);
      setError('فشل في تأكيد السند');
      return false;
    }
  };

  return {
    safes: filteredSafes,
    unconfirmedVouchers,
    isLoading,
    error,
    selectedSafe,
    setSelectedSafe,
    resetHistory,
    isLoadingHistory,
    editingSafe,
    setEditingSafe,
    newSafe,
    setNewSafe,
    isSubmitting,
    isRefreshing: isLoading,
    setIsRefreshing: () => { }, // No-op as it's real-time now
    handleViewHistory,
    handleAddSafe,
    handleEdit,
    handleDelete,
    confirmVoucher,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
  };
}
