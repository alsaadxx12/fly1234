import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Send,
    Image as ImageIcon,
    Clock,
    Users,
    Search,
    Loader2,
    Play,
    Pause,
    Trash2,
    MessageCircle,
    AlertTriangle,
    Check
} from 'lucide-react';
import useMessageSending from '../libs/whatsapp/useMessageSending';
import useImageUpload from '../libs/whatsapp/useImageUpload';
import { WhatsAppAccountSelector } from '../libs/whatsapp/WhatsAppAccountSelector';
import { getGlobalWhatsAppSettings } from '../../../lib/collections/whatsapp';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedUsers: any[];
    onSend?: (data: any) => void;
}

const BroadcastModal: React.FC<BroadcastModalProps> = ({ isOpen, onClose, selectedUsers, onSend: _onSend }) => {
    const [message, setMessage] = useState('');
    const [delay, setDelay] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<{ instance_id: string; token: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        isSending,
        sendMessage,
        sendProgress,
        isPaused,
        togglePause,
        setIsSending
    } = useMessageSending();

    const {
        selectedImage,
        imagePreview,
        handleImageChange,
        clearSelectedImage,
        uploadImageWithRetry,
        isUploading
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
        if (!selectedAccount) {
            setError('يرجى اختيار حساب واتساب أولاً');
            return;
        }

        setError(null);

        try {
            let imageUrl: string | null = null;
            if (selectedImage) {
                imageUrl = await uploadImageWithRetry(selectedImage, selectedAccount);
            }

            const recipients = selectedUsers.map(u => ({
                id: u.id,
                name: u.fullname || u.name,
                phone: u.mobile || u.phone
            })).filter(r => r.phone);

            if (recipients.length === 0) {
                setError('المستخدمون المختارون لا يملكون أرقام هواتف صالحة');
                return;
            }

            await sendMessage({
                text: message,
                imageUrl: imageUrl,
                recipients: recipients,
                recipientType: 'contact',
                account: selectedAccount,
                delayMs: delay * 1000
            });

            if (_onSend) {
                _onSend({
                    message,
                    imageUrl,
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={isSending ? undefined : onClose} />

            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] lg:h-[85vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">

                {/* Left Side: Content & Config (60%) */}
                <div className="flex-[1.5] flex flex-col bg-white dark:bg-slate-900 relative h-full">
                    {/* Compact Header */}
                    <div className="p-3 sm:p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تجهيز الإعلان</span>
                        </div>
                        <button onClick={onClose} disabled={isSending} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Scrollable Form */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar pb-32">
                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-rose-100 dark:border-rose-900/30">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
                                    <Users className="w-3 h-3" /> الحساب
                                </label>
                                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all shadow-sm">
                                    <WhatsAppAccountSelector
                                        onAccountSelected={setSelectedAccount}
                                        initialAccount={selectedAccount}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
                                    <Clock className="w-3 h-3" /> الفاصل (ثانية)
                                </label>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={delay}
                                        onChange={(e) => setDelay(Number(e.target.value))}
                                        disabled={isSending}
                                        className="bg-transparent border-none text-xs font-black w-full focus:ring-0 p-0"
                                    />
                                    {delay >= 10 && <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">آمن</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
                                <MessageCircle className="w-3 h-3" /> نص الرسالة
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isSending}
                                placeholder="اكتب رسالتك..."
                                className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all resize-none shadow-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
                                <ImageIcon className="w-3 h-3" /> مرفق الإعلان
                            </label>
                            {imagePreview ? (
                                <div className="relative group rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden aspect-video bg-slate-950 flex items-center justify-center shadow-sm">
                                    <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                                    <button onClick={clearSelectedImage} disabled={isSending} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className={`flex flex-col items-center justify-center w-full h-20 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-all shadow-sm ${isSending ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <ImageIcon className="w-4 h-4 text-slate-300 mb-1" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">تحميل صورة</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isSending} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Simple Bottom Action Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center gap-3 z-30">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800 min-h-[46px]">
                            {isSending || sendProgress.sent > 0 || sendProgress.failed > 0 ? (
                                <div className="w-full flex items-center gap-2">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[7px] font-black uppercase tracking-tighter mb-0.5">
                                            <span className={isPaused ? 'text-amber-500' : 'text-emerald-500'}>{isPaused ? 'Muted' : 'Sending'}</span>
                                            <span className="opacity-50">{sendProgress.sent + sendProgress.failed} / {selectedUsers.length}</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${((sendProgress.sent + sendProgress.failed) / selectedUsers.length) * 100}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 truncate max-w-[60px]">{sendProgress.current}</span>
                                </div>
                            ) : (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">بانتظار البدء...</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {isSending && (
                                <button onClick={togglePause} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    {isPaused ? <Play className="w-4 h-4 fill-slate-600" /> : <Pause className="w-4 h-4 fill-slate-600" />}
                                </button>
                            )}
                            <button
                                onClick={startBroadcast}
                                disabled={isSending && !isPaused || !message.trim() && !selectedImage || isUploading}
                                className={`h-10 px-6 sm:px-8 rounded-xl font-black text-[11px] shadow-md transition-all active:scale-95 flex items-center gap-2
                                    ${isSending ? 'bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                            >
                                {isUploading || (isSending && !isPaused) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                <span>{isUploading ? 'برفح...' : isSending ? (isPaused ? 'استمرار' : 'يرسل..') : 'إرسال'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Target List (40%) */}
                <div className="flex-1 h-[300px] lg:h-auto flex flex-col bg-slate-50 dark:bg-slate-950/50 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800">
                    <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المستهدفين</span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black">{selectedUsers.length}</span>
                        </div>
                        <div className="relative group">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="بحث..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg py-2 pr-9 pl-3 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] shadow-sm">
                                <div className="flex items-center gap-2.5 truncate">
                                    <div className="w-7 h-7 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-slate-400 text-[9px] uppercase">{log.name[0]}</div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{log.name}</span>
                                </div>
                                <div className="flex-shrink-0">
                                    {log.status === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> :
                                        log.status === 'sending' ? <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" /> :
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                        <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
                            <span className="block text-emerald-600 font-black text-base leading-none mb-1">{sendProgress.sent}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">ناجح</span>
                        </div>
                        <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-100 dark:border-red-900/30">
                            <span className="block text-red-600 font-black text-base leading-none mb-1">{sendProgress.failed || 0}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">فاشل</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BroadcastModal;
