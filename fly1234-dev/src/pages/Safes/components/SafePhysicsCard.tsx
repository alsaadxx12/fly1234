import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Safe, UnconfirmedVoucher } from '../types';
import { useTheme } from '../../../contexts/ThemeContext';
import { History, Lock, AlertCircle, Shield, Edit, Trash2, ChevronDown, CheckCircle } from 'lucide-react';

interface SafePhysicsCardProps {
    safe: Safe;
    unconfirmedVouchers: UnconfirmedVoucher[];
    unconfirmedBalance: { usd: number; iqd: number };
    onEdit: (safe: Safe) => void;
    onDelete: (safeId: string) => void;
    onViewHistory: (safe: Safe) => void;
    onConfirmAll: () => void;
    hasEditPermission: boolean;
    hasDeletePermission: boolean;
    index: number;
}

const SafePhysicsCard: React.FC<SafePhysicsCardProps> = ({
    safe,
    unconfirmedVouchers,
    unconfirmedBalance,
    onEdit,
    onDelete,
    onViewHistory,
    onConfirmAll,
    hasEditPermission: canEdit,
    hasDeletePermission: canDelete,
    index
}) => {
    const { theme } = useTheme();
    const safeUnconfirmed = unconfirmedVouchers.filter(v => v.safeId === safe.id);
    const [isExpanded, setIsExpanded] = useState(false);

    const formatCurrency = (amount: number, currency: 'USD' | 'IQD') => {
        return new Intl.NumberFormat('en-US').format(amount) + ` ${currency === 'USD' ? '$' : 'د.ع'}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.05
            }}
            className="relative h-full"
        >
            <div
                className={`relative h-full p-6 rounded-3xl border transition-all duration-300 group ${theme === 'dark'
                    ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60'
                    : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                    } backdrop-blur-xl shadow-xl hover:shadow-2xl hover:-translate-y-1`}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        {safe.custodian_image ? (
                            <div className="relative">
                                <img
                                    src={safe.custodian_image}
                                    alt={safe.custodian_name}
                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
                                />
                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${safe.is_main ? 'bg-amber-500' : 'bg-blue-500'} text-white text-[10px]`}>
                                    {safe.is_main ? <Shield className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                </div>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-2xl ${safe.is_main
                                ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/20'
                                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {safe.is_main ? <Shield className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                            </div>
                        )}

                        <div>
                            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {safe.name}
                            </h3>
                            {safe.custodian_name && (
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {safe.custodian_name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions Dropdown (Simulated) */}
                    <div className="flex gap-2">
                        {canEdit && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onEdit(safe)}
                                className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <Edit className="w-4 h-4" />
                            </motion.button>
                        )}
                        {canDelete && (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onDelete(safe.id)}
                                className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Balances (Unconfirmed Only) */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-600/30' : 'bg-gray-50 border-gray-100'}`}>
                        <p className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>غير مؤكد (USD)</p>
                        <p className={`text-xl font-black ${unconfirmedBalance.usd >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {unconfirmedBalance.usd >= 0 ? '+' : ''}{unconfirmedBalance.usd.toLocaleString()}
                        </p>
                    </div>
                    <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-700/30 border-gray-600/30' : 'bg-gray-50 border-gray-100'}`}>
                        <p className={`text-xs font-bold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>غير مؤكد (IQD)</p>
                        <p className={`text-xl font-black ${unconfirmedBalance.iqd >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                            {unconfirmedBalance.iqd >= 0 ? '+' : ''}{unconfirmedBalance.iqd.toLocaleString()}
                        </p>
                    </div>
                </div>
                {/* Footer / Pending Actions */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onConfirmAll}
                                disabled={safeUnconfirmed.length === 0}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${safeUnconfirmed.length > 0
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/20'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>تأكيد الكل</span>
                            </motion.button>

                            <button
                                onClick={() => onViewHistory(safe)}
                                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                                title="السجل"
                            >
                                <History className="w-4 h-4" />
                            </button>
                        </div>

                        {safeUnconfirmed.length > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${isExpanded
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                                    }`}
                            >
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-bold">{safeUnconfirmed.length} معلق</span>
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </motion.div>
                            </motion.button>
                        )}
                    </div>

                    {/* Expandable Pending List */}
                    <AnimatePresence>
                        {isExpanded && safeUnconfirmed.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="overflow-hidden"
                            >
                                <div className={`mt-2 p-2 rounded-xl space-y-2 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                                    }`}>
                                    {safeUnconfirmed.map(voucher => (
                                        <div key={voucher.id} className={`flex justify-between items-center p-2 rounded-lg text-xs ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-white border border-gray-100'
                                            }`}>
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                                                {voucher.companyName || 'بدون اسم'}
                                            </span>
                                            <span className={`font-bold ${voucher.currency === 'USD' ? 'text-emerald-500' : 'text-blue-500'
                                                }`} dir="ltr">
                                                {formatCurrency(voucher.amount, voucher.currency)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            className="text-xs text-green-500 hover:text-green-600 font-bold underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onConfirmAll();
                                            }}
                                        >
                                            تأكيد الكل
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Glossy Overlay (Simple) */}
                <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 60%)`,
                    }}
                />
            </div>
        </motion.div>
    );
};

export default SafePhysicsCard;
