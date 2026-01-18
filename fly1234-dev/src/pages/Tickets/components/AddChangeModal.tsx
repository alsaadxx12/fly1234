import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, DollarSign, Calendar } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import SourceSelector from './SourceSelector';
import BeneficiarySelector from './BeneficiarySelector';
import ArabicDatePicker from '../../../components/ArabicDatePicker';
import { Ticket } from '../types';

interface AddChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (changeData: {
    pnr: string;
    source: string;
    beneficiary: string;
    sourceChangeAmount: number;
    beneficiaryChangeAmount: number;
    sourceCurrency: 'IQD' | 'USD';
    beneficiaryCurrency: 'IQD' | 'USD';
    changeDate: Date;
    entryDate: Date;
  }) => void;
  editingTicket?: Ticket | null;
}

interface Source {
  id: string;
  name: string;
  currency: 'IQD' | 'USD';
}

interface Beneficiary {
  id: string;
  name: string;
  currency: 'IQD' | 'USD';
}

export default function AddChangeModal({ isOpen, onClose, onAdd, editingTicket }: AddChangeModalProps) {
  const { theme } = useTheme();
  const [pnr, setPnr] = useState('');
  const [source, setSource] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [sourceChangeAmount, setSourceChangeAmount] = useState('');
  const [beneficiaryChangeAmount, setBeneficiaryChangeAmount] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [changeDate, setChangeDate] = useState<Date>(new Date());
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSources();
      loadBeneficiaries();

      // تحميل بيانات التعديل
      if (editingTicket) {
        setPnr(editingTicket.pnr);
        setSource(editingTicket.source || '');
        setBeneficiary(editingTicket.beneficiary || '');
        setCurrency(editingTicket.currency as 'IQD' | 'USD' || 'IQD');

        if (editingTicket.passengers && editingTicket.passengers[0]) {
          setSourceChangeAmount(editingTicket.passengers[0].purchasePrice.toString());
          setBeneficiaryChangeAmount(editingTicket.passengers[0].salePrice.toString());
        }

        if (editingTicket.issueDate) {
          setChangeDate(new Date(editingTicket.issueDate));
        }
        if (editingTicket.entryDate) {
          setEntryDate(new Date(editingTicket.entryDate));
        }
      } else {
        // إعادة تعيين النموذج وتعيين تاريخ اليوم تلقائياً
        resetForm();
      }
    }
  }, [isOpen, editingTicket]);

  const loadSources = async () => {
    try {
      const sourcesSnapshot = await getDocs(collection(db, 'sources'));
      const sourcesList = sourcesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        currency: doc.data().currency || 'IQD'
      }));
      setSources(sourcesList);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const beneficiariesList = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        currency: doc.data().currency || 'IQD'
      }));
      setBeneficiaries(beneficiariesList);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pnr.trim()) {
      alert('الرجاء إدخال رقم PNR');
      return;
    }

    if (!source.trim()) {
      alert('الرجاء اختيار المصدر');
      return;
    }

    if (!beneficiary.trim()) {
      alert('الرجاء اختيار المستفيد');
      return;
    }

    if (!sourceChangeAmount || parseFloat(sourceChangeAmount) <= 0) {
      alert('الرجاء إدخال مبلغ التغيير من المصدر');
      return;
    }

    if (!beneficiaryChangeAmount || parseFloat(beneficiaryChangeAmount) <= 0) {
      alert('الرجاء إدخال مبلغ البيع للمستفيد');
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        pnr: pnr.trim(),
        source: source.trim(),
        beneficiary: beneficiary.trim(),
        sourceChangeAmount: parseFloat(sourceChangeAmount),
        beneficiaryChangeAmount: parseFloat(beneficiaryChangeAmount),
        sourceCurrency: currency,
        beneficiaryCurrency: currency,
        changeDate,
        entryDate
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding change:', error);
      alert('حدث خطأ أثناء إضافة التغيير');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPnr('');
    setSource('');
    setBeneficiary('');
    setSourceChangeAmount('');
    setBeneficiaryChangeAmount('');
    setCurrency('IQD');
    setChangeDate(new Date());
    setEntryDate(new Date());
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700'
            : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-orange-600/20 to-amber-600/20 border border-orange-500/30'
                : 'bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200'
            }`}>
              <ArrowRightLeft className={`w-6 h-6 ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-2xl font-black ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                إضافة تغيير تذكرة
              </h2>
              <p className={`text-sm font-bold mt-0.5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                تسجيل عملية تغيير من المصدر إلى المستفيد
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* PNR */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              رقم PNR <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              placeholder="أدخل رقم PNR"
              required
              dir="ltr"
              className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg text-center transition-all ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              } focus:outline-none`}
            />
          </div>

          {/* التواريخ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* تاريخ التغيير */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ التغيير <span className="text-red-500">*</span>
                </div>
              </label>
              <ArabicDatePicker
                value={changeDate}
                onChange={(date) => setChangeDate(date || new Date())}
                showHijri={false}
              />
            </div>

            {/* تاريخ الإدخال */}
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ الإدخال <span className="text-red-500">*</span>
                </div>
              </label>
              <div className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-center ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}>
                {entryDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* المصدر والمستفيد */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* المصدر */}
            <div className={`p-5 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-blue-900/20 border-blue-700/50'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                }`}>
                  <ArrowRightLeft className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <h3 className={`text-base font-black ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  المصدر (غير لنا)
                </h3>
              </div>

              <SourceSelector
                value={source}
                onChange={(value) => setSource(value)}
                sources={sources}
                required
                label="اختر المصدر"
              />

              <div className="mt-4">
                <label className={`block text-xs font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  المبلغ المدفوع للمصدر <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sourceChangeAmount}
                  onChange={(e) => setSourceChangeAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  min="0"
                  dir="ltr"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-lg text-center transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  } focus:outline-none`}
                />
              </div>
            </div>

            {/* المستفيد */}
            <div className={`p-5 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-emerald-900/20 border-emerald-700/50'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'bg-emerald-600/20' : 'bg-emerald-100'
                }`}>
                  <DollarSign className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`} />
                </div>
                <h3 className={`text-base font-black ${
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  المستفيد (بعنا له)
                </h3>
              </div>

              <BeneficiarySelector
                value={beneficiary}
                onChange={(value) => setBeneficiary(value)}
                beneficiaries={beneficiaries}
                required
                label="اختر المستفيد"
              />

              <div className="mt-4">
                <label className={`block text-xs font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  المبلغ المستلم من المستفيد <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={beneficiaryChangeAmount}
                  onChange={(e) => setBeneficiaryChangeAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  min="0"
                  dir="ltr"
                  className={`w-full px-4 py-3 rounded-xl border-2 font-bold text-lg text-center transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  } focus:outline-none`}
                />
              </div>
            </div>
          </div>

          {/* العملة */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              العملة <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrency('IQD')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm ${
                  currency === 'IQD'
                    ? theme === 'dark'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                IQD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm ${
                  currency === 'USD'
                    ? theme === 'dark'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                USD
              </button>
            </div>
          </div>

          {/* الربح المتوقع */}
          {sourceChangeAmount && beneficiaryChangeAmount && (
            <div className={`p-4 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  الربح المتوقع:
                </span>
                <span className={`text-2xl font-black ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} dir="ltr">
                  {(parseFloat(beneficiaryChangeAmount) - parseFloat(sourceChangeAmount)).toFixed(2)} {currency}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={`flex-1 px-6 py-3.5 rounded-xl font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3.5 rounded-xl font-black text-white transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
              } shadow-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الإضافة...
                </div>
              ) : (
                'إضافة التغيير'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
