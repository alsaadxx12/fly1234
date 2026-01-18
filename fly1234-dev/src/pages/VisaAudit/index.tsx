import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, Calendar, User, FileText, DollarSign, Download } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import CustomDatePicker from '../../components/CustomDatePicker';
import ModernButton from '../../components/ModernButton';

interface Visa {
  id: string;
  name: string;
  passportNumber: string;
  nationality: string;
  visaType: string;
  salePrice: number;
  purchasePrice: number;
  source: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  auditStatus?: 'pending' | 'approved' | 'rejected';
  auditedBy?: string;
  auditedByName?: string;
  auditedAt?: Date;
  auditNotes?: string;
}

export default function VisaAudit() {
  const { theme } = useTheme();
  const { employee } = useAuth();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'visas'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visasData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          auditedAt: data.auditedAt?.toDate(),
          auditStatus: data.auditStatus || 'pending'
        } as Visa;
      });
      setVisas(visasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAudit = async (visaId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await updateDoc(doc(db, 'visas', visaId), {
        auditStatus: status,
        auditedBy: employee?.id,
        auditedByName: employee?.name,
        auditedAt: new Date(),
        auditNotes: notes || ''
      });
    } catch (error) {
      console.error('Error auditing visa:', error);
    }
  };

  const filteredVisas = useMemo(() => {
    return visas.filter(visa => {
      const matchesSearch =
        visa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visa.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visa.nationality?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || visa.auditStatus === statusFilter;

      const matchesSource = sourceFilter === 'all' || visa.source === sourceFilter;

      const matchesDate = (!dateFrom || visa.createdAt >= dateFrom) &&
                         (!dateTo || visa.createdAt <= dateTo);

      return matchesSearch && matchesStatus && matchesSource && matchesDate;
    });
  }, [visas, searchTerm, statusFilter, sourceFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const pending = visas.filter(v => v.auditStatus === 'pending').length;
    const approved = visas.filter(v => v.auditStatus === 'approved').length;
    const rejected = visas.filter(v => v.auditStatus === 'rejected').length;

    return { pending, approved, rejected, total: visas.length };
  }, [visas]);

  const sources = useMemo(() => {
    const uniqueSources = new Set(visas.map(v => v.source).filter(Boolean));
    return Array.from(uniqueSources);
  }, [visas]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return theme === 'dark' ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50';
      case 'rejected':
        return theme === 'dark' ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50';
      default:
        return theme === 'dark' ? 'text-yellow-400 bg-yellow-900/20' : 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'مدقق';
      case 'rejected':
        return 'مرفوض';
      default:
        return 'قيد الانتظار';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-black ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            تدقيق الفيزا
          </h1>
          <p className={`mt-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            مراجعة والموافقة على طلبات الفيزا
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                المجموع
              </p>
              <p className={`text-3xl font-black mt-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {stats.total}
              </p>
            </div>
            <FileText className={`w-12 h-12 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
            }`} />
          </div>
        </div>

        <div className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                قيد الانتظار
              </p>
              <p className={`text-3xl font-black mt-1 ${
                theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
              }`}>
                {stats.pending}
              </p>
            </div>
            <Clock className={`w-12 h-12 ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
            }`} />
          </div>
        </div>

        <div className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                مدقق
              </p>
              <p className={`text-3xl font-black mt-1 ${
                theme === 'dark' ? 'text-green-300' : 'text-green-700'
              }`}>
                {stats.approved}
              </p>
            </div>
            <CheckCircle className={`w-12 h-12 ${
              theme === 'dark' ? 'text-green-400' : 'text-green-500'
            }`} />
          </div>
        </div>

        <div className={`rounded-2xl p-6 ${
          theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>
                مرفوض
              </p>
              <p className={`text-3xl font-black mt-1 ${
                theme === 'dark' ? 'text-red-300' : 'text-red-700'
              }`}>
                {stats.rejected}
              </p>
            </div>
            <XCircle className={`w-12 h-12 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-500'
            }`} />
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${
        theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
      } shadow-sm space-y-4`}>
        <div className="grid grid-cols-5 gap-4">
          <div className="relative">
            <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث..."
              className={`w-full pr-10 pl-4 py-3 rounded-xl border-2 transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } outline-none focus:border-blue-500`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'bg-gray-900/50 border-gray-700 text-white'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            } outline-none focus:border-blue-500`}
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">مدقق</option>
            <option value="rejected">مرفوض</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={`px-4 py-3 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'bg-gray-900/50 border-gray-700 text-white'
                : 'bg-gray-50 border-gray-300 text-gray-900'
            } outline-none focus:border-blue-500`}
          >
            <option value="all">جميع المصادر</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <CustomDatePicker
            selected={dateFrom}
            onChange={setDateFrom}
            placeholder="من تاريخ"
          />

          <CustomDatePicker
            selected={dateTo}
            onChange={setDateTo}
            placeholder="إلى تاريخ"
          />
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-gray-800/30' : 'bg-white'
      } shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${
              theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'
            }`}>
              <tr>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  الاسم
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  رقم الجواز
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  نوع الفيزا
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  المالية
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  المصدر
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  المدخل
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  التاريخ
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  الحالة
                </th>
                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredVisas.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`px-6 py-12 text-center ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    لا توجد فيزا
                  </td>
                </tr>
              ) : (
                filteredVisas.map((visa) => (
                  <tr key={visa.id} className={`${
                    theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'
                  } transition-colors`}>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <div className="font-bold">{visa.name}</div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {visa.nationality}
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {visa.passportNumber}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {visa.visaType}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">شراء:</span>
                          <span className="font-bold">${visa.purchasePrice}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-500">مبيع:</span>
                          <span className="font-bold text-blue-600">${visa.salePrice}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">ربح:</span>
                          <span className="font-bold text-green-600">${visa.salePrice - visa.purchasePrice}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {visa.source}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {visa.createdByName}
                    </td>
                    <td className={`px-6 py-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {visa.createdAt.toLocaleDateString('ar-IQ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        getStatusColor(visa.auditStatus)
                      }`}>
                        {getStatusIcon(visa.auditStatus)}
                        {getStatusText(visa.auditStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {visa.auditStatus === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAudit(visa.id, 'approved')}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                            title="موافقة"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleAudit(visa.id, 'rejected')}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark'
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                            title="رفض"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
