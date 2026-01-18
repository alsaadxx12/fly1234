import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { 
  History, X, Search, ChevronLeft, ChevronRight, 
  Users, Phone, Calendar, Image as ImageIcon,
  Loader2, AlertCircle, Eye, Download, Trash2,
  RotateCcw
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import * as XLSX from 'xlsx';

interface DeletedVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeletedVoucher {
  id: string;
  originalId: string;
  companyName: string;
  employeeName: string;
  invoiceNumber: string;
  type: 'receipt' | 'payment';
  amount: number;
  currency: string;
  deletedAt: Date;
  deletedBy: string;
  imageUrl?: string;
}

const DeletedVouchersModal: React.FC<DeletedVouchersModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receipt' | 'payment'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [selectedVoucher, setSelectedVoucher] = useState<DeletedVoucher | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [deletedVouchers, setDeletedVouchers] = useState<DeletedVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeletedVouchers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const deletedVouchersRef = collection(db, 'deleted_vouchers');
        const q = query(deletedVouchersRef, orderBy('deletedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const vouchers: DeletedVoucher[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          deletedAt: doc.data().deletedAt?.toDate() || new Date(),
        })) as DeletedVoucher[];
        
        setDeletedVouchers(vouchers);
      } catch (err) {
        console.error('Error fetching deleted vouchers:', err);
        setError('Failed to load deleted vouchers');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchDeletedVouchers();
    }
  }, [isOpen]);

  // Filter vouchers
  const filteredVouchers = React.useMemo(() => {
    let result = [...deletedVouchers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(voucher => 
        (voucher.companyName?.toLowerCase().includes(query) || false) ||
        (voucher.employeeName?.toLowerCase().includes(query) || false) ||
        (voucher.invoiceNumber?.toString().includes(query) || false)
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(voucher => voucher.type === filterType);
    }
    
    return result;
  }, [deletedVouchers, searchQuery, filterType]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const paginatedVouchers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVouchers, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  // Export to CSV
  const handleExport = () => {
    // Transform vouchers data for Excel
    const excelData = filteredVouchers.map(voucher => ({
      'رقم الفاتورة': voucher.invoiceNumber || '',
      'نوع السند': voucher.type === 'receipt' ? 'سند قبض' : 'سند دفع',
      'الشركة': voucher.companyName || '',
      'المبلغ': voucher.amount || 0,
      'العملة': voucher.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي',
      'تاريخ الحذف': voucher.deletedAt?.toLocaleDateString('en-GB') || '',
      'تم الحذف بواسطة': voucher.deletedBy || '',
      'المنظم': voucher.employeeName || ''
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const columnWidths = [
      { wch: 10 }, // رقم الفاتورة
      { wch: 10 }, // نوع السند
      { wch: 25 }, // الشركة
      { wch: 12 }, // المبلغ
      { wch: 12 }, // العملة
      { wch: 15 }, // تاريخ الحذف
      { wch: 15 }, // تم الحذف بواسطة
      { wch: 15 }  // المنظم
    ];
    
    worksheet['!cols'] = columnWidths;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DeletedVouchers');
    
    // Generate Excel file
    XLSX.writeFile(workbook, `deleted_vouchers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Restore deleted voucher
  const handleRestoreVoucher = async (voucher: DeletedVoucher) => {
    if (!voucher || !voucher.originalId) {
      setRestoreError('لا يمكن استرجاع هذا السند. معلومات السند غير مكتملة.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      // Get the full voucher data
      const voucherRef = doc(db, 'deleted_vouchers', voucher.id);
      const voucherDoc = await getDoc(voucherRef);
      
      if (!voucherDoc.exists()) {
        throw new Error('لم يتم العثور على بيانات السند المحذوف');
      }
      
      const voucherData = voucherDoc.data();
      
      // Remove fields that shouldn't be in the restored voucher
      const { deletedAt, deletedBy, originalId, id, ...restoreData } = voucherData;
      
      // Add the voucher back to the vouchers collection
      const vouchersRef = collection(db, 'vouchers');
      await addDoc(vouchersRef, {
        ...restoreData,
        restoredAt: serverTimestamp(),
        restoredFrom: voucher.id,
        isRestored: true
      });
      
      setRestoreSuccess(`تم استرجاع السند ${voucher.companyName} بنجاح`);
      
      // Remove the restored voucher from the list
      setDeletedVouchers(prev => prev.filter(v => v.id !== voucher.id));
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setRestoreSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error restoring voucher:', error);
      setRestoreError('فشل في استرجاع السند. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <History className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">سجل السندات المحذوفة</h3>
              <p className="text-xs text-gray-500">
                {filteredVouchers.length} سند محذوف
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="البحث عن سند..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'receipt' | 'payment')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">جميع السندات</option>
              <option value="receipt">سندات القبض</option>
              <option value="payment">سندات الدفع</option>
            </select>
          </div>
        </div>
          
        {/* Success/Error Messages */}
        {restoreSuccess && (
          <div className="m-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 border border-green-100 animate-fadeIn">
            <div className="p-1 bg-green-100 rounded-full">
              <RotateCcw className="w-4 h-4 text-green-600" />
            </div>
            <span>{restoreSuccess}</span>
          </div>
        )}
        
        {restoreError && (
          <div className="m-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{restoreError}</span>
          </div>
        )}
        
        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-gray-500">{error}</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">لا توجد سندات محذوفة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedVouchers.map((voucher) => (
                <div key={voucher.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{voucher.companyName || 'غير معروف'}</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{voucher.deletedAt?.toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{voucher.deletedBy || 'غير معروف'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreVoucher(voucher)}
                      disabled={isRestoring}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors text-xs disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>استرجاع</span>
                    </button>
                    {voucher.imageUrl && (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden" title="يحتوي على صورة">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredVouchers.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <span className="text-sm text-gray-500">
              الصفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeletedVouchersModal;