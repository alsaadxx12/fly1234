import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  ArrowUpLeft, ArrowDownRight, User, DollarSign, FileText, Pencil, Trash2, Eye,
  Printer, MessageCircle, CheckCircle, Calendar, Building2, Plane, Zap, ChevronLeft, ChevronRight, Phone, Box, AlertTriangle
} from 'lucide-react';
import CurrencyConversionDialog from './CurrencyConversionDialog';
import useAccountSettings from '../hooks/useAccountSettings';
import ModernModal from '../../../components/ModernModal';
import SendVoucherWhatsAppModal from '../../../components/SendVoucherWhatsAppModal';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';

interface Voucher {
  id: string;
  type: 'receipt' | 'payment';
  invoiceNumber: number;
  companyName: string;
  amount: number;
  currency: 'USD' | 'IQD';
  details?: string;
  createdAt: Date;
  employeeId: string;
  settlement: boolean;
  confirmation: boolean;
  phone?: string;
  whatsAppGroupId?: string;
  gates: number;
  internal: number;
  external: number;
  fly: number;
  createdBy: string;
  createdByName?: string;
  route?: string;
  safeName?: string;
  exchangeRate?: number;
}

interface AccountsTableProps {
  vouchers: Voucher[];
  onSettlementToggle: (voucher: Voucher) => void;
  onConfirmationToggle: (voucher: Voucher) => void;
  onViewVoucher: (id: string) => void;
  onEditVoucher: (id: string) => void;
  onDeleteVoucher: (id: string) => void;
  readOnlyMode: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalVouchers: number;
  itemsPerPage: number;
}

const AccountsTable: React.FC<AccountsTableProps> = (props) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { settings } = useAccountSettings();
  const { currentRate } = useExchangeRate();
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [voucherToPrint, setVoucherToPrint] = useState<any>(null);
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'IQD':
        return 'د.ع';
      default:
        return currency;
    }
  };
  const [unsettleConfirmVoucher, setUnsettleConfirmVoucher] = useState<Voucher | null>(null);
  const [unconfirmConfirmVoucher, setUnconfirmConfirmVoucher] = useState<Voucher | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedVoucherForWhatsApp, setSelectedVoucherForWhatsApp] = useState<any>(null);
  const [whatsAppConvertToIQD, setWhatsAppConvertToIQD] = useState(false);


  useEffect(() => {
    if (selectedVoucherForWhatsApp && !showCurrencyDialog) {
      setIsWhatsAppModalOpen(true);
    }
  }, [selectedVoucherForWhatsApp, showCurrencyDialog]);

  const handleWhatsAppClick = (voucher: Voucher) => {
    setSelectedVoucherForWhatsApp(voucher);
    if (voucher.currency === 'USD') {
      setVoucherToPrint(null); // Ensure print state is cleared
      setShowCurrencyDialog(true);
    } else {
      setWhatsAppConvertToIQD(false);
      setIsWhatsAppModalOpen(true);
    }
  };

  const handlePrintVoucher = (voucherData: any) => {
    if (voucherData.currency === 'USD') {
      setSelectedVoucherForWhatsApp(null); // Ensure whatsapp state is cleared
      setVoucherToPrint(voucherData);
      setShowCurrencyDialog(true);
    } else {
      const url = `/voucher/${voucherData.id}?convertToIQD=false&rate=${currentRate}`;
      window.open(url, '_blank');
    }
  };

  const handleSettlementToggle = (voucher: Voucher) => {
    if (voucher.settlement) {
      setUnsettleConfirmVoucher(voucher);
    } else {
      props.onSettlementToggle(voucher);
    }
  };

  const handleConfirmationToggle = (voucher: Voucher) => {
    if (voucher.confirmation) {
      setUnconfirmConfirmVoucher(voucher);
    } else {
      props.onConfirmationToggle(voucher);
    }
  };


  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const calculateTicketTotals = (ticket: Voucher) => {
    if (ticket.type === 'payment') {
      return { purchase: 0, sale: 0, profit: 0, amount: ticket.amount || 0 };
    }
    const purchase = (ticket.gates || 0) + (ticket.internal || 0) + (ticket.external || 0) + (ticket.fly || 0);
    const sale = ticket.amount || 0;
    return { purchase, sale, profit: sale - purchase, amount: sale };
  };

  if (props.vouchers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">لا توجد سندات لعرضها</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">حاول تغيير الفلاتر أو إضافة سند جديد</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {props.vouchers.map((voucher) => {
          const totals = calculateTicketTotals(voucher);
          const isSettled = voucher.settlement === true;
          const distributionEntries = [
            { label: settings.gatesColumnLabel || 'جات', value: voucher.gates, icon: <Zap className="w-3 h-3 text-yellow-500" /> },
            { label: settings.internalColumnLabel || 'داخلي', value: voucher.internal, icon: <ArrowDownRight className="w-3 h-3 text-blue-500" /> },
            { label: settings.externalColumnLabel || 'خارجي', value: voucher.external, icon: <ArrowUpLeft className="w-3 h-3 text-purple-500" /> },
            { label: settings.flyColumnLabel || 'فلاي', value: voucher.fly, icon: <Plane className="w-3 h-3 text-green-500" /> },
          ].filter(entry => entry.value > 0);

          return (
            <div key={voucher.id} className={`relative rounded-xl shadow-sm border overflow-hidden transition-all duration-300 group ${isSettled
              ? 'bg-gradient-to-br from-purple-900 to-indigo-900 border-purple-700'
              : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
              {isSettled && (
                <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden">
                  <div className="absolute transform -rotate-45 bg-purple-600 text-center text-white font-semibold py-1 -left-8 top-6 w-32">
                    متحاسب عليه
                  </div>
                </div>
              )}

              <div className="p-4 relative">
                <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-6 gap-y-4">
                  {/* Section 1: Basic Info */}
                  <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-right">
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`px-3 py-1 font-black rounded-lg text-xs uppercase tracking-wider ${voucher.type === 'receipt'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                          {voucher.type === 'receipt' ? 'سند قبض' : 'سند دفع'}
                        </span>
                        <span className={`font-mono font-black text-sm px-2 py-1 rounded-md ${isSettled ? 'bg-white/10 text-gray-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          #{voucher.invoiceNumber || voucher.id.substring(0, 6)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center lg:justify-start gap-2 w-full">
                        <div className={`p-2 rounded-xl ${isSettled ? 'bg-white/15' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <Building2 className={`w-5 h-5 ${isSettled ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                        </div>
                        <p className={`text-xl font-[900] truncate ${isSettled ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {voucher.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmationToggle(voucher)}
                        className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs border-2 ${voucher.confirmation
                          ? (isSettled ? 'bg-green-500/20 border-green-400/30 text-green-300' : 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300')
                          : (isSettled ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-700/50 dark:border-gray-700 dark:text-gray-400')}`}
                      >
                        <CheckCircle size={14} /> <span>تأكيد</span>
                      </button>
                      <button
                        onClick={() => handleSettlementToggle(voucher)}
                        className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs border-2 ${voucher.settlement
                          ? (isSettled ? 'bg-purple-500/20 border-purple-400/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300')
                          : (isSettled ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-700/50 dark:border-gray-700 dark:text-gray-400')}`}
                      >
                        <DollarSign size={14} /> <span>تحاسب</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Details */}
                  <div className="lg:col-span-5 lg:border-x-2 lg:border-dashed lg:border-gray-200 lg:dark:border-gray-700 px-4 flex flex-col justify-center gap-3 py-4 lg:py-0 border-y-2 lg:border-y-0 border-dashed border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <div className={`p-1 rounded-md ${isSettled ? 'bg-white/10' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.65rem] opacity-60">منظم السند</span>
                          <span className={isSettled ? 'text-white' : 'text-gray-900 dark:text-gray-200'}>{voucher.createdByName || 'غير معروف'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <div className={`p-1 rounded-md ${isSettled ? 'bg-white/10' : 'bg-orange-50 dark:bg-orange-900/30'}`}>
                          <Calendar className="w-3.5 h-3.5 text-orange-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.65rem] opacity-60">تاريخ السند</span>
                          <span className={isSettled ? 'text-white' : 'text-gray-900 dark:text-gray-200'}>{new Date(voucher.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}</span>
                        </div>
                      </div>

                      {voucher.safeName && (
                        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <div className={`p-1 rounded-md ${isSettled ? 'bg-white/10' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                            <Box className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.65rem] opacity-60">الصندوق</span>
                            <span className={isSettled ? 'text-white' : 'text-gray-900 dark:text-gray-200'}>{voucher.safeName}</span>
                          </div>
                        </div>
                      )}

                      {(voucher.phone || voucher.whatsAppGroupId) && (
                        <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                          <div className={`p-1 rounded-md ${isSettled ? 'bg-white/10' : 'bg-green-50 dark:bg-green-900/30'}`}>
                            <Phone className="w-3.5 h-3.5 text-green-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.65rem] opacity-60">رقم الهاتف / المجموعة</span>
                            <span dir="ltr" className={isSettled ? 'text-white' : 'text-gray-900 dark:text-gray-200'}>{voucher.phone || voucher.whatsAppGroupId}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {voucher.details && (
                      <div className={`mt-1 p-3 rounded-xl text-right text-sm font-bold leading-relaxed border ${isSettled
                        ? 'bg-white/10 border-white/5 text-white'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600 text-slate-700 dark:text-slate-300'
                        }`}>
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 mt-0.5 opacity-50 shrink-0" />
                          <p className="line-clamp-2 hover:line-clamp-none transition-all cursor-default">{voucher.details}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Financials & Actions */}
                  <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                    <div className="flex flex-col items-center lg:items-end justify-center">
                      <span className={`text-xs font-bold mb-1 ${isSettled ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                        {voucher.type === 'receipt' ? 'إجمالي المبلغ المستلم' : 'إجمالي المبلغ المدفوع'}
                      </span>
                      <div className={`flex items-baseline gap-2 font-mono font-black text-3xl lg:text-4xl ${voucher.type === 'receipt'
                        ? 'text-emerald-500 drop-shadow-[0_4px_10px_rgba(16,185,129,0.3)]'
                        : 'text-rose-500 drop-shadow-[0_4px_10px_rgba(244,63,94,0.3)]'
                        }`}>
                        {formatNumber(totals.amount)}
                        <span className="text-sm font-bold opacity-60 ml-1">{getCurrencySymbol(voucher.currency)}</span>
                      </div>

                      {voucher.type === 'receipt' && distributionEntries.length > 0 && (
                        <div className={`mt-3 w-full grid grid-cols-2 gap-2 p-2 rounded-xl ${isSettled ? 'bg-white/10' : 'bg-slate-50 dark:bg-gray-700/40'}`}>
                          {distributionEntries.map(entry => (
                            <div className="flex items-center justify-between gap-2 px-2" key={entry.label}>
                              <div className="flex items-center gap-1 text-[0.65rem] font-black text-gray-500 dark:text-gray-400">
                                {entry.icon} {entry.label}
                              </div>
                              <span className={`text-[0.7rem] font-mono font-black ${isSettled ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                {formatNumber(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center lg:justify-end gap-1 sm:gap-2">
                      {(voucher.phone || voucher.whatsAppGroupId) && (
                        <button onClick={() => handleWhatsAppClick(voucher)} className={`flex-1 lg:flex-none p-3 lg:p-2.5 rounded-xl transition-all shadow-sm ${isSettled ? 'bg-white/10 text-green-300 hover:bg-white/20' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50'}`} title="واتساب">
                          <MessageCircle size={18} className="mx-auto" />
                        </button>
                      )}
                      <button onClick={() => props.onViewVoucher(voucher.id)} className={`flex-1 lg:flex-none p-3 lg:p-2.5 rounded-xl transition-all shadow-sm ${isSettled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-purple-50 text-purple-500 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50'}`} title="عرض"><Eye size={18} className="mx-auto" /></button>
                      {!props.readOnlyMode && <button onClick={() => props.onEditVoucher(voucher.id)} className={`flex-1 lg:flex-none p-3 lg:p-2.5 rounded-xl transition-all shadow-sm ${isSettled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-blue-50 text-blue-500 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'}`} title="تعديل"><Pencil size={18} className="mx-auto" /></button>}
                      <button onClick={() => handlePrintVoucher(voucher)} className={`flex-1 lg:flex-none p-3 lg:p-2.5 rounded-xl transition-all shadow-sm ${isSettled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-orange-50 text-orange-500 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50'}`} title="طباعة"><Printer size={18} className="mx-auto" /></button>
                      {!props.readOnlyMode && <button onClick={() => props.onDeleteVoucher(voucher.id)} className={`flex-1 lg:flex-none p-3 lg:p-2.5 rounded-xl transition-all shadow-sm ${isSettled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50'}`} title="حذف"><Trash2 size={18} className="mx-auto" /></button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4 p-4 mt-3">
        <button
          onClick={props.onNextPage}
          disabled={!props.hasNextPage}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="text-gray-700 dark:text-gray-300 font-bold">
          صفحة {props.currentPage}
        </span>
        <button
          onClick={props.onPreviousPage}
          disabled={!props.hasPreviousPage}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {showCurrencyDialog && (
        <CurrencyConversionDialog
          isOpen={showCurrencyDialog}
          onClose={() => {
            setShowCurrencyDialog(false);
            setSelectedVoucherForWhatsApp(null);
            setVoucherToPrint(null);
          }}
          onConfirm={(convertToIQD) => {
            const voucher = selectedVoucherForWhatsApp || voucherToPrint;
            const rateToUse = (voucher?.exchangeRate && voucher.exchangeRate > 1) ? voucher.exchangeRate : currentRate;

            if (selectedVoucherForWhatsApp) {
              setWhatsAppConvertToIQD(convertToIQD);
              setIsWhatsAppModalOpen(true);
            } else if (voucherToPrint) {
              const url = `/voucher/${voucherToPrint.id}?convertToIQD=${convertToIQD}&rate=${rateToUse}`;
              window.open(url, '_blank');
            }
            setShowCurrencyDialog(false);
          }}
          amount={(selectedVoucherForWhatsApp || voucherToPrint)?.amount || 0}
          exchangeRate={((selectedVoucherForWhatsApp || voucherToPrint)?.exchangeRate > 1) ? (selectedVoucherForWhatsApp || voucherToPrint).exchangeRate : currentRate}
        />
      )}

      <ModernModal
        isOpen={!!unsettleConfirmVoucher}
        onClose={() => setUnsettleConfirmVoucher(null)}
        title="تأكيد إلغاء التحاسب"
        icon={<AlertTriangle className="w-8 h-8 text-orange-500" />}
        iconColor="orange"
      >
        <p>هل أنت متأكد من أنك تريد إلغاء تحاسب هذا السند؟ سيؤثر هذا على الحسابات النهائية.</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setUnsettleConfirmVoucher(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">إلغاء</button>
          <button
            onClick={() => {
              if (unsettleConfirmVoucher) {
                props.onSettlementToggle(unsettleConfirmVoucher);
              }
              setUnsettleConfirmVoucher(null);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            نعم، إلغاء التحاسب
          </button>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={!!unconfirmConfirmVoucher}
        onClose={() => setUnconfirmConfirmVoucher(null)}
        title="تأكيد إلغاء التأكيد"
        icon={<AlertTriangle className="w-8 h-8 text-orange-500" />}
        iconColor="orange"
      >
        <p>هل أنت متأكد من أنك تريد إلغاء تأكيد هذا السند؟</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setUnconfirmConfirmVoucher(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">إلغاء</button>
          <button
            onClick={() => {
              if (unconfirmConfirmVoucher) {
                props.onConfirmationToggle(unconfirmConfirmVoucher);
              }
              setUnconfirmConfirmVoucher(null);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            نعم، إلغاء التأكيد
          </button>
        </div>
      </ModernModal>
      {isWhatsAppModalOpen && selectedVoucherForWhatsApp && (
        <SendVoucherWhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedVoucherForWhatsApp(null);
          }}
          voucherData={selectedVoucherForWhatsApp}
          selectedAccount={window.selectedWhatsAppAccount}
          convertToIQD={whatsAppConvertToIQD}
        />
      )}
    </>
  );
};

export default AccountsTable;
