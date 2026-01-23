import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    FileText,
    X,
    Printer,
    MessageCircle,
    FileSpreadsheet,
    Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { generateStatementHTML, StatementData } from '../../pages/Settings/utils/statementTemplateEngine';
import DateRangePicker from './components/DateRangePicker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getGlobalWhatsAppSettings } from '../../lib/collections/whatsapp';
import { sendWhatsAppDocument, normalizePhoneNumber } from '../../utils/whatsappUtils';
import { createPortal } from 'react-dom';

const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";

// Function to parse and structure transaction details
function parseTransactionDetails(details: string): string {
    if (!details || details.trim() === '') return details;

    const parts: string[] = [];

    // Extract FLIGHT information
    const flightMatch = details.match(/FLIGHT[^,]*,\s*([^(]+?)\s+to\s+([^(]+?)(?:,|\.|$)/i);
    if (flightMatch) {
        let from = flightMatch[1].trim();
        let to = flightMatch[2].trim();

        // Clean up airport codes in parentheses
        from = from.replace(/\s*\([^)]+\)\s*$/, '').trim();
        to = to.replace(/\s*\([^)]+\)\s*$/, '').trim();

        const route = `${from} → ${to}`;

        // Extract airline (after "one-way" or "round-trip", before comma or "Dep.")
        const airlineMatch = details.match(/(?:one-way|round-trip)[^,]*,\s*([^,]+?)(?:,|\.|Dep\.|$)/i);
        let airline = airlineMatch ? airlineMatch[1].trim() : '';
        // Remove trailing dots
        airline = airline.replace(/\.$/, '').trim();

        // Extract departure date and time
        const depMatch = details.match(/Dep\.\s*(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})/i);
        const depDate = depMatch ? depMatch[1] : '';
        const depTime = depMatch ? depMatch[2] : '';

        // Extract trip type
        const tripTypeMatch = details.match(/(one-way|round-trip)/i);
        const tripType = tripTypeMatch ? tripTypeMatch[1] : '';

        parts.push(`<div class="mb-2 pb-2 border-b border-slate-200">
            <div class="flex items-center gap-2 mb-1">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span class="text-[10px] font-black text-slate-500 uppercase">Flight Information</span>
            </div>
            <div class="space-y-1 text-[10px] font-bold text-slate-700">
                ${route ? `<div><span class="text-slate-500">Route:</span> <span class="text-slate-800">${route}</span></div>` : ''}
                ${airline ? `<div><span class="text-slate-500">Airline:</span> <span class="text-slate-800">${airline}</span></div>` : ''}
                ${tripType ? `<div><span class="text-slate-500">Type:</span> <span class="text-slate-800 capitalize">${tripType}</span></div>` : ''}
                ${depDate && depTime ? `<div><span class="text-slate-500">Departure:</span> <span class="text-slate-800">${depDate} ${depTime}</span></div>` : ''}
            </div>
        </div>`);
    }

    // Extract passenger names first to count actual passengers
    const nameMatches = details.match(/([A-Z\s]+)\(et\.\d+\)/g);
    const actualPassengerCount = nameMatches ? nameMatches.length : 0;

    // Extract passenger information (ADT, CHD, INF) from text
    const adtMatch = details.match(/ADT\s+(\d+)/i);
    const chdMatch = details.match(/CHD\s+(\d+)/i);
    const infMatch = details.match(/INF\s+(\d+)/i);

    let adtCount = adtMatch ? parseInt(adtMatch[1]) : 0;
    let chdCount = chdMatch ? parseInt(chdMatch[1]) : 0;
    let infCount = infMatch ? parseInt(infMatch[1]) : 0;

    // Smart calculation: if we have actual passenger names, use them to correct counts
    if (actualPassengerCount > 0) {
        const totalMentioned = adtCount + chdCount + infCount;

        // If total mentioned doesn't match actual count, adjust
        if (totalMentioned !== actualPassengerCount) {
            // If no passenger types mentioned at all, assume all are ADT
            if (totalMentioned === 0) {
                adtCount = actualPassengerCount;
            }
            // If total mentioned is less than actual, add difference to ADT
            else if (totalMentioned < actualPassengerCount) {
                adtCount = actualPassengerCount - chdCount - infCount;
            }
            // If total mentioned is more than actual, prioritize ADT
            else if (totalMentioned > actualPassengerCount) {
                // Keep CHD and INF as is, adjust ADT
                adtCount = Math.max(0, actualPassengerCount - chdCount - infCount);
            }
        }

        // Special case: if ADT is 0 or 1 but we have many passengers, they're likely all ADT
        if (adtCount <= 1 && actualPassengerCount > 1 && chdCount === 0 && infCount === 0) {
            adtCount = actualPassengerCount;
        }
    }

    // Build passenger info string
    const passengerParts: string[] = [];
    if (adtCount > 0) passengerParts.push(`ADT ${adtCount}`);
    if (chdCount > 0) passengerParts.push(`CHD ${chdCount}`);
    if (infCount > 0) passengerParts.push(`INF ${infCount}`);

    // Only show passenger count if we have information
    if (passengerParts.length > 0 || actualPassengerCount > 0) {
        const passengerInfo = passengerParts.length > 0
            ? passengerParts.join(', ')
            : (actualPassengerCount > 0 ? `Total Passengers: ${actualPassengerCount}` : '');

        parts.push(`<div class="mb-2 pb-2 border-b border-slate-200">
            <div class="flex items-center gap-2 mb-1">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span class="text-[10px] font-black text-slate-500 uppercase">Passengers</span>
            </div>
            <div class="text-[10px] font-bold text-slate-700">${passengerInfo}</div>
        </div>`);
    }

    // Extract and display passenger names
    if (nameMatches && nameMatches.length > 0) {
        const names = nameMatches.map(n => {
            const nameMatch = n.match(/([A-Z\s]+)\(et\.(\d+)\)/);
            return nameMatch ? `<div class="flex items-center gap-2"><span class="text-slate-700">${nameMatch[1].trim()}</span><span class="text-slate-400 text-[9px]">(et.${nameMatch[2]})</span></div>` : '';
        }).filter(n => n).join('');

        if (names) {
            parts.push(`<div class="mb-2 pb-2 border-b border-slate-200">
                <div class="flex items-center gap-2 mb-1">
                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span class="text-[10px] font-black text-slate-500 uppercase">Passenger Names (${actualPassengerCount})</span>
                </div>
                <div class="space-y-0.5 text-[10px] font-medium">${names}</div>
            </div>`);
        }
    }

    // Extract Transfer/Payment information
    const transferMatch = details.match(/Transfer\s*:Date\s*(\d{4}-\d{2}-\d{2})|Transfer\s+Date:\s*(\d{4}-\d{2}-\d{2})/i);
    const dateMatch = details.match(/(\d{4}-\d{2}-\d{2})/);

    // Improved Description extraction - multiple patterns
    let description = '';

    // Pattern 1: :Description ... (before Submit or end)
    const descMatch1 = details.match(/:Description\s*([^:]+?)(?:\s*Submit|$)/i);
    // Pattern 2: Description: ... (with colon)
    const descMatch2 = details.match(/Description\s*:\s*([^:]+?)(?:\s*Submit|$)/i);
    // Pattern 3: Arabic patterns (تسديد حساب, دفع, تحويل)
    const arabicDescMatch = details.match(/(?:تسديد\s+حساب|دفع|تحويل)[^:]*:?\s*([^:]+?)(?:\s*Submit|$)/i);
    // Pattern 4: Text after "Transfer Date:" or "Date:" and before "Submit"
    const descMatch3 = details.match(/(?:Transfer\s+Date|Date):\s*\d{4}-\d{2}-\d{2}[^:]*:?\s*([^:]+?)(?:\s*Submit|$)/i);
    // Pattern 5: Any text between dates and "Submit By"
    const descMatch4 = details.match(/\d{4}-\d{2}-\d{2}[^:]*:?\s*([^:]+?)(?:\s*Submit\s+By|$)/i);
    // Pattern 6: Text after date in format "Date: 2025-12-13 Description: ..."
    const descMatch5 = details.match(/Date:\s*\d{4}-\d{2}-\d{2}\s+Description:\s*([^:]+?)(?:\s*Submit|$)/i);
    // Pattern 7: Text after "Transfer" and before "Submit By" or date
    const descMatch6 = details.match(/Transfer[^:]*:?\s*([^:]+?)(?:\s*Submit\s+By|\d{4}-\d{2}-\d{2}|$)/i);
    // Pattern 8: Any meaningful text after "Transfer Date:" that's not a date
    const descMatch7 = details.match(/Transfer\s+Date:\s*\d{4}-\d{2}-\d{2}\s+([A-Za-z\u0600-\u06FF\s]+?)(?:\s*Submit|$)/i);

    if (descMatch1) {
        description = descMatch1[1].trim();
    } else if (descMatch2) {
        description = descMatch2[1].trim();
    } else if (descMatch5) {
        description = descMatch5[1].trim();
    } else if (descMatch7) {
        description = descMatch7[1].trim();
    } else if (descMatch3) {
        description = descMatch3[1].trim();
    } else if (descMatch4) {
        description = descMatch4[1].trim();
    } else if (descMatch6) {
        description = descMatch6[1].trim();
    } else if (arabicDescMatch) {
        description = arabicDescMatch[1] ? arabicDescMatch[1].trim() : arabicDescMatch[0].trim();
    }

    // Clean description - remove common prefixes, dates, and extra spaces
    if (description) {
        description = description
            .replace(/^(تسديد\s+حساب|دفع|تحويل|Transfer|Date)\s*/i, '')
            .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove dates
            .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '') // Remove Arabic dates
            .replace(/\s+/g, ' ')
            .trim();

        // If description is too short or just whitespace, try to extract from full text
        if (description.length < 3 || !description.match(/[A-Za-z\u0600-\u06FF]/)) {
            // Try to find any meaningful text in the details
            const fallbackMatch = details.match(/(?:Transfer|تسديد|دفع|تحويل)[^:]*:?\s*([A-Za-z\u0600-\u06FF\s]{3,}?)(?:\s*\d{4}-\d{2}-\d{2}|\s*Submit|$)/i);
            if (fallbackMatch && fallbackMatch[1]) {
                description = fallbackMatch[1].trim();
            }
        }
    }

    const submitMatch = details.match(/Submit\s+By\s*:?\s*([^:]+?)(?::|$)/i);
    const arabicDateMatch = details.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

    if (transferMatch || description || submitMatch || arabicDescMatch || (dateMatch && details.includes('Transfer'))) {
        const transferDate = transferMatch ? (transferMatch[1] || transferMatch[2]) : (dateMatch ? dateMatch[1] : '');
        const submitBy = submitMatch ? submitMatch[1].trim() : '';
        const arabicDate = arabicDateMatch ? arabicDateMatch[1] : '';

        parts.push(`<div class="mb-2">
            <div class="flex items-center gap-2 mb-1">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span class="text-[10px] font-black text-slate-500 uppercase">Payment/Transfer</span>
            </div>
            <div class="space-y-1 text-[10px] font-bold text-slate-700">
                ${transferDate ? `<div><span class="text-slate-500">Date:</span> <span class="text-slate-800">${transferDate}</span></div>` : ''}
                ${arabicDate ? `<div><span class="text-slate-500">Date (AR):</span> <span class="text-slate-800">${arabicDate}</span></div>` : ''}
                ${description ? `<div><span class="text-slate-500">Description:</span> <span class="text-slate-800">${description}</span></div>` : ''}
                ${submitBy ? `<div><span class="text-slate-500">Submitted By:</span> <span class="text-slate-800">${submitBy}</span></div>` : ''}
            </div>
        </div>`);
    }

    // Extract Booking Payment or other transaction types
    if (details.includes('Booking Payment') || details.includes('Payment')) {
        const paymentType = details.match(/(Booking Payment|Payment)/i)?.[0] || '';
        if (paymentType && !parts.some(p => p.includes('Payment/Transfer'))) {
            parts.push(`<div class="mb-2">
                <div class="flex items-center gap-2 mb-1">
                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span class="text-[10px] font-black text-slate-500 uppercase">Transaction Type</span>
                </div>
                <div class="text-[10px] font-bold text-slate-700">${paymentType}</div>
            </div>`);
        }
    }

    // If no structured parts found, return original with better formatting
    if (parts.length === 0) {
        // Clean and format the original text
        const cleaned = details
            .replace(/\s+/g, ' ')
            .trim();

        return `<div class="text-[10px] font-medium text-slate-700 leading-relaxed">${cleaned}</div>`;
    }

    return parts.join('');
}

interface Transaction {
    id: string;
    no: string;
    date: string;
    timestamp?: Date;
    details: string;
    pnr?: string;
    booking_id?: string | null; // For display in date column
    type: string;
    debit_iqd: number | string;
    debit_usd: number | string;
    credit_iqd: number | string;
    credit_usd: number | string;
    balance_iqd: number | string;
    invoice_no?: string;
    raw_details?: any;
    is_failed?: boolean;
    is_prev_balance?: boolean;
    monthKey?: string; // For grouping
}

// Removed unused StatementSummary interface

const StatementPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const buyerId = searchParams.get('id');
    const token = searchParams.get('token');
    const buyerAlias = searchParams.get('alias') || 'Buyer';
    const tableRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappAccounts, setWhatsappAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // Filter State - Date Range
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;
    const [filterType, setFilterType] = useState('All');
    const [removeFailed, setRemoveFailed] = useState('Show all transaction');

    // Quick date presets
    const setQuickDate = (preset: 'today' | 'week' | 'month' | 'year' | 'clear') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (preset) {
            case 'today':
                setDateRange([today, new Date(today)]);
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                setDateRange([weekStart, new Date(today)]);
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateRange([monthStart, new Date(today)]);
                break;
            case 'year':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                setDateRange([yearStart, new Date(today)]);
                break;
            case 'clear':
                setDateRange([null, null]);
                break;
        }
    };

    // Manual Filtering Logic
    const [activeFilters, setActiveFilters] = useState({
        startDate: null as Date | null,
        endDate: null as Date | null,
        type: 'All',
        removeFailed: 'Show all transaction'
    });

    // Update active filters when date range changes
    useEffect(() => {
        if (startDate && endDate) {
            setActiveFilters(prev => ({
                ...prev,
                startDate,
                endDate
            }));
        }
    }, [startDate, endDate]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;



    const fetchStatement = useCallback(async () => {
        if (!buyerId || !token) {
            setError("Missing buyer ID or token");
            return;
        }

        setLoading(true);
        setError(null);
        const perpage = 1000;
        let page = 1;
        const allItems: any[] = [];
        let apiSummary: any = null;

        try {
            while (true) {
                const params: any = {
                    id: buyerId,
                    "pagination[page]": page,
                    "pagination[perpage]": perpage,
                    sort: "asc",
                    field: "no",
                };

                // Apply date filters if provided
                if (activeFilters.startDate) params['query[from]'] = format(activeFilters.startDate, 'yyyy-MM-dd');
                if (activeFilters.endDate) params['query[to]'] = format(activeFilters.endDate, 'yyyy-MM-dd');

                const payload = {
                    endpoint: "https://accounts.fly4all.com/api/transactions/buyers",
                    token,
                    method: "POST",
                    params,
                    body: {},
                };

                const res = await fetch(FN_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (!json?.ok) throw new Error(json?.error || "Proxy failed");

                const api = json.data;
                if (page === 1) {
                    apiSummary = api?.summary ?? null;
                    if (apiSummary?.entity?.user) setUserInfo(apiSummary.entity.user);
                }

                let items = [];
                if (api?.data && Array.isArray(api.data)) {
                    items = api.data;
                } else if (Array.isArray(api)) {
                    items = api;
                } else if (api?.transactions && Array.isArray(api.transactions)) {
                    items = api.transactions;
                }

                if (!items || items.length === 0) break;

                const mappedItems = items.map((item: any) => {
                    const type = String(item.type || (item.transaction_note?.includes('Previous Balance') ? '' : 'N/A')).toUpperCase();
                    let rawNote = item.transaction_note || '';
                    const is_prev_balance = rawNote.includes('Previous Balance');

                    // Extract PNR - only actual PNR (6 alphanumeric characters)
                    let pnr = '-';
                    if (item.reference && item.reference !== '-' && /^[A-Z0-9]{6}$/.test(item.reference)) {
                        pnr = item.reference;
                    }

                    // Extract Booking ID for date column
                    const bookingId = item.booking_id && item.booking_id !== '-' ? item.booking_id : null;

                    // Format details in a structured way
                    let cleanDetails = rawNote;
                    if (!is_prev_balance) {
                        // Remove PNR info from details if it's already in PNR column
                        let processed = rawNote
                            .replace(/BK011-#\s*ID\s*\d+/g, '')
                            .replace(/TR011-#\s*:Serial\s*\d+/g, '')
                            .replace(/PO\d+\s*:Supp/g, '')
                            .replace(/PNR:\s*[A-Z0-9]+/g, '')
                            .trim();

                        // Clean up extra spaces
                        processed = processed.replace(/\s+/g, ' ').trim();

                        // Parse and structure the details
                        const structured = parseTransactionDetails(processed);
                        cleanDetails = structured;

                        if (!cleanDetails || cleanDetails === '') {
                            cleanDetails = 'بدون تفاصيل';
                        }
                    }

                    const is_failed = type.includes('FAILED') || rawNote.includes('فاشل');

                    return {
                        id: String(item.id || item.no || Math.random()),
                        no: item.transactionSerial || item.no || item.id || '-',
                        date: item.created_at || '-',
                        details: cleanDetails || 'بدون تفاصيل',
                        pnr,
                        booking_id: bookingId, // For display in date column
                        type,
                        debit_iqd: item.debit && item.debit !== " " ? item.debit : '-',
                        debit_usd: item.default_amount_debit && item.default_amount_debit !== " " ? item.default_amount_debit : '-',
                        credit_iqd: item.credit && item.credit !== " " ? item.credit : '-',
                        credit_usd: item.default_amount_credit && item.default_amount_credit !== " " ? item.default_amount_credit : '-',
                        balance_iqd: item.remaining_balance || '-',
                        invoice_no: item.invoice_no !== '-' ? item.invoice_no : undefined,
                        is_failed,
                        is_prev_balance
                    };
                });

                allItems.push(...mappedItems);
                if (items.length < perpage) break;
                page++;
            }

            let filtered = allItems;
            if (activeFilters.type !== 'All') {
                filtered = filtered.filter(x => x.type === activeFilters.type);
            }
            if (activeFilters.removeFailed === 'Remove failed transaction') {
                filtered = filtered.filter(x => !x.is_failed);
            }

            setTransactions(filtered);
            setSummary(apiSummary);
            setCurrentPage(1);
        } catch (err: any) {
            console.error("Statement fetch error:", err);
            setError(err.message || "Failed to load statement");
        } finally {
            setLoading(false);
        }
    }, [buyerId, token, activeFilters]);

    useEffect(() => {
        fetchStatement();
    }, [fetchStatement]);

    const handleApplyFilters = () => {
        setActiveFilters({ startDate: startDate || null, endDate: endDate || null, type: filterType, removeFailed });
    };

    const handleResetFilters = () => {
        setDateRange([null, null]);
        setFilterType('All');
        setRemoveFailed('Show all transaction');
        setActiveFilters({ startDate: null, endDate: null, type: 'All', removeFailed: 'Show all transaction' });
    };

    const handleDownload = () => {
        if (transactions.length === 0) return;
        const exportData = transactions.map(t => ({
            Date: t.date,
            Details: t.details.replace(/<[^>]*>?/gm, ''), // Strip HTML for Excel
            Type: t.type,
            Debit: t.debit_iqd,
            Credit: t.credit_iqd,
            Balance: t.balance_iqd,
            'Invoice No': t.invoice_no
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Statement");
        XLSX.writeFile(wb, `Statement_${buyerAlias}_${new Date().getTime()}.xlsx`);
    };

    const handlePrintWithTemplate = async () => {
        if (!summary || !transactions.length) {
            alert('لا توجد بيانات متاحة للطباعة');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Get user info
            const userTitle = userInfo?.search_title || userInfo?.name || buyerAlias;
            const userMobile = userInfo?.mobile || "-";
            const userEmail = userInfo?.email || "-";

            // Load template from Firestore
            const templateRef = doc(db, 'settings', 'statementTemplate');
            const templateDoc = await getDoc(templateRef);
            
            let template = '';
            if (templateDoc.exists() && templateDoc.data().html) {
                template = templateDoc.data().html;
            } else {
                // Use default template if none exists
                alert('لم يتم العثور على قالب. يرجى إنشاء قالب في الإعدادات أولاً.');
                setLoading(false);
                return;
            }

            // Load company settings
            const printSettingsRef = doc(db, 'settings', 'print');
            const printSettingsDoc = await getDoc(printSettingsRef);
            const printSettings = printSettingsDoc.exists() ? printSettingsDoc.data() : {};
            
            // Get logo URL from template settings (same logic as sendStatementPDF)
            // Priority: template logoUrl > print settings logoUrl > default
            const templateData = templateDoc.data();
            const templateLogoUrl = templateData.logoUrl || templateData.customLogoUrl;
            const logoUrl = templateLogoUrl || printSettings.logoUrl || 'https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp';

            // Prepare statement data
            const statementData: StatementData = {
                summary: {
                    from: summary.from || '',
                    to: summary.to || '',
                    previousBalance: String(summary.previousBalance || '0'),
                    totalCredit: String(summary.totalCredit || '0'),
                    totalDebit: String(summary.totalDebit || '0'),
                    balanceDue: String(summary.balanceDue || '0'),
                    currency: summary.currency || 'IQD'
                },
                user: {
                    name: userTitle,
                    email: userEmail,
                    mobile: userMobile
                },
                company: {
                    logoUrl: logoUrl,
                    name: printSettings.companyNameLabel || 'شركة الروضتين للسفر والسياحة',
                    address: printSettings.footerAddress || '9647730308111 - 964771800033 | كربلاء - شارع الإسكان'
                },
                transactions: transactions.map((t, idx) => {
                    // NO column: Always use simple sequential number
                    const transactionNo = String(idx + 1);
                    
                    // Get the original transaction number for Date column
                    const originalNo = String(t.no || '');
                    const isValidTransactionNo = originalNo && 
                                                 originalNo.length <= 20 && 
                                                 !originalNo.includes('cai') && 
                                                 !originalNo.includes('zbhbg') &&
                                                 originalNo !== '-';
                    
                    // Format date to include transaction number and booking ID
                    let formattedDate = t.date || '';
                    if (!t.is_prev_balance) {
                        // Add transaction number to date if it's a valid transaction number
                        if (isValidTransactionNo) {
                            formattedDate = formattedDate && formattedDate !== '-' 
                                ? `${formattedDate}<br>${originalNo}` 
                                : originalNo;
                        }
                        // Add booking ID if exists
                        if (t.booking_id && t.booking_id !== '-' && t.booking_id) {
                            formattedDate = formattedDate 
                                ? `${formattedDate}<br>Booking: ${t.booking_id}` 
                                : `Booking: ${t.booking_id}`;
                        }
                    }
                    
                    // Remove Booking from details (it can be embedded in raw details and may be split across lines)
                    let cleanDetails = t.details || '';
                    // Remove "Booking: #BK011-1087942" even if it is broken like "#BK011-\n1087942"
                    cleanDetails = cleanDetails.replace(/(\|\s*)?Booking:\s*#?BK\d+\s*-\s*\d+/gi, '').trim();
                    // If we have a specific booking_id, remove it too (covers unusual formats)
                    if (t.booking_id && t.booking_id !== '-' && t.booking_id) {
                        const escapedBookingId = t.booking_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const bookingIdPattern = new RegExp(`(\\|\\s*)?Booking:\\s*${escapedBookingId.replace(/\\-/g, '\\\\-').replace(/\\s+/g, '\\\\s*')}`, 'gi');
                        cleanDetails = cleanDetails.replace(bookingIdPattern, '').trim();
                    }
                    // Also remove any leading/trailing separators left behind
                    cleanDetails = cleanDetails.replace(/^\|\s*/, '').replace(/\|\s*$/, '').trim();
                    
                    return {
                        no: transactionNo,
                        date: formattedDate,
                        pnr: t.pnr || '-',
                        booking_id: t.booking_id || '-',
                        details: cleanDetails,
                        type: t.type || 'N/A',
                        debit_iqd: String(t.debit_iqd || '-'),
                        debit_usd: String(t.debit_usd || '-'),
                        credit_iqd: String(t.credit_iqd || '-'),
                        credit_usd: String(t.credit_usd || '-'),
                        balance_iqd: String(t.balance_iqd || '-'),
                        invoice_no: t.invoice_no || '-'
                    };
                })
            };

            // Generate HTML
            const html = generateStatementHTML(template, statementData);

            // Open print window
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                
                // Wait for content to load, then print
                setTimeout(() => {
                    // Add print styles to ensure colors are preserved
                    const style = printWindow.document.createElement('style');
                    style.textContent = `
                        @media print {
                            @page {
                                margin: 0.5cm;
                            }
                            * {
                                print-color-adjust: exact !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                        }
                    `;
                    printWindow.document.head.appendChild(style);
                    
                    printWindow.print();
                }, 500);
            }
        } catch (error: any) {
            console.error('Error printing with template:', error);
            setError(error.message || 'فشل طباعة الكشف. يرجى المحاولة مرة أخرى.');
            alert(`خطأ في الطباعة: ${error.message || 'فشل طباعة الكشف'}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePDFExport = async () => {
        if (!summary || !buyerId || !token) {
            alert('Missing required information to generate PDF');
            return;
        }

        setLoading(true);
        setError(null);

        let loadingToast: HTMLElement | null = null;

        try {
            // Show loading indicator
            loadingToast = document.createElement('div');
            loadingToast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
            loadingToast.textContent = 'Generating PDF...';
            document.body.appendChild(loadingToast);

            // Generate export name
            const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
            const sanitizedAlias = buyerAlias.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const exportName = `statement-of-account-${sanitizedAlias}-${timestamp}`;

            // Prepare params for proxy (API expects FormData, but proxy will handle it)
            const params: any = {
                exportFormat: 'pdf',
                service: 'buyersTransactions',
                'params[id]': buyerId,
                exportTemplate: 'statmentOfAccount',
                exportName: exportName,
                expire: '1440'
            };

            // Add filters
            if (activeFilters.startDate) {
                params['filters[from]'] = format(activeFilters.startDate, 'yyyy-MM-dd');
            }
            if (activeFilters.endDate) {
                params['filters[to]'] = format(activeFilters.endDate, 'yyyy-MM-dd');
            }
            params['filters[type]'] = activeFilters.type === 'All' ? 'all' : activeFilters.type;
            params['filters[removeFailedRefund]'] = activeFilters.removeFailed === 'Remove failed transaction' ? 'failed' : 'all';

            // Log request details for debugging
            console.log('PDF Export Request:', {
                buyerId,
                exportName,
                filters: {
                    from: activeFilters.startDate ? format(activeFilters.startDate, 'yyyy-MM-dd') : 'none',
                    to: activeFilters.endDate ? format(activeFilters.endDate, 'yyyy-MM-dd') : 'none',
                    type: activeFilters.type,
                    removeFailed: activeFilters.removeFailed
                }
            });

            // Use proxy to avoid CORS issues
            // Note: The proxy should handle FormData conversion for the export endpoint
            const payload = {
                endpoint: 'https://accounts.fly4all.com/api/export',
                token,
                method: 'POST',
                params: params, // Send params, proxy will convert to FormData if needed
                body: {}
            };

            const response = await fetch(FN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Remove loading toast
            if (loadingToast && loadingToast.parentNode) {
                document.body.removeChild(loadingToast);
                loadingToast = null;
            }

            // Check proxy response
            const json = await response.json();
            if (!json?.ok) {
                console.error('PDF Export Proxy Error:', json);
                throw new Error(json?.error || "Proxy failed");
            }

            // The proxy returns the API response in json.data
            const apiResponse = json.data;
            
            // Check if API returned an error
            if (apiResponse.error || (apiResponse.message && !apiResponse.url && !apiResponse.file)) {
                console.error('PDF Export API Error:', apiResponse);
                throw new Error(apiResponse.error || apiResponse.message || 'API returned an error');
            }

            // The result is the API response
            const result = apiResponse;
            console.log('PDF Export Response:', result);

            // Check if we got a file URL (multiple possible response formats)
            // Note: API returns 'openLink' field for the PDF URL
            const pdfUrl = result.openLink || result.url || result.file || result.downloadUrl || result.download_url || 
                          result.data?.url || result.data?.file || result.data?.openLink || result.link || result.path;
            
            if (!pdfUrl) {
                console.error('Unexpected response format:', result);
                throw new Error('PDF generation completed but no file URL was returned. Response: ' + JSON.stringify(result));
            }

            // Ensure URL is absolute
            const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `https://accounts.fly4all.com${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;

            // Open PDF in new tab
            window.open(fullUrl, '_blank');
            
            // Also trigger download
            const link = document.createElement('a');
            link.href = fullUrl;
            link.download = `${exportName}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error: any) {
            console.error('Error generating PDF:', error);
            setError(error.message || 'Failed to generate PDF. Please try again.');
            
            // Show user-friendly error message
            const errorMessage = error.message || 'Failed to generate PDF. Please try again.';
            alert(`Error generating PDF:\n${errorMessage}\n\nPlease check the console for more details.`);
        } finally {
            // Remove loading toast if still present
            if (loadingToast && loadingToast.parentNode) {
                document.body.removeChild(loadingToast);
            }
            setLoading(false);
        }
    };

    const loadWhatsAppAccounts = async () => {
        try {
            const accounts = await getGlobalWhatsAppSettings();
            if (!accounts || accounts.length === 0) {
                alert('لا يوجد حساب واتساب نشط. يرجى إعداد حساب واتساب في الإعدادات أولاً.');
                return;
            }
            setWhatsappAccounts(accounts);
            setShowWhatsAppModal(true);
        } catch (error) {
            console.error('Error loading WhatsApp accounts:', error);
            alert('فشل تحميل حسابات الواتساب');
        }
    };

    const handleWhatsApp = () => {
        if (!summary || !userInfo) {
            alert('لا توجد بيانات متاحة للإرسال');
            return;
        }

        const userMobile = userInfo?.mobile;
        if (!userMobile || userMobile === '-' || userMobile.trim() === '') {
            alert('لا يوجد رقم هاتف مسجل للعميل');
            return;
        }

        loadWhatsAppAccounts();
    };

    const sendStatementPDF = async () => {
        if (!selectedAccount) {
            alert('يرجى اختيار حساب واتساب');
            return;
        }

        if (!summary || !userInfo) {
            alert('لا توجد بيانات متاحة للإرسال');
            return;
        }

        const userMobile = userInfo?.mobile;
        if (!userMobile || userMobile === '-' || userMobile.trim() === '') {
            alert('لا يوجد رقم هاتف مسجل للعميل');
            return;
        }

        if (!selectedAccount.instance_id || !selectedAccount.token) {
            alert('حساب الواتساب غير مكتمل. يرجى التحقق من الإعدادات.');
            return;
        }

        setSendingStatus('sending');
        setError(null);

        try {
            console.log('📄 Starting statement PDF generation...');

            // Load template from Firestore
            const templateRef = doc(db, 'settings', 'statementTemplate');
            const templateDoc = await getDoc(templateRef);
            
            if (!templateDoc.exists()) {
                alert('لم يتم العثور على قالب. يرجى إنشاء قالب في الإعدادات أولاً.');
                setSendingStatus('error');
                setError('لم يتم العثور على قالب. يرجى إنشاء قالب في الإعدادات أولاً.');
                return;
            }

            const templateData = templateDoc.data();
            
            // Get the actual template HTML from Firestore (not default)
            let template = '';
            if (templateData.html) {
                template = templateData.html;
                console.log('✅ Loaded custom template from Firestore');
            } else {
                alert('القالب المحفوظ غير صحيح. يرجى التحقق من الإعدادات.');
                setSendingStatus('error');
                setError('القالب المحفوظ غير صحيح. يرجى التحقق من الإعدادات.');
                return;
            }

            // Load company settings
            const printSettingsRef = doc(db, 'settings', 'print');
            const printSettingsDoc = await getDoc(printSettingsRef);
            const printSettings = printSettingsDoc.exists() ? printSettingsDoc.data() : {};
            
            // Get logo URL from template settings (customLogoUrl saved as logoUrl in Firestore)
            // Priority: template logoUrl > print settings logoUrl > default
            const templateLogoUrl = templateData.logoUrl || templateData.customLogoUrl;
            const logoUrl = templateLogoUrl || printSettings.logoUrl || 'https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp';
            
            console.log('🖼️ Logo URL:', logoUrl);

            // Prepare statement data (same as handlePrintWithTemplate)
            const userTitle = userInfo?.search_title || userInfo?.name || buyerAlias;
            const userEmail = userInfo?.email || "-";

            const statementData: StatementData = {
                summary: {
                    from: summary.from || '',
                    to: summary.to || '',
                    previousBalance: String(summary.previousBalance || '0'),
                    totalCredit: String(summary.totalCredit || '0'),
                    totalDebit: String(summary.totalDebit || '0'),
                    balanceDue: String(summary.balanceDue || '0'),
                    currency: summary.currency || 'IQD'
                },
                user: {
                    name: userTitle,
                    email: userEmail,
                    mobile: userMobile
                },
                company: {
                    logoUrl: logoUrl,
                    name: printSettings.companyNameLabel || 'شركة الروضتين للسفر والسياحة',
                    address: printSettings.footerAddress || '9647730308111 - 964771800033 | كربلاء - شارع الإسكان'
                },
                transactions: transactions.map((t, idx) => {
                    // NO column: Always use simple sequential number
                    const transactionNo = String(idx + 1);
                    const originalNo = String(t.no || '');
                    const isLongId = originalNo.length > 20 || (originalNo.includes('cai') && originalNo.includes('zbhbg'));

                    // Format date to include transaction number and booking ID
                    let formattedDate = t.date || '';
                    const isValidTransactionNo = transactionNo && transactionNo !== String(idx + 1) && transactionNo !== '-';

                    if (!t.is_prev_balance) {
                        if (isValidTransactionNo && originalNo && !isLongId) {
                            formattedDate = formattedDate && formattedDate !== '-' 
                                ? `${formattedDate}<br>${originalNo}` 
                                : originalNo;
                        }
                        if (t.booking_id && t.booking_id !== '-') {
                            formattedDate = formattedDate 
                                ? `${formattedDate}<br>Booking: ${t.booking_id}` 
                                : `Booking: ${t.booking_id}`;
                        }
                    }
                    
                    // Remove Booking ID from details if it exists
                    let cleanDetails = t.details || '';
                    if (t.booking_id && t.booking_id !== '-' && t.booking_id) {
                        const bookingPattern = new RegExp(`Booking:\\s*#BK011-\\s*${t.booking_id.replace(/#BK011-/gi, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                        cleanDetails = cleanDetails.replace(bookingPattern, '').trim();
                        cleanDetails = cleanDetails.replace(/\|\s*$/, '').replace(/^\|\s*/, '').trim();
                    }
                    
                    return {
                        no: transactionNo,
                        date: formattedDate,
                        pnr: t.pnr || '-',
                        booking_id: t.booking_id || '-',
                        details: cleanDetails,
                        type: t.type || 'N/A',
                        debit_iqd: String(t.debit_iqd || '-'),
                        debit_usd: String(t.debit_usd || '-'),
                        credit_iqd: String(t.credit_iqd || '-'),
                        credit_usd: String(t.credit_usd || '-'),
                        balance_iqd: String(t.balance_iqd || '-'),
                        invoice_no: t.invoice_no || '-'
                    };
                })
            };

            // Generate HTML
            console.log('📝 Generating HTML from template...');
            console.log('🖼️ Using logo URL:', logoUrl);
            console.log('📄 Template preview (first 500 chars):', template.substring(0, 500));
            const html = generateStatementHTML(template, statementData);
            console.log('✅ HTML generated, length:', html.length);
            // Check if logo was replaced
            if (html.includes('{{company.logoUrl}}')) {
                console.warn('⚠️ Logo URL was not replaced in template!');
            } else {
                console.log('✅ Logo URL replaced successfully');
            }

            // Create a temporary iframe to render the HTML
            console.log('🖼️ Creating iframe for rendering...');
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '0';
            // Use pixel width instead of mm for better accuracy
            const iframeWidth = 210 * 3.779527559; // A4 width in pixels (210mm)
            iframe.style.width = `${iframeWidth}px`;
            iframe.style.height = '10000px'; // Large height to fit all content
            iframe.style.overflow = 'visible'; // Ensure no clipping
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            // Wait for iframe to load
            console.log('⏳ Waiting for iframe to load...');
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('انتهت مهلة تحميل المحتوى. يرجى المحاولة مرة أخرى.'));
                }, 10000); // 10 seconds timeout
                
                iframe.onload = () => {
                    clearTimeout(timeout);
                    resolve(undefined);
                };
                
                iframe.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('فشل تحميل المحتوى في iframe.'));
                };
                
                iframe.srcdoc = html;
            });
            console.log('✅ Iframe loaded successfully');

            // Wait for content to render and images to load
            console.log('⏳ Waiting for content to render and images to load...');
            
            // Wait for all images to load
            const waitForImages = (): Promise<void> => {
                return new Promise((resolve) => {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!iframeDoc) {
                        resolve();
                        return;
                    }
                    
                    const images = iframeDoc.querySelectorAll('img');
                    if (images.length === 0) {
                        resolve();
                        return;
                    }
                    
                    let loadedCount = 0;
                    const totalImages = images.length;
                    
                    const checkComplete = () => {
                        loadedCount++;
                        if (loadedCount === totalImages) {
                            console.log('✅ All images loaded');
                            resolve();
                        }
                    };
                    
                    images.forEach((img) => {
                        if (img.complete) {
                            checkComplete();
                        } else {
                            img.onload = checkComplete;
                            img.onerror = () => {
                                console.warn('⚠️ Image failed to load:', img.src);
                                checkComplete(); // Continue even if image fails
                            };
                        }
                    });
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        console.warn('⚠️ Image loading timeout, proceeding anyway');
                        resolve();
                    }, 5000);
                });
            };
            
            await waitForImages();
            await new Promise(resolve => setTimeout(resolve, 500)); // Extra wait for rendering
            console.log('✅ Content rendered');

            // Get the actual body element from iframe
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                throw new Error('فشل في الوصول لمحتوى HTML');
            }

            const bodyElement = iframeDoc.body;

            // Ensure body has no height restrictions
            bodyElement.style.height = 'auto';
            bodyElement.style.overflow = 'visible';
            bodyElement.style.minHeight = 'auto';

            // Force a reflow to ensure accurate measurements
            bodyElement.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get the actual scroll height of the content
            const scrollHeight = Math.max(
                bodyElement.scrollHeight,
                bodyElement.offsetHeight,
                297 * 3.779527559
            ) + 50; // Add small padding for safety
            const scrollWidth = bodyElement.scrollWidth || 210 * 3.779527559;

            // Use body element (more efficient than html element)
            const targetElement = bodyElement;

            // Convert HTML to canvas with high quality settings
            console.log('🎨 Converting HTML to canvas...', { scrollWidth, scrollHeight });
            
            // Ensure iframe document has proper width and CSS (iframeDoc already declared above)
            if (iframeDoc) {
                iframeDoc.documentElement.style.width = `${scrollWidth}px`;
                iframeDoc.documentElement.style.maxWidth = `${scrollWidth}px`;
                iframeDoc.body.style.width = `${scrollWidth}px`;
                iframeDoc.body.style.maxWidth = `${scrollWidth}px`;
                iframeDoc.body.style.overflow = 'visible';
                
                // Fix Account Summary box to ensure it's not clipped
                const summaryBox = iframeDoc.querySelector('.summary-box');
                if (summaryBox) {
                    (summaryBox as HTMLElement).style.width = '100%';
                    (summaryBox as HTMLElement).style.maxWidth = '100%';
                    (summaryBox as HTMLElement).style.minWidth = '0';
                    (summaryBox as HTMLElement).style.boxSizing = 'border-box';
                    (summaryBox as HTMLElement).style.overflow = 'visible';
                }
                
                // Fix header-right to ensure proper layout
                const headerRight = iframeDoc.querySelector('.header-right');
                if (headerRight) {
                    (headerRight as HTMLElement).style.width = '58%';
                    (headerRight as HTMLElement).style.maxWidth = '58%';
                    (headerRight as HTMLElement).style.overflow = 'visible';
                    (headerRight as HTMLElement).style.display = 'flex';
                    (headerRight as HTMLElement).style.flexDirection = 'column';
                }
                
                // Fix header to reduce gaps
                const header = iframeDoc.querySelector('.header');
                if (header) {
                    (header as HTMLElement).style.gap = '20px';
                    (header as HTMLElement).style.alignItems = 'flex-start';
                }
                
                // Fix title margin
                const title = iframeDoc.querySelector('.title');
                if (title) {
                    (title as HTMLElement).style.marginBottom = '12px';
                }
            }
            
            // Wait a bit for styles to apply
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const canvas = await html2canvas(targetElement, {
                scale: 3, // High quality for PDF
                useCORS: true,
                logging: false,
                width: scrollWidth,
                height: scrollHeight,
                backgroundColor: '#ffffff',
                windowWidth: scrollWidth,
                windowHeight: scrollHeight,
                allowTaint: false, // Keep false for CORS to work properly
                removeContainer: false,
                foreignObjectRendering: false, // Disable to ensure images load properly
                imageTimeout: 15000, // 15 seconds timeout for images
                onclone: (clonedDoc) => {
                    // Ensure cloned document has proper width and no restrictions
                    const clonedHtml = clonedDoc.documentElement;
                    const clonedBody = clonedDoc.body;
                    
                    if (clonedHtml) {
                        clonedHtml.style.width = `${scrollWidth}px`;
                        clonedHtml.style.maxWidth = `${scrollWidth}px`;
                        clonedHtml.style.height = 'auto';
                        clonedHtml.style.overflow = 'visible';
                        clonedHtml.style.maxHeight = 'none';
                    }
                    
                    if (clonedBody) {
                        clonedBody.style.width = `${scrollWidth}px`;
                        clonedBody.style.maxWidth = `${scrollWidth}px`;
                        clonedBody.style.height = 'auto';
                        clonedBody.style.overflow = 'visible';
                        clonedBody.style.maxHeight = 'none';
                    }
                    
                    // Fix Account Summary box to ensure it's not clipped
                    const summaryBox = clonedDoc.querySelector('.summary-box');
                    if (summaryBox) {
                        (summaryBox as HTMLElement).style.width = '100%';
                        (summaryBox as HTMLElement).style.maxWidth = '100%';
                        (summaryBox as HTMLElement).style.minWidth = '0';
                        (summaryBox as HTMLElement).style.boxSizing = 'border-box';
                        (summaryBox as HTMLElement).style.overflow = 'visible';
                    }
                    
                    // Fix header-right to ensure proper layout
                    const headerRight = clonedDoc.querySelector('.header-right');
                    if (headerRight) {
                        (headerRight as HTMLElement).style.width = '58%';
                        (headerRight as HTMLElement).style.maxWidth = '58%';
                        (headerRight as HTMLElement).style.overflow = 'visible';
                        (headerRight as HTMLElement).style.display = 'flex';
                        (headerRight as HTMLElement).style.flexDirection = 'column';
                        (headerRight as HTMLElement).style.paddingLeft = '20px';
                    }
                    
                    // Fix header to reduce gaps
                    const header = clonedDoc.querySelector('.header');
                    if (header) {
                        (header as HTMLElement).style.gap = '20px';
                        (header as HTMLElement).style.alignItems = 'flex-start';
                    }
                    
                    // Fix title margin
                    const title = clonedDoc.querySelector('.title');
                    if (title) {
                        (title as HTMLElement).style.marginBottom = '12px';
                        (title as HTMLElement).style.fontSize = '28px';
                    }
                },
            }).catch((error) => {
                console.error('❌ html2canvas error:', error);
                throw new Error(`فشل تحويل HTML إلى صورة: ${error.message}`);
            });
            console.log('✅ Canvas created', { width: canvas.width, height: canvas.height });

            // Create PDF from canvas with multi-page support
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pageHeight = 297; // A4 height in mm
            
            // Optimize image quality vs file size (use JPEG with 0.85 quality for smaller file and faster processing)
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            
            // Handle multi-page content
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if content is longer than one page
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Convert PDF to Blob with compression
            console.log('📦 Converting PDF to Blob...');
            const pdfBlob = pdf.output('blob');
            console.log('✅ PDF Blob created', { size: `${(pdfBlob.size / 1024).toFixed(2)} KB` });

            // Remove iframe immediately to free memory
            try {
                document.body.removeChild(iframe);
                console.log('✅ Iframe removed');
            } catch (e) {
                console.warn('⚠️ Iframe already removed or not found');
            }

            // Normalize phone number
            const normalizedPhone = normalizePhoneNumber(userMobile);
            console.log('📱 Normalized phone:', normalizedPhone);

            // Generate filename
            const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
            const sanitizedAlias = buyerAlias.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const filename = `statement-${sanitizedAlias}-${timestamp}.pdf`;
            console.log('📄 Filename:', filename);

            // Upload PDF to Firebase Storage with timeout
            console.log('☁️ Uploading PDF to Firebase Storage...');
            const storageRef = ref(storage, `statements/${buyerId || 'unknown'}/${filename}`);
            
            // Add timeout for upload (30 seconds)
            const uploadPromise = uploadBytes(storageRef, pdfBlob);
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('انتهت مهلة رفع الملف. يرجى المحاولة مرة أخرى.')), 30000)
            );
            
            await Promise.race([uploadPromise, timeoutPromise]);
            console.log('✅ PDF uploaded to Firebase Storage');
            
            // Get download URL
            console.log('🔗 Getting download URL...');
            const downloadURL = await getDownloadURL(storageRef);
            console.log('✅ Download URL obtained:', downloadURL.substring(0, 50) + '...');

            // Prepare message
            const message = `*Statement of Account - ${buyerAlias}*\nPeriod: ${summary.from} - ${summary.to}\nPrevious Balance: ${summary.previousBalance} ${summary.currency}\nTotal Credit: ${summary.totalCredit} ${summary.currency}\nTotal Debit: ${summary.totalDebit} ${summary.currency}\n*Balance Due: ${summary.balanceDue} ${summary.currency}*`;

            // Send PDF document via WhatsApp using download URL
            // ultramsg API supports sending documents from URL
            console.log('📤 Sending PDF via WhatsApp...', {
                instanceId: selectedAccount.instance_id,
                phone: normalizedPhone,
                filename
            });
            
            const result = await sendWhatsAppDocument(
                selectedAccount.instance_id,
                selectedAccount.token,
                normalizedPhone,
                downloadURL, // Use download URL instead of base64
                filename,
                message
            ).catch((error) => {
                console.error('❌ WhatsApp send error:', error);
                throw new Error(`فشل إرسال الكشف عبر WhatsApp: ${error.message || 'خطأ غير معروف'}`);
            });

            console.log('📨 WhatsApp API response:', result);

            if (result?.sent || result?.success) {
                console.log('✅ Statement sent successfully!');
                setSendingStatus('success');
                setShowWhatsAppModal(false);
                setTimeout(() => {
                    setSendingStatus('idle');
                    setSelectedAccount(null);
                }, 3000);
            } else {
                console.error('❌ Unexpected response format:', result);
                throw new Error(`فشل إرسال الكشف. الاستجابة: ${JSON.stringify(result)}`);
            }

        } catch (error: any) {
            console.error('❌ Error sending statement via WhatsApp:', error);
            setSendingStatus('error');
            const errorMessage = error?.message || error?.toString() || 'فشل إرسال الكشف';
            setError(errorMessage);
            console.error('Full error details:', {
                message: errorMessage,
                stack: error?.stack,
                name: error?.name
            });
        }
    };

    const availableTypes = useMemo(() => {
        const types = new Set<string>();
        transactions.forEach(t => {
            if (t.type && t.type !== 'N/A' && t.type !== '') {
                types.add(t.type);
            }
        });
        return Array.from(types).sort();
    }, [transactions]);

    // Sort and organize transactions: Previous Balance first, then by date (oldest first)
    const organizedTransactions = useMemo(() => {
        if (transactions.length === 0) return [];

        // Separate Previous Balance from regular transactions
        const prevBalance = transactions.filter(t => t.is_prev_balance);
        const regularTransactions = transactions.filter(t => !t.is_prev_balance);

        // Sort regular transactions by date (oldest first)
        const sorted = regularTransactions.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB; // Ascending (oldest first)
        });

        // Add month grouping key
        const withMonthKey = sorted.map(t => {
            try {
                const date = new Date(t.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return { ...t, monthKey };
            } catch {
                return { ...t, monthKey: 'unknown' };
            }
        });

        // Combine: Previous Balance first, then sorted transactions
        return [...prevBalance, ...withMonthKey];
    }, [transactions]);

    // Group transactions by month for display
    const groupedTransactions = useMemo(() => {
        const groups: { monthKey: string; monthLabel: string; transactions: Transaction[] }[] = [];
        let currentGroup: { monthKey: string; monthLabel: string; transactions: Transaction[] } | null = null;

        organizedTransactions.forEach(tr => {
            // Previous Balance goes in its own section
            if (tr.is_prev_balance) {
                groups.push({
                    monthKey: 'prev-balance',
                    monthLabel: 'Previous Balance',
                    transactions: [tr]
                });
                return;
            }

            // Regular transactions grouped by month
            const monthKey = tr.monthKey || 'unknown';
            const monthLabel = monthKey !== 'unknown'
                ? new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : 'Unknown Date';

            if (!currentGroup || currentGroup.monthKey !== monthKey) {
                currentGroup = { monthKey, monthLabel, transactions: [] };
                groups.push(currentGroup);
            }
            currentGroup.transactions.push(tr);
        });

        return groups;
    }, [organizedTransactions]);

    // Calculate pagination with month headers
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        // Flatten with month headers
        const flat: Array<{ type: 'header' | 'transaction'; data: any }> = [];
        let itemCount = 0;

        for (const group of groupedTransactions) {
            // Add header for non-previous-balance groups
            if (group.monthKey !== 'prev-balance') {
                if (itemCount >= start && itemCount < end) {
                    flat.push({ type: 'header', data: group });
                }
                itemCount++; // Count header as an item
            }

            // Add transactions
            for (const tr of group.transactions) {
                if (itemCount >= start && itemCount < end) {
                    flat.push({ type: 'transaction', data: tr });
                }
                itemCount++;

                if (itemCount >= end) break;
            }

            if (itemCount >= end) break;
        }

        return { items: flat, totalItems: itemCount };
    }, [groupedTransactions, currentPage]);

    // Calculate total pages based on actual transactions (excluding headers)
    const totalTransactions = organizedTransactions.length;
    const totalPages = Math.ceil(totalTransactions / itemsPerPage);

    // Dynamic header data - Use user info (buyer info) instead of company info
    const userTitle = userInfo?.search_title || userInfo?.name || buyerAlias;
    const userMobile = userInfo?.mobile || "-";
    const userEmail = userInfo?.email || "-";

    // Helper function to format amount with color
    const formatAmount = useCallback((value: string | number | null | undefined) => {
        if (!value || value === '-') {
            return { displayValue: '0', colorClass: 'text-slate-600', isNegative: false };
        }

        const str = String(value);
        const isNegative = str.includes('(') || str.startsWith('-');
        const cleanStr = str.replace(/[()]/g, '').replace(/[^\d.-]/g, '');
        const amount = parseFloat(cleanStr);
        const isNegativeAmount = isNaN(amount) ? false : amount < 0;

        const finalIsNegative = isNegative || isNegativeAmount;
        const colorClass = finalIsNegative ? 'text-rose-600' : (amount > 0 ? 'text-emerald-600' : 'text-slate-600');

        return { displayValue: str, colorClass, isNegative: finalIsNegative };
    }, []);

    // WhatsApp Account Selection Modal
    const WhatsAppAccountModal = () => {
        if (!showWhatsAppModal) return null;

        return createPortal(
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
                onClick={() => {
                    if (sendingStatus === 'idle') {
                        setShowWhatsAppModal(false);
                        setSelectedAccount(null);
                    }
                }}
            >
                <div 
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            اختيار حساب الواتساب
                        </h3>
                        {sendingStatus === 'idle' && (
                            <button
                                onClick={() => {
                                    setShowWhatsAppModal(false);
                                    setSelectedAccount(null);
                                }}
                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {sendingStatus === 'sending' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-green-500 mb-4" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                جاري توليد وإرسال الكشف...
                            </p>
                        </div>
                    )}

                    {sendingStatus === 'success' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-lg font-black text-green-600 dark:text-green-400 mb-2">
                                تم الإرسال بنجاح!
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                تم إرسال الكشف كملف PDF إلى رقم الهاتف المسجل
                            </p>
                        </div>
                    )}

                    {sendingStatus === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-lg font-black text-red-600 dark:text-red-400 mb-2">
                                فشل الإرسال
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                                {error || 'حدث خطأ أثناء الإرسال'}
                            </p>
                            <button
                                onClick={() => {
                                    setSendingStatus('idle');
                                    setError(null);
                                }}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    )}

                    {sendingStatus === 'idle' && (
                        <>
                            <div className="space-y-3 mb-6">
                                {whatsappAccounts.map((account: any) => (
                                    <button
                                        key={account.id || account.instance_id}
                                        onClick={() => setSelectedAccount(account)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                                            selectedAccount?.instance_id === account.instance_id
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-black text-gray-800 dark:text-white mb-1">
                                                    {account.name || 'حساب واتساب'}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {account.instance_id}
                                                </p>
                                            </div>
                                            {selectedAccount?.instance_id === account.instance_id && (
                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowWhatsAppModal(false);
                                        setSelectedAccount(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={sendStatementPDF}
                                    disabled={!selectedAccount}
                                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    إرسال
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>,
            document.body
        );
    };

    return (
        <>
            <WhatsAppAccountModal />
        <div className="min-h-screen bg-white p-4 md:p-8 flex flex-col items-center font-tajawal">
            <style>{`
                .transaction-details b { font-weight: 900; }
                .transaction-details br { margin-bottom: 4px; display: block; content: ""; }
                .transaction-details div { margin-bottom: 2px; }
                .transaction-details .border-b { border-color: #e2e8f0; }
                
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0 !important; background: white !important; }
                    .min-h-screen { height: auto !important; min-height: 0 !important; padding: 0 !important; }
                    .max-w-7xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
                    .shadow-lg, .shadow-md, .shadow-xl, .shadow-sm { box-shadow: none !important; }
                    .border { border-color: #f1f5f9 !important; }
                    .bg-slate-100 { background-color: #f8fafc !important; }
                    .rounded-xl, .rounded-3xl, .rounded-lg { border-radius: 0 !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    th, td { border: 1px solid #f1f5f9 !important; }
                }
            `}</style>

            <div className="w-full max-w-7xl flex flex-col gap-6">
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600 text-[11px] font-bold">
                        <FileText className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">

                    {/* Summary Box */}
                    <div className="w-full md:w-[450px] bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100">
                        <div className="bg-slate-400 p-2 px-4 flex justify-end">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Account summary</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 mb-4 text-right">{summary?.from} - {summary?.to}</p>

                            <div className="flex justify-between items-center text-[11px] font-bold">
                                {(() => {
                                    const prevBalance = formatAmount(summary?.previousBalance);
                                    return (
                                        <span className={prevBalance.colorClass}>
                                            {prevBalance.displayValue} {summary?.currency || 'IQD'}
                                        </span>
                                    );
                                })()}
                                <span className="text-slate-600">Previous Balance</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-bold">
                                {(() => {
                                    const totalCredit = formatAmount(summary?.totalCredit);
                                    return (
                                        <span className={totalCredit.colorClass}>
                                            {totalCredit.displayValue} {summary?.currency || 'IQD'}
                                        </span>
                                    );
                                })()}
                                <span className="text-slate-600">Total credit / amount paid</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-bold">
                                {(() => {
                                    const totalDebit = formatAmount(summary?.totalDebit);
                                    return (
                                        <span className={totalDebit.colorClass}>
                                            {totalDebit.displayValue} {summary?.currency || 'IQD'}
                                        </span>
                                    );
                                })()}
                                <span className="text-slate-600">Total debit / invoiced amount</span>
                            </div>

                            <div className="pt-2 border-t border-slate-200 mt-4 flex justify-between items-center text-xs font-black">
                                {(() => {
                                    const balanceDue = formatAmount(summary?.balanceDue);
                                    return (
                                        <span className={balanceDue.colorClass}>
                                            {balanceDue.displayValue} {summary?.currency || 'IQD'}
                                        </span>
                                    );
                                })()}
                                <span className="text-slate-800 uppercase italic">Balance due (Debit)</span>
                            </div>
                        </div>
                    </div>

                    {/* User Info Section - Buyer/User Information */}
                    <div className="flex items-start gap-6 text-right md:text-right flex-row-reverse">
                        <div className="flex flex-col gap-1 items-end">
                            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{userTitle}</h1>
                            <div className="text-[11px] text-slate-500 font-bold space-y-1 mt-1">
                                {userMobile && userMobile !== '-' && (
                                    <p>Mobile: {userMobile}</p>
                                )}
                                {userEmail && userEmail !== '-' && (
                                    <p>Email: {userEmail}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Filter Bar */}
                <div className="bg-white border-t border-b border-slate-100 py-8 space-y-6">
                    {/* Quick Date Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Quick Select:</span>
                        <button
                            onClick={() => setQuickDate('today')}
                            className="px-4 py-2 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setQuickDate('week')}
                            className="px-4 py-2 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setQuickDate('month')}
                            className="px-4 py-2 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setQuickDate('year')}
                            className="px-4 py-2 bg-white border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => setQuickDate('clear')}
                            className="px-4 py-2 bg-white border-2 border-slate-100 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    </div>

                    {/* Filter Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</label>
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(range) => setDateRange(range)}
                                placeholder="Select date range"
                                maxDate={new Date()}
                            />
                        </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remove failed transaction</label>
                        <select
                            value={removeFailed}
                            onChange={(e) => setRemoveFailed(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer"
                        >
                            <option>Show all transaction</option>
                            <option>Remove failed transaction</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer font-tajawal"
                        >
                            <option value="All">All types</option>
                            {availableTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-end no-print">
                    <button
                        onClick={handleResetFilters}
                        className="px-10 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleApplyFilters}
                        disabled={loading}
                        className="px-12 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95"
                    >
                        Apply Filters
                    </button>
                </div>

                {/* 3. Export & Content */}
                <div className="flex flex-wrap gap-4 justify-start mt-4 no-print">
                    <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95 text-center flex items-center gap-2 group"
                    >
                        <FileSpreadsheet className="w-4 h-4 group-hover:rotate-6 transition-transform" />
                        Excel
                    </button>

                    <button
                        onClick={handlePrintWithTemplate}
                        disabled={loading}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 text-center flex items-center gap-2 group disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        )}
                        طباعة بالقالب
                    </button>

                    <button
                        onClick={handleWhatsApp}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 transition-all active:scale-95 text-center flex items-center gap-2 group"
                    >
                        <MessageCircle className="w-4 h-4 group-hover:animate-bounce transition-transform" />
                        WhatsApp
                    </button>
                </div>

                {/* 4. Table Section */}
                <div ref={tableRef} className="border border-slate-100 rounded-3xl overflow-x-auto bg-white shadow-sm mt-4">
                    <table className="w-full text-left font-tajawal">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 border-b-2 border-slate-300">
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-12 text-center border-r border-slate-200">#</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-40 text-right border-r border-slate-200">DATE</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-36 text-center border-r border-slate-200">PNR</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right border-r border-slate-200">DETAILS</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-28 text-center border-r border-slate-200">TYPE</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-40 text-center border-r border-slate-200">DEBIT</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-40 text-center border-r border-slate-200">CREDIT</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-40 text-center border-r border-slate-200">BALANCE</th>
                                <th className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-widest w-36 text-center">INVOICE NO.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Retrieving historical records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <FileText className="w-12 h-12" />
                                            <p className="text-[11px] font-black uppercase tracking-widest">No matching records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                (() => {
                                    let globalIdx = (currentPage - 1) * itemsPerPage;

                                    // Format date nicely
                                    const formatDate = (dateStr: string) => {
                                        try {
                                            const date = new Date(dateStr);
                                            const month = date.toLocaleDateString('en-US', { month: 'short' });
                                            const day = date.getDate();
                                            const year = date.getFullYear();
                                            const time = dateStr.split(' ').slice(3).join(' ') || '';
                                            return { date: `${month} ${year} ${day}`, time };
                                        } catch {
                                            return { date: dateStr.split(' ').slice(0, 3).join(' '), time: dateStr.split(' ').slice(3).join(' ') };
                                        }
                                    };

                                    return paginatedData.items.map((item) => {
                                        if (item.type === 'header') {
                                    return (
                                                <tr key={`header-${item.data.monthKey}`} className="bg-slate-200/50 border-y-2 border-slate-300">
                                                    <td colSpan={9} className="p-3 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1 h-6 bg-blue-600 rounded-full" />
                                                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                                                {item.data.monthLabel}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const tr = item.data;
                                        globalIdx++;
                                        const dateParts = formatDate(tr.date);

                                        return (
                                            <tr key={tr.id} className={`${tr.is_prev_balance ? 'bg-amber-50/30 border-l-4 border-amber-400' : 'hover:bg-blue-50/30'} transition-colors group border-b border-slate-100`}>
                                                <td className="p-4 text-[10px] font-bold text-slate-400 text-center border-r border-slate-100">{globalIdx}</td>

                                                <td className="p-4 text-right border-r border-slate-100">
                                                    {tr.is_prev_balance ? (
                                                        <span className="text-[10px] font-bold text-slate-500 italic">-</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5 text-[10px] font-bold">
                                                            <span className="text-slate-800">{dateParts.date}</span>
                                                            <span className="text-slate-500">{dateParts.time}</span>
                                                            <span className="text-blue-600 mt-1 opacity-60 group-hover:opacity-100 transition-opacity font-mono text-[9px]">#{tr.no}</span>
                                                            {tr.booking_id && (
                                                                <span className="text-slate-600 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity font-mono text-[9px]">#BK011-{tr.booking_id}</span>
                                                            )}
                                                    </div>
                                                )}
                                            </td>

                                                <td className="p-4 text-center border-r border-slate-100">
                                                    {tr.pnr && tr.pnr !== '-' ? (
                                                        <span className="text-[10px] font-bold text-slate-700 font-mono">
                                                            {tr.pnr}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>

                                                <td className="p-4 text-right border-r border-slate-100">
                                                    <div
                                                        className={`max-w-lg transaction-details ${tr.is_prev_balance ? 'italic font-black text-amber-700 text-[11px]' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: tr.details }}
                                                />
                                            </td>

                                                <td className="p-4 text-center border-r border-slate-100">
                                                    {tr.is_prev_balance || !tr.type || tr.type === "N/A" ? (
                                                        <span className="text-slate-300">-</span>
                                                    ) : (
                                                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black text-white shadow-sm inline-block min-w-[70px] ${tr.type === 'CHARGE' ? 'bg-emerald-600' :
                                                            tr.type === 'OT-ISSUE' || tr.type === 'DT-ISSUE' ? 'bg-orange-500' :
                                                                tr.type === 'PAYMENT' ? 'bg-blue-600' :
                                                                    tr.type === 'REFUND' ? 'bg-purple-600' :
                                                                        'bg-slate-500'
                                                        }`}>
                                                        {tr.type}
                                                    </span>
                                                )}
                                            </td>

                                                <td className="p-4 text-center border-r border-slate-100">
                                                    {tr.debit_iqd !== '-' ? (
                                                        <div className="flex flex-col items-center gap-0.5 text-[11px] font-black text-rose-600">
                                                            <span>{tr.debit_iqd}</span>
                                                            {tr.debit_usd !== '-' && (
                                                                <span className="text-rose-400 font-bold text-[9px] opacity-70">{tr.debit_usd}</span>
                                                            )}
                                                </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                            </td>

                                                <td className="p-4 text-center border-r border-slate-100">
                                                    {tr.credit_iqd !== '-' ? (
                                                        <div className="flex flex-col items-center gap-0.5 text-[11px] font-black text-emerald-600">
                                                            <span>{tr.credit_iqd}</span>
                                                            {tr.credit_usd !== '-' && (
                                                                <span className="text-emerald-500 font-bold text-[9px] opacity-70">{tr.credit_usd}</span>
                                                            )}
                                                </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                            </td>

                                                <td className="p-4 text-center border-r border-slate-100">
                                                    <div className={`text-[11px] font-black tracking-tighter ${tr.balance_iqd.toString().includes('(') ? 'text-rose-600' : 'text-emerald-600'
                                                        }`}>
                                                        {tr.balance_iqd !== '-' ? tr.balance_iqd : '-'}
                                                </div>
                                            </td>

                                                <td className="p-4 text-center">
                                                {tr.invoice_no ? (
                                                        <span className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                                                            {tr.invoice_no}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                            </td>
                                        </tr>
                                    );
                                    });
                                })()
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-6 py-12">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => {
                                setCurrentPage(p => p - 1);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-20 shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Page</span>
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-800">{currentPage}</span>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">of {totalPages}</span>
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => {
                                setCurrentPage(p => p + 1);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-20 shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};

export default StatementPage;
