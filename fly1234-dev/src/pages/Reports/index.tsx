import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import SmartAnalysisCard from './components/SmartAnalysisCard';
import FlightDataCard from './components/FlightDataCard';
import { ReportsList } from './components/ReportsList';
import { Megaphone, X, Download, Calendar, ChevronDown, Settings, MessageSquare } from 'lucide-react';
import useBookingReports from './hooks/useBookingReports';
import { BookingReport, BookingFilters } from './types';
import { checkMatch, normalizeDateForCompare } from '../../lib/services/flightLogic';
import * as XLSX from 'xlsx';
import { useNotification } from '../../contexts/NotificationContext';
import ApiSettingsModal from './components/ApiSettingsModal';
import { MessageTemplatesModal } from './components/MessageTemplatesModal';

const ReportsPage: React.FC = () => {
  const { theme } = useTheme();
  const [extractedData, setExtractedData] = useState<any>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [inputText, setInputText] = useState('');

  const { allReports, isLoading, error, fetchReports } = useBookingReports();
  const [displayReports, setDisplayReports] = useState<BookingReport[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [tableDate, setTableDate] = useState<string | undefined>(undefined);
  const [isApiSettingsModalOpen, setIsApiSettingsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const { showNotification } = useNotification();

  const uniqueSuppliers = useMemo(() => {
    if (!allReports) return [];
    const suppliers = allReports.map(r => r.supplier).filter((s): s is string => !!s);
    return [...new Set(suppliers)];
  }, [allReports]);

  const uniqueDates = useMemo(() => {
    if (!allReports) return [];
    const dates = allReports
      .map(r => r.date)
      .filter((d): d is string => !!d)
      .map(d => normalizeDateForCompare(d));
    return [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [allReports]);

  useEffect(() => {
    let reports = allReports;

    if (supplierFilter) {
      reports = reports.filter(report => report.supplier === supplierFilter);
    }

    if (tableDate) {
      const normalizedTableDate = normalizeDateForCompare(tableDate);
      reports = reports.filter(report =>
        report.date && normalizeDateForCompare(report.date) === normalizedTableDate
      );
    }

    const reportsWithStatus = reports.map(report => ({
      ...report,
      match_status: checkMatch(report, extractedData)
    }));
    setDisplayReports(reportsWithStatus);
  }, [allReports, extractedData, supplierFilter, tableDate]);

  const handleDataExtracted = (data: any, translation: string) => {
    let formattedDate = '';
    if (data && data.date) {
      try {
        const dateObj = new Date(data.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error("Invalid date from extraction", data.date);
      }
    }

    const initialFlightData = {
      airline: data?.airline || '',
      flightNumber: data?.flightNumber || '',
      from: data?.origin || '',
      to: data?.destination || '',
      date: formattedDate,
      oldTime: data?.oldTime || '',
      newTime: data?.newTime || '',
      notificationType: data?.type || 'delay',
      newFlightNumber: data?.newFlightNumber || '',
      newAirline: data?.newAirline || '',
      signature: 'fly4all team',
    };

    setExtractedData(initialFlightData);
    setTranslatedText(translation);

    if (data) {
      handleSearch({
        airline: data.airline,
        flightNumber: data.flightNumber,
        date: formattedDate,
      });
    }
  };

  const handleFlightDataChange = (newData: any) => {
    setExtractedData(newData);
  };

  const handleSearch = (filters: BookingFilters) => {
    fetchReports(filters);
  };

  const handleClearFilters = () => {
    setInputText('');
    setExtractedData(null);
    setTranslatedText('');
    setTableDate(undefined);
    setSupplierFilter('');
    fetchReports(undefined); // Clear reports
  };

  const handleExportExcel = () => {
    if (displayReports.length === 0) {
      showNotification('info', 'تنبيه', 'لا توجد بيانات لتصديرها');
      return;
    }

    const dataToExport = displayReports.map(report => ({
      'PNR': report.pnr,
      'العميل': report.buyer,
      'شركة الطيران': report.flight_airline,
      'رقم الرحلة': report.flight_number,
      'التاريخ': report.date,
      'من': report.origin,
      'إلى': report.destination,
      'المبلغ': report.amount,
      'العملة': report.currency,
      'حالة الحجز': report.booking_status,
      'المورد': report.supplier,
      'رقم الهاتف': report.phone,
      'البريد الإلكتروني': report.email,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقارير الرحلات');
    XLSX.writeFile(workbook, 'FlightReports.xlsx');
  };

  const hasActiveFilters = !!(inputText || extractedData || tableDate || supplierFilter);

  return (
    <main className="flex-1 overflow-y-auto h-full bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-4 text-right">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-lg animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                مركز التبليغات
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold">متابعة وتحليل تقارير الحجوزات والرحلات الذكية</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-black shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>القوالب</span>
            </button>
            <button
              onClick={() => setIsApiSettingsModalOpen(true)}
              className="flex items-center justify-center gap-2 h-11 px-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-black shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4 text-purple-500" />
              <span>الإعدادات</span>
            </button>
          </div>
        </div>

        {/* Control Bar - Glass Effect */}
        <div className={`sticky top-4 z-30 p-4 rounded-3xl border backdrop-blur-xl shadow-lg transition-all ${theme === 'dark' ? 'bg-gray-800/80 border-gray-700/50 shadow-black/20' : 'bg-white/80 border-gray-200/50 shadow-gray-200/10'
          }`}>
          <div className="flex flex-col lg:flex-row items-center gap-4">

            <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl font-black shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel</span>
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center justify-center h-11 px-5 bg-rose-500/10 text-rose-500 rounded-xl font-black hover:bg-rose-500/20 transition-all border border-rose-500/20 w-full sm:w-auto"
                  title="مسح التصفية"
                >
                  <X className="w-5 h-5" />
                  <span className="sm:hidden mr-2">مسح الفلاتر</span>
                </button>
              )}
            </div>

            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden lg:block mx-2"></div>

            {/* Date Filter */}
            <div className="relative w-full lg:w-64">
              <select
                value={tableDate || ''}
                onChange={(e) => setTableDate(e.target.value || undefined)}
                className={`w-full px-4 py-3 pr-10 rounded-xl font-bold border outline-none appearance-none transition-all cursor-pointer ${theme === 'dark'
                  ? 'bg-gray-700/50 border-gray-600 text-white focus:border-indigo-500'
                  : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-indigo-500 focus:bg-white'
                  }`}
              >
                <option value="">جميع التواريخ</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Supplier Filters (Horizontal Scroll) */}
            <div className="flex-1 w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-hide flex items-center gap-2">
              <button
                onClick={() => setSupplierFilter('')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${supplierFilter === ''
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : (theme === 'dark' ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                  }`}
              >
                الكل
              </button>
              {uniqueSuppliers.map(supplier => (
                <button
                  key={supplier}
                  onClick={() => setSupplierFilter(supplier)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${supplierFilter === supplier
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : (theme === 'dark' ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                    }`}
                >
                  {supplier}
                </button>
              ))}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Smart Analysis */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <SmartAnalysisCard
              onDataExtracted={handleDataExtracted}
              translatedText={translatedText}
              inputText={inputText}
              onInputChange={setInputText}
            />
            <FlightDataCard
              extractedData={extractedData}
              onDataChange={handleFlightDataChange}
              onSearch={handleSearch}
              isSearching={isLoading}
            />
          </div>

          {/* Main Content: Reports Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            <ReportsList
              reports={displayReports}
              isLoading={isLoading}
              error={error}
              onRefresh={() => fetchReports(extractedData ? {
                airline: extractedData.airline,
                flightNumber: extractedData.flightNumber,
                date: extractedData.date,
                origin: extractedData.from,
                destination: extractedData.to
              } : undefined)}
              extractedData={extractedData}
            />
          </div>
        </div>

        <ApiSettingsModal
          isOpen={isApiSettingsModalOpen}
          onClose={() => setIsApiSettingsModalOpen(false)}
          onSave={() => {
            if (extractedData) {
              handleSearch({
                airline: extractedData.airline,
                flightNumber: extractedData.flightNumber,
                date: extractedData.date,
              });
            }
          }}
        />
        <MessageTemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
        />
      </div>
    </main>
  );
};

export default ReportsPage;
