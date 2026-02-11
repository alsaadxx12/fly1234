import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
    MapPin,
    DollarSign,
    RefreshCw,
    Calculator,
    Globe,
    Clock,
    Search,
    ChevronDown,
    Activity,
    Sparkles,
    BarChart3,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Iraqi Provinces Exchange Rate Data (simulated)
// ──────────────────────────────────────────────
const BASE_RATE = 1480; // Central Bank rate

interface ProvinceRate {
    name: string;
    nameEn: string;
    buy: number;
    sell: number;
    change: number; // percent change from yesterday
    region: 'شمال' | 'وسط' | 'جنوب';
}

const generateProvinceRates = (): ProvinceRate[] => {
    const provinces: Array<{ name: string; nameEn: string; offset: number; region: 'شمال' | 'وسط' | 'جنوب' }> = [
        { name: 'بغداد', nameEn: 'Baghdad', offset: 0, region: 'وسط' },
        { name: 'كربلاء', nameEn: 'Karbala', offset: 3, region: 'وسط' },
        { name: 'النجف', nameEn: 'Najaf', offset: 5, region: 'وسط' },
        { name: 'البصرة', nameEn: 'Basra', offset: -2, region: 'جنوب' },
        { name: 'أربيل', nameEn: 'Erbil', offset: 8, region: 'شمال' },
        { name: 'السليمانية', nameEn: 'Sulaymaniyah', offset: 10, region: 'شمال' },
        { name: 'دهوك', nameEn: 'Duhok', offset: 7, region: 'شمال' },
        { name: 'كركوك', nameEn: 'Kirkuk', offset: 4, region: 'شمال' },
        { name: 'الموصل', nameEn: 'Mosul', offset: 6, region: 'شمال' },
        { name: 'الأنبار', nameEn: 'Anbar', offset: 2, region: 'وسط' },
        { name: 'بابل', nameEn: 'Babylon', offset: 1, region: 'وسط' },
        { name: 'ديالى', nameEn: 'Diyala', offset: 3, region: 'وسط' },
        { name: 'واسط', nameEn: 'Wasit', offset: -1, region: 'جنوب' },
        { name: 'ميسان', nameEn: 'Maysan', offset: -3, region: 'جنوب' },
        { name: 'ذي قار', nameEn: 'Dhi Qar', offset: -2, region: 'جنوب' },
        { name: 'المثنى', nameEn: 'Al-Muthanna', offset: -4, region: 'جنوب' },
        { name: 'القادسية', nameEn: 'Al-Qadisiyyah', offset: -1, region: 'جنوب' },
        { name: 'صلاح الدين', nameEn: 'Saladin', offset: 5, region: 'وسط' },
    ];

    return provinces.map(p => {
        const buy = BASE_RATE + p.offset * 50 + Math.floor(Math.random() * 30 - 15);
        const sell = buy + Math.floor(Math.random() * 20 + 10);
        const change = parseFloat((Math.random() * 1.2 - 0.4).toFixed(2));
        return { name: p.name, nameEn: p.nameEn, buy, sell, change, region: p.region };
    });
};

// ──────────────────────────────────────────────
// Popular Currency Pairs
// ──────────────────────────────────────────────
interface CurrencyInfo {
    code: string;
    name: string;
    flag: string;
    rateToIQD: number;
}

const currencies: CurrencyInfo[] = [
    { code: 'USD', name: 'دولار أمريكي', flag: '🇺🇸', rateToIQD: 1480 },
    { code: 'EUR', name: 'يورو', flag: '🇪🇺', rateToIQD: 1610 },
    { code: 'GBP', name: 'جنيه إسترليني', flag: '🇬🇧', rateToIQD: 1870 },
    { code: 'TRY', name: 'ليرة تركية', flag: '🇹🇷', rateToIQD: 43 },
    { code: 'AED', name: 'درهم إماراتي', flag: '🇦🇪', rateToIQD: 403 },
    { code: 'SAR', name: 'ريال سعودي', flag: '🇸🇦', rateToIQD: 395 },
    { code: 'KWD', name: 'دينار كويتي', flag: '🇰🇼', rateToIQD: 4810 },
    { code: 'IRR', name: 'ريال إيراني', flag: '🇮🇷', rateToIQD: 0.035 },
    { code: 'JOD', name: 'دينار أردني', flag: '🇯🇴', rateToIQD: 2088 },
    { code: 'EGP', name: 'جنيه مصري', flag: '🇪🇬', rateToIQD: 30 },
    { code: 'CNY', name: 'يوان صيني', flag: '🇨🇳', rateToIQD: 204 },
    { code: 'INR', name: 'روبية هندية', flag: '🇮🇳', rateToIQD: 17.6 },
];

// ──────────────────────────────────────────────
// Landing Page Component
// ──────────────────────────────────────────────
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { customSettings } = useTheme();

    const [provinceRates, setProvinceRates] = useState<ProvinceRate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [regionFilter, setRegionFilter] = useState<string>('الكل');
    const [sortBy, setSortBy] = useState<'name' | 'buy' | 'sell' | 'change'>('name');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Converter state
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('IQD');
    const [amount, setAmount] = useState('100');
    const [isConverterFlipped, setIsConverterFlipped] = useState(false);

    useEffect(() => {
        setProvinceRates(generateProvinceRates());
    }, []);

    const refreshRates = () => {
        setProvinceRates(generateProvinceRates());
        setLastUpdate(new Date());
    };

    // Filtered and sorted provinces
    const filteredProvinces = useMemo(() => {
        let list = [...provinceRates];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(p => p.name.includes(term) || p.nameEn.toLowerCase().includes(term));
        }
        if (regionFilter !== 'الكل') {
            list = list.filter(p => p.region === regionFilter);
        }
        list.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
            if (sortBy === 'buy') return b.buy - a.buy;
            if (sortBy === 'sell') return b.sell - a.sell;
            return b.change - a.change;
        });
        return list;
    }, [provinceRates, searchTerm, regionFilter, sortBy]);

    // Currency converter
    const convertedAmount = useMemo(() => {
        const amt = parseFloat(amount) || 0;
        if (fromCurrency === 'IQD' && toCurrency === 'IQD') return amt;
        if (fromCurrency === 'IQD') {
            const target = currencies.find(c => c.code === toCurrency);
            return target ? amt / target.rateToIQD : 0;
        }
        if (toCurrency === 'IQD') {
            const source = currencies.find(c => c.code === fromCurrency);
            return source ? amt * source.rateToIQD : 0;
        }
        const source = currencies.find(c => c.code === fromCurrency);
        const target = currencies.find(c => c.code === toCurrency);
        if (!source || !target) return 0;
        return (amt * source.rateToIQD) / target.rateToIQD;
    }, [amount, fromCurrency, toCurrency]);

    const flipCurrencies = () => {
        setIsConverterFlipped(!isConverterFlipped);
        const temp = fromCurrency;
        setFromCurrency(toCurrency);
        setToCurrency(temp);
    };

    const avgBuy = provinceRates.length > 0 ? Math.round(provinceRates.reduce((s, p) => s + p.buy, 0) / provinceRates.length) : 0;
    const avgSell = provinceRates.length > 0 ? Math.round(provinceRates.reduce((s, p) => s + p.sell, 0) / provinceRates.length) : 0;
    const maxBuy = provinceRates.length > 0 ? Math.max(...provinceRates.map(p => p.buy)) : 0;
    const minBuy = provinceRates.length > 0 ? Math.min(...provinceRates.map(p => p.buy)) : 0;

    return (
        <div className="min-h-screen bg-[#0a0e1a] font-['Tajawal'] text-white overflow-x-hidden selection:bg-blue-500/30">
            {/* ═══════════════════════════ Navigation ═══════════════════════════ */}
            <nav className="fixed top-0 w-full z-50 bg-[#0a0e1a]/80 backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(user ? '/attendance-standalone' : '/login')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 text-sm"
                    >
                        {user ? 'لوحة التحكم' : 'تسجيل الدخول'}
                    </motion.button>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src={customSettings.logoUrl} alt="Logo" className="h-8 md:h-11 w-auto" />
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════ Hero Section ═══════════════════════════ */}
            <section className="relative pt-24 pb-8 md:pt-32 md:pb-12 px-4 md:px-8 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-[100px]" />
                    <div className="absolute top-[30%] left-[50%] w-[300px] h-[300px] bg-emerald-500/4 rounded-full blur-[80px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-5">
                            <Activity className="w-3.5 h-3.5" />
                            <span>أسعار محدثة لحظياً</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-4 leading-tight">
                            أسعار صرف الدولار{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400">
                                في العراق
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                            تابع أسعار الصرف في جميع المحافظات العراقية لحظة بلحظة مع أداة تحويل العملات المتقدمة
                        </p>
                    </motion.div>

                    {/* ═══ Stats Cards ═══ */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
                    >
                        {[
                            { label: 'سعر الشراء (متوسط)', value: avgBuy.toLocaleString(), icon: TrendingUp, color: 'emerald', suffix: 'د.ع' },
                            { label: 'سعر البيع (متوسط)', value: avgSell.toLocaleString(), icon: TrendingDown, color: 'rose', suffix: 'د.ع' },
                            { label: 'أعلى سعر', value: maxBuy.toLocaleString(), icon: BarChart3, color: 'amber', suffix: 'د.ع' },
                            { label: 'أقل سعر', value: minBuy.toLocaleString(), icon: Activity, color: 'blue', suffix: 'د.ع' },
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className={`relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-4 hover:bg-white/[0.06] transition-all group`}
                            >
                                <div className={`absolute top-0 right-0 w-20 h-20 bg-${stat.color}-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-${stat.color}-500/10 transition-all`} />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{stat.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xl md:text-2xl font-black">{stat.value}</span>
                                        <span className="text-xs text-slate-500 font-bold">{stat.suffix}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Last Update + Refresh */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>آخر تحديث: {lastUpdate.toLocaleTimeString('ar-IQ')}</span>
                        </div>
                        <button
                            onClick={refreshRates}
                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>تحديث الأسعار</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ Province Exchange Rates Table ═══════════════════════════ */}
            <section className="px-4 md:px-8 pb-10 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="ابحث عن محافظة..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['الكل', 'شمال', 'وسط', 'جنوب'].map(region => (
                                <button
                                    key={region}
                                    onClick={() => setRegionFilter(region)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${regionFilter === region
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] border border-white/5'
                                        }`}
                                >
                                    {region === 'الكل' ? '🏳️ الكل' : region === 'شمال' ? '🏔️ شمال' : region === 'وسط' ? '🏛️ وسط' : '🌊 جنوب'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort Buttons */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">ترتيب حسب:</span>
                        {[
                            { key: 'name' as const, label: 'الاسم' },
                            { key: 'buy' as const, label: 'سعر الشراء' },
                            { key: 'sell' as const, label: 'سعر البيع' },
                            { key: 'change' as const, label: 'التغيّر' },
                        ].map(s => (
                            <button
                                key={s.key}
                                onClick={() => setSortBy(s.key)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${sortBy === s.key
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02] backdrop-blur-sm">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-white/[0.03] border-b border-white/5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                            <div className="col-span-4">المحافظة</div>
                            <div className="col-span-2 text-center">سعر الشراء</div>
                            <div className="col-span-2 text-center">سعر البيع</div>
                            <div className="col-span-2 text-center">الفرق</div>
                            <div className="col-span-2 text-center">التغيّر %</div>
                        </div>

                        {/* Table Body */}
                        <AnimatePresence mode="popLayout">
                            {filteredProvinces.map((province, idx) => (
                                <motion.div
                                    key={province.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className={`grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 items-center px-4 md:px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.04] transition-all group ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'
                                        }`}
                                >
                                    {/* Province Name */}
                                    <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all shrink-0">
                                            <MapPin className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-black text-sm text-white">{province.name}</div>
                                            <div className="text-[10px] text-slate-600 font-bold">{province.nameEn} • {province.region}</div>
                                        </div>
                                    </div>

                                    {/* Buy Price */}
                                    <div className="md:col-span-2 text-center">
                                        <div className="md:hidden text-[9px] text-slate-600 font-bold uppercase mb-0.5">شراء</div>
                                        <span className="text-sm font-black text-emerald-400">{province.buy.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-600 mr-1">د.ع</span>
                                    </div>

                                    {/* Sell Price */}
                                    <div className="md:col-span-2 text-center">
                                        <div className="md:hidden text-[9px] text-slate-600 font-bold uppercase mb-0.5">بيع</div>
                                        <span className="text-sm font-black text-rose-400">{province.sell.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-600 mr-1">د.ع</span>
                                    </div>

                                    {/* Spread */}
                                    <div className="hidden md:block md:col-span-2 text-center">
                                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-bold text-slate-400">
                                            {(province.sell - province.buy).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Change */}
                                    <div className="hidden md:flex md:col-span-2 justify-center">
                                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${province.change >= 0
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                            {province.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {province.change >= 0 ? '+' : ''}{province.change}%
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredProvinces.length === 0 && (
                            <div className="text-center py-16 text-slate-600">
                                <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                <p className="font-bold">لا توجد نتائج</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ Currency Converter ═══════════════════════════ */}
            <section className="px-4 md:px-8 py-12 md:py-20 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-3xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
                            <Calculator className="w-3.5 h-3.5" />
                            <span>محول العملات</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black mb-3">
                            حوّل بين{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                العملات العالمية
                            </span>
                        </h2>
                        <p className="text-slate-500 text-sm max-w-lg mx-auto">
                            حساب فوري ودقيق لتحويل العملات مع أحدث أسعار الصرف
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/20"
                    >
                        {/* From */}
                        <div className="space-y-3 mb-4">
                            <label className="text-[11px] font-black text-slate-500 uppercase px-1">من</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0"
                                        dir="ltr"
                                        className="w-full h-14 px-5 text-xl font-black text-white bg-white/[0.05] border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500/50 transition-all text-right"
                                    />
                                </div>
                                <select
                                    value={fromCurrency}
                                    onChange={e => setFromCurrency(e.target.value)}
                                    className="h-14 px-4 bg-white/[0.05] border border-white/10 rounded-2xl font-black text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer min-w-[140px] transition-all"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="IQD" className="bg-slate-900">🇮🇶 IQD - دينار عراقي</option>
                                    {currencies.map(c => (
                                        <option key={c.code} value={c.code} className="bg-slate-900">
                                            {c.flag} {c.code} - {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Flip Button */}
                        <div className="flex justify-center my-2">
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={flipCurrencies}
                                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
                            >
                                <ArrowUpDown className="w-5 h-5" />
                            </motion.button>
                        </div>

                        {/* To */}
                        <div className="space-y-3 mt-4">
                            <label className="text-[11px] font-black text-slate-500 uppercase px-1">إلى</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <div className="w-full h-14 px-5 flex items-center justify-end text-xl font-black bg-white/[0.05] border border-white/10 rounded-2xl text-emerald-400" dir="ltr">
                                        {convertedAmount === 0 ? '0' : convertedAmount < 1 ? convertedAmount.toFixed(6) : convertedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <select
                                    value={toCurrency}
                                    onChange={e => setToCurrency(e.target.value)}
                                    className="h-14 px-4 bg-white/[0.05] border border-white/10 rounded-2xl font-black text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer min-w-[140px] transition-all"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="IQD" className="bg-slate-900">🇮🇶 IQD - دينار عراقي</option>
                                    {currencies.map(c => (
                                        <option key={c.code} value={c.code} className="bg-slate-900">
                                            {c.flag} {c.code} - {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Rate Info */}
                        <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <span className="font-bold">
                                1 {fromCurrency} = {' '}
                                {(() => {
                                    if (fromCurrency === 'IQD' && toCurrency === 'IQD') return '1';
                                    if (fromCurrency === 'IQD') {
                                        const t = currencies.find(c => c.code === toCurrency);
                                        return t ? (1 / t.rateToIQD).toFixed(6) : '0';
                                    }
                                    if (toCurrency === 'IQD') {
                                        const s = currencies.find(c => c.code === fromCurrency);
                                        return s ? s.rateToIQD.toLocaleString() : '0';
                                    }
                                    const s = currencies.find(c => c.code === fromCurrency);
                                    const t = currencies.find(c => c.code === toCurrency);
                                    return s && t ? (s.rateToIQD / t.rateToIQD).toFixed(4) : '0';
                                })()}{' '}
                                {toCurrency}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                محدث الآن
                            </span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════ Popular Currencies Grid ═══════════════════════════ */}
            <section className="px-4 md:px-8 py-12 md:py-20">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4">
                            <Globe className="w-3.5 h-3.5" />
                            <span>العملات العالمية</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black mb-3">
                            أسعار صرف{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                العملات الرئيسية
                            </span>
                        </h2>
                        <p className="text-slate-500 text-sm">أسعار الصرف مقابل الدينار العراقي</p>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {currencies.map((currency, i) => (
                            <motion.div
                                key={currency.code}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.04 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group"
                            >
                                <div className="text-2xl mb-2">{currency.flag}</div>
                                <div className="text-xs font-black text-white mb-0.5">{currency.code}</div>
                                <div className="text-[10px] text-slate-600 font-bold mb-3">{currency.name}</div>
                                <div className="pt-3 border-t border-white/5">
                                    <div className="text-lg font-black text-amber-400">
                                        {currency.rateToIQD < 1
                                            ? currency.rateToIQD.toFixed(3)
                                            : currency.rateToIQD.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-slate-600 font-bold">دينار عراقي</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════ CTA Section ═══════════════════════════ */}
            <section className="px-4 md:px-8 py-12 md:py-20">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4djJjOC44MzYgMCAxNiA3LjE2NCAxNiAxNnMyLjE2NCAxNi0xNiAxNnYyYzkuOTQgMCAxOC04LjA2IDE4LTE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                        <div className="relative z-10 p-8 md:p-16 text-center">
                            <Sparkles className="w-10 h-10 text-white/60 mx-auto mb-5" />
                            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                                نظام إدارة متكامل لأعمالك
                            </h2>
                            <p className="text-blue-100/70 text-sm md:text-lg max-w-xl mx-auto mb-8">
                                سجّل الآن واستمتع بإدارة حساباتك، سندات القبض والدفع، والصناديق المالية من منصة واحدة
                            </p>
                            <button
                                onClick={() => navigate(user ? '/attendance-standalone' : '/login')}
                                className="bg-white text-blue-600 px-8 md:px-12 py-3.5 md:py-4 rounded-2xl font-black text-base md:text-lg hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-2xl inline-flex items-center gap-3"
                            >
                                <span>{user ? 'دخول لوحة التحكم' : 'ابدأ الآن مجاناً'}</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════ Footer ═══════════════════════════ */}
            <footer className="border-t border-white/5 px-4 md:px-8 py-8 bg-[#060912]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-bold">
                    <div className="flex items-center gap-3">
                        <img src={customSettings.logoUrl} alt="Logo" className="h-6 w-auto opacity-40" />
                        <span>© {new Date().getFullYear()} FLY4ALL. جميع الحقوق محفوظة.</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-700">أسعار الصرف تقريبية وللاطلاع فقط</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
