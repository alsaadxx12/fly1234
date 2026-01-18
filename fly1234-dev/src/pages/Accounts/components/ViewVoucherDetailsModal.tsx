import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { X, ArrowDownRight, ArrowUpLeft, Building2, DollarSign, Phone, Download, FileText, Calendar, Clock, User, Box, TriangleAlert as AlertTriangle, Loader2, History, Eye, Hash, Users, MessageCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import useVoucherHistory from '../hooks/useVoucherHistory';
import { formatValueForDisplay } from '../utils/objectUtils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';

interface ViewVoucherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId: string | null;
  settings: {
    useCustomColumns: boolean;
    showGatesColumn: boolean;
    showInternalColumn: boolean;
    showExternalColumn: boolean;
    showFlyColumn: boolean;
    gatesColumnLabel: string;
    internalColumnLabel: string;
    externalColumnLabel: string;
    flyColumnLabel: string;
  };
}

interface VoucherHistory {
  id: string;
  updatedAt: Date;
  updatedBy: string;
  updatedById: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export default function ViewVoucherDetailsModal({
  isOpen,
  onClose,
  voucherId,
  settings
}: ViewVoucherDetailsModalProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { getVoucherHistory, isLoading: isHistoryLoading } = useVoucherHistory();

  // Voucher data state
  const [voucherData, setVoucherData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState<VoucherHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load voucher data
  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch voucher data
        const voucherRef = doc(db, 'vouchers', voucherId);
        const voucherDoc = await getDoc(voucherRef);

        if (!voucherDoc.exists()) {
          throw new Error('لم يتم العثور على السند');
        }

        const data = voucherDoc.data();

        // Format dates
        const formattedData = {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : null
        };

        setVoucherData(formattedData);
      } catch (error) {
        console.error('Error fetching voucher data:', error);
        setError('فشل في تحميل بيانات السند');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && voucherId) {
      fetchVoucherData();
    }
  }, [isOpen, voucherId]);

  // Load voucher history
  const fetchVoucherHistory = async () => {
    if (!voucherId) return;
    setIsLoadingHistory(true);

    try {
      // Use the hook to get history
      const history = await getVoucherHistory(voucherId);

      if (history.length === 0) {
        // If no history records exist, create a mock history entry from the voucher data
        if (voucherData && voucherData.updatedAt) {
          setVoucherHistory([{
            id: 'initial',
            updatedAt: voucherData.updatedAt,
            updatedBy: voucherData.updatedBy || voucherData.employeeName,
            updatedById: voucherData.updatedById || voucherData.employeeId,
            changes: [{ field: 'تحديث', oldValue: null, newValue: 'تم تحديث السند' }]
          }]);
        } else {
          setVoucherHistory([]);
        }
      } else {
        setVoucherHistory(history);
      }
    } catch (error) {
      console.error('Error fetching voucher history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Export history to Excel
  const exportHistoryToExcel = () => {
    if (!voucherHistory || voucherHistory.length === 0) return;

    setIsExporting(true);

    try {
      // Transform history data for Excel
      const excelData = voucherHistory.flatMap(historyItem =>
        historyItem.changes.map(change => ({
          'تاريخ التعديل': historyItem.updatedAt.toLocaleDateString('en-GB'),
          'وقت التعديل': historyItem.updatedAt.toLocaleTimeString('en-GB'),
          'تم بواسطة': historyItem.updatedBy,
          'الحقل': change.displayName || formatFieldName(change.field),
          'القيمة القديمة': change.oldValue !== undefined && change.oldValue !== null
            ? formatValueForDisplay(change.field, change.oldValue, voucherData?.currency)
            : '-',
          'القيمة الجديدة': change.newValue !== undefined && change.newValue !== null
            ? formatValueForDisplay(change.field, change.newValue, voucherData?.currency)
            : '-'
        }))
      );

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // تاريخ التعديل
        { wch: 10 }, // وقت التعديل
        { wch: 20 }, // تم بواسطة
        { wch: 15 }, // الحقل
        { wch: 20 }, // القيمة القديمة
        { wch: 20 }  // القيمة الجديدة
      ];

      worksheet['!cols'] = columnWidths;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'VoucherHistory');

      // Generate Excel file
      XLSX.writeFile(workbook, `voucher_history_${voucherData?.invoiceNumber || voucherId}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting history to Excel:', error);
      alert('حدث خطأ أثناء تصدير سجل التعديلات');
    } finally {
      setIsExporting(false);
    }
  };

  // Format field name for display
  const formatFieldName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      companyName: 'اسم الشركة',
      amount: 'المبلغ',
      currency: 'العملة',
      gates: settings.useCustomColumns ? settings.gatesColumnLabel : 'العمود الأول',
      internal: settings.useCustomColumns ? settings.internalColumnLabel : 'العمود الثاني',
      external: settings.useCustomColumns ? settings.externalColumnLabel : 'العمود الثالث',
      fly: settings.useCustomColumns ? settings.flyColumnLabel : 'العمود الرابع',
      phone: 'رقم الهاتف',
      details: 'التفاصيل',
      safeName: 'اسم الصندوق',
      safeId: 'معرف الصندوق',
      exchangeRate: 'سعر الصرف',
      whatsAppGroupId: 'معرف مجموعة الواتساب',
      whatsAppGroupName: 'اسم مجموعة الواتساب',
      status: 'الحالة',
      employeeName: 'اسم الموظف',
      employeeId: 'معرف الموظف',
      settlement: 'التحاسب',
      confirmation: 'التأكيد'
    };

    // Use the display name from the change object if available, otherwise use the mapping
    return fieldMap[fieldName] || fieldName.displayName || fieldName;
  };

  // Format value for display
  const formatValue = (field: string, value: any): string => {
    return formatValueForDisplay(field, value, voucherData?.currency);
  };

  // Helper functions for safe date formatting
  const formatDisplayDate = (dateValue: any): string => {
    if (!dateValue) return '-';

    try {
      let date: Date;

      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firebase Timestamp
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return '-';
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }

      return date.toLocaleDateString('en-GB');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const formatDisplayTime = (dateValue: any): string => {
    if (!dateValue) return '-';

    try {
      let date: Date;

      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firebase Timestamp
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else {
        return '-';
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '-';
      }

      return date.toLocaleTimeString('en-GB');
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 dark:from-purple-700 dark:via-violet-700 dark:to-fuchsia-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">تفاصيل سند {voucherData?.type === 'receipt' ? 'قبض' : 'دفع'}</h3>
                <p className="text-sm text-purple-100 mt-1">رقم الفاتورة: #{voucherData?.invoiceNumber || voucherId?.substring(0, 6)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (showHistory) {
                    setShowHistory(false);
                  } else {
                    setShowHistory(true);
                    fetchVoucherHistory();
                  }
                }}
                className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all"
                title="عرض سجل التعديلات"
              >
                <History className="w-5 h-5" />
              </button>
              {showHistory && voucherHistory.length > 0 && (
                <button
                  onClick={exportHistoryToExcel}
                  disabled={isExporting}
                  className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all"
                  title="تصدير سجل التعديلات"
                >
                  {isExporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={`flex-1 flex items-center justify-center p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className={`w-10 h-10 animate-spin ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <p className={`${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>جاري تحميل بيانات السند...</p>
            </div>
          </div>
        ) : error ? (
          <div className={`flex-1 flex items-center justify-center p-6 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className={`flex items-center gap-2 p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-red-900/30 text-red-400 border-red-700/50'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} />
              <span>{error}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
            {!showHistory ? (
              <div className="space-y-8">
                {/* Main Info Card */}
                <div className={`rounded-xl shadow-sm p-6 border ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border-gray-700'
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shadow-inner ${
                          theme === 'dark'
                            ? 'bg-gradient-to-br from-purple-800/50 to-purple-700/30'
                            : 'bg-gradient-to-br from-purple-100 to-purple-50'
                        }`}>
                          <Building2 className={`w-6 h-6 ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className={`text-lg font-bold ${
                            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                          }`}>معلومات الشركة/الزبون</h4>
                          <p className={`${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>{voucherData.companyName}</p>
                        </div>
                      </div>

                      {voucherData.phone && (
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-gray-700/40 border-gray-600'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <Phone className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">رقم الهاتف</div>
                            <div className="font-medium text-gray-800" dir="ltr">{voucherData.phone}</div>
                          </div>
                        </div>
                      )}

                      {voucherData.whatsAppGroupName && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                          <MessageCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="text-sm text-green-600">مجموعة واتساب</div>
                            <div className="font-medium text-green-700">{voucherData.whatsAppGroupName}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Amount Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-50 rounded-xl shadow-inner">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">معلومات المبلغ</h4>
                          <p className="text-gray-600">
                            {voucherData.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="p-2 bg-green-100 rounded-lg">
                          {voucherData.type === 'receipt' ? (
                            <ArrowDownRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowUpLeft className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-green-600">المبلغ</div>
                          <div className="text-xl font-bold text-green-700">
                            {(voucherData.amount || 0).toLocaleString()} {voucherData.currency === 'USD' ? '$' : 'د.ع'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm text-indigo-600">سعر الصرف</div>
                          <div className="font-medium text-indigo-700">
                            {(voucherData.exchangeRate || 0).toLocaleString()} دينار/دولار
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution Info */}
                {voucherData.type === 'receipt' && (
                  <div className={`rounded-xl shadow-sm p-6 border ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border-gray-700'
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                }`}>
                    <div className="flex items-center gap-3 mb-4" style={{ display: settings.useCustomColumns === true && (settings.showGatesColumn || settings.showInternalColumn || settings.showExternalColumn || settings.showFlyColumn) ? 'flex' : 'none' }}>
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg shadow-inner">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">تقسيم المبلغ</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" style={{ display: settings.useCustomColumns === true && (settings.showGatesColumn || settings.showInternalColumn || settings.showExternalColumn || settings.showFlyColumn) ? 'grid' : 'none' }}>
                      {settings.showGatesColumn && settings.useCustomColumns === true && voucherData.gates > 0 && (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">
                            {settings.useCustomColumns ? settings.gatesColumnLabel : 'جات'}
                          </div>
                          <div className="text-lg font-bold text-gray-800">
                            {(voucherData.gates || 0).toLocaleString()} {voucherData.currency === 'USD' ? '$' : 'د.ع'}
                          </div>
                        </div>
                      )}

                      {settings.showInternalColumn && settings.useCustomColumns === true && voucherData.internal > 0 && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                          <div className="text-sm text-blue-600 mb-1">
                            {settings.useCustomColumns ? settings.internalColumnLabel : 'داخلي'}
                          </div>
                          <div className="text-lg font-bold text-blue-700">
                            {(voucherData.internal || 0).toLocaleString()} {voucherData.currency === 'USD' ? '$' : 'د.ع'}
                          </div>
                        </div>
                      )}

                      {settings.showExternalColumn && settings.useCustomColumns === true && voucherData.external > 0 && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                          <div className="text-sm text-amber-600 mb-1">
                            {settings.useCustomColumns ? settings.externalColumnLabel : 'خارجي'}
                          </div>
                          <div className="text-lg font-bold text-amber-700">
                            {(voucherData.external || 0).toLocaleString()} {voucherData.currency === 'USD' ? '$' : 'د.ع'}
                          </div>
                        </div>
                      )}

                      {settings.showFlyColumn && settings.useCustomColumns === true && voucherData.fly > 0 && (
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 shadow-sm">
                          <div className="text-sm text-purple-600 mb-1">
                            {settings.useCustomColumns ? settings.flyColumnLabel : 'فلاي'}
                          </div>
                          <div className="text-lg font-bold text-purple-700">
                            {(voucherData.fly || 0).toLocaleString()} {voucherData.currency === 'USD' ? '$' : 'د.ع'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/*  Details */}
                  <div className={`rounded-xl shadow-sm p-6 border ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border-gray-700'
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-br from-gray-200 to-gray-100 rounded-lg shadow-inner">
                        <FileText className="w-5 h-5 text-gray-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">التفاصيل</h4>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[100px] shadow-sm">
                      {voucherData.details ? (
                        <p className="text-gray-600 whitespace-pre-wrap">{voucherData.details}</p>
                      ) : (
                        <p className="text-gray-400 italic">لا توجد تفاصيل</p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className={`rounded-xl shadow-sm p-6 border ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-gray-700/40 to-gray-800/40 border-gray-700'
                    : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-br from-gray-200 to-gray-100 rounded-lg shadow-inner">
                        <Hash className="w-5 h-5 text-gray-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">معلومات إضافية</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">تاريخ الإنشاء</div>
                          <div className="font-medium text-gray-800">
                            {formatDisplayDate(voucherData.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">وقت الإنشاء</div>
                          <div className="font-medium text-gray-800">
                            {formatDisplayTime(voucherData.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">منظم السند</div>
                          <div className="font-medium text-gray-800">
                            {voucherData.employeeName}
                          </div>
                        </div>
                      </div>

                      {voucherData.safeName && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <Box className="w-5 h-5 text-gray-500" />
                          <div>
                            <div className="text-sm text-gray-500">الصندوق</div>
                            <div className="font-medium text-gray-800">
                              {voucherData.safeName || '-'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl shadow-inner">
                    <History className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">سجل التعديلات</h4>
                    <p className="text-sm text-gray-500">
                      {voucherHistory.length} تعديل
                    </p>
                  </div>
                </div>

                {voucherHistory.length > 0 && (
                  <button
                    onClick={exportHistoryToExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التصدير...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>تصدير إلى إكسل</span>
                      </>
                    )}
                  </button>
                )}

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  </div>
                ) : voucherHistory.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <p className="text-gray-500">لا توجد تعديلات</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {voucherHistory.map((history, index) => (
                      <div
                        key={history.id}
                        className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            <span className="font-medium text-gray-800">{history.updatedBy}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDistanceToNow(history.updatedAt, { addSuffix: true, locale: ar })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {history.changes.map((change, changeIndex) => (
                            <div key={changeIndex} className="text-sm">
                              <span className="text-gray-600">
                                {formatFieldName(change.field)}:{' '}
                              </span>
                              <span className="text-red-600 line-through">
                                {formatValue(change.field, change.oldValue)}
                              </span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="text-green-600">
                                {formatValue(change.field, change.newValue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
