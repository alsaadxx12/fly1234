import React from 'react';
import { MapPin, FileText, Info } from 'lucide-react';

interface BuyerCardProps {
    buyer: {
        id: string;
        alias: string;
        remaining_balance: string;
        credit_limit: string;
        virtual_credit: string;
        creditLimitBadge: string;
        city_id: string;
        buyerGroup: string;
        currency: string;
        status: string;
    };
    onViewStatement: (buyer: any) => void;
}

const BuyerCard: React.FC<BuyerCardProps> = ({ buyer, onViewStatement }) => {
    const getStatusColor = (badge: string) => {
        switch (badge?.toLowerCase()) {
            case 'success': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'danger': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row items-center gap-4 overflow-hidden text-right">
            {/* Subtle Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br opacity-[0.02] pointer-events-none transition-opacity duration-500 group-hover:opacity-[0.05] ${buyer.creditLimitBadge === 'success' ? 'from-emerald-500 to-blue-500' :
                buyer.creditLimitBadge === 'danger' ? 'from-rose-500 to-orange-500' : 'from-blue-500 to-indigo-500'
                }`} />

            {/* Right Section: Primary Identity - Compact */}
            <div className="flex flex-col items-center md:items-start text-center md:text-right min-w-[180px] max-w-[220px] relative z-10 space-y-1">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${buyer.status === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-tight leading-tight transition-colors group-hover:text-indigo-600">
                        {buyer.alias}
                    </h4>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1">
                    <span className={`px-2 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider ${getStatusColor(buyer.creditLimitBadge)}`}>
                        {buyer.buyerGroup}
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                        <MapPin className="w-2 h-2 text-slate-400" />
                        <span className="text-[7px] font-bold text-slate-600 dark:text-slate-300">{buyer.city_id || 'Global'}</span>
                    </div>
                </div>
            </div>

            {/* Center Section: Financial Metrics - Compact */}
            <div className="flex-1 w-full md:w-auto bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-3 border border-slate-200 dark:border-white/5 flex flex-row items-center justify-around gap-3 relative group-hover:from-white group-hover:to-slate-50 dark:group-hover:from-slate-800 dark:group-hover:to-slate-800/50 transition-all">
                {/* Remaining Balance */}
                <div className="flex flex-col items-center group/item">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider mb-0.5">الرصيد المتبقي</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-black tracking-tight ${buyer.remaining_balance?.toString().includes('(') ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {buyer.remaining_balance}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{buyer.currency}</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-300 dark:bg-white/10 hidden md:block" />

                {/* Credit Limit */}
                <div className="flex flex-col items-center group/item">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider mb-0.5">سقف الائتمان</span>
                    <span className={`text-sm font-black tracking-tight ${buyer.creditLimitBadge === 'danger' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {buyer.credit_limit}
                    </span>
                </div>

                <div className="h-8 w-px bg-slate-300 dark:bg-white/10 hidden md:block" />

                {/* Virtual Credit */}
                <div className="flex flex-col items-center group/item">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider mb-0.5">السقف الافتراضي</span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-amber-600 dark:text-amber-500 tracking-tight">
                            {buyer.virtual_credit || '0'}
                        </span>
                        <Info className="w-2.5 h-2.5 text-amber-500/40" />
                    </div>
                </div>
            </div>

            {/* Left Section: Action Button - Compact */}
            <div className="flex flex-row md:flex-col items-center gap-2 w-full md:w-auto min-w-[140px] relative z-20">
                <button
                    onClick={() => onViewStatement(buyer)}
                    className="flex-1 md:w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 shadow-md"
                >
                    <FileText className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">كشف الحساب</span>
                </button>
                <div className="flex items-center justify-between w-full px-1 gap-1">
                    <div className={`px-2 py-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[7px] font-black uppercase tracking-wider rounded-lg bg-slate-50 dark:bg-slate-800 ${buyer.status === 'success' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {buyer.status}
                    </div>
                    <div className="text-[7px] font-bold text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors">
                        #{buyer.id.substring(0, 6)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyerCard;
