import React, { useState, useEffect } from 'react';
import { getGlobalWhatsAppSettings } from '../../../../lib/collections/whatsapp';
import { Check, ChevronDown, Loader2 } from 'lucide-react';

interface WhatsAppAccountSelectorProps {
    onAccountSelected: (account: { instance_id: string; token: string }) => void;
    initialAccount?: { instance_id: string; token: string } | null;
}

export const WhatsAppAccountSelector: React.FC<WhatsAppAccountSelectorProps> = ({
    onAccountSelected,
    initialAccount
}) => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            setLoading(true);
            const data = await getGlobalWhatsAppSettings();
            setAccounts(data);

            if (initialAccount) {
                const found = data.find(acc => acc.instance_id === initialAccount.instance_id);
                if (found) setSelectedId(found.id);
            } else if (data.length > 0) {
                const active = data.find(acc => acc.is_active) || data[0];
                setSelectedId(active.id);
                onAccountSelected({ instance_id: active.instance_id, token: active.token });
            }
            setLoading(false);
        };
        fetchAccounts();
    }, [initialAccount, onAccountSelected]);

    const handleSelect = (acc: any) => {
        setSelectedId(acc.id);
        onAccountSelected({ instance_id: acc.instance_id, token: acc.token });
        setIsOpen(false);
    };

    const selectedAccount = accounts.find(acc => acc.id === selectedId);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-3">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-950 text-xs font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
            >
                <span className="truncate">
                    {selectedAccount ? selectedAccount.name || selectedAccount.instance_id : 'اختر الحساب...'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-[100] max-h-48 overflow-y-auto custom-scrollbar">
                    {accounts.map((acc) => (
                        <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleSelect(acc)}
                            className="w-full flex items-center justify-between px-3 py-2 text-right hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className={`text-[11px] ${selectedId === acc.id ? 'text-emerald-500 font-black' : 'text-slate-600 dark:text-slate-300 font-bold'}`}>
                                {acc.name || acc.instance_id}
                            </span>
                            {selectedId === acc.id && <Check className="w-3 h-3 text-emerald-500" />}
                        </button>
                    ))}
                    {accounts.length === 0 && (
                        <div className="p-3 text-[10px] text-slate-400 text-center">لا توجد حسابات مضافة</div>
                    )}
                </div>
            )}
        </div>
    );
};
