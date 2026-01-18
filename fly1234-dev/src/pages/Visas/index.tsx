import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Search, Trash2, FileText, Filter, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VisaEntry, VisaType } from './types';
import ModernModal from '../../components/ModernModal';
import CustomDatePicker from '../../components/CustomDatePicker';
import VisaFilters from './components/VisaFilters';
import VisaSourceSelector from './components/VisaSourceSelector';
import VisaBeneficiarySelector from './components/VisaBeneficiarySelector';
import VisaTypeSelector from './components/VisaTypeSelector';

interface Company {
  id: string;
  name: string;
}

export default function Visas() {
  const { theme } = useTheme();
  const { currentUser, employee } = useAuth();
  const { showNotification } = useNotification();

  const [visas, setVisas] = useState<VisaEntry[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');
  const [beneficiaryFilter, setBeneficiaryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [selectedVisaType, setSelectedVisaType] = useState('');
  const [source, setSource] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [bk, setBk] = useState('');

  // Modal states
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Date filters
  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(firstDay);
  const [dateTo, setDateTo] = useState<Date | undefined>(lastDay);

  useEffect(() => {
    loadVisas();
    loadVisaTypes();
    loadSources();
    loadCompanies();
  }, []);

  const loadVisas = async () => {
    setLoading(true);
    try {
      const visasRef = collection(db, 'visas');
      const q = query(visasRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const visasList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          passportNumber: data.passportNumber || '',
          visaType: data.visaType || '',
          source: data.source || '',
          beneficiary: data.beneficiary || '',
          salePrice: data.salePrice || 0,
          purchasePrice: data.purchasePrice || 0,
          notes: data.notes || '',
          bk: data.bk || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || '',
          createdByName: data.createdByName || '',
          entryChecked: data.entryChecked || false,
          auditChecked: data.auditChecked || false
        } as VisaEntry;
      });

      setVisas(visasList);
    } catch (error) {
      console.error('Error loading visas:', error);
      showNotification('error', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadVisaTypes = async () => {
    try {
      const typesRef = collection(db, 'visaTypes');
      const snapshot = await getDocs(typesRef);

      const typesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate() || new Date()
        } as VisaType;
      });

      setVisaTypes(typesList.filter(t => t.isActive));
    } catch (error) {
      console.error('Error loading visa types:', error);
    }
  };

  const loadSources = async () => {
    try {
      const sourcesRef = collection(db, 'sources');
      const q = query(sourcesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const sourcesList = snapshot.docs.map(doc => doc.data().name || '');
      setSources(sourcesList);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);

      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || ''
      })).filter(c => c.name.trim() !== '');

      setCompanies(companiesList);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !passportNumber.trim()) {
      showNotification('error', 'الرجاء ملء الحقول المطلوبة (الاسم ورقم الجواز)');
      return;
    }

    try {
      const visaData = {
        name: name.trim(),
        passportNumber: passportNumber.trim(),
        visaType: selectedVisaType.trim(),
        source: source.trim(),
        beneficiary: beneficiary.trim(),
        salePrice: parseFloat(salePrice) || 0,
        purchasePrice: parseFloat(purchasePrice) || 0,
        notes: notes.trim(),
        bk: bk.trim(),
        createdAt: Timestamp.now(),
        createdBy: currentUser?.uid || '',
        createdByName: employee?.name || '',
        entryChecked: false,
        auditChecked: false
      };

      await addDoc(collection(db, 'visas'), visaData);

      showNotification('success', 'تمت إضافة الفيزا بنجاح');

      // Clear form
      setName('');
      setPassportNumber('');
      setSelectedVisaType('');
      setSource('');
      setBeneficiary('');
      setSalePrice('');
      setPurchasePrice('');
      setNotes('');
      setBk('');

      // Reload data
      loadVisas();

      // Focus on first input
      setTimeout(() => {
        const firstInput = document.querySelector('input[name="name"]') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }, 100);
    } catch (error) {
      console.error('Error adding visa:', error);
      showNotification('error', 'فشل إضافة الفيزا');
    }
  };

  const handleAddVisaType = async () => {
    if (!newTypeName.trim()) {
      showNotification('error', 'الرجاء إدخال اسم النوع');
      return;
    }

    try {
      await addDoc(collection(db, 'visaTypes'), {
        name: newTypeName.trim(),
        isActive: true,
        createdAt: Timestamp.now()
      });

      showNotification('success', 'تمت إضافة النوع بنجاح');
      setNewTypeName('');
      loadVisaTypes();
    } catch (error) {
      console.error('Error adding visa type:', error);
      showNotification('error', 'فشل إضافة النوع');
    }
  };

  const handleDeleteVisaType = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع؟')) return;

    try {
      await deleteDoc(doc(db, 'visaTypes', id));
      showNotification('success', 'تم حذف النوع بنجاح');
      loadVisaTypes();
    } catch (error) {
      console.error('Error deleting visa type:', error);
      showNotification('error', 'فشل حذف النوع');
    }
  };

  const handleDeleteVisa = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفيزا؟')) return;

    try {
      await deleteDoc(doc(db, 'visas', id));
      showNotification('success', 'تم حذف الفيزا بنجاح');
      loadVisas();
    } catch (error) {
      console.error('Error deleting visa:', error);
      showNotification('error', 'فشل حذف الفيزا');
    }
  };

  const filteredVisas = useMemo(() => {
    let filtered = visas;

    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(v => v.createdAt >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(v => v.createdAt <= toDate);
    }

    // Source filter
    if (sourceFilter) {
      filtered = filtered.filter(v => v.source.toLowerCase().includes(sourceFilter.toLowerCase()));
    }

    // Beneficiary filter
    if (beneficiaryFilter) {
      filtered = filtered.filter(v => v.beneficiary.toLowerCase().includes(beneficiaryFilter.toLowerCase()));
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(v => v.visaType.toLowerCase().includes(typeFilter.toLowerCase()));
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(term) ||
        v.passportNumber.toLowerCase().includes(term) ||
        v.source.toLowerCase().includes(term) ||
        v.beneficiary.toLowerCase().includes(term) ||
        v.visaType.toLowerCase().includes(term) ||
        v.bk.toLowerCase().includes(term) ||
        v.notes.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [visas, dateFrom, dateTo, sourceFilter, beneficiaryFilter, typeFilter, searchTerm]);

  const calculateTotals = () => {
    let totalSale = 0;
    let totalPurchase = 0;

    filteredVisas.forEach(v => {
      totalSale += v.salePrice;
      totalPurchase += v.purchasePrice;
    });

    return {
      totalSale,
      totalPurchase,
      totalProfit: totalSale - totalPurchase
    };
  };

  const { totalSale, totalPurchase, totalProfit } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  if (loading && visas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleClearFilters = () => {
    setSourceFilter('');
    setBeneficiaryFilter('');
    setTypeFilter('');
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            إدخالات الفيزا
          </h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            إدارة طلبات الفيزا وإدخال البيانات بسرعة
          </p>
        </div>

        <button
          onClick={() => setShowTypesModal(true)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
            theme === 'dark'
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          <Settings className="w-5 h-5" />
          إعدادات الأنواع
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 ${
          theme === 'dark'
            ? 'bg-blue-950/30'
            : 'bg-blue-50/80'
        }`}>
          <div className={`text-sm font-bold mb-1 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            إجمالي المبيعات
          </div>
          <div className={`text-2xl font-black ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ${formatCurrency(totalSale)}
          </div>
        </div>

        <div className={`rounded-xl p-4 ${
          theme === 'dark'
            ? 'bg-orange-950/30'
            : 'bg-orange-50/80'
        }`}>
          <div className={`text-sm font-bold mb-1 ${
            theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
          }`}>
            إجمالي الشراء
          </div>
          <div className={`text-2xl font-black ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ${formatCurrency(totalPurchase)}
          </div>
        </div>

        <div className={`rounded-xl p-4 ${
          theme === 'dark'
            ? 'bg-emerald-950/30'
            : 'bg-emerald-50/80'
        }`}>
          <div className={`text-sm font-bold mb-1 ${
            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            الربح
          </div>
          <div className={`text-2xl font-black ${
            totalProfit >= 0
              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              : theme === 'dark' ? 'text-red-400' : 'text-red-600'
          }`}>
            ${formatCurrency(Math.abs(totalProfit))}
          </div>
        </div>

        <div className={`rounded-xl p-4 ${
          theme === 'dark'
            ? 'bg-purple-950/30'
            : 'bg-purple-50/80'
        }`}>
          <div className={`text-sm font-bold mb-1 ${
            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
          }`}>
            عدد الفيزا
          </div>
          <div className={`text-2xl font-black ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {filteredVisas.length}
          </div>
        </div>
      </div>

      {/* Quick Entry Form */}
      <div className={`rounded-2xl border-2 p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/30 border-gray-700/50'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          <Plus className="w-6 h-6" />
          إضافة فيزا جديدة
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="h-[52px]">
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم *"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
                required
              />
            </div>

            <div className="h-[52px]">
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="رقم الجواز *"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
                required
              />
            </div>

            <div className="h-[52px]">
              <VisaTypeSelector
                value={selectedVisaType}
                onChange={setSelectedVisaType}
                visaTypes={visaTypes}
                onManageTypes={() => setShowTypesModal(true)}
                placeholder="نوع الفيزا"
              />
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-6 gap-4">
            <div className="h-[52px]">
              <VisaSourceSelector
                value={source}
                onChange={setSource}
                sources={sources}
                placeholder="المصدر"
              />
            </div>

            <div className="h-[52px]">
              <VisaBeneficiarySelector
                value={beneficiary}
                onChange={setBeneficiary}
                companies={companies}
                placeholder="المستفيد"
              />
            </div>
            <div className="h-[52px]">
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="سعر البيع"
                step="0.01"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
              />
            </div>

            <div className="h-[52px]">
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="سعر الشراء"
                step="0.01"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
              />
            </div>

            <div className="h-[52px]">
              <input
                type="text"
                value={bk}
                onChange={(e) => setBk(e.target.value)}
                placeholder="BK"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
              />
            </div>

            <div className="h-[52px]">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="الملاحظة"
                className={`w-full h-full px-4 rounded-xl border-2 font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                } outline-none`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-[52px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة
          </button>
        </form>
      </div>

      {/* Search and Filters */}
      <div className={`rounded-2xl border-2 p-6 ${
        theme === 'dark'
          ? 'bg-gray-800/30 border-gray-700/50'
          : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-4 gap-4">
          <div className="relative h-[52px]">
            <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث..."
              className={`w-full h-full pr-10 pl-4 rounded-xl border-2 font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              } outline-none`}
            />
          </div>

          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={`relative h-[52px] px-4 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${
              (sourceFilter || beneficiaryFilter || typeFilter)
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 border-blue-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-violet-500 border-blue-400 text-white'
                : theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>فلترة</span>
            {(sourceFilter || beneficiaryFilter || typeFilter) && (
              <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                theme === 'dark'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {[sourceFilter, beneficiaryFilter, typeFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          <div className="h-[52px]">
            <CustomDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              label=""
              placeholder="من تاريخ"
            />
          </div>

          <div className="h-[52px]">
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              label=""
              placeholder="إلى تاريخ"
            />
          </div>
        </div>

        {/* Collapsible Filters Section */}
        {isFiltersExpanded && (
          <div className={`mt-6 p-6 rounded-xl border-2 space-y-4 animate-in slide-in-from-top duration-300 ${
            theme === 'dark'
              ? 'bg-gray-900/30 border-gray-700/50'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                فلترة الفيزا
              </h3>
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                إعادة تعيين
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <label className={`block text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  المصدر
                </label>
                <div className="h-[52px]">
                  <VisaSourceSelector
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    sources={sources}
                    placeholder="اختر المصدر..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  المستفيد
                </label>
                <div className="h-[52px]">
                  <VisaBeneficiarySelector
                    value={beneficiaryFilter}
                    onChange={setBeneficiaryFilter}
                    companies={companies}
                    placeholder="اختر المستفيد..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={`block text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  نوع الفيزا
                </label>
                <div className="h-[52px]">
                  <VisaTypeSelector
                    value={typeFilter}
                    onChange={setTypeFilter}
                    visaTypes={visaTypes}
                    placeholder="اختر نوع الفيزا..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-2xl border-2 overflow-hidden ${
        theme === 'dark'
          ? 'bg-gray-800/30 border-gray-700/50'
          : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>#</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>التاريخ</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>الاسم</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>رقم الجواز</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>نوع الفيزا</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>المصدر</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>المستفيد</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>سعر البيع</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>سعر الشراء</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>الربح</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>BK</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>الملاحظة</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>المدخل</th>
                <th className={`px-4 py-3 text-center text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisas.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <FileText className={`w-16 h-16 mx-auto mb-3 ${
                      theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                    }`} />
                    <p className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      لا توجد بيانات
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisas.map((visa, index) => {
                  const profit = visa.salePrice - visa.purchasePrice;
                  return (
                    <tr
                      key={visa.id}
                      className={`border-t ${
                        theme === 'dark'
                          ? 'border-gray-700/50 hover:bg-gray-700/30'
                          : 'border-gray-200 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {index + 1}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {formatDate(visa.createdAt)}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {visa.name}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        {visa.passportNumber}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {visa.visaType ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            theme === 'dark'
                              ? 'bg-purple-900/30 text-purple-400'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {visa.visaType}
                          </span>
                        ) : (
                          <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {visa.source || '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {visa.beneficiary || '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-black ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        ${formatCurrency(visa.salePrice)}
                      </td>
                      <td className={`px-4 py-3 text-center font-black ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        ${formatCurrency(visa.purchasePrice)}
                      </td>
                      <td className={`px-4 py-3 text-center font-black ${
                        profit >= 0
                          ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                          : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        ${formatCurrency(Math.abs(profit))}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {visa.bk || '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {visa.notes || '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {visa.createdByName || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteVisa(visa.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Visa Types Modal */}
      <ModernModal
        isOpen={showTypesModal}
        onClose={() => setShowTypesModal(false)}
        title="إعدادات أنواع الفيزا"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="اسم النوع الجديد"
              className={`flex-1 px-4 py-3 rounded-xl border-2 font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              } outline-none`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVisaType();
                }
              }}
            />
            <button
              onClick={handleAddVisaType}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إضافة
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {visaTypes.length === 0 ? (
              <p className={`text-center py-8 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                لا توجد أنواع حالياً
              </p>
            ) : (
              visaTypes.map(type => (
                <div
                  key={type.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    theme === 'dark'
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {type.name}
                  </span>
                  <button
                    onClick={() => handleDeleteVisaType(type.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-red-500/20 text-red-400'
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
