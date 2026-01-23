import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings,
    Search,
    RefreshCcw,
    AlertCircle,
    Loader2,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    Coins,
    Users,
    FileSpreadsheet,
    FileJson,
    FileText,
    ChevronDown,
    X,
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import BuyersSettingsModal from './components/BuyersSettingsModal';
import BuyerCard from './components/BuyerCard';
import { saveBuyersSettings } from '../../lib/services/buyersSettingsService';
import * as XLSX from 'xlsx';
import { useBuyersData } from './contexts/BuyersDataContext';



const BuyersAccounts: React.FC = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const {
        buyers,
        isFetchingInBg,
        totalResults,
        fetchedCount,
        syncLogs,
        startBgFetch,
        setBuyers,
        error,
        settings
    } = useBuyersData();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSaveSettings = async (newEndpoint: string, newToken: string) => {
        try {
            await saveBuyersSettings({ endpoint: newEndpoint, token: newToken });
            setIsSettingsOpen(false);
            showNotification('success', 'نجاح', 'تم حفظ الإعدادات بنجاح');
            handleRefresh();
        } catch (error) {
            showNotification('error', 'خطأ', 'فشل حفظ الإعدادات');
        }
    };

    const handleRefresh = () => {
        setBuyers([]);
        startBgFetch();
    };

    // Filter State - Defaults set to 'All' for complete visibility
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGroup, setFilterGroup] = useState('All');
    const [filterCurrency, setFilterCurrency] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [sortBy, setSortBy] = useState<'none' | 'creditLimit' | 'creditBalance' | 'remainingBalance'>('none');

    const [isExporting, setIsExporting] = useState(false);

    // UI State
    const [displayedCount, setDisplayedCount] = useState(40);

    // Parsing Helper
    const parseCurrencyValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const cleaned = val.toString().replace(/[^0-9.-]+/g, "");
        return parseFloat(cleaned) || 0;
    };

    const handleViewStatement = (buyer: any) => {
        const url = `/buyers-accounts/statement?id=${buyer.id}&token=${settings.token}&alias=${encodeURIComponent(buyer.alias)}&currency=${buyer.currency}`;
        navigate(url);
    };

    // 2. Export Functionality
    const exportData = (format: 'excel' | 'json' | 'csv') => {
        if (buyers.length === 0) {
            showNotification('info', 'تنبيه', 'لا توجد بيانات لتصديرها. يرجى الانتظار حتى اكتمال المزامنة.');
            return;
        }

        setIsExporting(true);
        try {
            const fileName = `buyers_accounts_${new Date().getTime()}`;

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(buyers, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const ws = XLSX.utils.json_to_sheet(buyers);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Buyers");

                if (format === 'excel') {
                    XLSX.writeFile(wb, `${fileName}.xlsx`);
                } else if (format === 'csv') {
                    XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
                }
            }
            showNotification('success', 'تم التصدير', `تم تصدير ${buyers.length} سجل بنجاح بصيغة ${format.toUpperCase()}`);
        } catch (err) {
            console.error("Export error:", err);
            showNotification('error', 'خطأ', 'فشل تصدير البيانات');
        } finally {
            setIsExporting(false);
        }
    };

    // 3. Optimized Filtering & Sorting Logic with First/Last Name Search
    const filteredBuyers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        
        // First, filter by criteria and calculate match scores
        const buyersWithScores = buyers.map(buyer => {
            // Apply filters first (always)
            const matchesGroup = filterGroup === 'All' || buyer.buyerGroup === filterGroup;
            const matchesCurrency = filterCurrency === 'All' || buyer.currency === filterCurrency;
            const matchesStatus = filterStatus === 'All' ||
                (filterStatus === 'Active' && buyer.status === 'success') ||
                (filterStatus === 'Inactive' && buyer.status !== 'success');

            let matchesType = true;
            const bal = parseCurrencyValue(buyer.credit);
            if (filterType === 'Debit') matchesType = bal < 0;
            else if (filterType === 'Credit') matchesType = bal > 0;
            else if (filterType === 'Zero') matchesType = bal === 0;

            // If filters don't match, exclude immediately
            if (!matchesGroup || !matchesCurrency || !matchesStatus || !matchesType) {
                return { buyer, score: -1 };
            }

            // If no search query, return with score 0 (no search relevance)
            if (query === '') {
                return { buyer, score: 0 };
            }

            // Enhanced search: Search in full name, first name, last name, and city
            const alias = (buyer.alias || '').toLowerCase().trim();
            const city = (buyer.city_id || '').toLowerCase().trim();
            
            // If alias or city is empty, don't match
            if (!alias && !city) {
                return { buyer, score: -1 };
            }
            
            // Split alias into words (first name, last name, etc.)
            const aliasWords = alias.split(/\s+/).filter((word: string) => word.length > 0);
            
            // Split query into words
            const queryWords = query.split(/\s+/).filter((word: string) => word.length > 0);
            
            let score = 0;
            
            // Check if query matches full alias or city (highest priority)
            if (alias === query) {
                score += 1000; // Exact match
            } else if (alias.includes(query)) {
                score += 500; // Full query in alias
            }
            
            if (city === query) {
                score += 800; // Exact city match
            } else if (city.includes(query)) {
                score += 400; // Query in city
            }
            
            // Count how many query words match alias words
            let matchedWords = 0;
            queryWords.forEach(qWord => {
                // Check exact word match (highest score)
                if (aliasWords.some((aWord: string) => aWord === qWord)) {
                    matchedWords++;
                    score += 200; // Exact word match
                }
                // Check partial word match
                else if (aliasWords.some((aWord: string) => aWord.includes(qWord) || qWord.includes(aWord))) {
                    matchedWords++;
                    score += 100; // Partial word match
                }
                // Check if query word is in full alias
                else if (alias.includes(qWord)) {
                    matchedWords++;
                    score += 50; // Query word in full alias
                }
            });
            
            // Bonus for matching all query words
            if (matchedWords === queryWords.length && queryWords.length > 1) {
                score += 300; // All words matched bonus
            }
            
            // If no matches at all, exclude
            if (score === 0) {
                return { buyer, score: -1 };
            }
            
            return { buyer, score };
        });
        
        // Filter out excluded buyers (score === -1) and sort by score (descending)
        let filtered = buyersWithScores
            .filter(item => item.score >= 0)
            .map(item => item);

        // Apply manual sorting if specified (but only if no search query, otherwise search relevance takes priority)
        if (sortBy !== 'none' && query === '') {
            filtered = filtered.sort((a, b) => {
                let aValue = 0;
                let bValue = 0;

                switch (sortBy) {
                    case 'creditLimit':
                        aValue = parseCurrencyValue(a.buyer.credit_limit);
                        bValue = parseCurrencyValue(b.buyer.credit_limit);
                        break;
                    case 'creditBalance':
                        aValue = parseCurrencyValue(a.buyer.credit);
                        bValue = parseCurrencyValue(b.buyer.credit);
                        break;
                    case 'remainingBalance':
                        aValue = parseCurrencyValue(a.buyer.remaining_balance);
                        bValue = parseCurrencyValue(b.buyer.remaining_balance);
                        break;
                }

                return bValue - aValue; // Descending order (highest first)
            });
        } else if (query !== '') {
            // When searching, sort by search relevance (score) first
            filtered = filtered.sort((a, b) => b.score - a.score);
        }

        // Extract buyers from the filtered array
        filtered = filtered.map(item => item.buyer);

        return filtered;
    }, [buyers, searchQuery, filterGroup, filterCurrency, filterStatus, filterType, sortBy]);

    // 3. Stats Aggregation (Grouped by Currency)
    const currencyStats = useMemo(() => {
        const statsMap: Record<string, { totalRemaining: number; totalLimit: number; totalDebit: number; totalVirtual: number }> = {};

        filteredBuyers.forEach(b => {
            const currency = b.currency || 'USD';
            if (!statsMap[currency]) {
                statsMap[currency] = { totalRemaining: 0, totalLimit: 0, totalDebit: 0, totalVirtual: 0 };
            }

            const bal = parseCurrencyValue(b.remaining_balance);
            const limit = parseCurrencyValue(b.credit_limit);
            const vCredit = parseCurrencyValue(b.virtual_credit);

            if (bal < 0) statsMap[currency].totalDebit += Math.abs(bal);

            statsMap[currency].totalRemaining += bal;
            statsMap[currency].totalLimit += limit;
            statsMap[currency].totalVirtual += vCredit;
        });

        return statsMap;
    }, [filteredBuyers]);

    const uniqueGroups = useMemo(() => {
        const groups = new Set(buyers.map(b => b.buyerGroup));
        return ['All', ...Array.from(groups).filter(Boolean)];
    }, [buyers]);

    const syncPercentage = totalResults > 0 ? Math.round((fetchedCount / totalResults) * 100) : 0;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(0); }
                    100% { transform: translateX(200%) translateY(0); }
                }
                .shimmer-animation {
                    animation: shimmer 2s infinite;
                }
            `}</style>
            {/* Enhanced Sync Progress Bar (Top) */}
            {isFetchingInBg && (
                <div className="h-2.5 w-full bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 z-[60] overflow-hidden sticky top-0 shadow-md">
                    <div className="relative h-full">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 transition-all duration-700 ease-out shadow-lg relative overflow-hidden"
                            style={{ width: `${Math.min(syncPercentage, 100)}%` }}
                        >
                            {/* Animated shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-animation" 
                                 style={{ animationDelay: '0.5s' }} />
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/60 to-cyan-400/60 blur-md opacity-75" />
                        </div>
                        {/* Percentage text overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-white drop-shadow-md tracking-tight">
                                {syncPercentage}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-6 pb-4 z-40 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase text-slate-800 dark:text-white">حسابات البايرز</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                    {isFetchingInBg
                                        ? `جاري المزامنة... (${fetchedCount.toLocaleString()} / ${totalResults.toLocaleString()})`
                                        : 'تزامن البيانات مكتمل'}
                                </p>
                                {isFetchingInBg && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Export Dropdown */}
                        <div className="relative group">
                            <button
                                disabled={isExporting || buyers.length === 0}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/20 transition-all hover:bg-emerald-100 disabled:opacity-50"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                                <span className="text-xs font-black">تصدير البيانات</span>
                                <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                            </button>

                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <button
                                    onClick={() => exportData('excel')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-right text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                    <span>ملف Excel (.xlsx)</span>
                                </button>
                                <button
                                    onClick={() => exportData('csv')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-right text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span>ملف CSV (.csv)</span>
                                </button>
                                <button
                                    onClick={() => exportData('json')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-right text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <FileJson className="w-4 h-4 text-amber-500" />
                                    <span>ملف JSON (.json)</span>
                                </button>
                            </div>
                        </div>

                        <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-800">
                            <Settings className="w-5 h-5 text-slate-400" />
                        </button>
                        <button onClick={handleRefresh} disabled={isFetchingInBg} className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 transition-all border border-blue-100/50 dark:border-blue-900/20">
                            <RefreshCcw className={`w-5 h-5 ${isFetchingInBg ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Compact Stats Summary Cards */}
                <div className="space-y-3">
                    {(() => {
                        const targetCurrency = filterCurrency === 'All' ? 'USD' : filterCurrency;
                        const s = currencyStats[targetCurrency] || { totalRemaining: 0, totalLimit: 0, totalDebit: 0, totalVirtual: 0 };

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* Virtual Credit Card */}
                                <div className="group relative bg-gradient-to-br from-amber-50 via-amber-50/50 to-orange-50 dark:from-amber-950/20 dark:via-amber-900/10 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-sm">
                                            <Coins className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-right flex-1 mr-3">
                                            <p className="text-[8px] font-black text-amber-700/70 dark:text-amber-400/70 uppercase tracking-wider leading-tight mb-1">سقف الائتمان الافتراضي</p>
                                            <p className="text-lg font-black text-amber-800 dark:text-amber-300 tracking-tight">
                                                {s.totalVirtual.toLocaleString()} <span className="text-[10px] text-amber-600/60 dark:text-amber-400/60">{targetCurrency}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Credit Limit Card */}
                                <div className="group relative bg-gradient-to-br from-rose-50 via-rose-50/50 to-pink-50 dark:from-rose-950/20 dark:via-rose-900/10 dark:to-pink-950/20 border border-rose-200/50 dark:border-rose-800/30 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg shadow-sm">
                                            <ArrowDownLeft className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-right flex-1 mr-3">
                                            <p className="text-[8px] font-black text-rose-700/70 dark:text-rose-400/70 uppercase tracking-wider leading-tight mb-1">إجمالي سقف الائتمان</p>
                                            <p className="text-lg font-black text-rose-800 dark:text-rose-300 tracking-tight">
                                                {s.totalLimit.toLocaleString()} <span className="text-[10px] text-rose-600/60 dark:text-rose-400/60">{targetCurrency}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Remaining Balance Card */}
                                <div className="group relative bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-teal-50 dark:from-emerald-950/20 dark:via-emerald-900/10 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-sm">
                                            <ArrowUpRight className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-right flex-1 mr-3">
                                            <p className="text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wider leading-tight mb-1">إجمالي الرصيد المتبقي</p>
                                            <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 tracking-tight">
                                                {s.totalRemaining.toLocaleString()} <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">{targetCurrency}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </header>

            <div className="flex flex-col h-full overflow-hidden relative">
                {/* Enhanced Advanced Filters */}
                <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-col lg:flex-row gap-3 z-30 shadow-sm">
                    {/* Compact Search Input */}
                    <div className="relative flex-1 group">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors z-10"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو المدينة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-10 pl-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors text-right"
                            />
                        </div>
                    </div>

                    {/* Filter Dropdowns Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:w-auto">
                        <div className="relative">
                            <select
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-2.5 px-4 text-[11px] font-black text-slate-600 dark:text-slate-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-8"
                            >
                                {uniqueGroups.map(g => <option key={g} value={g}>{g === 'All' ? 'مجموعة الباير' : g}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-2.5 px-4 text-[11px] font-black text-slate-600 dark:text-slate-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-8"
                            >
                                <option value="All">نوع الحساب</option>
                                <option value="Debit">Debit only</option>
                                <option value="Credit">Credit only</option>
                                <option value="Zero">Zero Balances</option>
                            </select>
                        </div>

                        <div className="relative">
                            <select
                                value={filterCurrency}
                                onChange={(e) => setFilterCurrency(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-2.5 px-4 text-[11px] font-black text-slate-600 dark:text-slate-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-8"
                            >
                                <option value="USD">USD</option>
                                <option value="IRR">IRR</option>
                                <option value="IQD">IQD</option>
                                <option value="All">الكل</option>
                            </select>
                        </div>

                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-2.5 px-4 text-[11px] font-black text-slate-600 dark:text-slate-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-8"
                            >
                                <option value="Active">Active Users</option>
                                <option value="Inactive">Inactive Users</option>
                                <option value="All">All Users</option>
                            </select>
                        </div>

                        {/* Sort By Filter */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl py-2.5 px-4 text-[11px] font-black text-slate-600 dark:text-slate-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-8"
                            >
                                <option value="none">ترتيب حسب</option>
                                <option value="creditLimit">الأعلى سقف ائتمان</option>
                                <option value="creditBalance">الأعلى رصيد ائتمان</option>
                                <option value="remainingBalance">الأعلى رصيد متبقي</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                    {error && buyers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                            <AlertCircle className="w-16 h-16 text-rose-500 mb-2 opacity-20" />
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">حدث خطأ في المزامنة!</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">{error}</p>
                            <button onClick={handleRefresh} className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black text-xs hover:bg-slate-900 transition-all">إعادة المحاولة</button>
                        </div>
                    ) : buyers.length === 0 && isFetchingInBg ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-500/10 rounded-full animate-ping absolute" />
                                <div className="w-20 h-20 border-4 border-blue-500/20 rounded-full border-t-blue-500 animate-spin relative" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">جاري بدء المزامنة الخارقة...</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">يرجى الانتظار قليلاً</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-[1700px] mx-auto pb-24">
                            {/* Results Header & Counter */}
                            <div className="flex flex-col md:flex-row items-center justify-between mb-8 px-6 py-6 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/5 dark:shadow-none gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-blue-500/10 rounded-2xl shadow-inner border border-blue-500/20">
                                        <Users className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">Buyer Accounts</h3>
                                        <div className="flex items-center gap-3 mt-1.5 p-1.5 pr-4 pl-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-full border border-blue-500/10 inline-flex w-fit group">
                                            <div className="relative">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-25" />
                                            </div>
                                            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest whitespace-nowrap">
                                                {fetchedCount.toLocaleString()} Records Obtained So Far
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-inner">
                                    <div className="flex flex-col items-center px-4">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Live Sync Progress</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-blue-500 tracking-tighter tabular-nums drop-shadow-sm">{fetchedCount.toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-slate-300">/ {totalResults > 0 ? totalResults.toLocaleString() : '...'}</span>
                                        </div>
                                    </div>
                                    <div className="w-[1.5px] h-10 bg-slate-200 dark:bg-slate-700/50" />
                                    <div className="flex flex-col items-center px-4">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-50">API Total</span>
                                        <span className="text-xl font-black text-slate-400 tracking-tighter opacity-50 tabular-nums">{totalResults.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sync Logs Console (Diagnostic Mode) */}
                            {isFetchingInBg && syncLogs.length > 0 && (
                                <div className="mb-8 bg-slate-900 rounded-3xl p-6 border border-white/10 shadow-2xl overflow-hidden relative group">
                                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Diagnostic Terminal (مراقبة المزامنة)</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar-dark font-mono">
                                        {syncLogs.map((log, i) => (
                                            <div key={i} className="text-[11px] flex items-center gap-3 text-emerald-400 opacity-80">
                                                <span className="opacity-30">{'>'}</span>
                                                <span>{log}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-5">
                                {filteredBuyers.slice(0, displayedCount).map((buyer, index) => (
                                    <BuyerCard
                                        key={`${buyer.id}-${index}`}
                                        buyer={buyer}
                                        onViewStatement={handleViewStatement}
                                    />
                                ))}
                            </div>

                            {displayedCount < filteredBuyers.length && (
                                <div className="flex justify-center py-12">
                                    <button
                                        onClick={() => setDisplayedCount(prev => prev + 40)}
                                        className="px-12 py-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-lg active:scale-95"
                                    >
                                        عرض المزيد ({filteredBuyers.length - displayedCount} متبقي)
                                    </button>
                                </div>
                            )}

                            {filteredBuyers.length === 0 && !isFetchingInBg && (
                                <div className="text-center py-32 opacity-20">
                                    <Search className="w-24 h-24 mx-auto mb-6" />
                                    <p className="text-2xl font-black uppercase tracking-widest">لا توجد نتائج مطابقة</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <BuyersSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                initialEndpoint={settings.endpoint}
                initialToken={settings.token}
            />
        </div>
    );
};

export default BuyersAccounts;
