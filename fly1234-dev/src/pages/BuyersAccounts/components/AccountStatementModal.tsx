import React, { useState, useEffect, useCallback } from 'react';
import {
    X,
    Download,
    Calendar,
    Filter,
    Loader2,
    AlertCircle,
    History,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";

interface Transaction {
    id: string;
    no: string;
    date: string;
    details: string;
    type: string;
    debit: number | string;
    credit: number | string;
    balance: number | string;
    invoice_no?: string;
}

interface StatementSummary {
    previous_balance: number | string;
    total_credit: number | string;
    total_debit: number | string;
    balance_due: number | string;
    currency: string;
    date_range: string;
}

interface AccountStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    buyer: any;
    token: string;
}

const AccountStatementModal: React.FC<AccountStatementModalProps> = ({ isOpen, onClose, buyer, token }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<StatementSummary | null>(null);

    // Filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterType, setFilterType] = useState('All');

    const fetchStatement = useCallback(async () => {
        if (!buyer?.id || !token) return;

        setLoading(true);
        setError(null);
        const perpage = 100; // Increased for better loading
        let page = 1;
        const allItems: any[] = [];
        let tempSummary: any = null;

        try {
            while (true) {
                const payload = {
                    endpoint: "https://accounts.fly4all.com/api/transactions/buyers",
                    token,
                    method: "POST",
                    params: {
                        id: buyer.id,
                        "pagination[page]": page,
                        "pagination[perpage]": perpage,
                        sort: "asc",
                        field: "no",
                    },
                    body: {},
                };

                const res = await fetch(FN_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!json?.ok) throw new Error(json?.error || "Proxy failed");

                const api = json.data;
                if (page === 1) tempSummary = api?.summary ?? null;

                const items = Array.isArray(api?.data) ? api.data : [];
                if (!items.length) break;

                allItems.push(...items);

                const total = Number(api?.meta?.total ?? 0);
                if (items.length < perpage) break;
                if (total > 0 && allItems.length >= total) break;

                page++;
            }

            setTransactions(allItems);
            setSummary(tempSummary);
        } catch (err: any) {
            console.error("Statement fetch error:", err);
            setError(err.message || "Failed to load statement");
        } finally {
            setLoading(false);
        }
    }, [buyer?.id, token]);

    useEffect(() => {
        if (isOpen) {
            fetchStatement();
        } else {
            // Reset state when closed
            setTransactions([]);
            setSummary(null);
        }
    }, [isOpen, fetchStatement]);

    const handleDownload = () => {
        if (transactions.length === 0) return;

        try {
            const ws = XLSX.utils.json_to_sheet(transactions);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Statement");
            XLSX.writeFile(wb, `Statement_${buyer.alias}_${new Date().getTime()}.xlsx`);
        } catch (err) {
            console.error("Download error:", err);
        }
    };

    const filteredTransactions = transactions.filter(tr => {
        if (filterType !== 'All' && tr.type !== filterType) return false;
        // Date filtering logic can be added here if dates are provided in correct format
        return true;
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <FileText className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">كشف الحساب - {buyer.alias}</h3>
                                <p className="text-xs font-bold text-slate-400">تحليل الحركات المالية والعمليات</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {loading && transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-sm font-black text-slate-500 text-center">جاري جلب بيانات كشف الحساب من السيرفر...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                                <AlertCircle className="w-16 h-16 text-rose-500 opacity-20" />
                                <h4 className="text-lg font-black text-slate-800 dark:text-white">خطأ في التحميل</h4>
                                <p className="text-sm text-slate-500 max-w-sm">{error}</p>
                                <button onClick={fetchStatement} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-black">إعادة المحاولة</button>
                            </div>
                        ) : (
                            <>
                                {/* Summary Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                        <div className="text-right">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Account Summary</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-bold">Previous Balance</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-black tracking-tight">{summary?.previous_balance || '0'} {buyer.currency}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-bold">Total Credit</span>
                                                <span className="text-emerald-500 font-black tracking-tight">{summary?.total_credit || '0'} {buyer.currency}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 font-bold">Total Debit</span>
                                                <span className="text-rose-500 font-black tracking-tight">{summary?.total_debit || '0'} {buyer.currency}</span>
                                            </div>
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Balance Due (Debit)</span>
                                                <span className="text-lg font-black text-rose-600 tracking-tighter">{summary?.balance_due || '0'} {buyer.currency}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters & Transaction List Area */}
                                    <div className="lg:col-span-3 space-y-6 text-right">
                                        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                                                <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">من تاريخ</label>
                                                <div className="relative">
                                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="date"
                                                        value={fromDate}
                                                        onChange={(e) => setFromDate(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-10 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-blue-500/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                                                <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">إلى تاريخ</label>
                                                <div className="relative">
                                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="date"
                                                        value={toDate}
                                                        onChange={(e) => setToDate(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-10 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-blue-500/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">النوع</label>
                                                <div className="relative">
                                                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <select
                                                        value={filterType}
                                                        onChange={(e) => setFilterType(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 px-10 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-blue-500/20 appearance-none"
                                                    >
                                                        <option value="All">الكل</option>
                                                        <option value="CHARGE">CHARGE</option>
                                                        <option value="OT-ISSUE">OT-ISSUE</option>
                                                        <option value="PAYMENT">PAYMENT</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleDownload}
                                                className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black transition-all hover:shadow-lg active:scale-95"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>Download statement of account</span>
                                            </button>
                                        </div>

                                        {/* Transactions Table */}
                                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900/50">
                                            <table className="w-full text-right border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Details</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Debit</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Credit</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Balance</th>
                                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Invoice No.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                    {filteredTransactions.map((tr, i) => (
                                                        <tr key={tr.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="p-4 text-[10px] font-bold text-slate-400 text-center">{i + 1}</td>
                                                            <td className="p-4 text-[11px] font-black text-slate-600 dark:text-slate-300">
                                                                <div className="flex items-center gap-2 justify-end">
                                                                    <span>{tr.date}</span>
                                                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                                        <History className="w-3.5 h-3.5 text-slate-400" />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-[10px] font-bold text-slate-500 max-w-[300px] text-right">
                                                                <div className="line-clamp-2" title={tr.details}>
                                                                    {tr.details}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black border inline-block ${tr.type === 'OT-ISSUE' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                                                        tr.type === 'CHARGE' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                                            tr.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                                    }`}>
                                                                    {tr.type}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-[11px] font-black text-slate-700 dark:text-slate-200 text-center">{tr.debit || '-'}</td>
                                                            <td className="p-4 text-[11px] font-black text-slate-700 dark:text-slate-200 text-center">{tr.credit || '-'}</td>
                                                            <td className="p-4 text-[11px] font-black text-slate-700 dark:text-slate-200 text-center">{tr.balance}</td>
                                                            <td className="p-4 text-right">
                                                                {tr.invoice_no && (
                                                                    <span className="text-[10px] font-black text-blue-500 hover:text-blue-600 cursor-pointer underline">
                                                                        {tr.invoice_no}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {!filteredTransactions.length && (
                                                        <tr>
                                                            <td colSpan={8} className="p-20 text-center text-slate-400 font-bold">
                                                                لا توجد حركات مطابقة للفلترة المختارة
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AccountStatementModal;
