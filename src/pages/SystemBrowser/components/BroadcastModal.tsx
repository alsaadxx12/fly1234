import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ImageIcon,
    Users,
    Search,
    Loader2,
    Trash2,
    Check,
    Rocket,
    RefreshCw,
    Activity,
    Send,
    Smartphone,
    ShieldCheck,
    Clock,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useMessageSending from '../libs/whatsapp/useMessageSending';
import useImageUpload from '../libs/whatsapp/useImageUpload';
import { WhatsAppAccountSelector } from '../libs/whatsapp/WhatsAppAccountSelector';
import { getGlobalWhatsAppSettings } from '../../../lib/collections/whatsapp';
import { ProBroadcastEditor } from '../../Announcements/components/ProBroadcastEditor';
import { BroadcastProgressPanel } from '../../Announcements/components/BroadcastProgressPanel';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedUsers: any[];
    onSend?: (data: any) => void;
}

const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, selectedUsers, onSend: _onSend }) => {
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<{ instance_id: string; token: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sendingMethod, setSendingMethod] = useState<'api' | 'direct'>('api');

    // Safety States
    const [useRandomDelay, setUseRandomDelay] = useState(true);
    const [maxDelayMs, setMaxDelayMs] = useState(60000); // Default max 60s
    const [useSpinTax, setUseSpinTax] = useState(true);

    const {
        isSending,
        sendMessage,
        sendProgress,
        isPaused,
        togglePause,
        setIsSending,
        setCurrentDelayMs,
        currentDelayMs
    } = useMessageSending();

    const {
        selectedImage,
        imagePreview,
        handleImageChange,
        clearSelectedImage,
        uploadImageWithRetry,
        isUploading: isImageUploading
    } = useImageUpload();

    const [logs, setLogs] = useState<{ id: string, name: string, status: 'pending' | 'sending' | 'success' | 'error', error?: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchDefaultAccount = async () => {
                try {
                    const settings = await getGlobalWhatsAppSettings();
                    const activeAccount = settings.find(acc => acc.is_active);
                    if (activeAccount) {
                        setSelectedAccount({
                            instance_id: activeAccount.instance_id,
                            token: activeAccount.token
                        });
                    }
                } catch (err) {
                    console.error('Failed to auto-select account:', err);
                }
            };
            fetchDefaultAccount();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setLogs(selectedUsers.map(u => ({
                id: u.id,
                name: u.fullname || u.name,
                status: 'pending'
            })));
            setError(null);
            setMessage('');
            clearSelectedImage();
        }
    }, [isOpen, selectedUsers]);

    const startBroadcast = async () => {
        if (!message.trim() && !selectedImage) {
            setError('يرجى كتابة رسالة أو اختيار صورة');
            return;
        }

        if (sendingMethod === 'api' && !selectedAccount) {
            setError('يرجى اختيار حساب واتساب أولاً');
            return;
        }

        setError(null);
        setIsSending(true);

        const recipients = selectedUsers.map(u => ({
            id: u.id,
            name: u.fullname || u.name,
            phone: u.mobile || u.phone
        })).filter(r => r.phone);

        if (recipients.length === 0) {
            setError('المستخدمون المختارون لا يملكون أرقام هواتف صالحة');
            setIsSending(false);
            return;
        }

        try {
            if (sendingMethod === 'api') {
                let imageUrl: string | null = null;
                if (selectedImage && selectedAccount) {
                    imageUrl = await uploadImageWithRetry(selectedImage, selectedAccount);
                }

                await sendMessage({
                    text: message,
                    imageUrl: imageUrl,
                    recipients: recipients,
                    recipientType: 'contact',
                    account: selectedAccount!,
                    delayMs: currentDelayMs,
                    maxDelayMs: maxDelayMs,
                    useRandomDelay: useRandomDelay,
                    useSpinTax: useSpinTax
                });
            } else {
                // Direct Method (wa.me)
                for (let i = 0; i < recipients.length; i++) {
                    const recipient = recipients[i];
                    const phone = recipient.phone.replace(/\D/g, '');
                    const encodedText = encodeURIComponent(message);
                    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodedText}`, 'whatsapp_window');
                    await new Promise(r => setTimeout(r, 1000));
                }
                setIsSending(false);
            }

            if (_onSend) {
                _onSend({
                    message,
                    recipientsCount: recipients.length,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (err: any) {
            console.error('Broadcast failed:', err);
            setError(err.message || 'فشلت عملية الإرسال');
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (isSending || sendProgress.sent > 0 || sendProgress.failed > 0) {
            setLogs(prev => prev.map((log, index) => {
                if (index === sendProgress.sent + sendProgress.failed && isSending && !isPaused) {
                    return { ...log, status: 'sending' };
                }
                if (index < sendProgress.sent + sendProgress.failed) {
                    if (log.status === 'sending' || log.status === 'pending') {
                        return { ...log, status: 'success' };
                    }
                }
                return log;
            }));
        }
    }, [sendProgress.sent, sendProgress.failed, isSending, isPaused]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log =>
            log.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [logs, searchQuery]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            <style>
                {`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .smooth-momentum {
                    -webkit-overflow-scrolling: touch;
                    scroll-behavior: smooth;
                }
                `}
            </style>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                onClick={isSending ? undefined : onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-[#0f172a] w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 relative z-10"
            >
                {/* Master Navigation Toolbar (Announcements Style) */}
                <div className="px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#2e1065] via-[#1e1b4b] to-[#0f172a] shadow-2xl z-20 shrink-0">
                    {/* Account Selection HUD & Method Toggle */}
                    <div className="flex items-center gap-2 shrink-0 h-11 px-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] group/hud hover:border-white/20 transition-all duration-500">
                        {/* Method Toggle */}
                        <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5 mr-2">
                            <button
                                onClick={() => setSendingMethod('api')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${sendingMethod === 'api' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <RefreshCw className={`w-3 h-3 ${sendingMethod === 'api' ? 'animate-spin-slow' : ''}`} />
                                AUTO (API)
                            </button>
                            <button
                                onClick={() => setSendingMethod('direct')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${sendingMethod === 'direct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                            >
                                <Smartphone className="w-3 h-3" />
                                SAFE (DIRECT)
                            </button>
                        </div>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${sendingMethod === 'api' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        </div>
                        <div className="w-px h-4 bg-white/10 mx-1.5" />

                        {sendingMethod === 'api' && (
                            <WhatsAppAccountSelector
                                onAccountSelected={setSelectedAccount}
                                initialAccount={selectedAccount}
                            />
                        )}

                        <div className="w-px h-6 bg-white/10 mx-1.5" />
                        <div className="flex items-center gap-2 h-8 px-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[11px] font-black text-white/80 tabular-nums">{selectedUsers.length}</span>
                        </div>
                    </div>

                    {/* Centered Status (Middle) */}
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                            {isSending ? (
                                <>
                                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                                    <span className="text-[11px] font-black text-white tracking-widest uppercase">{isPaused ? 'متوقف مؤقتاً' : 'جاري البث الآن'}</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[11px] font-black text-white/60 tracking-widest uppercase">جاهز للبدء</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons (Left) */}
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startBroadcast}
                            disabled={isSending && !isPaused || (!message.trim() && !selectedImage) || isImageUploading}
                            className="flex items-center gap-2.5 h-10 px-8 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl text-[12px] font-black shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <Rocket className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
                            <span>{isSending ? 'استكمال البث' : 'بدء البث المباشر'}</span>
                        </motion.button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 min-h-0 bg-slate-50 dark:bg-transparent">
                    {/* Left: Editor & Image (5 cols) */}
                    <div className="lg:col-span-5 space-y-6 overflow-y-auto hide-scrollbar">
                        <ProBroadcastEditor
                            value={message}
                            onChange={setMessage}
                            accentColor="indigo"
                        />

                        <div className="space-y-2 px-2">
                            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-violet-500" /> مرفق الإعلان
                            </label>
                            <AnimatePresence mode="wait">
                                {imagePreview ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="relative group rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden aspect-video bg-black flex items-center justify-center shadow-2xl"
                                    >
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button
                                                onClick={clearSelectedImage}
                                                className="p-4 bg-rose-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"
                                            >
                                                <Trash2 className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.label
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center w-full h-40 bg-white dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group shadow-inner"
                                    >
                                        <div className="p-3 bg-indigo-500/10 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-all">
                                            <ImageIcon className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحميل صورة مرفقة</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </motion.label>
                                )}
                            </AnimatePresence>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[11px] font-bold flex items-center gap-3 border border-rose-500/20 mx-2"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                {error}
                            </motion.div>
                        )}

                        {/* Smart Safety Engine Settings */}
                        <div className="mx-2 p-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-[2rem] border border-indigo-500/10 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <span className="text-[12px] font-black text-slate-700 dark:text-white uppercase tracking-tight">محرك الأمان الذكي</span>
                                </div>
                                <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">نشط</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> الحد الأدنى (ثانية)
                                    </label>
                                    <input
                                        type="number"
                                        value={currentDelayMs / 1000}
                                        onChange={(e) => setCurrentDelayMs(Number(e.target.value) * 1000)}
                                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> الحد الأقصى (ثانية)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxDelayMs / 1000}
                                        onChange={(e) => setMaxDelayMs(Number(e.target.value) * 1000)}
                                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-white dark:hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg transition-colors ${useRandomDelay ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                            <Activity className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase">توزيع عشوائي للفواصل</span>
                                            <span className="text-[8px] font-bold text-slate-400">يحاكي سلوك البشر في الإرسال</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={useRandomDelay}
                                        onChange={(e) => setUseRandomDelay(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 cursor-pointer hover:bg-white dark:hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg transition-colors ${useSpinTax ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                                            <Zap className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase">تنويع محتوى الرسائل</span>
                                            <span className="text-[8px] font-bold text-slate-400">مثال: {"{مرحباً|أهلاً|عزيزي}"}</span>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={useSpinTax}
                                        onChange={(e) => setUseSpinTax(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right: Recipient Status (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col min-h-0">
                        {/* Status Header */}
                        <div className="mb-4 flex items-center justify-between px-4">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">قائمة المستهدفين</span>
                            <div className="relative w-48">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="بحث في القائمة..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-1.5 pr-9 pl-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto smooth-momentum hide-scrollbar px-2 space-y-2">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="bg-white dark:bg-white/5 px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between transition-all hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-slate-400 text-xs">
                                            {log.name[0]}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">{log.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold tracking-tighter">{log.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                        {log.status === 'success' ? (
                                            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                <Check className="w-3 h-3" />
                                                <span className="text-[9px] font-black">ناجح</span>
                                            </div>
                                        ) : log.status === 'sending' ? (
                                            <div className="flex items-center gap-2 text-indigo-500 animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span className="text-[9px] font-black uppercase">جاري الإرسال</span>
                                            </div>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 shadow-inner" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progress Panel & Actions (Fixed Bottom) */}
                <div className="shrink-0 p-4 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-[#0f172a] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 w-full md:w-auto">
                        <BroadcastProgressPanel
                            isSending={isSending}
                            isPaused={isPaused}
                            sendProgress={sendProgress}
                            currentDelayMs={currentDelayMs}
                            onTogglePause={togglePause}
                            onSetDelay={setCurrentDelayMs}
                        />
                    </div>
                    {!isSending && (
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-[12px] font-black transition-all border border-slate-200 dark:border-white/5 shadow-sm active:scale-95"
                        >
                            إغلاق النافذة
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BroadcastModal;
