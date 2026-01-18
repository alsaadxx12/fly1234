import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ArrowRight, Plane, Calendar, Clock, Edit, Save, X, Repeat, User, Settings, Key, Link2, Loader2, Search, Eye, EyeOff, Brain, Filter, Layers, Check, Copy, MessageCircle, CheckCircle, AlertTriangle, List, RefreshCw } from 'lucide-react';
import { BookingReport, MatchResult, BookingFilters } from '../types';
import { useNotification } from '../../../contexts/NotificationContext';
import { ExtractedData } from '../../../lib/services/smartTicketExtractor';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ReportsListProps {
  reports: BookingReport[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  extractedData: ExtractedData | null;
}

export const ReportsList: React.FC<ReportsListProps> = ({ reports, isLoading, error, onRefresh, extractedData }) => {
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const docRef = doc(db, 'message_templates', 'reports');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTemplates(docSnap.data().templates || {});
        } else {
          setTemplates({});
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        setTemplates({});
      }
    };
    loadTemplates();
  }, []);

  const generateMessage = useCallback((report: BookingReport, extractedNotificationData: ExtractedData | null): string => {
    if (!extractedNotificationData || !templates || Object.keys(templates).length === 0) return '';

    const {
        airline,
        flightNumber,
        from,
        to,
        date,
        oldTime,
        newTime,
        notificationType,
        newFlightNumber,
        newAirline,
        signature
    } = extractedNotificationData;
    
    let finalNotificationType = notificationType;

    if (!finalNotificationType || finalNotificationType === '') {
        if (newFlightNumber && newTime) {
            finalNotificationType = 'number_time_delay'; 
        } else if (newFlightNumber) {
            finalNotificationType = 'number_change';
        } else if (newTime && oldTime) {
            finalNotificationType = newTime > oldTime ? 'delay' : 'advance';
        } else if (newTime) {
            finalNotificationType = 'delay';
        }
    }
    
    if(!finalNotificationType) return '';

    const template = templates[finalNotificationType];

    if (!template) {
        return `لا يوجد قالب رسالة لنوع التبليغ: ${finalNotificationType}`;
    }
    
    const placeholders = {
        passengerName: (report as any).passengers?.[0]?.name || report.buyer || 'العميل',
        pnr: report.pnr,
        route: `${report.origin || from} -> ${report.destination || to}`,
        reportDate: report.date ? new Date(report.date).toLocaleDateString('en-CA') : date,
        reportAirline: report.flight_airline || airline,
        reportFlightNumber: report.flight_number || flightNumber,
        oldTime: oldTime || '**',
        newTime: newTime || '',
        newFlightNumber: newFlightNumber || '',
        newAirline: newAirline || '',
        signature: signature || 'fly4all team'
    };

    let message = template;
    for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, value || '');
    }

    return message;
  }, [templates]);

  useEffect(() => {
    if (extractedData && reports.length > 0 && templates && Object.keys(templates).length > 0) {
        const newMessages: Record<string, string> = {};
        reports.forEach(report => {
            const message = generateMessage(report, extractedData);
            if (message) {
                newMessages[report.id] = message;
            }
        });
        setGeneratedMessages(newMessages);
    } else {
        setGeneratedMessages({});
    }
  }, [reports, extractedData, templates, generateMessage]);

  const handleCopy = (message: string) => {
    if (message) {
      navigator.clipboard.writeText(message)
        .then(() => {
          showNotification('success', 'تم نسخ نص التبليغ بنجاح!');
        })
        .catch(() => showNotification('error', 'فشل نسخ النص.'));
    }
  };

  const getStatusChip = (status: string) => {
    let colorClasses = '';
    const upperStatus = status?.toUpperCase() || 'UNKNOWN';
    switch (upperStatus) {
      case 'ISSUED':
      case 'PAID':
      case 'CONFIRMED':
      case 'VALIDATED':
        colorClasses = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        break;
      case 'PENDING':
        colorClasses = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        break;
      case 'CANCELLED':
      case 'UNPAID':
      case 'FAILED':
      case 'REFUNDED':
        colorClasses = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        break;
      default:
        colorClasses = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorClasses}`}>{status || 'N/A'}</span>;
  };
  
  const renderChangeSummary = () => {
    if (!extractedData) return null;
  
    const {
      newTime,
      oldTime,
      newFlightNumber,
      flightNumber,
      newAirline,
      airline,
    } = extractedData;
  
    const changes = [];
    const normalize = (s: string) => s ? s.toLowerCase().replace(/\s+/g, '') : '';
  
    if (newTime && oldTime && newTime !== oldTime) {
      changes.push(`الوقت تغير من ${oldTime} إلى ${newTime}`);
    } else if (newTime && !oldTime) {
      changes.push(`الوقت الجديد هو ${newTime}`);
    }
  
    if (newFlightNumber && flightNumber && newFlightNumber !== flightNumber) {
      changes.push(`رقم الرحلة تغير من ${flightNumber} إلى ${newFlightNumber}`);
    }
  
    if (newAirline && airline && normalize(newAirline) !== normalize(airline)) {
      changes.push(`شركة الطيران تغيرت من ${airline} إلى ${newAirline}`);
    }
  
    if (changes.length === 0) return null;
  
    return (
      <div className={`mb-6 p-4 rounded-lg border ${
        theme === 'dark' 
          ? 'bg-yellow-900/20 border-yellow-800/50 text-yellow-300'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4" />
          ملخص التغييرات المستخرجة
        </h4>
        <ul className="space-y-1 list-disc list-inside text-xs">
          {changes.map((change, index) => (
            <li key={index}>{change}</li>
          ))}
        </ul>
      </div>
    );
  };

  const getMatchStatusChip = (status: MatchResult) => {
    switch (status) {
      case 'EXACT':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700">
            <CheckCircle className="w-4 h-4"/>
            <span>مطابق</span>
          </div>
        );
      case 'DATE_MISMATCH':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700">
            <Calendar className="w-4 h-4"/>
            <span>تاريخ مختلف</span>
          </div>
        );
      case 'FLIGHT_NO_MISMATCH':
         return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
            <Plane className="w-4 h-4"/>
            <span>رحلة مختلفة</span>
          </div>
        );
      default:
        return null;
    }
  };

  const CardSkeleton = () => (
    <div className={`rounded-xl p-4 border animate-pulse ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className={`h-6 w-24 rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-6 w-20 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className={`h-4 w-3/4 rounded-md mb-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`h-12 w-full rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-12 w-full rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-12 w-full rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-12 w-full rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  );

  return (
    <div className={`rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-500" />
          نتائج البحث
        </h3>
        <button onClick={onRefresh} className={`p-2 rounded-lg transition-colors ${theme==='dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
          <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {renderChangeSummary()}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>لا توجد بيانات لعرضها. يرجى البحث عن رحلة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const message = generatedMessages[report.id];
              return (
              <div key={report.id} className={`rounded-xl border-2 transition-all flex flex-col ${
                report.match_status === 'EXACT' ? 'border-green-500 shadow-green-500/20' : (theme === 'dark' ? 'border-gray-700' : 'border-gray-200')
              } ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'}`}>
                <div className="p-4 flex justify-between items-start border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">{report.pnr}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{report.bookingId}</p>
                  </div>
                  {getMatchStatusChip(report.match_status)}
                </div>

                <div className="p-4 space-y-4 text-sm flex-1 overflow-y-auto">
                  {/* Flight Details */}
                  <div className="font-bold text-gray-800 dark:text-gray-200 mb-2">تفاصيل الرحلة</div>
                  <div className="space-y-2">
                    {report.serviceDetails?.legsInfo?.map((leg: any, index: number) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        index === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700/30'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Plane className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{leg.airline}</span>
                            </div>
                            <span className={`px-3 py-1 text-sm font-mono font-bold rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>
                                {leg.airlineAndflightNumber}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <p className="font-black text-lg">{leg.departureAirportAbb}</p>
                            <p className="text-xs text-gray-500">{leg.time}</p>
                          </div>
                          <div className="flex-1 px-2">
                             <div className="w-full h-px bg-gray-300 dark:bg-gray-600 relative flex items-center justify-center">
                                <Plane className="w-4 h-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 p-0.5 rounded-full" />
                             </div>
                          </div>
                          <div className="text-center">
                            <p className="font-black text-lg">{leg.arrivalAirportAbb}</p>
                             <p className="text-xs text-gray-500">{leg.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer and Supplier */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <p className="text-xs text-gray-500">المورد</p>
                        <p className="font-bold text-sm">{report.supplier}</p>
                    </div>
                     <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <p className="text-xs text-gray-500">العميل</p>
                        <p className="font-bold text-sm">{report.userSearchTitle} ({report.userCountry})</p>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                          <p className="text-xs text-gray-500">سعر البيع</p>
                          <p className="font-bold text-green-600 dark:text-green-400">{parseFloat(report.amount || '0').toLocaleString()} {report.currency}</p>
                      </div>
                       <div className="text-center">
                          <p className="text-xs text-gray-500">سعر المورد</p>
                          <p className="font-bold">{report["supplier pricing"]?.toLocaleString()} {report["supplier currency"]}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-xs text-gray-500">الربح</p>
                          <p className="font-bold">{((report.amount ? parseFloat(report.amount) : 0) - (report["supplier pricing"] || 0)).toFixed(2)} {report.currency}</p>
                      </div>
                  </div>
                  
                  {/* Statuses */}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">الحالة:</span>
                    <div className="flex items-center gap-2">
                      {getStatusChip(report.booking_status)}
                      {getStatusChip(report.invoice_status)}
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      النص التلقائي للتبليغ
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={message}
                        className="w-full h-32 p-2 text-xs border rounded-md bg-gray-100 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-600 font-mono resize-none"
                        dir="rtl"
                      />
                      <button
                        onClick={() => handleCopy(message)}
                        className="absolute top-2 left-2 p-1.5 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                        title="نسخ النص"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};
