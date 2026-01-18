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
    <div className={`relative overflow-hidden rounded-[2rem] shadow-2xl transition-all duration-300 h-full flex flex-col group ${theme === 'dark'
        ? 'bg-[#1a1d29]/80 border border-white/10 backdrop-blur-xl'
        : 'bg-white border border-gray-100 shadow-blue-500/5'
      }`}>
      {/* Decorative Gradient Background */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all duration-700 group-hover:scale-150 ${activeType === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />

      {/* Header Container */}
      <div className="relative p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-transform duration-500 group-hover:rotate-6 ${theme === 'dark'
              ? 'bg-gradient-to-br from-indigo-500 text-white shadow-indigo-500/20'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-600/20'
            }`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-xl font-[900] tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
              أحدث السندات المـالية
            </h3>
            <p className={`text-xs font-bold opacity-60 flex items-center gap-2 mt-0.5 ${theme === 'dark' ? 'text-indigo-200' : 'text-blue-600'
              }`}>
              <span className="flex h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              سجل العمليات الخمس الأخيرة
            </p>
          </div>
        </div>

        {/* Dynamic Filter Tabs */}
        <div className={`flex p-1 rounded-xl items-center ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-slate-100/80 border border-slate-200'
          }`}>
          <button
            onClick={() => setActiveType('receipt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-[800] transition-all duration-300 ${activeType === 'receipt'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-500 hover:text-emerald-500'
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            سندات قبض
          </button>
          <button
            onClick={() => setActiveType('payment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-[800] transition-all duration-300 ${activeType === 'payment'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-500 hover:text-rose-500'
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
            <div className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 border-dashed animate-spin ${theme === 'dark' ? 'border-white/20' : 'border-slate-200'
              }`}>
              <Loader2 className={`w-8 h-8 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-indigo-200/40' : 'text-slate-400'}`}>
              جاري مزامنة السجل المـالي...
            </p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-slate-100 bg-slate-50/50'
            }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200/50'
              }`}>
              <FileText className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-slate-500 font-bold">لا يوجد نشاط مـالي مسجل حالياً</p>
            <span className="text-xs text-slate-400 mt-1">ابدأ بإضافة أول سند {activeType === 'receipt' ? 'قبض' : 'دفع'}</span>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
            {vouchers.map((voucher, index) => (
              <div
                key={voucher.id}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`group/item flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 transform hover:-translate-x-2 animate-in fade-in slide-in-from-right-4 ${theme === 'dark'
                    ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                    : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200'
                  }`}
              >
                {/* Status Indicator Bar */}
                <div className={`w-1.5 h-12 rounded-full flex-shrink-0 transition-all duration-500 group-hover/item:h-14 ${voucher.type === 'receipt' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  }`} />

                {/* Voucher Icon */}
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-transform duration-500 group-hover/item:scale-110 ${voucher.type === 'receipt'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                  }`}>
                  {voucher.type === 'receipt' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpLeft className="w-6 h-6" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-[900] truncate leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'
                    }`}>
                    {voucher.companyName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-slate-400 transition-colors group-hover/item:text-indigo-400">
                      <User className="w-3 h-3" />
                      {voucher.employeeName}
                    </span>
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-slate-400 transition-colors group-hover/item:text-indigo-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(voucher.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Amount Section */}
                <div className="text-left flex flex-col items-end gap-1">
                  <div className={`text-lg font-[900] tracking-tight leading-none ${voucher.type === 'receipt'
                      ? 'text-emerald-500 font-mono'
                      : 'text-rose-500 font-mono'
                    }`}>
                    {formatCurrency(voucher.amount, voucher.currency)}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-[900] uppercase tracking-wider ${voucher.type === 'receipt'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                    }`}>
                    {voucher.type === 'receipt' ? 'عملية قبض' : 'عملية دفع'}
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className={`p-4 mx-6 mb-6 rounded-2xl border flex items-center justify-between transition-all duration-500 hover:scale-[1.02] ${theme === 'dark'
          ? 'bg-white/5 border-white/10 text-white/50 hover:text-white'
          : 'bg-slate-50 border-slate-100/50 text-slate-500 hover:text-blue-600'
        }`}>
        <span className="text-xs font-bold">عرض السجل الكامل للسندات</span>
        <button className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-white hover:bg-blue-600 hover:text-white shadow-sm'
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

