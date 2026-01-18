import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { 
  Building2, DollarSign, Calendar, CheckCircle2, 
  Loader2, AlertTriangle, Trash2, Pencil, Eye, 
  CreditCard, Clock, X, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Subscription } from '../types';

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  onAddPayment: (subscription: Subscription) => void;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

const SubscriptionsTable: React.FC<SubscriptionsTableProps> = ({
  subscriptions,
  isLoading,
  error,
  onAddPayment,
  hasEditPermission,
  hasDeletePermission
}) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Calculate pagination
  const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = subscriptions.slice(indexOfFirstItem, indexOfLastItem);
  
  // Get status text based on dates
  const getSubscriptionStatusText = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    if (startDate > now) {
      return 'قريب البدء';
    } else if (endDate < now) {
      return 'منتهي';
    } else if (endDate <= twoWeeksFromNow) {
      return 'قريب الانتهاء';
    } else {
      return 'نشط';
    }
  };
  
  // Get status color based on status text
  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'نشط':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'منتهي':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'قريب الانتهاء':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'قريب البدء':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-gray-600">جاري تحميل الاشتراكات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-200 m-4">
        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200 m-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-50 rounded-full shadow-md">
            <Repeat className="w-12 h-12 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد اشتراكات</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          لم يتم العثور على أي اشتراكات. قم بإضافة اشتراك جديد للبدء.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span>الشركة</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>نوع الخدمة</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span>المبلغ</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>تاريخ البداية</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>تاريخ الانتهاء</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-gray-500" />
                  <span>الحالة</span>
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2 justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>الإجراءات</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.map((subscription) => {
              const statusText = getSubscriptionStatusText(subscription.startDate, subscription.endDate);
              const statusColor = getSubscriptionStatusColor(statusText);
              
              return (
                <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <div className="p-2 bg-gray-100 rounded-lg mr-2">
                        <Building2 className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="font-medium">{subscription.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                        {subscription.serviceType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 font-bold">
                        {subscription.amount.toLocaleString()} {subscription.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{formatDate(subscription.startDate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span>{formatDate(subscription.endDate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <span className={`px-3 py-1 rounded-lg border ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onAddPayment(subscription)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="إضافة دفعة"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {hasEditPermission && (
                        <button
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {hasDeletePermission && (
                        <button
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-50"
            >
              السابق
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-50"
            >
              التالي
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                عرض <span className="font-medium">{indexOfFirstItem + 1}</span> إلى <span className="font-medium">{Math.min(indexOfLastItem, subscriptions.length)}</span> من أصل <span className="font-medium">{subscriptions.length}</span> اشتراك
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">السابق</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border ${
                      currentPage === index + 1
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-600 z-10'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } text-sm font-medium`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-gray-50 text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">التالي</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsTable;