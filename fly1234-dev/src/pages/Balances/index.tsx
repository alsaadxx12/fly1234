import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Plus,
  Edit2,
  Trash2,
  Wallet,
  Search,
  Download,
  RefreshCw,
  Settings,
  X,
  Image as ImageIcon,
  DollarSign,
  History,
  Clock,
  User,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import ModernModal from '../../components/ModernModal';
import ModernButton from '../../components/ModernButton';
import ModernInput from '../../components/ModernInput';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import BalanceLimitsModal from './components/BalanceLimitsModal';

interface SupplierSource {
  id: string;
  name: string;
  image?: string;
  type: 'airline' | 'supplier';
  createdAt: Date;
}

interface Balance {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceImage?: string;
  amount: number;
  currency: 'IQD' | 'USD' | 'AED';
  type: 'airline' | 'supplier';
  notes?: string;
  lastUpdated: Date;
  createdAt: Date;
  lastUpdatedBy?: {
    email: string;
    name: string;
  };
  limits?: {
    red: number;
    yellow: number;
    green: number;
  };
  isAutoSync?: boolean;
  apiSource?: string;
}

interface BalanceHistory {
  id: string;
  balanceId: string;
  sourceName: string;
  action: 'created' | 'updated' | 'deleted';
  oldAmount?: number;
  newAmount?: number;
  oldCurrency?: 'IQD' | 'USD' | 'AED';
  newCurrency?: 'IQD' | 'USD' | 'AED';
  oldNotes?: string;
  newNotes?: string;
  changes: string;
  timestamp: Date;
  updatedBy?: {
    email: string;
    name: string;
  };
}

function Balances() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<Balance[]>([]);
  const [sources, setSources] = useState<SupplierSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditSourceModal, setShowEditSourceModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<Balance | null>(null);
  const [editingSource, setEditingSource] = useState<SupplierSource | null>(null);
  const [limitsBalance, setLimitsBalance] = useState<Balance | null>(null);
  const [selectedBalanceForHistory, setSelectedBalanceForHistory] = useState<Balance | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'airline' | 'supplier'>('all');
  const [filterAutoSync, setFilterAutoSync] = useState<'all' | 'manual' | 'auto'>('all');
  const { showNotification } = useNotification();
  const { user, employee } = useAuth();

  const [formData, setFormData] = useState({
    sourceId: '',
    amount: '',
    currency: 'IQD' as 'IQD' | 'USD' | 'AED',
    notes: ''
  });

  const [sourceFormData, setSourceFormData] = useState({
    name: '',
    image: '',
    type: 'airline' as 'airline' | 'supplier'
  });

  useEffect(() => {
    loadSources();
    syncApiConnections();

    // استخدام onSnapshot للحصول على التحديثات الفورية
    const q = query(
      collection(db, 'balances'),
      orderBy('lastUpdated', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const balancesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Balance[];
        setBalances(balancesData);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error parsing balances:', err);
        setError('خطأ في تحليل البيانات');
        setLoading(false);
      }
    }, (error) => {
      console.error('Error loading balances:', error);
      showNotification('فشل تحميل الأرصدة', 'error');
      setError('فشل تحميل الأرصدة: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showNotification]);

  const syncApiConnections = async () => {
    try {
      const apiConnectionsRef = collection(db, 'api_connections');
      const connectionsSnapshot = await getDocs(apiConnectionsRef);
      const activeConnections = connectionsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(conn => conn.isActive);

      const balancesRef = collection(db, 'balances');
      const balancesSnapshot = await getDocs(balancesRef);

      const updates: { id: string; isAutoSync: boolean; apiSource: string | null }[] = [];

      for (const balance of balancesSnapshot.docs) {
        const balanceData = balance.data();
        const hasActiveConnection = activeConnections.some(
          conn => conn.sourceId === balanceData.sourceId
        );

        const connection = activeConnections.find(
          conn => conn.sourceId === balanceData.sourceId
        );

        if (hasActiveConnection && connection) {
          if (!balanceData.isAutoSync) {
            await updateDoc(doc(db, 'balances', balance.id), {
              isAutoSync: true,
              apiSource: connection.name
            });
            updates.push({ id: balance.id, isAutoSync: true, apiSource: connection.name });
          }
        } else {
          if (balanceData.isAutoSync) {
            await updateDoc(doc(db, 'balances', balance.id), {
              isAutoSync: false,
              apiSource: null
            });
            updates.push({ id: balance.id, isAutoSync: false, apiSource: null });
          }
        }
      }

      // تحديث الـ state مباشرة بدون إعادة تحميل
      if (updates.length > 0) {
        setBalances(prevBalances =>
          prevBalances.map(balance => {
            const update = updates.find(u => u.id === balance.id);
            return update ? { ...balance, isAutoSync: update.isAutoSync, apiSource: update.apiSource } : balance;
          })
        );
      }
    } catch (error) {
      console.error('Error syncing API connections:', error);
    }
  };

  useEffect(() => {
    let filtered = balances;

    if (filterType !== 'all') {
      filtered = filtered.filter(b => b.type === filterType);
    }

    if (filterAutoSync !== 'all') {
      if (filterAutoSync === 'auto') {
        filtered = filtered.filter(b => b.isAutoSync === true);
      } else if (filterAutoSync === 'manual') {
        filtered = filtered.filter(b => !b.isAutoSync);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.sourceName.toLowerCase().includes(term) ||
        b.notes?.toLowerCase().includes(term)
      );
    }

    setFilteredBalances(filtered);
  }, [balances, searchTerm, filterType, filterAutoSync]);

  // تم استبدال loadBalances بـ onSnapshot في useEffect

  const getBalanceColor = (balance: Balance): 'red' | 'yellow' | 'green' | 'gray' => {
    if (!balance.limits) return 'gray';

    const { red, yellow, green } = balance.limits;
    const amount = balance.amount;

    // أخضر: أكبر من الحد الأخضر (جيد)
    if (amount > green) return 'green';

    // أصفر: بين الحد الأصفر والأخضر (متوسط)
    if (amount > yellow && amount <= green) return 'yellow';

    // أحمر: أقل من أو يساوي الحد الأحمر (خطر)
    if (amount <= red) return 'red';

    // أصفر: بين الأحمر والأصفر
    return 'yellow';
  };

  const getBalanceColorClasses = (color: 'red' | 'yellow' | 'green' | 'gray') => {
    switch (color) {
      case 'red':
        return {
          border: 'border-red-400 hover:border-red-500',
          ring: 'ring-2 ring-red-100',
          gradient: 'bg-gradient-to-b from-red-400 to-red-600',
          bg: 'bg-gradient-to-l from-red-50 via-red-50/30 to-white'
        };
      case 'yellow':
        return {
          border: 'border-yellow-400 hover:border-yellow-500',
          ring: 'ring-2 ring-yellow-100',
          gradient: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
          bg: 'bg-gradient-to-l from-yellow-50 via-yellow-50/30 to-white'
        };
      case 'green':
        return {
          border: 'border-green-400 hover:border-green-500',
          ring: 'ring-2 ring-green-100',
          gradient: 'bg-gradient-to-b from-green-400 to-green-600',
          bg: 'bg-gradient-to-l from-green-50 via-green-50/30 to-white'
        };
      default:
        return {
          border: 'border-gray-200 hover:border-teal-300',
          ring: '',
          gradient: 'bg-gradient-to-b from-teal-400 to-emerald-500',
          bg: 'bg-gradient-to-l from-white via-gray-50/30 to-white'
        };
    }
  };

  const getBalanceColorBg = (balance: Balance) => {
    if (balance.amount < 0) {
      return 'from-red-100 to-rose-100 border-red-300';
    }

    if (!balance.limits) return 'from-teal-50 to-emerald-50 border-teal-100';

    // أخضر: أكبر من الحد الأخضر
    if (balance.amount > balance.limits.green) {
      return 'from-green-50 to-green-100 border-green-200';
    }
    // أصفر: بين الأصفر والأخضر
    else if (balance.amount > balance.limits.yellow && balance.amount <= balance.limits.green) {
      return 'from-yellow-50 to-yellow-100 border-yellow-200';
    }
    // أحمر: أقل من أو يساوي الأحمر
    else if (balance.amount <= balance.limits.red) {
      return 'from-red-50 to-red-100 border-red-200';
    }
    // أصفر: بين الأحمر والأصفر
    else {
      return 'from-yellow-50 to-yellow-100 border-yellow-200';
    }
  };

  const getBalanceTextColor = (balance: Balance) => {
    if (balance.amount < 0) {
      return 'from-red-700 to-rose-700';
    }

    if (!balance.limits) return 'from-teal-600 to-emerald-600';

    // أخضر: أكبر من الحد الأخضر
    if (balance.amount > balance.limits.green) {
      return 'from-green-600 to-green-700';
    }
    // أصفر: بين الأصفر والأخضر
    else if (balance.amount > balance.limits.yellow && balance.amount <= balance.limits.green) {
      return 'from-yellow-600 to-yellow-700';
    }
    // أحمر: أقل من أو يساوي الأحمر
    else if (balance.amount <= balance.limits.red) {
      return 'from-red-600 to-red-700';
    }
    // أصفر: بين الأحمر والأصفر
    else {
      return 'from-yellow-600 to-yellow-700';
    }
  };

  const loadSources = async () => {
    try {
      const sourcesRef = collection(db, 'balance_sources');
      const snapshot = await getDocs(sourcesRef);
      const sourcesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as SupplierSource[];
      setSources(sourcesData);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification('حجم الصورة يجب أن يكون أقل من 2 ميجابايت', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSourceFormData({ ...sourceFormData, image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleAddSource = async () => {
    if (!sourceFormData.name.trim()) {
      showNotification('الرجاء إدخال اسم المصدر', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'balance_sources'), {
        name: sourceFormData.name,
        image: sourceFormData.image || '',
        type: sourceFormData.type,
        createdAt: Timestamp.now()
      });

      showNotification('تم إضافة المصدر بنجاح', 'success');
      setSourceFormData({ name: '', image: '', type: 'airline' });
      await loadSources();
    } catch (error) {
      console.error('Error adding source:', error);
      showNotification('فشل إضافة المصدر', 'error');
    }
  };

  const handleEditSource = (source: SupplierSource) => {
    setEditingSource(source);
    setSourceFormData({
      name: source.name,
      image: source.image || '',
      type: source.type
    });
    setShowEditSourceModal(true);
  };

  const handleUpdateSource = async () => {
    if (!editingSource || !sourceFormData.name) {
      showNotification('الرجاء إدخال اسم المصدر', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'balance_sources', editingSource.id), {
        name: sourceFormData.name,
        image: sourceFormData.image,
        type: sourceFormData.type
      });

      const balancesSnapshot = await getDocs(collection(db, 'balances'));
      const updatePromises = balancesSnapshot.docs
        .filter(balanceDoc => balanceDoc.data().sourceId === editingSource.id)
        .map(balanceDoc =>
          updateDoc(doc(db, 'balances', balanceDoc.id), {
            sourceName: sourceFormData.name,
            sourceImage: sourceFormData.image,
            type: sourceFormData.type
          })
        );

      await Promise.all(updatePromises);

      // تحديث المصدر في الـ state مباشرة
      setSources(prevSources =>
        prevSources.map(s =>
          s.id === editingSource.id
            ? { ...s, name: sourceFormData.name, image: sourceFormData.image, type: sourceFormData.type }
            : s
        )
      );

      // تحديث جميع الأرصدة المرتبطة بالمصدر في الـ state
      setBalances(prevBalances =>
        prevBalances.map(b =>
          b.sourceId === editingSource.id
            ? { ...b, sourceName: sourceFormData.name, sourceImage: sourceFormData.image, type: sourceFormData.type }
            : b
        )
      );

      showNotification('تم تحديث المصدر بنجاح', 'success');
      setShowEditSourceModal(false);
      setEditingSource(null);
      setSourceFormData({ name: '', image: '', type: 'airline' });
    } catch (error) {
      console.error('Error updating source:', error);
      showNotification('فشل تحديث المصدر', 'error');
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;

    try {
      await deleteDoc(doc(db, 'balance_sources', sourceId));
      showNotification('تم حذف المصدر بنجاح', 'success');
      await loadSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      showNotification('فشل حذف المصدر', 'error');
    }
  };

  const addBalanceHistory = async (
    balanceId: string,
    sourceName: string,
    action: 'created' | 'updated' | 'deleted',
    changes: string,
    oldData?: any,
    newData?: any
  ) => {
    try {
      await addDoc(collection(db, 'balance_history'), {
        balanceId,
        sourceName,
        action,
        oldAmount: oldData?.amount,
        newAmount: newData?.amount,
        oldCurrency: oldData?.currency,
        newCurrency: newData?.currency,
        oldNotes: oldData?.notes,
        newNotes: newData?.notes,
        changes,
        timestamp: Timestamp.now(),
        updatedBy: {
          email: user?.email || '',
          name: employee?.name || ''
        }
      });
    } catch (error) {
      console.error('Error adding balance history:', error);
    }
  };

  const handleAddBalance = async () => {
    if (!formData.sourceId) {
      showNotification('الرجاء اختيار المصدر', 'error');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) === 0) {
      showNotification('الرجاء إدخال المبلغ', 'error');
      return;
    }

    try {
      const source = sources.find(s => s.id === formData.sourceId);
      if (!source) {
        showNotification('المصدر غير موجود', 'error');
        return;
      }

      const balanceData = {
        sourceId: formData.sourceId,
        sourceName: source.name,
        sourceImage: source.image || '',
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: source.type,
        notes: formData.notes,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now(),
        lastUpdatedBy: {
          email: user?.email || '',
          name: employee?.name || ''
        }
      };

      const docRef = await addDoc(collection(db, 'balances'), balanceData);

      await addBalanceHistory(
        docRef.id,
        source.name,
        'created',
        `تم إنشاء رصيد جديد بمبلغ ${formatCurrency(balanceData.amount)} ${getCurrencyName(balanceData.currency)}`,
        null,
        balanceData
      );

      // إضافة الرصيد الجديد للـ state مباشرة
      const newBalance: Balance = {
        id: docRef.id,
        ...balanceData,
        lastUpdated: new Date(),
        createdAt: new Date()
      };
      setBalances(prev => [newBalance, ...prev]);

      showNotification('تم إضافة الرصيد بنجاح', 'success');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding balance:', error);
      showNotification('فشل إضافة الرصيد', 'error');
    }
  };

  const handleEditBalance = (balance: Balance) => {
    setEditingBalance(balance);
    setFormData({
      sourceId: balance.sourceId,
      amount: balance.amount.toString(),
      currency: balance.currency,
      notes: balance.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateBalance = async () => {
    if (!editingBalance || !formData.sourceId || !formData.amount) {
      showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    try {
      const source = sources.find(s => s.id === formData.sourceId);
      if (!source) {
        showNotification('المصدر غير موجود', 'error');
        return;
      }

      const oldData = {
        amount: editingBalance.amount,
        currency: editingBalance.currency,
        notes: editingBalance.notes
      };

      const newData = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        notes: formData.notes
      };

      const changes = [];
      if (oldData.amount !== newData.amount) {
        changes.push(`المبلغ من ${formatCurrency(oldData.amount)} إلى ${formatCurrency(newData.amount)}`);
      }
      if (oldData.currency !== newData.currency) {
        changes.push(`العملة من ${getCurrencyName(oldData.currency)} إلى ${getCurrencyName(newData.currency)}`);
      }
      if (oldData.notes !== newData.notes) {
        changes.push(`الملاحظات تم تحديثها`);
      }

      await updateDoc(doc(db, 'balances', editingBalance.id), {
        sourceId: formData.sourceId,
        sourceName: source.name,
        sourceImage: source.image || '',
        amount: newData.amount,
        currency: newData.currency,
        type: source.type,
        notes: newData.notes,
        lastUpdated: Timestamp.now(),
        lastUpdatedBy: {
          email: user?.email || '',
          name: employee?.name || ''
        }
      });

      await addBalanceHistory(
        editingBalance.id,
        source.name,
        'updated',
        `تم تعديل الرصيد: ${changes.join(', ')}`,
        oldData,
        newData
      );

      showNotification('تم تحديث الرصيد بنجاح', 'success');

      // تحديث الرصيد في الـ state مباشرة
      setBalances(prevBalances =>
        prevBalances.map(b =>
          b.id === editingBalance.id
            ? {
              ...b,
              sourceId: formData.sourceId,
              sourceName: source.name,
              sourceImage: source.image || '',
              amount: newData.amount,
              currency: newData.currency,
              type: source.type,
              notes: newData.notes,
              lastUpdated: new Date(),
              lastUpdatedBy: {
                email: user?.email || '',
                name: employee?.name || ''
              }
            }
            : b
        )
      );

      setShowEditModal(false);
      setEditingBalance(null);
      resetForm();
    } catch (error) {
      console.error('Error updating balance:', error);
      showNotification('فشل تحديث الرصيد', 'error');
    }
  };

  const handleDeleteBalance = async (balance: Balance) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الرصيد؟')) return;

    try {
      await addBalanceHistory(
        balance.id,
        balance.sourceName,
        'deleted',
        `تم حذف رصيد بمبلغ ${formatCurrency(balance.amount)} ${getCurrencyName(balance.currency)}`,
        {
          amount: balance.amount,
          currency: balance.currency,
          notes: balance.notes
        },
        null
      );

      await deleteDoc(doc(db, 'balances', balance.id));

      // حذف الرصيد من الـ state مباشرة
      setBalances(prevBalances => prevBalances.filter(b => b.id !== balance.id));

      showNotification('تم حذف الرصيد بنجاح', 'success');
    } catch (error) {
      console.error('Error deleting balance:', error);
      showNotification('فشل حذف الرصيد', 'error');
    }
  };

  const loadBalanceHistory = async (balanceId: string) => {
    try {
      const historySnapshot = await getDocs(collection(db, 'balance_history'));
      const historyData = historySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }))
        .filter((h: any) => h.balanceId === balanceId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp) as BalanceHistory[];

      setBalanceHistory(historyData);
    } catch (error) {
      console.error('Error loading balance history:', error);
    }
  };

  const handleViewHistory = async (balance: Balance) => {
    setSelectedBalanceForHistory(balance);
    await loadBalanceHistory(balance.id);
    setShowHistoryModal(true);
  };

  const resetForm = () => {
    setFormData({
      sourceId: '',
      amount: '',
      currency: 'IQD',
      notes: ''
    });
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'IQD': return 'د.ع';
      case 'USD': return '$';
      case 'AED': return 'د.إ';
      default: return '';
    }
  };

  const getCurrencyName = (currency: string) => {
    switch (currency) {
      case 'IQD': return 'دينار عراقي';
      case 'USD': return 'دولار أمريكي';
      case 'AED': return 'درهم إماراتي';
      default: return '';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };



  const exportToExcel = () => {
    const data = filteredBalances.map(balance => ({
      'المصدر': balance.sourceName,
      'المبلغ': balance.amount,
      'العملة': getCurrencyName(balance.currency),
      'النوع': balance.type === 'airline' ? 'خط طيران' : 'مورد',
      'ملاحظات': balance.notes || '',
      'آخر تحديث': balance.lastUpdated.toLocaleDateString('en-GB')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأرصدة');
    XLSX.writeFile(wb, `الأرصدة_${new Date().toLocaleDateString('en-GB')}.xlsx`);
  };

  const totalIQD = balances.filter(b => b.currency === 'IQD').reduce((sum, b) => sum + b.amount, 0);
  const totalUSD = balances.filter(b => b.currency === 'USD').reduce((sum, b) => sum + b.amount, 0);
  const totalAED = balances.filter(b => b.currency === 'AED').reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center p-6 bg-red-50 rounded-xl max-w-md">
          <div className="text-red-600 mb-4">
            <X className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-red-900 mb-2">حدث خطأ</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  console.log('Balances loaded:', balances.length, 'Filtered:', filteredBalances.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
            إدارة الأرصدة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold">إدارة أرصدة خطوط الطيران والموردين</p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl font-black shadow-lg shadow-teal-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">إضافة رصيد</span>
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={exportToExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>
            <button
              onClick={() => showNotification('يتم التحديث تلقائياً', 'info')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 font-black">إجمالي الدينار</p>
              <p className="text-2xl font-black mt-1 leading-none">{formatCurrency(totalIQD)}</p>
              <p className="text-[10px] opacity-70 mt-1 font-bold">دينار عراقي</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 font-black">إجمالي الدولار</p>
              <p className="text-2xl font-black mt-1 leading-none">{formatCurrency(totalUSD)}</p>
              <p className="text-[10px] opacity-70 mt-1 font-bold">دولار أمريكي</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl shadow-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 font-black">إجمالي الدرهم</p>
              <p className="text-2xl font-black mt-1 leading-none">{formatCurrency(totalAED)}</p>
              <p className="text-[10px] opacity-70 mt-1 font-bold">درهم إماراتي</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/40 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث باسم المصدر أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-10 pl-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right font-bold text-sm transition-all"
            />
          </div>
          <div className="flex gap-1 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'airline', label: 'الطيران' },
              { id: 'supplier', label: 'الموردين' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black text-xs transition-all ${filterType === t.id
                  ? 'bg-white dark:bg-gray-600 text-teal-600 dark:text-teal-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="text-xs font-black text-gray-400 ml-2">
            نوع الرصيد:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'الكل', icon: null },
              { id: 'auto', label: 'API تلقائي', icon: <Zap className="w-3 h-3" /> },
              { id: 'manual', label: 'يدوي', icon: null }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterAutoSync(f.id as any)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs border transition-all ${filterAutoSync === f.id
                  ? 'bg-gray-900 border-gray-900 text-white dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredBalances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Wallet className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-xl font-bold mb-2">لا توجد أرصدة</p>
            <p className="text-sm">ابدأ بإضافة رصيد جديد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBalances.map((balance, index) => {
              const balanceColor = getBalanceColor(balance);
              const colorClasses = getBalanceColorClasses(balanceColor);

              return (
                <div
                  key={balance.id}
                  className={`group relative ${colorClasses.bg} dark:bg-gray-800/10 rounded-2xl shadow-sm border ${colorClasses.border} dark:border-gray-700 p-4 transition-all hover:shadow-md cursor-default`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Source Info */}
                    <div className="flex items-center gap-3 lg:w-1/3">
                      <div className="relative">
                        {balance.sourceImage ? (
                          <img
                            src={balance.sourceImage}
                            alt={balance.sourceName}
                            className="w-14 h-14 rounded-2xl object-cover shadow-sm bg-white"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner ${balance.type === 'airline' ? 'bg-blue-500' : 'bg-orange-500'
                            }`}>
                            {balance.sourceName.charAt(0)}
                          </div>
                        )}
                        {balance.isAutoSync && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm" title="متزامن">
                            <Zap className="w-2.5 h-2.5" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-800 dark:text-slate-100 truncate">{balance.sourceName}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md ${balance.type === 'airline' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300'
                            }`}>
                            {balance.type === 'airline' ? 'طيران' : 'مورد'}
                          </span>
                          {balance.isAutoSync && (
                            <span className="text-[10px] font-black text-green-600 dark:text-green-400 flex items-center gap-1">
                              تلقائي API
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Currency */}
                    <div className="grid grid-cols-2 lg:grid-cols-1 lg:flex lg:flex-row items-center gap-3 flex-1">
                      <div className={`p-3 rounded-xl flex flex-col justify-center border lg:w-48 ${getBalanceColorBg(balance)} dark:bg-opacity-5`}>
                        <span className="text-[10px] font-black opacity-60 mb-0.5">الرصيد</span>
                        <div className={`text-xl font-black font-mono leading-none ${getBalanceTextColor(balance)}`}>
                          {formatCurrency(balance.amount)}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl flex flex-col justify-center border lg:w-40 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
                        <span className="text-[10px] font-black opacity-60 mb-0.5">العملة</span>
                        <div className={`text-sm font-black text-slate-700 dark:text-slate-200`}>
                          {getCurrencyName(balance.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-2 p-1 border-t lg:border-t-0 border-dashed border-gray-100 dark:border-gray-700 pt-3 lg:pt-0">
                      <div className="flex gap-2">
                        {balance.lastUpdatedBy && (
                          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 max-w-[150px]">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{balance.lastUpdatedBy.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{balance.lastUpdated.toLocaleDateString('ar-EG-u-nu-latn')}</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => setLimitsBalance(balance)}
                          className="p-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="الحدود"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(balance)}
                          className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="السجل"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditBalance(balance)}
                          className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBalance(balance)}
                          className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-sm"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModernModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="إضافة رصيد جديد"
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 text-right">
                المصدر *
              </label>
              <button
                onClick={() => setShowSourcesModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                إدارة المصادر
              </button>
            </div>
            <select
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
              required
            >
              <option value="">اختر المصدر</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.type === 'airline' ? 'خط طيران' : 'مورد'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              المبلغ * <span className="text-xs text-gray-500">(استخدم الإشارة السالبة - للطلبات)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.-]/g, '');
                setFormData({ ...formData, amount: value });
              }}
              placeholder="0.00"
              className={`w-full px-4 py-4 text-3xl font-bold text-center border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all ${parseFloat(formData.amount) < 0
                ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                : 'border-gray-200 bg-white text-gray-900 focus:ring-teal-500'
                }`}
              required
            />
            {parseFloat(formData.amount) < 0 && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="font-bold">⚠</span>
                هذا طلب (رصيد سالب)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              العملة *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'IQD' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'IQD'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">د.ع</p>
                <p className="text-xs">دينار عراقي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'USD' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'USD'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">$</p>
                <p className="text-xs">دولار أمريكي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'AED' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'AED'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">د.إ</p>
                <p className="text-xs">درهم إماراتي</p>
              </button>
            </div>
          </div>

          <ModernInput
            label="ملاحظات (اختياري)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أي ملاحظات إضافية"
          />

          <div className="flex gap-3 justify-end pt-4 border-t">
            <ModernButton
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              إلغاء
            </ModernButton>
            <ModernButton onClick={handleAddBalance}>
              إضافة الرصيد
            </ModernButton>
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBalance(null);
          resetForm();
        }}
        title="تعديل الرصيد"
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 text-right">
                المصدر *
              </label>
              <button
                onClick={() => setShowSourcesModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                إدارة المصادر
              </button>
            </div>
            <select
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
              required
            >
              <option value="">اختر المصدر</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.type === 'airline' ? 'خط طيران' : 'مورد'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              المبلغ * <span className="text-xs text-gray-500">(استخدم الإشارة السالبة - للطلبات)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.-]/g, '');
                setFormData({ ...formData, amount: value });
              }}
              placeholder="0.00"
              className={`w-full px-4 py-4 text-3xl font-bold text-center border-2 rounded-xl focus:ring-2 focus:border-transparent transition-all ${parseFloat(formData.amount) < 0
                ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                : 'border-gray-200 bg-white text-gray-900 focus:ring-teal-500'
                }`}
              required
            />
            {parseFloat(formData.amount) < 0 && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="font-bold">⚠</span>
                هذا طلب (رصيد سالب)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              العملة *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'IQD' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'IQD'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">د.ع</p>
                <p className="text-xs">دينار عراقي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'USD' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'USD'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">$</p>
                <p className="text-xs">دولار أمريكي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'AED' })}
                className={`p-4 rounded-xl border-2 transition-all ${formData.currency === 'AED'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-lg mb-1">د.إ</p>
                <p className="text-xs">درهم إماراتي</p>
              </button>
            </div>
          </div>

          <ModernInput
            label="ملاحظات (اختياري)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="أي ملاحظات إضافية"
          />

          <div className="flex gap-3 justify-end pt-4 border-t">
            <ModernButton
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingBalance(null);
                resetForm();
              }}
            >
              إلغاء
            </ModernButton>
            <ModernButton onClick={handleUpdateBalance}>
              حفظ التعديلات
            </ModernButton>
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showSourcesModal}
        onClose={() => {
          setShowSourcesModal(false);
          setSourceFormData({ name: '', image: '', type: 'airline' });
        }}
        title="إدارة المصادر"
      >
        <div className="space-y-5">
          <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                النوع
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceFormData({ ...sourceFormData, type: 'airline' })}
                  className={`p-3 rounded-xl border-2 transition-all ${sourceFormData.type === 'airline'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <p className="font-semibold text-sm">خط طيران</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFormData({ ...sourceFormData, type: 'supplier' })}
                  className={`p-3 rounded-xl border-2 transition-all ${sourceFormData.type === 'supplier'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <p className="font-semibold text-sm">مورد</p>
                </button>
              </div>
            </div>

            <ModernInput
              label="اسم المصدر"
              value={sourceFormData.name}
              onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
              placeholder="مثال: طيران العربية"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                صورة المصدر (اختياري)
              </label>
              <div className="flex flex-col items-center gap-3">
                {sourceFormData.image && (
                  <div className="relative">
                    <img
                      src={sourceFormData.image}
                      alt="Preview"
                      className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setSourceFormData({ ...sourceFormData, image: '' })}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-teal-500 transition-colors">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">اختيار صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 text-center">
                  الحجم الأقصى: 2 ميجابايت<br />
                  الصيغ المدعومة: JPG, PNG, GIF
                </p>
              </div>
            </div>

            <ModernButton
              onClick={handleAddSource}
              fullWidth
              icon={<Plus className="w-4 h-4" />}
            >
              إضافة المصدر
            </ModernButton>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 text-right px-2">المصادر الحالية</h3>
            {sources.length === 0 ? (
              <p className="text-center text-gray-500 py-8">لا توجد مصادر</p>
            ) : (
              sources.map(source => (
                <div key={source.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-teal-300 transition-colors">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditSource(source)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{source.name}</p>
                      <p className="text-xs text-gray-500">
                        {source.type === 'airline' ? 'خط طيران' : 'مورد'}
                      </p>
                    </div>
                    {source.image ? (
                      <img
                        src={source.image}
                        alt={source.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${source.type === 'airline' ? 'bg-blue-500' : 'bg-orange-500'
                        }`}>
                        {source.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showEditSourceModal}
        onClose={() => {
          setShowEditSourceModal(false);
          setEditingSource(null);
          setSourceFormData({ name: '', image: '', type: 'airline' });
        }}
        title="تعديل المصدر"
      >
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                النوع
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceFormData({ ...sourceFormData, type: 'airline' })}
                  className={`p-3 rounded-xl border-2 transition-all ${sourceFormData.type === 'airline'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <p className="font-semibold text-sm">خط طيران</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFormData({ ...sourceFormData, type: 'supplier' })}
                  className={`p-3 rounded-xl border-2 transition-all ${sourceFormData.type === 'supplier'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <p className="font-semibold text-sm">مورد</p>
                </button>
              </div>
            </div>

            <ModernInput
              label="اسم المصدر"
              value={sourceFormData.name}
              onChange={(e) => setSourceFormData({ ...sourceFormData, name: e.target.value })}
              placeholder="مثال: طيران العربية"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                رابط الصورة (اختياري)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sourceFormData.image}
                  onChange={(e) => setSourceFormData({ ...sourceFormData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
                />
                {sourceFormData.image && (
                  <div className="relative w-12 h-12">
                    <img
                      src={sourceFormData.image}
                      alt="معاينة"
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <ModernButton
              onClick={() => {
                setShowEditSourceModal(false);
                setEditingSource(null);
                setSourceFormData({ name: '', image: '', type: 'airline' });
              }}
              variant="secondary"
              fullWidth
            >
              إلغاء
            </ModernButton>
            <ModernButton
              onClick={handleUpdateSource}
              fullWidth
              icon={<Edit2 className="w-4 h-4" />}
            >
              حفظ التعديلات
            </ModernButton>
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedBalanceForHistory(null);
          setBalanceHistory([]);
        }}
        title={`سجل الرصيد - ${selectedBalanceForHistory?.sourceName || ''}`}
      >
        <div className="space-y-4">
          {balanceHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mb-3 opacity-20" />
              <p className="text-lg font-bold mb-1">لا يوجد سجل</p>
              <p className="text-sm">لم يتم إجراء أي تعديلات على هذا الرصيد</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {balanceHistory.map((history) => (
                <div
                  key={history.id}
                  className={`p-4 rounded-xl border-2 ${history.action === 'created'
                    ? 'bg-green-50 border-green-200'
                    : history.action === 'updated'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${history.action === 'created'
                        ? 'bg-green-500 text-white'
                        : history.action === 'updated'
                          ? 'bg-blue-500 text-white'
                          : 'bg-red-500 text-white'
                        }`}>
                        {history.action === 'created' ? (
                          <Plus className="w-4 h-4" />
                        ) : history.action === 'updated' ? (
                          <Edit2 className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-sm font-bold ${history.action === 'created'
                        ? 'text-green-700'
                        : history.action === 'updated'
                          ? 'text-blue-700'
                          : 'text-red-700'
                        }`}>
                        {history.action === 'created'
                          ? 'إنشاء'
                          : history.action === 'updated'
                            ? 'تعديل'
                            : 'حذف'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {history.timestamp?.toLocaleString('ar-IQ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{history.changes}</p>

                  {history.updatedBy && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-lg border border-gray-200">
                      <User className="w-4 h-4 text-blue-600" />
                      <div className="flex-1 text-right">
                        <p className="text-xs font-semibold text-gray-900">{history.updatedBy.name}</p>
                        <p className="text-xs text-gray-600">{history.updatedBy.email}</p>
                      </div>
                    </div>
                  )}

                  {history.action === 'updated' && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-1">القيمة السابقة</p>
                        <p className="text-sm font-bold text-gray-700">
                          {history.oldAmount && formatCurrency(history.oldAmount)} {history.oldCurrency && getCurrencyName(history.oldCurrency)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-1">القيمة الجديدة</p>
                        <p className="text-sm font-bold text-teal-600">
                          {history.newAmount && formatCurrency(history.newAmount)} {history.newCurrency && getCurrencyName(history.newCurrency)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModernModal>

      {/* Balance Limits Modal */}
      {limitsBalance && (
        <BalanceLimitsModal
          balance={limitsBalance}
          onClose={() => setLimitsBalance(null)}
          onSuccess={() => {
            setLimitsBalance(null);
          }}
        />
      )}
    </div>
  );
}

export default Balances;
