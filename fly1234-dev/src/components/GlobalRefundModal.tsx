import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Calendar, Trash2, Save, DollarSign } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ticket, Passenger } from '../pages/Tickets/types';
import ArabicDatePicker from './ArabicDatePicker';

interface GlobalRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pnr: string, passengers: Passenger[], type: 'refund', notes: string, additionalData: {
    route: string;
    beneficiary: string;
    source: string;
    currency: string;
    entryDate: Date;
    issueDate: Date;
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

export default function GlobalRefundModal({
  isOpen,
  onClose,
  onSave,
  editingTicket,
  onDelete
}: GlobalRefundModalProps) {
  const { theme } = useTheme();
  const [pnr, setPnr] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [source, setSource] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
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
        setBeneficiary(editingTicket.beneficiary || '');
        setSource(editingTicket.source || '');
        setCurrency(editingTicket.currency as 'IQD' | 'USD' || 'IQD');

        if (editingTicket.passengers && editingTicket.passengers[0]) {
          setPurchasePrice(editingTicket.passengers[0].purchasePrice.toString());
          setSalePrice(editingTicket.passengers[0].salePrice.toString());
        }

        if (editingTicket.issueDate) {
          setIssueDate(new Date(editingTicket.issueDate));
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

    if (!pnr.trim() || !beneficiary.trim() || !source.trim() || !purchasePrice || !salePrice) {
      return;
    }

    setLoading(true);
    try {
      const passengers: Passenger[] = [
        {
          id: crypto.randomUUID(),
          name: 'استرجاع',
          passportNumber: '-',
          passengerType: 'adult',
          purchasePrice: parseFloat(purchasePrice),
          salePrice: parseFloat(salePrice),
          ticketNumber: '-',
        }
      ];

      await onSave(
        pnr.trim(),
        passengers,
        'refund',
        `المصدر: ${source} | المستفيد: ${beneficiary}`,
        {
          route: '',
          beneficiary: beneficiary.trim(),
          source: source.trim(),
          currency,
          entryDate,
          issueDate
        }
      );

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving refund:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTicket || !onDelete) return;

    if (window.confirm('هل أنت متأكد من حذف هذا الاسترجاع؟')) {
      setLoading(true);
      try {
        await onDelete(editingTicket.id);
        resetForm();
        onClose();
      } catch (error) {
        console.error('Error deleting refund:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setPnr('');
    setBeneficiary('');
    setSource('');
    setCurrency('IQD');
    setPurchasePrice('');
    setSalePrice('');
    setIssueDate(new Date());
    setEntryDate(new Date());
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    const selectedSource = sources.find(s => s.name === value);
    if (selectedSource) {
      setCurrency(selectedSource.currency);
    }
  };

  const profit = salePrice && purchasePrice
    ? parseFloat(salePrice) - parseFloat(purchasePrice)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {editingTicket ? 'تعديل استرجاع' : 'إضافة استرجاع جديد'}
              </h2>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                تسجيل عملية استرجاع تذكرة
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
              className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-lg text-center transition-all ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              } focus:outline-none`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  تاريخ الاسترجاع <span className="text-red-500">*</span>
                </div>
              </label>
              <ArabicDatePicker
                value={issueDate}
                onChange={(date) => setIssueDate(date || new Date())}
                showHijri={false}
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
                {new Date(entryDate).toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                المصدر <span className="text-red-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-red-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
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
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                المستفيد <span className="text-red-500">*</span>
              </label>
              <select
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-red-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
              >
                <option value="">اختر المستفيد...</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                سعر الشراء <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                  dir="ltr"
                  className={`w-full px-4 py-3 pr-16 rounded-xl border-2 font-bold text-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                  } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                />
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {currency}
                </span>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                سعر الاسترجاع <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                  dir="ltr"
                  className={`w-full px-4 py-3 pr-16 rounded-xl border-2 font-bold text-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                  } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                />
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {purchasePrice && salePrice && (
            <div className={`p-4 rounded-xl border-2 ${
              profit >= 0
                ? theme === 'dark'
                  ? 'bg-green-900/20 border-green-700/50'
                  : 'bg-green-50 border-green-200'
                : theme === 'dark'
                  ? 'bg-red-900/20 border-red-700/50'
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-center">
                <p className={`text-sm font-bold mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {profit >= 0 ? 'الربح' : 'الخسارة'}
                </p>
                <p className={`text-2xl font-black ${
                  profit >= 0
                    ? theme === 'dark'
                      ? 'text-green-400'
                      : 'text-green-600'
                    : theme === 'dark'
                      ? 'text-red-400'
                      : 'text-red-600'
                }`} dir="ltr">
                  {Math.abs(profit).toFixed(2)} {currency}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {editingTicket && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                حذف
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {editingTicket ? 'حفظ التعديلات' : 'إضافة الاسترجاع'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
