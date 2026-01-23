import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import useAccountSettings from '../hooks/useAccountSettings';

interface ExportToExcelButtonProps {
  vouchers: any[];
  fileName?: string;
  buttonText?: string;
  className?: string;
  voucherType?: 'payment' | 'receipt';
  children?: React.ReactNode;
  onPrepareExport?: () => Promise<void>;
}

const ExportToExcelButton: React.FC<ExportToExcelButtonProps> = ({
  vouchers,
  fileName = 'vouchers',
  buttonText = 'تصدير إلى إكسل',
  className = '',
  voucherType = 'receipt',
  children,
  onPrepareExport
}) => {
  const { t } = useLanguage();
  const { settings } = useAccountSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFilter, setExportFilter] = useState<'all' | 'unconfirmed' | 'unsettled' | 'confirmed-unsettled'>('all');

  const exportToExcel = async () => {
    setIsExporting(true);

    if (onPrepareExport) {
        await onPrepareExport();
    }
    
    // We need a short delay to allow the state with all vouchers to update in the parent component
    setTimeout(() => {
        try {
            if (!vouchers || vouchers.length === 0) {
              setIsExporting(false);
              return;
            }

            // ... rest of the export logic ...
            const baseColumnWidths = [
                { wch: 25 },  // اسم الشركة
                { wch: 12 },  // المبلغ المستلم
                { wch: 12 },  // دولار
                { wch: 12 },  // دينار
            ];

            const columnWidths = voucherType === 'receipt'
                ? [
                    ...baseColumnWidths,
                    { wch: 15 },  // داخلي
                    { wch: 15 },  // خارجي
                    { wch: 15 },  // فلاي (دولار)
                    { wch: 15 },  // فلاي (دينار)
                    { wch: 30 },  // التفاصيل
                    { wch: 12 }   // التاريخ
                ]
                : [
                    ...baseColumnWidths,
                    { wch: 30 },  // التفاصيل
                    { wch: 12 }   // التاريخ
                ];

            let filteredVouchers = [...vouchers];

            if (exportFilter === 'unconfirmed') {
                filteredVouchers = filteredVouchers.filter(voucher => voucher.confirmation !== true);
            } else if (exportFilter === 'unsettled') {
                filteredVouchers = filteredVouchers.filter(voucher => voucher.settlement !== true);
            } else if (exportFilter === 'confirmed-unsettled') {
                filteredVouchers = filteredVouchers.filter(voucher => voucher.confirmation === true && voucher.settlement !== true);
            }
            
            const excelData = filteredVouchers.map(voucher => {
                const usdAmount = voucher.currency === 'USD' ? voucher.amount : null;
                const iqdAmount = voucher.currency === 'IQD' ? voucher.amount : null;
                const flyUsd = voucher.currency === 'USD' ? voucher.fly || null : null;
                const flyIqd = voucher.currency === 'IQD' ? voucher.fly || null : null;
                
                const createdAt = voucher.createdAt?.toDate ? voucher.createdAt.toDate() : new Date(voucher.createdAt);

                const baseFields = {
                    'اسم الشركة': voucher.companyName || null,
                    'المبلغ المستلم': voucher.amount || null,
                    'دولار': usdAmount,
                    'دينار': iqdAmount,
                };

                if (voucherType === 'receipt') {
                    return {
                        ...baseFields,
                        [settings.internalColumnLabel || 'داخلي']: voucher.internal || null,
                        [settings.externalColumnLabel || 'خارجي']: voucher.external || null,
                        [`${settings.flyColumnLabel || 'فلاي'} (دولار)`]: flyUsd,
                        [`${settings.flyColumnLabel || 'فلاي'} (دينار)`]: flyIqd,
                        'التفاصيل': voucher.details || null,
                        'التاريخ': createdAt.toLocaleDateString('en-GB')
                    };
                } else {
                    return {
                        ...baseFields,
                        'التفاصيل': voucher.details || null,
                        'التاريخ': createdAt.toLocaleDateString('en-GB')
                    };
                }
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!dir'] = 'rtl';
            let range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');
            const defaultStyle = { alignment: { horizontal: 'center', vertical: 'center' }, font: { bold: true } };
            worksheet['!cols'] = columnWidths.map(col => ({ ...col, style: defaultStyle }));

            for (let C = 0; C <= range.e.c; C++) {
                const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!worksheet[headerCell]) continue;
                worksheet[headerCell].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4F46E5" } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }

            for (let R = 1; R <= range.e.r; R++) {
                for (let C = 0; C <= range.e.c; C++) {
                    const cell = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!worksheet[cell]) continue;
                    worksheet[cell].s = {
                        font: { bold: true },
                        alignment: { horizontal: 'center', vertical: 'center' }
                    };
                }
            }

            worksheet['!cols'] = columnWidths;
            range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1');

            for (let R = 1; R <= range.e.r; R++) {
                const iqdAmountCell = worksheet[XLSX.utils.encode_cell({r: R, c: 3})];
                const usdAmountCell = worksheet[XLSX.utils.encode_cell({r: R, c: 2})];
                const isIqdVoucher = !usdAmountCell || usdAmountCell.v === null || usdAmountCell.v === '' || usdAmountCell.v === undefined;

                if (iqdAmountCell && iqdAmountCell.v !== undefined && iqdAmountCell.v !== '' && iqdAmountCell.v !== null && isIqdVoucher) {
                    const cellRef = XLSX.utils.encode_cell({r: R, c: 3});
                    worksheet[cellRef] = { 
                        t: 'n', 
                        f: `${iqdAmountCell.v}/1000`,
                        v: iqdAmountCell.v / 1000,
                        s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } }
                    };
                }

                if (voucherType === 'receipt') {
                    const internalCell = worksheet[XLSX.utils.encode_cell({r: R, c: 4})];
                    if (internalCell && internalCell.v !== undefined && internalCell.v !== '' && internalCell.v !== null && isIqdVoucher) {
                        const cellRef = XLSX.utils.encode_cell({r: R, c: 4});
                        worksheet[cellRef] = { 
                            t: 'n', 
                            f: `${internalCell.v}/1000`,
                            v: internalCell.v / 1000,
                            s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } }
                        };
                    }
                    const externalCell = worksheet[XLSX.utils.encode_cell({r: R, c: 5})];
                    if (externalCell && externalCell.v !== undefined && externalCell.v !== '' && externalCell.v !== null && isIqdVoucher) {
                        const cellRef = XLSX.utils.encode_cell({r: R, c: 5});
                        worksheet[cellRef] = { 
                            t: 'n', 
                            f: `${externalCell.v}/1000`,
                            v: externalCell.v / 1000,
                            s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } }
                        };
                    }
                    const flyIqdCell = worksheet[XLSX.utils.encode_cell({r: R, c: 7})];
                    if (flyIqdCell && flyIqdCell.v !== undefined && flyIqdCell.v !== '' && flyIqdCell.v !== null && isIqdVoucher) {
                        const cellRef = XLSX.utils.encode_cell({r: R, c: 7});
                        worksheet[cellRef] = { 
                            t: 'n', 
                            f: `${flyIqdCell.v}/1000`,
                            v: flyIqdCell.v / 1000,
                            s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } }
                        };
                    }
                }
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, exportFilter === 'all' ? 'All Vouchers' : 
                                                        exportFilter === 'unconfirmed' ? 'Unconfirmed Vouchers' :
                                                        exportFilter === 'unsettled' ? 'Unsettled Vouchers' :
                                                        'Confirmed Unsettled Vouchers');

            XLSX.writeFile(workbook, `${fileName}_${exportFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);

            setShowExportOptions(false);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('حدث خطأ أثناء تصدير البيانات');
        } finally {
            setIsExporting(false);
        }
    }, 100); // 100ms delay
  };

  const handlePrepareAndExport = async () => {
    setIsExporting(true);
    if(onPrepareExport) {
        await onPrepareExport();
    }
    setShowExportOptions(true);
    setIsExporting(false);
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showExportOptions) {
        setShowExportOptions(false);
      }
    };

    if (showExportOptions) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showExportOptions]);

  return (
    <div className="relative">
      <button
        onClick={handlePrepareAndExport}
        disabled={isExporting}
        className={`flex items-center justify-center h-[52px] w-[52px] bg-green-100 dark:bg-green-700 text-green-600 dark:text-green-300 rounded-xl hover:bg-green-200 dark:hover:bg-green-600 transition-colors disabled:opacity-50 ${className}`}
      >
        {isExporting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          children
        )}
      </button>

      {/* Export Options Modal */}
      {showExportOptions && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] backdrop-blur-sm"
            onClick={() => setShowExportOptions(false)}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {/* Modal Content */}
            <div 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                zIndex: 100000,
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">خيارات التصدير</h3>
                <button 
                  onClick={() => setShowExportOptions(false)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>اختر نوع السندات التي تريد تصديرها</span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="exportFilter"
                      checked={exportFilter === 'all'}
                      onChange={() => setExportFilter('all')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white">جميع السندات</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">تصدير كافة السندات بغض النظر عن حالتها</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {vouchers.length} سند
                    </div>
                  </label> 

                  <label className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="exportFilter"
                      checked={exportFilter === 'unconfirmed'}
                      onChange={() => setExportFilter('unconfirmed')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white">السندات غير المؤكدة</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">تصدير السندات التي لم يتم تأكيدها فقط</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {vouchers.filter(v => v.confirmation !== true).length} سند
                    </div>
                    <div className="mr-auto p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                      <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="exportFilter"
                      checked={exportFilter === 'unsettled'}
                      onChange={() => setExportFilter('unsettled')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white">السندات غير المتحاسب عليها</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">تصدير السندات التي لم يتم التحاسب عليها فقط</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {vouchers.filter(v => v.settlement !== true).length} سند
                    </div>
                    <div className="mr-auto p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
                      <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="exportFilter"
                      checked={exportFilter === 'confirmed-unsettled'}
                      onChange={() => setExportFilter('confirmed-unsettled')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white">المؤكدة غير المتحاسب عليها</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">تصدير السندات المؤكدة التي لم يتم التحاسب عليها</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {vouchers.filter(v => v.confirmation === true && v.settlement !== true).length} سند
                    </div>
                    <div className="mr-auto p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button 
                  onClick={() => setShowExportOptions(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التصدير...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>تصدير</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default ExportToExcelButton;
