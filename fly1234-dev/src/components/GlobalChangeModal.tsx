import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, DollarSign, Calendar, Trash2, Save } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ticket } from '../pages/Tickets/types';
import ArabicDatePicker from './ArabicDatePicker';
import ModernModal from './ModernModal';

interface GlobalChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (changeData: {
    pnr: string;
    source: string;
    beneficiary: string;
    sourceChangeAmount: number;
    beneficiaryChangeAmount: number;
    sourceCurrency: 'IQD' | 'USD';
    beneficiaryCurrency: 'IQD' | 'USD';
    changeDate: Date;
    entryDate: Date;
  }) => Promise<void>;
  editingTicket?: Ticket | null;
  onDelete?: (ticketId: string) => Promise<void>;
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

export default function GlobalChangeModal({
  isOpen,
  onClose,
  onSave,
  editingTicket,
  onDelete
}: GlobalChangeModalProps) {
  const { theme } = useTheme();
  const [pnr, setPnr] = useState('');
  const [source, setSource] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [sourceChangeAmount, setSourceChangeAmount] = useState('');
  const [beneficiaryChangeAmount, setBeneficiaryChangeAmount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [beneficiaryCurrency, setBeneficiaryCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [changeDate, setChangeDate] = useState<Date>(new Date());
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSources();
      loadBeneficiaries();

      if (editingTicket) {
        setPnr(editingTicket.pnr);
        setSource(editingTicket.source || '');
        setBeneficiary(editingTicket.beneficiary || '');
        setSourceCurrency(editingTicket.currency as 'IQD' | 'USD' || 'IQD');

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

    if (!pnr.trim() || !source.trim() || !beneficiary.trim() || !sourceChangeAmount || !beneficiaryChangeAmount) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        pnr: pnr.trim(),
        source: source.trim(),
        beneficiary: beneficiary.trim(),
        sourceChangeAmount: parseFloat(sourceChangeAmount),
        beneficiaryChangeAmount: parseFloat(beneficiaryChangeAmount),
        sourceCurrency,
        beneficiaryCurrency,
        changeDate,
        entryDate
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving change:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTicket || !onDelete) return;

    if (window.confirm('هل أنت متأكد من حذف هذا التغيير؟')) {
      setLoading(true);
      try {
        await onDelete(editingTicket.id);
        resetForm();
        onClose();
      } catch (error) {
        console.error('Error deleting change:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setPnr('');
    setSource('');
    setBeneficiary('');
    setSourceChangeAmount('');
    setBeneficiaryChangeAmount('');
    setSourceCurrency('IQD');
    setBeneficiaryCurrency('IQD');
    setChangeDate(new Date());
    setEntryDate(new Date());
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    // لا نغير العملة تلقائياً - يمكن للمستخدم التحكم بها يدوياً
  };

  const handleBeneficiaryChange = (value: string) => {
    setBeneficiary(value);
    // لا نغير العملة تلقائياً - يمكن للمستخدم التحكم بها يدوياً
  };

  const profit = beneficiaryChangeAmount && sourceChangeAmount
    ? parseFloat(beneficiaryChangeAmount) - parseFloat(sourceChangeAmount)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border-2 overflow-hidden ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-gray-700/50 shadow-orange-500/10'
          : 'bg-gradient-to-br from-white via-gray-50 to-orange-50/30 border-gray-200/80 shadow-orange-500/20'
      }`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b-2 backdrop-blur-sm ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-orange-950/30 via-gray-800/50 to-amber-950/30 border-gray-700/50'
            : 'bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-yellow-50/30 border-gray-200/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {editingTicket ? 'تعديل تغيير' : 'إضافة تغيير جديد'}
              </h2>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                تسجيل عملية تغيير من المصدر إلى المستفيد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg text-center transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 shadow-lg shadow-gray-900/50 hover:shadow-orange-500/20 focus:shadow-orange-500/30 focus:border-orange-500'
                  : 'bg-white border-gray-300/50 text-gray-900 placeholder-gray-400 shadow-lg shadow-gray-200/50 hover:shadow-orange-400/30 focus:shadow-orange-500/40 focus:border-orange-500'
              } focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                selected={changeDate}
                onChange={(date) => setChangeDate(date || new Date())}
                dateFormat="dd/MM/yyyy"
              />
            </div>

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
                {new Date(entryDate).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-blue-900/20 border-blue-700/50'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                <h3 className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  المصدر (غير لنا)
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    اختر المصدر <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={source}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-800/50 border-gray-700/50 text-white shadow-md shadow-gray-900/40 hover:shadow-blue-500/20 focus:shadow-blue-500/30 focus:border-blue-500'
                        : 'bg-white border-gray-300/50 text-gray-900 shadow-md shadow-gray-200/40 hover:shadow-blue-400/30 focus:shadow-blue-500/40 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                  >
                    <option value="">اختر المصدر...</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    المبلغ المدفوع للمصدر <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={sourceChangeAmount}
                        onChange={(e) => setSourceChangeAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        min="0"
                        dir="ltr"
                        className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-lg transition-all duration-200 ${
                          theme === 'dark'
                            ? 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 shadow-lg shadow-gray-900/50 hover:shadow-blue-500/20 focus:shadow-blue-500/30'
                            : 'bg-white border-gray-300/50 text-gray-900 placeholder-gray-400 shadow-lg shadow-gray-200/50 hover:shadow-blue-400/30 focus:shadow-blue-500/40'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSourceCurrency('IQD')}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                          sourceCurrency === 'IQD'
                            ? theme === 'dark'
                              ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/50 scale-105'
                              : 'bg-orange-600 text-white shadow-lg shadow-orange-500/50 scale-105'
                            : theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 shadow-md'
                              : 'bg-gray-200/50 text-gray-700 hover:bg-gray-300 shadow-md'
                        }`}
                      >
                        IQD
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceCurrency('USD')}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                          sourceCurrency === 'USD'
                            ? theme === 'dark'
                              ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 scale-105'
                              : 'bg-red-600 text-white shadow-lg shadow-red-500/50 scale-105'
                            : theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 shadow-md'
                              : 'bg-gray-200/50 text-gray-700 hover:bg-gray-300 shadow-md'
                        }`}
                      >
                        USD
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-green-900/20 border-green-700/50'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-500" />
                <h3 className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-700'
                }`}>
                  المستفيد (بعنا له)
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    اختر المستفيد <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={beneficiary}
                    onChange={(e) => handleBeneficiaryChange(e.target.value)}
                    required
                    className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-gray-800/50 border-gray-700/50 text-white shadow-md shadow-gray-900/40 hover:shadow-green-500/20 focus:shadow-green-500/30 focus:border-green-500'
                        : 'bg-white border-gray-300/50 text-gray-900 shadow-md shadow-gray-200/40 hover:shadow-green-400/30 focus:shadow-green-500/40 focus:border-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                  >
                    <option value="">اختر المستفيد...</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    المبلغ المستلم من المستفيد <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={beneficiaryChangeAmount}
                        onChange={(e) => setBeneficiaryChangeAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        min="0"
                        dir="ltr"
                        className={`w-full px-3 py-3 rounded-xl border-2 font-bold text-lg transition-all duration-200 ${
                          theme === 'dark'
                            ? 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 shadow-lg shadow-gray-900/50 hover:shadow-green-500/20 focus:shadow-green-500/30'
                            : 'bg-white border-gray-300/50 text-gray-900 placeholder-gray-400 shadow-lg shadow-gray-200/50 hover:shadow-green-400/30 focus:shadow-green-500/40'
                        } focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBeneficiaryCurrency('IQD')}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                          beneficiaryCurrency === 'IQD'
                            ? theme === 'dark'
                              ? 'bg-green-600 text-white shadow-lg shadow-green-500/50 scale-105'
                              : 'bg-green-600 text-white shadow-lg shadow-green-500/50 scale-105'
                            : theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 shadow-md'
                              : 'bg-gray-200/50 text-gray-700 hover:bg-gray-300 shadow-md'
                        }`}
                      >
                        IQD
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeneficiaryCurrency('USD')}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                          beneficiaryCurrency === 'USD'
                            ? theme === 'dark'
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50 scale-105'
                              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50 scale-105'
                            : theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 shadow-md'
                              : 'bg-gray-200/50 text-gray-700 hover:bg-gray-300 shadow-md'
                        }`}
                      >
                        USD
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {sourceChangeAmount && beneficiaryChangeAmount && (
            <div className={`p-4 rounded-xl border-2 ${
              theme === 'dark'
                ? 'bg-gray-800/50 border-gray-700/50'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-center space-y-2">
                <p className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  ملخص التغيير
                </p>
                <div className="flex justify-around items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold mb-1 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      دفعنا (المصدر)
                    </span>
                    <span className={`text-lg font-black ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`} dir="ltr">
                      {parseFloat(sourceChangeAmount).toFixed(2)} {sourceCurrency}
                    </span>
                  </div>
                  <ArrowRightLeft className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold mb-1 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      استلمنا (المستفيد)
                    </span>
                    <span className={`text-lg font-black ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} dir="ltr">
                      {parseFloat(beneficiaryChangeAmount).toFixed(2)} {beneficiaryCurrency}
                    </span>
                  </div>
                </div>
                {sourceCurrency === beneficiaryCurrency && (
                  <div className={`pt-2 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <p className={`text-xs font-bold mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {profit >= 0 ? 'الربح' : 'الخسارة'}
                    </p>
                    <p className={`text-xl font-black ${
                      profit >= 0
                        ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`} dir="ltr">
                      {Math.abs(profit).toFixed(2)} {sourceCurrency}
                    </p>
                  </div>
                )}
                {sourceCurrency !== beneficiaryCurrency && (
                  <div className={`pt-2 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <p className={`text-xs font-bold ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      ⚠️ عملات مختلفة - يرجى المراجعة
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {editingTicket && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 via-red-600 to-rose-600 hover:from-red-700 hover:via-rose-700 hover:to-red-800 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-red-500/40 hover:shadow-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                حذف
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-gray-700/50 hover:bg-gray-600 text-white shadow-lg shadow-gray-900/50 hover:shadow-gray-600/30'
                  : 'bg-gray-200/50 hover:bg-gray-300 text-gray-800 shadow-lg shadow-gray-300/50 hover:shadow-gray-400/40'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white rounded-xl font-bold transition-all duration-200 shadow-xl shadow-orange-500/40 hover:shadow-orange-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {editingTicket ? 'حفظ التعديلات' : 'إضافة التغيير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
