import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  FileText,
  ArrowDownRight,
  ArrowUpLeft,
  Calendar,
  Loader2,
  User,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

interface Voucher {
  id: string;
  companyName: string;
  amount: number;
  currency: 'USD' | 'IQD';
  type: 'receipt' | 'payment';
  createdAt: Date;
  employeeName?: string;
}

export default function RecentVouchers() {
  const { theme } = useTheme();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'receipt' | 'payment'>('receipt');

  useEffect(() => {
    setLoading(true);
    const vouchersRef = collection(db, 'vouchers');
    const q = query(
      vouchersRef,
      where('type', '==', activeType),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vouchersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          companyName: data.companyName,
          amount: data.amount,
          currency: data.currency,
          type: data.type,
          createdAt: data.createdAt.toDate(),
          employeeName: data.employeeName || 'غير معروف',
        } as Voucher;
      });
      setVouchers(vouchersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recent vouchers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeType]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US').format(amount) + (currency === 'USD' ? ' $' : ' د.ع');
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-200 h-full flex flex-col ${theme === 'dark'
        ? 'bg-[#1a1d29]/90 border border-white/10 backdrop-blur-xl'
        : 'bg-white border border-gray-200 shadow-sm'
      }`}>
      {/* Decorative Gradient Background */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] opacity-15 pointer-events-none ${activeType === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />

      {/* Header Container */}
      <div className="relative p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-md ${theme === 'dark'
              ? 'bg-gradient-to-br from-indigo-500 text-white shadow-indigo-500/20'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-600/20'
            }`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
              أحدث السندات المالية
            </h3>
            <p className={`text-xs font-medium opacity-70 flex items-center gap-2 mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
              <span className="flex h-1.5 w-1.5 rounded-full bg-current" />
              سجل العمليات الخمس الأخيرة
            </p>
          </div>
        </div>

        {/* Dynamic Filter Tabs */}
        <div className={`flex p-1 rounded-lg items-center gap-1 ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'
          }`}>
          <button
            onClick={() => setActiveType('receipt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${activeType === 'receipt'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-600 hover:text-emerald-600'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            سندات قبض
          </button>
          <button
            onClick={() => setActiveType('payment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 ${activeType === 'payment'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-gray-600 hover:text-rose-600'
              }`}
          >
            <TrendingDown className="w-4 h-4" />
            سندات دفع
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 px-6 pb-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed animate-spin ${theme === 'dark' ? 'border-white/20' : 'border-gray-200'
              }`}>
              <Loader2 className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              جاري التحميل...
            </p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl border border-dashed ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-gray-200 bg-gray-50/50'
            }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-200/50'
              }`}>
              <FileText className="w-8 h-8 opacity-30" />
            </div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>لا يوجد نشاط مالي مسجل حالياً</p>
            <span className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>ابدأ بإضافة أول سند {activeType === 'receipt' ? 'قبض' : 'دفع'}</span>
          </div>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className={`group/item flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${theme === 'dark'
                    ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                  }`}
              >
                {/* Status Indicator Bar */}
                <div className={`w-1 h-12 rounded-full flex-shrink-0 ${voucher.type === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />

                {/* Voucher Icon */}
                <div className={`flex items-center justify-center w-11 h-11 rounded-lg flex-shrink-0 ${voucher.type === 'receipt'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-rose-500/10 text-rose-600'
                  }`}>
                  {voucher.type === 'receipt' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpLeft className="w-5 h-5" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                    {voucher.companyName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      <User className="w-3 h-3" />
                      {voucher.employeeName}
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(voucher.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Amount Section */}
                <div className="text-left flex flex-col items-end gap-1">
                  <div className={`text-base font-bold tracking-tight leading-none ${voucher.type === 'receipt'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                    }`}>
                    {formatCurrency(voucher.amount, voucher.currency)}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${voucher.type === 'receipt'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-rose-500/10 text-rose-700'
                    }`}>
                    {voucher.type === 'receipt' ? 'قبض' : 'دفع'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className={`p-4 mx-6 mb-6 rounded-xl border flex items-center justify-between transition-colors duration-200 ${theme === 'dark'
          ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900'
        }`}>
        <span className="text-xs font-medium">عرض السجل الكامل للسندات</span>
        <button className={`p-1.5 rounded-md transition-colors duration-200 ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-white hover:bg-gray-200 shadow-sm'
          }`}>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

