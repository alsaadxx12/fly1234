import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Settings,
    Search,
    RefreshCcw,
    AlertCircle,
    Loader2,
    CheckSquare,
    Square,
    FileSpreadsheet,
    Filter,
    CheckCircle2
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import BrowserSettingsModal from './components/BrowserSettingsModal';
import UserCardDetails from './components/UserCardDetails';
import BroadcastModal from './components/BroadcastModal';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { saveDataFlySettings, subscribeToDataFlySettings } from '../../lib/services/dataFlyService';

const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";

const BUYER_GROUPS = [
    "General user",
    "Admin",
    "Travel companies",
    "Application API OUT",
    "Al-Rawdatain offices",
    "Api Out Segment",
    "Passengers group",
    "Companies outside",
    "Shasha Al-Rawdatain",
    "Iraq Company Cash",
    "Api Out Parto",
    "Api Out Sindbad",
    "Supplier Test - Made by Luxota Support",
    "Sindibad - TK - ME - QR"
];

const SystemBrowser: React.FC = () => {
    const { showNotification } = useNotification();

    // Settings State
    const [endpoint, setEndpoint] = useState('https://accounts.fly4all.com/api/users');
    const [token, setToken] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Sync Settings with Firestore
    useEffect(() => {
        const unsubscribe = subscribeToDataFlySettings((settings) => {
            if (settings.endpoint) setEndpoint(settings.endpoint);
            if (settings.token) setToken(settings.token);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveSettings = async (newEndpoint: string, newToken: string) => {
        try {
            await saveDataFlySettings({ endpoint: newEndpoint, token: newToken });
            setIsSettingsOpen(false);
            showNotification('success', 'نجاح', 'تم حفظ الإعدادات بنجاح');
        } catch (error) {
            showNotification('error', 'خطأ', 'فشل حفظ الإعدادات');
        }
    };

    // Data State (The "Full" Dataset)
    const [rawUsers, setRawUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

    // UI State (Filtering & Lazy Loading)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [displayedCount, setDisplayedCount] = useState(50);

    // Selection State (Robust All/Exclude Pattern)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

    // 1. Fetch ALL Data Loop with Retry and Progress Monitoring
    const fetchAllData = useCallback(async () => {
        if (!token) {
            setError('يرجى ضبط مفتاح الوصول (Token) في الإعدادات أولاً.');
            return;
        }

        setLoading(true);
        setError(null);
        setRawUsers([]);
        setFetchProgress({ current: 0, total: 0 });

        const MAX_RETRIES = 3;
        const perpage = 1500;
        let page = 1;
        const allItems: any[] = [];
        let total = 0;

        try {
            while (true) {
                let retryCount = 0;
                let success = false;
                let result: any = null;

                while (retryCount < MAX_RETRIES && !success) {
                    try {
                        const response = await fetch(FN_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                endpoint,
                                token,
                                method: "POST",
                                params: {
                                    "pagination[page]": page,
                                    "pagination[perpage]": perpage,
                                },
                                body: {}
                            })
                        });

                        result = await response.json();
                        if (result.ok) {
                            success = true;
                        } else {
                            throw new Error(result.error || `Error ${result.status}`);
                        }
                    } catch (e: any) {
                        retryCount++;
                        console.warn(`Retry ${retryCount}/${MAX_RETRIES} for page ${page}`);
                        if (retryCount >= MAX_RETRIES) throw e;
                        await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
                    }
                }

                const items = result.data?.data || [];
                total = result.data?.total || total;

                if (items.length === 0) break;

                allItems.push(...items);
                setRawUsers([...allItems]);
                setFetchProgress({ current: allItems.length, total: total || allItems.length });

                if (items.length < perpage) break;
                page++;
            }
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError(`حدث خطأ أثناء جلب البيانات: ${err.message}. تم جلب ${allItems.length} سجل حتى الآن.`);
        } finally {
            setLoading(false);
        }
    }, [endpoint, token]);


    useEffect(() => {
        if (token) {
            fetchAllData();
        }
    }, [token, endpoint]);

    const [showOnlyWhatsApp, setShowOnlyWhatsApp] = useState(false);

    // 2. Client-side Filtering Logic
    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return rawUsers.filter(user => {
            const matchesSearch = query === '' ||
                (user.fullname || '').toLowerCase().includes(query) ||
                (user.email || '').toLowerCase().includes(query);

            const matchesGroup = !selectedGroup || user.buyer_group === selectedGroup || user.type === selectedGroup;

            const matchesWhatsApp = !showOnlyWhatsApp || (user.mobile && user.mobile.length > 5);

            return matchesSearch && matchesGroup && matchesWhatsApp;
        });
    }, [rawUsers, searchQuery, selectedGroup, showOnlyWhatsApp]);

    // Reset lazy display when filters change
    useEffect(() => {
        setDisplayedCount(50);
    }, [searchQuery, selectedGroup]);

    // 3. UI Lazy Loading (Infinite Scroll on Displayed Data)
    const observer = useRef<IntersectionObserver | null>(null);
    const lastUserElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && displayedCount < filteredUsers.length) {
                setDisplayedCount(prev => prev + 50);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, displayedCount, filteredUsers.length]);

    // 4. Selection Logic
    const toggleSelectAll = () => {
        if (isAllSelected || selectedIds.size > 0) {
            setIsAllSelected(false);
            setSelectedIds(new Set());
            setExcludedIds(new Set());
        } else {
            setIsAllSelected(true);
            setExcludedIds(new Set());
            setSelectedIds(new Set());
        }
    };

    const toggleUserSelection = useCallback((userId: string) => {
        if (isAllSelected) {
            setExcludedIds(prev => {
                const next = new Set(prev);
                if (next.has(userId)) next.delete(userId);
                else next.add(userId);
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(userId)) next.delete(userId);
                else next.add(userId);
                return next;
            });
        }
    }, [isAllSelected]);

    const isUserSelected = useCallback((userId: string) => {
        if (isAllSelected) return !excludedIds.has(userId);
        return selectedIds.has(userId);
    }, [isAllSelected, selectedIds, excludedIds]);

    const getSelectedItems = useCallback(() => {
        if (isAllSelected) {
            return filteredUsers.filter(u => !excludedIds.has(u.id));
        }
        return rawUsers.filter(u => selectedIds.has(u.id));
    }, [isAllSelected, filteredUsers, rawUsers, selectedIds, excludedIds]);

    const exportData = (type: 'excel' | 'json') => {
        setExporting(true);
        try {
            const dataToExport = getSelectedItems();
            const finalData = dataToExport.length > 0 ? dataToExport : filteredUsers;

            if (finalData.length === 0) {
                showNotification('info', 'تنبيه', 'لا توجد بيانات لتصديرها');
                return;
            }

            if (type === 'excel') {
                const ws = XLSX.utils.json_to_sheet(finalData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Users");
                XLSX.writeFile(wb, `system_users_${new Date().getTime()}.xlsx`);
            } else {
                const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `system_users_${new Date().getTime()}.json`;
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            showNotification('success', 'تم التصدير', `تم تصدير ${finalData.length} سجل بنجاح`);
        } catch (err) {
            console.error("Export error:", err);
            showNotification('error', 'خطأ', 'فشل التصدير');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 pt-4 flex flex-col gap-4 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="pb-3 text-sm font-black text-blue-500 relative">
                            <span>تصفح المستخدمين</span>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-all">
                            <Settings className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={fetchAllData} disabled={loading} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 transition-all">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col h-full overflow-hidden relative">
                {/* Search Bar */}
                <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-3 z-10">
                    <div className="relative flex-1 group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="بحث سريع..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pr-9 pl-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500/20 transition-all text-right"
                        />
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-3 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 w-48 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <select
                                value={selectedGroup || ''}
                                onChange={(e) => setSelectedGroup(e.target.value || null)}
                                className="bg-transparent border-none text-[10px] font-black text-slate-700 dark:text-slate-200 focus:ring-0 w-full cursor-pointer appearance-none"
                            >
                                <option value="">جميع المجموعات</option>
                                {BUYER_GROUPS.map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => setShowOnlyWhatsApp(!showOnlyWhatsApp)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all border
                        ${showOnlyWhatsApp
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100'}`}
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span>واتساب</span>
                        </button>
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                        <button
                            onClick={() => exportData('excel')}
                            disabled={exporting}
                            className="flex items-center gap-2 px-3 py-1.5 text-emerald-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-[9px] font-black disabled:opacity-30"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>تصدير</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {/* Selection Bar */}
                    <div className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between gap-4 z-10">
                        <button
                            onClick={toggleSelectAll}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black transition-all border
                        ${isAllSelected || selectedIds.size > 0
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'}`}
                        >
                            {isAllSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedIds.size > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            <span>{isAllSelected ? `الكل (${filteredUsers.length - excludedIds.size})` : selectedIds.size > 0 ? `تم اختيار ${selectedIds.size}` : 'تحديد الكل'}</span>
                        </button>

                        <div className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-2">
                            {fetchProgress.total > 0 && (
                                <span>{fetchProgress.current.toLocaleString()} / {fetchProgress.total.toLocaleString()}</span>
                            )}
                            <span>الإجمالي: <span className="text-slate-900 dark:text-white">{filteredUsers.length.toLocaleString()}</span></span>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <main className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                        {error ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                                <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                                <h3 className="text-md font-black text-slate-800 dark:text-white">تنبيه!</h3>
                                <button onClick={() => setIsSettingsOpen(true)} className="px-5 py-2 bg-slate-800 text-white rounded-xl font-black text-xs">الإعدادات</button>
                            </div>
                        ) : loading && rawUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                                <div className="w-12 h-12 border-4 border-slate-200 rounded-full border-t-blue-500 animate-spin" />
                                <p className="text-sm font-black text-slate-700">جاري التحميل...</p>
                            </div>
                        ) : (
                            <div className="max-w-[1400px] mx-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                                    {filteredUsers.slice(0, displayedCount).map((user, index) => (
                                        <div key={user.id} ref={index === Math.min(displayedCount, filteredUsers.length) - 1 ? lastUserElementRef : null}>
                                            <UserCardDetails
                                                user={user}
                                                isSelected={isUserSelected(user.id)}
                                                onToggleSelect={toggleUserSelection}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {displayedCount < filteredUsers.length && (
                                    <div className="flex justify-center py-10 opacity-50">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    </div>
                                )}
                                {!loading && filteredUsers.length === 0 && (
                                    <div className="text-center py-20 opacity-20">
                                        <Filter className="w-20 h-20 mx-auto mb-4" />
                                        <p className="text-xl font-black uppercase tracking-widest">لا توجد نتائج مطابقة</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>

                {/* Selection Hub - Floating Bottom Bar */}
                {(isAllSelected || selectedIds.size > 0) && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
                        <div className="bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4 ring-1 ring-white/5">
                            <div className="flex items-center gap-3 mr-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter opacity-70">المختار</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-black text-white leading-none">{isAllSelected ? (filteredUsers.length - excludedIds.size).toLocaleString() : selectedIds.size.toLocaleString()}</span>
                                        <span className="text-[9px] font-bold text-slate-400">سجل</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-white/10" />

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsBroadcastOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[11px] font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                    <span>ارسال</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAllSelected(false);
                                        setSelectedIds(new Set());
                                        setExcludedIds(new Set());
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-full text-[11px] font-black transition-all active:scale-95 border border-white/5"
                                >
                                    الغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <BrowserSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                initialEndpoint={endpoint}
                initialToken={token}
            />

            <BroadcastModal
                isOpen={isBroadcastOpen}
                onClose={() => setIsBroadcastOpen(false)}
                selectedUsers={getSelectedItems()}
                onSend={(data: any) => {
                    console.log('Sending broadcast:', data);
                }}
            />
        </div>
    );
};

export default SystemBrowser;
