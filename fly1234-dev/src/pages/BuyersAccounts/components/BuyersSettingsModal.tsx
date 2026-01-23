import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BuyersSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (endpoint: string, token: string) => void;
    initialEndpoint: string;
    initialToken: string;
}

const BuyersSettingsModal: React.FC<BuyersSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialEndpoint,
    initialToken
}) => {
    const [endpoint, setEndpoint] = useState(initialEndpoint);
    const [token, setToken] = useState(initialToken);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        setEndpoint(initialEndpoint);
        setToken(initialToken);
    }, [initialEndpoint, initialToken, isOpen]);

    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
            style={{ 
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}
            onClick={(e) => {
                // Close modal when clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800 relative"
                style={{ 
                    zIndex: 100000,
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">إعدادات الاتصال</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2 text-right">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest leading-none">Endpoint URL</label>
                        <input
                            type="text"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2 text-right">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest leading-none">Bearer Token</label>
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                            placeholder="TOKEN"
                        />
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => onSave(endpoint, token)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BuyersSettingsModal;
