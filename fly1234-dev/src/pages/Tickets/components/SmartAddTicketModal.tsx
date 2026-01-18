import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Sparkles, FileText, Loader as Loader2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Zap, Plane, DollarSign, Trash2, Wifi, Calendar, Banknote, Users } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { TicketType, Passenger, PassengerType } from '../types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import BeneficiarySelector from './BeneficiarySelector';
import SourceSelector from './SourceSelector';
import { SmartTicketExtractor } from '../../../lib/services/smartTicketExtractor';
import CustomDatePicker from '../../../components/CustomDatePicker';

interface SmartAddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (pnr: string, passengers: Passenger[], type: TicketType, notes?: string, additionalData?: {
    route?: string;
    beneficiary?: string;
    source?: string;
    currency?: string;
    entryDate?: Date;
    issueDate?: Date;
  }) => Promise<void>;
  initialType?: TicketType;
}

interface Company {
  id: string;
  name: string;
  entityType?: 'company' | 'client' | 'expense';
}

interface Source {
  id: string;
  name: string;
  currency: 'IQD' | 'USD';
}

interface ExtractedData {
  pnr: string;
  route: string;
  issueDate: string;
  passengers: Array<{
    name: string;
    passportNumber: string;
    ticketNumber: string;
    passengerType: PassengerType;
  }>;
}

export default function SmartAddTicketModal({ isOpen, onClose, onAdd, initialType = 'entry' }: SmartAddTicketModalProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState('');
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);

  const [beneficiary, setBeneficiary] = useState('');
  const [source, setSource] = useState('');
  const [currency, setCurrency] = useState('IQD');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  const [generalPurchasePrice, setGeneralPurchasePrice] = useState<number>(0);
  const [generalSalePrice, setGeneralSalePrice] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadCompanies();
      loadSources();
      checkAIConnection();
    }
  }, [isOpen]);

  const checkAIConnection = async () => {
    try {
      const settingsRef = doc(db, 'system_settings', 'global');
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.aiApiKey && data.aiApiKey.trim().length > 0) {
          setAiConnected(true);
          return;
        }
      }

      const localKey = localStorage.getItem('ai_api_key') || localStorage.getItem('openai_api_key');
      setAiConnected(!!localKey && localKey.trim().length > 0);
    } catch {
      setAiConnected(false);
    }
  };

  const resetForm = () => {
    setStep('upload');
    setSelectedFile(null);
    setExtractedData(null);
    setError('');
    setBeneficiary('');
    setSource('');
    setCurrency('IQD');
    setIssueDate(new Date());
    setPassengers([]);
    setExtracting(false);
    setLoading(false);
    setGeneralPurchasePrice(0);
    setGeneralSalePrice(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadCompanies = async () => {
    try {
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];
      setCompanies(companiesList);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const loadSources = async () => {
    try {
      const sourcesRef = collection(db, 'sources');
      const snapshot = await getDocs(sourcesRef);
      const sourcesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Source[];
      setSources(sourcesList);
    } catch (err) {
      console.error('Error loading sources:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (isPDF || isImage) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid PDF or image file');
      }
    }
  };

  const handleExtractData = async () => {
    if (!selectedFile) return;

    setExtracting(true);
    setError('');

    try {
      let data: ExtractedData;

      if (selectedFile.type.startsWith('image/')) {
        data = await SmartTicketExtractor.extractFromImage(selectedFile);
      } else {
        data = await SmartTicketExtractor.extractFromPDF(selectedFile);
      }

      if (data && (data.pnr || data.passengers.length > 0)) {
        setExtractedData(data);
        if (data.issueDate) {
          try {
            const parsedDate = new Date(data.issueDate);
            if (!isNaN(parsedDate.getTime())) {
              setIssueDate(parsedDate);
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }

        const passengersWithPrices: Passenger[] = data.passengers.map(p => ({
          id: crypto.randomUUID(),
          name: p.name,
          passportNumber: p.passportNumber,
          ticketNumber: p.ticketNumber,
          passengerType: p.passengerType,
          purchasePrice: 0,
          salePrice: 0
        }));

        setPassengers(passengersWithPrices);
        setStep('review');
      } else {
        setError('Could not extract data. Please check file quality or enter manually.');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      const errorMessage = err?.message || 'حدث خطأ أثناء معالجة الملف';

      if (errorMessage.includes('API') || errorMessage.includes('مفتاح') || errorMessage.includes('key')) {
        setError('⚠️ الرجاء إضافة مفتاح API للذكاء الاصطناعي من صفحة الإعدادات أولاً\n\nانتقل إلى: الإعدادات → إعدادات الذكاء الاصطناعي → أدخل مفتاح Gemini API');
      } else {
        setError(errorMessage);
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleUpdatePassenger = (id: string, field: keyof Passenger, value: any) => {
    setPassengers(passengers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleDeletePassenger = (id: string) => {
    setPassengers(passengers.filter(p => p.id !== id));
  };

  const applyGeneralPrices = () => {
    if (generalPurchasePrice > 0 || generalSalePrice > 0) {
      setPassengers(passengers.map(p => ({
        ...p,
        purchasePrice: generalPurchasePrice || p.purchasePrice,
        salePrice: generalSalePrice || p.salePrice
      })));
    }
  };

  const formatNumberWithCommas = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const parseDate = (dateStr: string): Date => {
    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!extractedData || !beneficiary || !source) {
      setError('Please fill all required fields');
      return;
    }

    if (passengers.length === 0) {
      setError('At least one passenger is required');
      return;
    }

    const hasEmptyPrices = passengers.some(p => !p.purchasePrice || !p.salePrice);
    if (hasEmptyPrices) {
      setError('Please enter purchase and sale prices for all passengers');
      return;
    }

    setLoading(true);
    try {
      const today = new Date();

      await onAdd(
        extractedData.pnr,
        passengers,
        initialType,
        '',
        {
          route: extractedData.route,
          beneficiary,
          source,
          currency,
          entryDate: today,
          issueDate: issueDate
        }
      );

      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while adding the ticket');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className={`rounded-2xl shadow-xl border w-full max-w-4xl max-h-[90vh] overflow-hidden ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === 'dark'
            ? 'border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-900'
            : 'border-gray-200 bg-gradient-to-r from-white via-gray-50 to-gray-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                استخراج ذكي
              </h2>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                رفع صورة أو PDF للاستخراج
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {aiConnected !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                aiConnected
                  ? theme === 'dark' ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-50 text-green-700 border-green-200'
                  : theme === 'dark' ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <Wifi className="w-3.5 h-3.5" />
                {aiConnected ? 'AI متصل' : 'AI غير متصل'}
              </div>
            )}

            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{maxHeight: 'calc(90vh - 80px)'}}>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className={`p-3 rounded-lg flex items-start gap-2 border ${
                theme === 'dark'
                  ? 'bg-red-900/20 text-red-300 border-red-700'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  {error}
                </div>
              </div>
            )}

            {step === 'upload' && (
              <div className="space-y-3">
                {!aiConnected && aiConnected !== null && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 text-xs ${
                    theme === 'dark'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold mb-1">مفتاح API مفقود</p>
                      <p className="leading-relaxed">
                        لاستخدام الاستخراج الذكي، يرجى إضافة مفتاح Gemini API من صفحة الإعدادات.
                        <br />
                        <span className="opacity-75">الإعدادات → إعدادات الذكاء الاصطناعي</span>
                      </p>
                    </div>
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                    theme === 'dark'
                      ? 'border-gray-600 hover:border-blue-500 bg-gray-900'
                      : 'border-gray-300 hover:border-blue-500 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <>
                      <Upload className={`w-12 h-12 mx-auto mb-3 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                      <h3 className={`text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        اضغط لرفع ملف
                      </h3>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        PDF أو صورة
                      </p>
                    </>
                  ) : (
                    <>
                      <FileText className={`w-12 h-12 mx-auto mb-3 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-500'
                      }`} />
                      <h3 className={`text-sm font-medium mb-1 truncate ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {selectedFile.name}
                      </h3>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  )}
                </div>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleExtractData}
                    disabled={extracting || !aiConnected}
                    className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {extracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الاستخراج...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        استخراج
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {step === 'review' && (
              extractedData ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg flex items-center gap-2 border ${
                  theme === 'dark'
                    ? 'bg-green-900/20 text-green-400 border-green-700'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">تم الاستخراج بنجاح</span>
                </div>

                {/* Extracted Info */}
                <div className="grid grid-cols-4 gap-2">
                  <div className={`p-3 rounded-lg text-center border ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <Plane className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {extractedData.pnr || 'N/A'}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg text-center col-span-2 border ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <p className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {extractedData.route || 'N/A'}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg text-center border ${
                    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <p className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {passengers.length} PAX
                    </p>
                  </div>
                </div>

                {/* Dates & Entity */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-sm font-bold mb-1.5 block ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      تاريخ الإدخال
                    </label>
                    <input
                      type="text"
                      value={new Date().toISOString().split('T')[0]}
                      disabled
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-bold text-center transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-gray-500 border-gray-700'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <CustomDatePicker
                      value={issueDate}
                      onChange={(date) => date && setIssueDate(date)}
                      label="تاريخ الإصدار *"
                      placeholder="اختر تاريخ الإصدار"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <BeneficiarySelector
                    value={beneficiary}
                    onChange={setBeneficiary}
                    beneficiaries={companies}
                    required
                  />

                  <SourceSelector
                    value={source}
                    onChange={setSource}
                    sources={sources}
                    required
                  />

                  <div>
                    <label className={`text-sm font-bold mb-1.5 block ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      العملة *
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-bold text-center transition-all duration-200 ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50'
                          : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      } outline-none`}
                      required
                    >
                      <option value="IQD">IQD - دينار</option>
                      <option value="USD">USD - دولار</option>
                    </select>
                  </div>
                </div>

                {/* General Prices */}
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      الأسعار العامة
                    </span>
                    <button
                      type="button"
                      onClick={applyGeneralPrices}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 text-white hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700"
                    >
                      تطبيق
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={generalPurchasePrice ? formatNumberWithCommas(generalPurchasePrice) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setGeneralPurchasePrice(value ? Number(value) : 0);
                      }}
                      placeholder="سعر الشراء"
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-center ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border-gray-700 focus:border-blue-500'
                          : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                      } outline-none`}
                    />
                    <input
                      type="text"
                      value={generalSalePrice ? formatNumberWithCommas(generalSalePrice) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setGeneralSalePrice(value ? Number(value) : 0);
                      }}
                      placeholder="سعر البيع"
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-center ${
                        theme === 'dark'
                          ? 'bg-gray-800 text-white border-gray-700 focus:border-blue-500'
                          : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
                      } outline-none`}
                    />
                  </div>
                </div>

                {/* Passengers - Scrollable */}
                <div>
                  <h3 className={`text-base font-black mb-3 flex items-center gap-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    <Users className="w-5 h-5" />
                    الركاب ({passengers.length})
                  </h3>

                  <div className="space-y-2">
                    {passengers.map((passenger, index) => (
                      <div
                        key={passenger.id}
                        className={`p-2 rounded-lg border ${
                          theme === 'dark'
                            ? 'border-gray-700 bg-gray-900'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            theme === 'dark'
                              ? 'bg-gray-800 text-gray-400'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePassenger(passenger.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                          <input
                            value={passenger.name}
                            onChange={(e) => handleUpdatePassenger(passenger.id, 'name', e.target.value)}
                            placeholder="Name"
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                            required
                          />

                          <input
                            value={passenger.passportNumber}
                            onChange={(e) => handleUpdatePassenger(passenger.id, 'passportNumber', e.target.value)}
                            placeholder="Passport"
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                            required
                          />

                          <input
                            value={passenger.ticketNumber || ''}
                            onChange={(e) => handleUpdatePassenger(passenger.id, 'ticketNumber', e.target.value)}
                            placeholder="Ticket"
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <select
                            value={passenger.passengerType}
                            onChange={(e) => handleUpdatePassenger(passenger.id, 'passengerType', e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                          >
                            <option value="adult">Adult</option>
                            <option value="child">Child</option>
                            <option value="infant">Infant</option>
                          </select>

                          <input
                            type="text"
                            value={passenger.purchasePrice ? formatNumberWithCommas(passenger.purchasePrice) : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdatePassenger(passenger.id, 'purchasePrice', value ? Number(value) : 0);
                            }}
                            placeholder="Buy"
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                            required
                          />

                          <input
                            type="text"
                            value={passenger.salePrice ? formatNumberWithCommas(passenger.salePrice) : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdatePassenger(passenger.id, 'salePrice', value ? Number(value) : 0);
                            }}
                            placeholder="Sell"
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${
                              theme === 'dark'
                                ? 'bg-gray-900 text-white border border-gray-700'
                                : 'bg-white text-gray-900 border border-gray-300'
                            }`}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    رجوع
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإضافة...
                      </>
                    ) : (
                      'إضافة التذكرة'
                    )}
                  </button>
                </div>
              </div>
              ) : (
                <div className={`p-6 text-center ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">لا توجد بيانات مستخرجة</p>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
                  >
                    العودة للرفع
                  </button>
                </div>
              )
            )}
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
