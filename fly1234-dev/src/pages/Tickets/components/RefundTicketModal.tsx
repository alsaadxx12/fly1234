import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Users, DollarSign, Building2, User } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import ModernButton from '../../../components/ModernButton';
import ModernInput from '../../../components/ModernInput';

interface Ticket {
  id: string;
  pnr: string;
  passengers: string[];
  source: string;
  beneficiary: string;
  salePrice: number;
  purchasePrice: number;
  route: string;
  ticketDate?: Date;
}

interface RefundTicketModalProps {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundTicketModal({ ticket, onClose, onSuccess }: RefundTicketModalProps) {
  const { theme } = useTheme();
  const { employee } = useAuth();
  const { showNotification } = useNotification();

  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundBeneficiary, setRefundBeneficiary] = useState(ticket.beneficiary);
  const [refundSource, setRefundSource] = useState(ticket.source);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<string[]>([]);

  useEffect(() => {
    loadSourcesAndBeneficiaries();
  }, []);

  const loadSourcesAndBeneficiaries = async () => {
    try {
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      settingsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.sources) setSources(data.sources);
        if (data.beneficiaries) setBeneficiaries(data.beneficiaries);
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const togglePassenger = (passenger: string) => {
    setSelectedPassengers(prev =>
      prev.includes(passenger)
        ? prev.filter(p => p !== passenger)
        : [...prev, passenger]
    );
  };

  const handleSubmit = async () => {
    if (selectedPassengers.length === 0) {
      showNotification('error', 'يرجى اختيار مسافر واحد على الأقل');
      return;
    }

    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      showNotification('error', 'يرجى إدخال مبلغ الاسترجاع');
      return;
    }

    if (!refundBeneficiary || !refundSource) {
      showNotification('error', 'يرجى اختيار المستفيد والمصدر');
      return;
    }

    setLoading(true);
    try {
      // Create refund record
      await addDoc(collection(db, 'refunds'), {
        type: 'ticket',
        ticketId: ticket.id,
        pnr: ticket.pnr,
        route: ticket.route,
        passengers: selectedPassengers,
        originalAmount: ticket.salePrice,
        refundAmount: parseFloat(refundAmount),
        beneficiary: refundBeneficiary,
        source: refundSource,
        notes: notes,
        ticketDate: ticket.ticketDate || new Date(),
        createdBy: employee?.id || '',
        createdByName: employee?.name || '',
        createdAt: new Date()
      });

      // Update ticket to mark it has refund
      await updateDoc(doc(db, 'tickets', ticket.id), {
        hasRefund: true,
        refundedPassengers: selectedPassengers,
        lastRefundAt: new Date()
      });

      showNotification('success', 'تم إنشاء الاسترجاع بنجاح');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating refund:', error);
      showNotification('error', 'فشل إنشاء الاسترجاع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-3xl rounded-2xl shadow-2xl ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className={`text-2xl font-black ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              استرجاع تذكرة
            </h2>
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              PNR: {ticket.pnr}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className={`rounded-xl p-4 ${
            theme === 'dark' ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <div>
                <p className={`text-sm font-semibold mb-1 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                }`}>
                  معلومات التذكرة
                </p>
                <div className={`text-sm space-y-1 ${
                  theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'
                }`}>
                  <p><strong>المسار:</strong> {ticket.route}</p>
                  <p><strong>السعر الأصلي:</strong> ${ticket.salePrice}</p>
                  <p><strong>المصدر:</strong> {ticket.source}</p>
                  <p><strong>المستفيد:</strong> {ticket.beneficiary}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-6 ${
            theme === 'dark' ? 'bg-gray-900/40 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <Users className={`w-6 h-6 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <h3 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                اختر المسافرين المراد استرجاعهم
              </h3>
            </div>
            <div className="space-y-2">
              {ticket.passengers.map((passenger, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                    selectedPassengers.includes(passenger)
                      ? theme === 'dark'
                        ? 'bg-purple-900/30 border-2 border-purple-500'
                        : 'bg-purple-100 border-2 border-purple-500'
                      : theme === 'dark'
                        ? 'bg-gray-800/50 border-2 border-gray-700 hover:border-purple-600'
                        : 'bg-white border-2 border-gray-300 hover:border-purple-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPassengers.includes(passenger)}
                    onChange={() => togglePassenger(passenger)}
                    className="w-5 h-5 rounded accent-purple-600"
                  />
                  <User className={`w-5 h-5 ${
                    selectedPassengers.includes(passenger)
                      ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    selectedPassengers.includes(passenger)
                      ? theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                      : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {passenger}
                  </span>
                </label>
              ))}
            </div>
            <p className={`text-sm mt-3 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              تم اختيار: {selectedPassengers.length} من {ticket.passengers.length} مسافر
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                المستفيد
              </label>
              <select
                value={refundBeneficiary}
                onChange={(e) => setRefundBeneficiary(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                } outline-none focus:border-blue-500`}
              >
                <option value="">اختر المستفيد</option>
                {beneficiaries.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-bold mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                المصدر
              </label>
              <select
                value={refundSource}
                onChange={(e) => setRefundSource(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                } outline-none focus:border-blue-500`}
              >
                <option value="">اختر المصدر</option>
                {sources.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <ModernInput
            label="مبلغ الاسترجاع"
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="أدخل المبلغ"
            icon={<DollarSign className="w-5 h-5" />}
          />

          <ModernInput
            label="ملاحظات (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أضف ملاحظات..."
            multiline
            rows={3}
          />

          <div className={`rounded-xl p-4 ${
            theme === 'dark' ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${
                theme === 'dark' ? 'text-green-300' : 'text-green-700'
              }`}>
                المبلغ المسترجع:
              </span>
              <span className={`text-2xl font-black ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                ${refundAmount || '0'}
              </span>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <ModernButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </ModernButton>
          <ModernButton
            variant="danger"
            onClick={handleSubmit}
            loading={loading}
            disabled={selectedPassengers.length === 0 || !refundAmount || !refundBeneficiary || !refundSource}
          >
            {loading ? 'جاري الحفظ...' : 'تأكيد الاسترجاع'}
          </ModernButton>
        </div>
      </div>
    </div>
  );
}
