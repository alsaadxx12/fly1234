import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Contact, Search, RefreshCw, CheckCircle2, ImageIcon, Trash2, Plus, Rocket, Loader2, UserX, Megaphone, Upload, FileSpreadsheet, Users, FileCheck, X, AlertTriangle, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWhatsAppContacts from '../../../hooks/useWhatsAppContacts';
import useCompanies from '../../Companies/hooks/useCompanies';
import { readExcelFile, cleanString } from '../../../lib/services/excelService';
import { WhatsAppAccountSelector } from '../../SystemBrowser/libs/whatsapp/WhatsAppAccountSelector';
import useImageUpload from '../../SystemBrowser/libs/whatsapp/useImageUpload';
import useMessageSending from '../../SystemBrowser/libs/whatsapp/useMessageSending';
import { BroadcastProgressPanel } from './BroadcastProgressPanel';
import { ProBroadcastEditor } from './ProBroadcastEditor';

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.896 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.031c0 2.122.554 4.193 1.607 6.041l-1.708 6.236 6.38-1.674c1.778.969 3.793 1.48 5.845 1.481h.005c6.632 0 12.032-5.403 12.035-12.041a11.968 11.968 0 00-3.525-8.513z" />
    </svg>
);

interface ComprehensiveContainerProps {
    onToggleTarget: (target: any) => void;
    onSelectAll: (targets: any[]) => void;
    onDeselectAll: (ids: string[]) => void;
    selectedIds: Set<string>;
    exclusions: Set<string>;
    onBroadcastComplete?: (data: any) => void;
    selectedAccount: { instance_id: string; token: string } | null;
    setSelectedAccount: (account: { instance_id: string; token: string } | null) => void;
}

const AnimatedTargetCard = React.memo(({ target, isSelected, onToggle, index }: any) => {
    const { isContact, isClient, isImported } = target.sources || {
        isContact: target.type === 'contact',
        isClient: target.type === 'client',
        isImported: target.type === 'imported'
    };

    const accentColor = isClient ? 'blue' : isImported ? 'emerald' : 'purple';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85, rotateX: -15, z: -50 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, z: 0 }}
            transition={{
                duration: 0.4,
                delay: Math.min((index % 20) * 0.02, 0.4), // Reset stagger for each new batch
                ease: [0.23, 1, 0.32, 1]
            }}
            className="w-full h-[88px] relative group overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
            <motion.div
                className={`absolute inset-0 z-0 origin-right ${isSelected
                    ? `bg-${accentColor}-500/20`
                    : `bg-${accentColor}-50/50 dark:bg-${accentColor}-500/10`}`}
                initial={false}
                animate={{ scaleX: isSelected ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            />

            <button
                onClick={onToggle}
                className={`relative z-10 flex items-center gap-3 h-full px-4 text-right w-full transition-all ${isSelected
                    ? `ring-2 ring-${accentColor}-400/50`
                    : ''}`}
            >
                <div className="relative w-12 h-12 flex-shrink-0">
                    {target.image ? (
                        <img src={target.image} className="w-full h-full rounded-xl object-cover shadow-sm" alt="" loading="lazy" />
                    ) : (
                        <div className={`w-full h-full rounded-xl flex items-center justify-center shadow-inner ${isSelected
                            ? `bg-${accentColor}-500 text-white`
                            : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            <WhatsAppIcon className="w-6 h-6" />
                        </div>
                    )}
                    <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900 ${isClient ? 'bg-blue-600' : isImported ? 'bg-emerald-600' : 'bg-purple-600'
                        }`}>
                        {isClient ? <Users className="w-3 h-3 text-white" /> :
                            isImported ? <FileSpreadsheet className="w-3 h-3 text-white" /> :
                                <Contact className="w-3 h-3 text-white" />}
                    </div>
                    {isContact && (
                        <div className="absolute -top-1 -left-1 z-20">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.7, 1, 0.7]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            />
                        </div>
                    )}
                    {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate transition-colors ${isSelected
                        ? `text-${accentColor}-600 dark:text-${accentColor}-400`
                        : 'text-gray-700 dark:text-gray-200'}`}>
                        {target.name || target.phone || target.id}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {isClient && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase bg-blue-100 text-blue-600">
                                عميل مسجل
                            </span>
                        )}
                        {isContact && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase bg-purple-100 text-purple-600">
                                جهة اتصال
                            </span>
                        )}
                        {isImported && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase bg-emerald-100 text-emerald-600">
                                ملف مستورد
                            </span>
                        )}
                        <p className="text-[10px] text-gray-400 truncate font-bold">{target.phone || target.id}</p>
                    </div>
                </div>
            </button>
        </motion.div>
    );
});

const ComprehensiveContainer: React.FC<ComprehensiveContainerProps> = ({
    onToggleTarget,
    onSelectAll,
    onDeselectAll,
    selectedIds,
    exclusions,
    onBroadcastComplete,
    selectedAccount,
    setSelectedAccount
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'clients' | 'contacts' | 'imported'>('all');
    const [importedTargets, setImportedTargets] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importSummary, setImportSummary] = useState<{
        successCount: number;
        skipped: { phone: string; reason: string }[];
    } | null>(null);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState<string>('');

    // Dynamic Mapping States
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [selectedMapping, setSelectedMapping] = useState<{ phoneIndex1: number; phoneIndex2: number }>({ phoneIndex1: 0, phoneIndex2: 1 });
    const [isMappingMode, setIsMappingMode] = useState(false);
    const [visibleCount, setVisibleCount] = useState(100);

    const { whatsappContacts, isLoading: isLoadingContacts, fetchContacts } = useWhatsAppContacts(false, selectedAccount);
    const { companies: allClients, isLoading: isLoadingClients, fetchData: fetchClients } = useCompanies('', 'all', false, 'client');

    const { selectedImage, imagePreview, handleImageChange, clearSelectedImage, uploadImageWithRetry, isUploading: isImageUploading } = useImageUpload();
    const { isSending, sendMessage, sendProgress, isPaused, togglePause, setCurrentDelayMs, currentDelayMs, setIsSending } = useMessageSending();

    const [error, setError] = useState<string | null>(null);

    const convertArabicDigits = (str: string): string => {
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        const persianDigits = '۰۱۲۳۴٥٦٧٨٩';
        return str.replace(/[٠-٩۰-۹]/g, (d) => {
            const index = arabicDigits.indexOf(d);
            if (index !== -1) return index.toString();
            const pIndex = persianDigits.indexOf(d);
            if (pIndex !== -1) return pIndex.toString();
            return d;
        });
    };

    const smartNormalizePhone = useCallback((phone: string): string | null => {
        if (!phone) return null;

        // 1. Convert Arabic/Persian digits to English
        let clean = convertArabicDigits(phone);

        // 2. Basic Cleaning: Keep digits and plus sign
        clean = clean.replace(/[^\d+]/g, '');

        // 3. Handle 00 prefix
        if (clean.startsWith('00')) clean = '+' + clean.slice(2);

        // 4. Global Normalization (Permissive)
        const digitsOnly = clean.replace(/\D/g, '');

        // If it already has a plus sign, trust it if looks like a phone number
        if (clean.startsWith('+')) {
            return digitsOnly.length >= 7 ? clean : null;
        }

        // Iraqi shortcuts (Keep these as smart defaults if starting with 07 or 7)
        if (digitsOnly.length === 11 && digitsOnly.startsWith('07')) {
            return '+964' + digitsOnly.slice(1);
        }
        if (digitsOnly.length === 10 && digitsOnly.startsWith('7')) {
            return '+964' + digitsOnly;
        }

        // 5. General fallback: if digits > 7, assume it's a valid number
        if (digitsOnly.length >= 7) {
            // If it starts with a country code (like 964...), prefix with +
            // We'll use a heuristic: if digitsOnly is 11-13 chars and starts with common prefixes, prefix with +
            // But user said "no conditions", so we just ensure it has a plus if it's international or assume it needs one.
            // For now, if no plus, we'll try to be smart but permissive.
            if (digitsOnly.startsWith('964')) return '+' + digitsOnly;

            // If it's a generic number without plus, add plus if it looks like an international number
            // or just return it with plus as a "best effort"
            return '+' + digitsOnly;
        }

        return null;
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            fetchContacts();
            fetchClients();
        }
    }, [selectedAccount, fetchContacts, fetchClients]);

    const allTargets = useMemo(() => {
        const merged = new Map<string, any>();

        const getBaseTarget = (phone: string, existing: any) => ({
            id: phone + '@c.us',
            phone: phone,
            name: existing?.name || '',
            image: existing?.image || '',
            sources: {
                isContact: false,
                isClient: false,
                isImported: false,
                ...(existing?.sources || {})
            }
        });

        // 1. Process Clients
        allClients
            .filter(c => c.entityType === 'client' && c.phone)
            .forEach(c => {
                const normalized = smartNormalizePhone(c.phone!);
                if (!normalized) return;
                const existing = merged.get(normalized);
                const base = getBaseTarget(normalized, existing);
                base.name = c.name || base.name;
                base.sources.isClient = true;
                merged.set(normalized, base);
            });

        // 2. Process WhatsApp Contacts
        whatsappContacts.forEach(c => {
            const rawPhone = (c as any).phone || c.id.split('@')[0];
            const normalized = smartNormalizePhone(rawPhone);
            if (!normalized) return;
            const existing = merged.get(normalized);
            const base = getBaseTarget(normalized, existing);
            base.name = c.name || base.name;
            base.image = (c as any).image || base.image;
            base.sources.isContact = true;
            merged.set(normalized, base);
        });

        // 3. Process Imported
        importedTargets.forEach(c => {
            const normalized = smartNormalizePhone(c.phone);
            if (!normalized) return;
            const existing = merged.get(normalized);
            const base = getBaseTarget(normalized, existing);
            base.name = c.name || base.name;
            base.sources.isImported = true;
            merged.set(normalized, base);
        });

        return Array.from(merged.values());
    }, [whatsappContacts, allClients, importedTargets, smartNormalizePhone]);

    const filteredTargets = useMemo(() => {
        return allTargets.filter(t => {
            const searchStr = (searchTerm || '').toLowerCase();
            const matchesSearch = (t.name || '').toLowerCase().includes(searchStr) ||
                (t.phone || '').toLowerCase().includes(searchStr);

            const matchesExclusion = !exclusions.has(t.id);

            let matchesFilter = false;
            if (filterType === 'all') {
                matchesFilter = true;
            } else if (filterType === 'clients') {
                matchesFilter = t.sources?.isClient === true;
            } else if (filterType === 'contacts') {
                matchesFilter = t.sources?.isContact === true;
            } else if (filterType === 'imported') {
                matchesFilter = t.sources?.isImported === true;
            }

            return matchesSearch && matchesExclusion && matchesFilter;
        });
    }, [allTargets, searchTerm, exclusions, filterType]);

    const excludedCount = useMemo(() => {
        return allTargets.filter(t => exclusions.has(t.id)).length;
    }, [allTargets, exclusions]);

    const handleToggleAll = useCallback(() => {
        const allFilteredIds = filteredTargets.map(t => t.id);
        const allFilteredSelected = allFilteredIds.every(id => selectedIds.has(id));
        if (allFilteredSelected) {
            onDeselectAll(allFilteredIds);
        } else {
            onSelectAll(filteredTargets);
        }
    }, [filteredTargets, selectedIds, onDeselectAll, onSelectAll]);

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
        setIsSending(true);

        try {
            let imageUrl: string | null = null;
            if (selectedImage) imageUrl = await uploadImageWithRetry(selectedImage, selectedAccount);

            const selectedTargetsData = Array.from(selectedIds).map(id => {
                const target = allTargets.find(t => t.id === id);
                return {
                    id: id,
                    name: target?.name || 'Target',
                    phone: target?.phone || id.split('@')[0],
                    type: 'contact'
                };
            });

            // For comprehensive ad, we treat all as contacts (individual numbers)
            // since we removed groups
            if (selectedTargetsData.length > 0) {
                await sendMessage({
                    text: message,
                    imageUrl: imageUrl,
                    recipients: selectedTargetsData,
                    recipientType: 'contact',
                    account: selectedAccount,
                    delayMs: currentDelayMs
                });
            }

            if (onBroadcastComplete) {
                onBroadcastComplete({
                    message,
                    imageUrl,
                    recipientsCount: selectedTargetsData.length,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err: any) {
            console.error('Broadcast failed:', err);
            setError(err.message || 'فشلت عملية الإرسال');
            setIsSending(false);
        }
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsImporting(true);
        setError(null);
        setImportSummary(null);

        try {
            const firstFile = files[0];
            const rows = await readExcelFile(firstFile);
            if (rows.length > 0) {
                // Read first row as headers, handle empty/null cases
                const headers = rows[0].map((h: any, i: number) => String(h || `عمود ${i + 1}`));
                setAvailableHeaders(headers);
                setPendingFiles(Array.from(files));
                setIsMappingMode(true);

                // Smart default detection
                let p1Idx = 0;
                let p2Idx = 1;
                headers.forEach((h, i) => {
                    const text = h.toLowerCase();
                    if (text.includes('هاتف') || text.includes('phone') || text.includes('رقم') || text.includes('tel')) {
                        if (p1Idx === 0 && !headers[0].toLowerCase().includes('phone')) p1Idx = i;
                        else p2Idx = i;
                    }
                });
                setSelectedMapping({ phoneIndex1: p1Idx, phoneIndex2: p2Idx });
            } else {
                setError('الملف المختار فارغ');
                setIsImporting(false);
            }
        } catch (err) {
            setError('فشل في قراءة ملف الإكسل');
            setIsImporting(false);
        } finally {
            e.target.value = '';
        }
    };

    const startImportProcessing = async () => {
        if (pendingFiles.length === 0) return;

        setIsMappingMode(false);
        setImportProgress(0);
        setImportStatus('بدء التحضير...');

        try {
            const successfulMap = new Map<string, any>();
            const skipped: { phone: string; reason: string }[] = [];

            // 1. Read files one by one to avoid 0% hang
            const allFilesRows: any[][][] = [];
            let totalRows = 0;

            for (let i = 0; i < pendingFiles.length; i++) {
                const file = pendingFiles[i];
                setImportStatus(`جاري قراءة الملف (${i + 1}/${pendingFiles.length}): ${file.name}`);
                await new Promise(resolve => setTimeout(resolve, 100)); // UI yield

                const rows = await readExcelFile(file);
                allFilesRows.push(rows);
                totalRows += Math.max(0, rows.length - 1);
            }

            if (totalRows === 0) {
                setIsImporting(false);
                return;
            }

            let processedRows = 0;
            const CHUNK_SIZE = 250; // Optimized size for simultaneous cleaning & processing

            // 2. Process in chunks
            for (let fIdx = 0; fIdx < pendingFiles.length; fIdx++) {
                const file = pendingFiles[fIdx];
                const rows = allFilesRows[fIdx];
                const dataRows = rows.slice(1);

                setImportStatus(`جاري معالجة بيانات: ${file.name}`);

                for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
                    const chunk = dataRows.slice(i, i + CHUNK_SIZE);

                    chunk.forEach((row, chunkIdx) => {
                        const _globalIdx = i + chunkIdx;
                        // Extract from selected columns
                        const phoneIndices = [selectedMapping.phoneIndex1];
                        if (selectedMapping.phoneIndex2 !== -1) {
                            phoneIndices.push(selectedMapping.phoneIndex2);
                        }

                        phoneIndices.forEach(pIdx => {
                            const rawCell = row[pIdx];
                            if (rawCell === null || rawCell === undefined) return;

                            // CLEANING: Move cleaning from service to here (chunked)
                            const cleanedCell = typeof rawCell === 'string' ? cleanString(rawCell) : String(rawCell);
                            if (!cleanedCell) return;

                            const normalized = smartNormalizePhone(cleanedCell);
                            if (!normalized) {
                                if (pIdx === selectedMapping.phoneIndex1) {
                                    skipped.push({ phone: `${file.name}: ${cleanedCell}`, reason: 'تنسيق غير مكتمل أو رقم غير صالح' });
                                }
                                return;
                            }

                            if (!successfulMap.has(normalized)) {
                                successfulMap.set(normalized, {
                                    id: normalized + '@c.us',
                                    name: normalized,
                                    phone: normalized,
                                    sources: { isImported: true, isClient: false, isContact: false }
                                });
                            }
                        });

                        processedRows++;
                    });

                    // Update progress and yield to main thread
                    setImportProgress(Math.round((processedRows / totalRows) * 100));
                    await new Promise(resolve => setTimeout(resolve, 5)); // Allow UI to repaint
                }
            }

            const uniqueBatch = Array.from(successfulMap.values());

            if (uniqueBatch.length > 0) {
                setImportedTargets(prev => {
                    const existing = new Map(prev.map(item => [item.phone, item]));
                    uniqueBatch.forEach(item => {
                        existing.set(item.phone, item);
                    });
                    return Array.from(existing.values());
                });
            }

            setImportSummary({
                successCount: uniqueBatch.length,
                skipped: skipped
            });
            setError(null);
            setPendingFiles([]);
        } catch (err) {
            console.error('Import error:', err);
            setError('فشل في معالجة ملفات الإكسل');
        } finally {
            setIsImporting(false);
            setImportProgress(0);
            setImportStatus('');
        }
    };


    const isLoading = isLoadingContacts || isLoadingClients;
    const isAllSelected = useMemo(() =>
        filteredTargets.length > 0 && filteredTargets.every(t => selectedIds.has(t.id)),
        [filteredTargets, selectedIds]);

    const displayTargets = useMemo(() => filteredTargets.slice(0, visibleCount), [filteredTargets, visibleCount]);

    // Reset visible count when filter or search changes
    useEffect(() => {
        setVisibleCount(100);
    }, [searchTerm, filterType, importedTargets]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 300) { // 300px threshold
            if (visibleCount < filteredTargets.length) {
                setVisibleCount(prev => prev + 100);
            }
        }
    };

    return (
        <div className="flex flex-col h-[780px] w-full overflow-hidden bg-white dark:bg-gray-950">
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

            {/* Master Navigation Toolbar */}
            <div className="px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 shadow-2xl sticky top-0 z-50 shrink-0">
                {/* Account Selection HUD (Right) */}
                <div className="flex items-center gap-2 shrink-0 h-11 px-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] group/hud hover:border-white/20 transition-all duration-500">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] hidden lg:block">المرسل</span>
                    </div>
                    <div className="w-px h-4 bg-white/10 mx-1.5" />
                    <WhatsAppAccountSelector
                        onAccountSelected={setSelectedAccount}
                        initialAccount={selectedAccount}
                    />
                    <div className="w-px h-6 bg-white/10 mx-1.5" />
                    <div className="flex items-center gap-2 h-8 px-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl group-hover/hud:bg-amber-500/20 transition-all duration-500">
                        <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-black text-white/80 tabular-nums">{filteredTargets.length}</span>
                    </div>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-1.5 h-8 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl ml-2 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black text-white/80 tabular-nums">{selectedIds.size}</span>
                        </div>
                    )}
                    {excludedCount > 0 && (
                        <div className="flex items-center gap-1.5 h-8 px-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl ml-2 text-rose-400">
                            <UserX className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black text-white/80 tabular-nums">{excludedCount}</span>
                        </div>
                    )}
                </div>

                {/* Centered Search & Type Filter (Middle) */}
                <div className="flex-1 max-w-[500px] flex items-center gap-2 mt-1 md:mt-0 h-10">
                    <div className="relative flex-1 h-full">
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Search className="w-4 h-4 text-amber-300" />
                        </div>
                        <input
                            type="text"
                            placeholder="ابحث في الكل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-full bg-white/5 border border-white/10 rounded-2xl pr-12 pl-4 text-sm font-bold outline-none ring-white/20 focus:ring-4 focus:bg-white/10 transition-all shadow-inner text-center text-white placeholder-white/40"
                        />
                    </div>

                    <div className="flex bg-white/10 rounded-2xl p-1 border border-white/10 overflow-hidden h-full">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 text-[10px] font-black rounded-xl transition-all ${filterType === 'all' ? 'bg-white text-emerald-900 shadow-lg' : 'text-white/60 hover:text-emerald-300'}`}
                        >الكل</button>
                        <button
                            onClick={() => setFilterType('clients')}
                            className={`px-3 text-[10px] font-black rounded-xl transition-all ${filterType === 'clients' ? 'bg-white text-blue-900 shadow-lg' : 'text-white/60 hover:text-blue-300'}`}
                        >العملاء</button>
                        <button
                            onClick={() => setFilterType('contacts')}
                            className={`px-3 text-[10px] font-black rounded-xl transition-all ${filterType === 'contacts' ? 'bg-white text-purple-900 shadow-lg' : 'text-white/60 hover:text-purple-300'}`}
                        >واتساب</button>
                        <button
                            onClick={() => setFilterType('imported')}
                            className={`px-3 text-[10px] font-black rounded-xl transition-all ${filterType === 'imported' ? 'bg-white text-amber-900 shadow-lg' : 'text-white/60 hover:text-amber-300'}`}
                        >مستورد</button>
                    </div>

                    <div className="flex items-center gap-1">
                        <label className="flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer transition-all border border-white/10 text-white" title="استيراد إكسل">
                            <Upload className="w-4 h-4" />
                            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} multiple />
                        </label>
                        {importedTargets.length > 0 && (
                            <button
                                onClick={() => setImportedTargets([])}
                                className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-xl border border-rose-500/30 transition-all"
                                title="مسح المستورد"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => { fetchContacts(); fetchClients(); }}
                        disabled={isLoading || !selectedAccount}
                        className="p-1.5 text-amber-300 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Send/Toggle Buttons (Left) */}
                <div className="flex items-center gap-3 shrink-0 h-10">
                    <button
                        onClick={handleToggleAll}
                        disabled={filteredTargets.length === 0}
                        title={isAllSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                        className={`group w-10 h-10 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center ${isAllSelected
                            ? 'bg-white text-amber-900 shadow-inner'
                            : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                            }`}
                    >
                        {isAllSelected ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startBroadcast}
                        disabled={isSending || (!message.trim() && !selectedImage) || selectedIds.size === 0 || isImageUploading}
                        className="flex items-center gap-2.5 h-10 px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl text-[12px] font-black shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <Rocket className={`w-4 h-4 ${isSending ? 'animate-bounce' : 'group-hover:translate-x-1 group-hover:-translate-y-1'}`} />
                        <span>{isSending ? 'جاري البث...' : 'إرسال البث الآن'}</span>
                    </motion.button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 pt-2 min-h-0">
                {/* Inputs Area (5 cols) */}
                <div className="lg:col-span-5 space-y-5 overflow-y-auto hide-scrollbar scroll-smooth">
                    <ProBroadcastEditor
                        value={message}
                        onChange={setMessage}
                        accentColor="amber"
                    />

                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-2 px-2">
                            <ImageIcon className="w-4 h-4 text-amber-500" /> مرفق الإعلان
                        </label>
                        <AnimatePresence mode="wait">
                            {imagePreview ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="relative group rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden aspect-video bg-gray-50 dark:bg-black flex items-center justify-center shadow-lg"
                                >
                                    <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button
                                            onClick={clearSelectedImage}
                                            className="p-3 bg-rose-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.label
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center w-full h-[180px] bg-white dark:bg-gray-950 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-all group"
                                >
                                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-all">
                                        <Plus className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">إضافة صورة</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </motion.label>
                            )}
                        </AnimatePresence>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold flex items-center gap-3 border border-rose-100 dark:border-rose-900/30"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {error}
                        </motion.div>
                    )}
                </div>

                {/* Targets List Area (7 cols) */}
                <div className="lg:col-span-7 flex flex-col min-h-0 items-center">
                    <div
                        onScroll={handleScroll}
                        className="flex-1 max-h-[608px] overflow-y-auto smooth-momentum hide-scrollbar px-4 touch-pan-y w-full max-w-[580px] [perspective:1200px]"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start pb-6">
                            {isLoading ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 className="w-12 h-12 animate-spin text-amber-500 mb-4 opacity-50" />
                                    <span className="text-sm font-black tracking-widest uppercase opacity-50">جاري تحميل البيانات...</span>
                                </div>
                            ) : displayTargets.length > 0 ? (
                                displayTargets.map((target, idx) => (
                                    <AnimatedTargetCard
                                        key={`${target.id}-${idx}`} // Salt key to ensure animation on load
                                        target={target}
                                        index={idx}
                                        isSelected={selectedIds.has(target.id)}
                                        onToggle={() => onToggleTarget(target)}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Megaphone className="w-10 h-10 text-gray-200 dark:text-gray-800" />
                                    </div>
                                    <p className="text-sm font-black text-gray-300 dark:text-gray-700">لا توجد نتائج تطابق البحث</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Bottom Progress & Summary */}
            <div className="shrink-0 p-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                <BroadcastProgressPanel
                    isSending={isSending}
                    isPaused={isPaused}
                    sendProgress={sendProgress}
                    currentDelayMs={currentDelayMs}
                    onTogglePause={togglePause}
                    onSetDelay={setCurrentDelayMs}
                />
            </div>

            {/* Import Feedback Overlay */}
            <AnimatePresence>
                {(isImporting || importSummary) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-md p-4"
                    >
                        <motion.div
                            layoutId="importModal"
                            className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                            {isMappingMode ? (
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                            <Settings2 className="w-5 h-5 text-amber-500" />
                                            تحديد أعمدة البيانات
                                        </h3>
                                        <button onClick={() => { setIsImporting(false); setIsMappingMode(false); }} className="text-gray-400 hover:text-rose-500 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                                                عمود الأرقام الأول (أساسي)
                                            </label>
                                            <select
                                                value={selectedMapping.phoneIndex1}
                                                onChange={(e) => setSelectedMapping(prev => ({ ...prev, phoneIndex1: parseInt(e.target.value) }))}
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            >
                                                {availableHeaders.map((header, i) => (
                                                    <option key={i} value={i}>{header}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                                                عمود الأرقام الثاني (اختياري)
                                            </label>
                                            <select
                                                value={selectedMapping.phoneIndex2}
                                                onChange={(e) => setSelectedMapping(prev => ({ ...prev, phoneIndex2: parseInt(e.target.value) }))}
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-outfit"
                                            >
                                                <option value={-1}>- لا يوجد / لا أحتاج -</option>
                                                {availableHeaders.map((header, i) => (
                                                    <option key={i} value={i}>{header}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex flex-col gap-2">
                                        <button
                                            onClick={startImportProcessing}
                                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            <FileCheck className="w-4 h-4" />
                                            بدء استيراد {pendingFiles.length} ملفات
                                        </button>
                                        <button
                                            onClick={() => { setIsImporting(false); setIsMappingMode(false); }}
                                            className="w-full py-3 text-gray-400 dark:text-gray-500 text-[10px] font-black hover:text-rose-500 transition-colors"
                                        >
                                            إلغاء العملية
                                        </button>
                                    </div>
                                </div>
                            ) : isImporting ? (
                                <div className="p-10 flex flex-col items-center gap-6">
                                    <div className="relative">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-16 h-16 rounded-full border-4 border-amber-500/10 border-t-amber-500"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-3">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white">جاري المعالجة... {importProgress}%</h3>
                                        <div className="w-48 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mx-auto">
                                            <motion.div
                                                className="h-full bg-amber-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${importProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 animate-pulse">{importStatus}</p>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 opacity-60">يرجى الانتظار، لا تغلق النافذة</p>
                                    </div>
                                </div>
                            ) : importSummary && (
                                <div className="flex flex-col h-full max-h-[80vh]">
                                    <div className="p-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-black flex items-center gap-2 text-lg">
                                                <FileCheck className="w-5 h-5" /> نتيجة الاستيراد
                                            </h3>
                                            <button
                                                onClick={() => setImportSummary(null)}
                                                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
                                            تم استيراد {importSummary.successCount} رقم بنجاح
                                        </p>
                                    </div>

                                    <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-950 min-h-[200px]">
                                        {importSummary.skipped.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest px-1">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    أرقام تم استبعادها ({importSummary.skipped.length})
                                                </div>
                                                <div className="space-y-2">
                                                    {importSummary.skipped.map((skip, i) => (
                                                        <div key={i} className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-rose-100 dark:border-rose-950/30 flex items-center justify-between gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-gray-800 dark:text-white">{skip.phone}</span>
                                                                <span className="text-[10px] text-rose-500 font-bold">{skip.reason}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                                </div>
                                                <h4 className="font-black text-gray-900 dark:text-white mb-1">استيراد مكتمل</h4>
                                                <p className="text-xs font-bold text-gray-500">تمت معالجة جميع الأرقام بنجاح دون أخطاء</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-white dark:bg-gray-900">
                                        <button
                                            onClick={() => setImportSummary(null)}
                                            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl text-[11px] font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-outfit"
                                        >
                                            إغلاق والعودة
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComprehensiveContainer;
