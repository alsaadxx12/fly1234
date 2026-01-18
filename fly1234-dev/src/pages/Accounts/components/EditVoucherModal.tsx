import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useExchangeRate } from '../../../contexts/ExchangeRateContext';
import { useAuth } from '../../../contexts/AuthContext';
import useVoucherHistory from '../hooks/useVoucherHistory';
import {
  X, ArrowDownRight, ArrowUpLeft, Building2, DollarSign, Phone, Box,
  FileText, Check, AlertTriangle, Loader2, AlertCircle,
  Search, MessageCircle, Users, Save, CreditCard
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface EditVoucherModalProps {
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
  onVoucherUpdated: () => void;
}

export default function EditVoucherModal({
  isOpen,
  onClose,
  voucherId,
  settings,
  onVoucherUpdated
}: EditVoucherModalProps) {
  const { t } = useLanguage();
  const { currentRate } = useExchangeRate();
  const { employee } = useAuth();
  const { addHistoryEntry, detectChanges } = useVoucherHistory();

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
    whatsAppGroupId: '',
    whatsAppGroupName: '',
    currency: 'USD', // USD or IQD
    amount: '',
    gates: '',
    internal: '',
    external: '',
    fly: '',
    phone: '',
    details: '',
    safeId: '',
    safeName: '',
    exchangeRate: currentRate.toString(),
    type: 'receipt' as 'receipt' | 'payment'
  });

  // Derived state
  const [distributionError, setDistributionError] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [safes, setSafes] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [selectedCompanyHasWhatsApp, setSelectedCompanyHasWhatsApp] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  // WhatsApp sending state
  const [sendToWhatsApp, setSendToWhatsApp] = useState(false);

  // Format and validate phone number
  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '').trim();

    // Add country code if not present
    if (!cleaned.startsWith('964') && cleaned.length > 0) {
      // Remove leading zero if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '964' + cleaned;
    }

    // Ensure the number has the correct format for WhatsApp API
    if (cleaned.length > 0 && !cleaned.includes('@')) {
      cleaned = cleaned + '@c.us';
    }

    return cleaned;
  };

  // Check if phone number is valid
  const isValidPhoneNumber = (phone: string): boolean => {
    // Basic validation - should have at least 10 digits after formatting
    if (!phone) return false;

    // Remove @c.us if present for validation
    const cleaned = phone.replace(/\D/g, '').replace('@c.us', '').trim();
    return cleaned.length >= 9; // Iraqi numbers are typically 10-11 digits with country code
  };

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

        const voucherData = voucherDoc.data();
        // Store original data for comparison
        setOriginalData(voucherData);

        // Set form data
        setFormData({
          companyId: voucherData.companyId || '',
          companyName: voucherData.companyName || '',
          whatsAppGroupId: voucherData.whatsAppGroupId || '',
          whatsAppGroupName: voucherData.whatsAppGroupName || '',
          currency: voucherData.currency || 'USD',
          amount: voucherData.amount?.toString() || '',
          gates: voucherData.gates?.toString() || '',
          internal: voucherData.internal?.toString() || '',
          external: voucherData.external?.toString() || '',
          fly: voucherData.fly?.toString() || '',
          phone: voucherData.phone || '',
          details: voucherData.details || '',
          safeId: voucherData.safeId || '',
          safeName: voucherData.safeName || '',
          exchangeRate: voucherData.exchangeRate?.toString() || currentRate.toString(),
          type: voucherData.type || 'receipt'
        });

        // Set search query to company name
        setSearchQuery(voucherData.companyName || '');

        // Set custom company flag
        setIsCustomCompany(voucherData.isCustomCompany || voucherData.companyId === 'custom');

        // Set selected company has WhatsApp flag
        setSelectedCompanyHasWhatsApp(!!voucherData.whatsAppGroupId);

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
  }, [isOpen, voucherId, currentRate]);

  // Load companies and safes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all safes
        const safesRef = collection(db, 'safes');
        const safesQuery = query(safesRef, orderBy('name', 'asc'));
        const safesSnapshot = await getDocs(safesQuery);

        const safesData = safesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));

        setSafes(safesData);

        // Fetch companies
        setIsLoadingCompanies(true);
        const companiesRef = collection(db, 'companies');
        const companiesQuery = query(companiesRef, orderBy('name', 'asc'));
        const companiesSnapshot = await getDocs(companiesQuery);

        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          whatsAppGroupId: doc.data().whatsAppGroupId || null,
          whatsAppGroupName: doc.data().whatsAppGroupName || null
        }));

        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
        setIsLoadingCompanies(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('فشل في تحميل البيانات');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Filter companies based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(query)
    );

    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

  // Fetch company details when a company is selected
  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (companyDoc.exists()) {
        const companyData = companyDoc.data();

        // Check if company has WhatsApp group
        if (companyData.whatsAppGroupId && companyData.whatsAppGroupName) {
          setFormData(prev => ({
            ...prev,
            whatsAppGroupId: companyData.whatsAppGroupId,
            whatsAppGroupName: companyData.whatsAppGroupName
          }));
          setSelectedCompanyHasWhatsApp(true);
        } else {
          setFormData(prev => ({
            ...prev,
            whatsAppGroupId: '',
            whatsAppGroupName: ''
          }));
          setSelectedCompanyHasWhatsApp(false);
        }
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  // When amount changes, update gates field to match
  // Also recalculate gates when other distribution fields change
  useEffect(() => {
    try {
      const amount = parseFloat(formData.amount) || 0;
      const internal = parseFloat(formData.internal) || 0;
      const external = parseFloat(formData.external) || 0;
      const fly = parseFloat(formData.fly) || 0;

      // Calculate total of distribution fields
      const totalDistribution = internal + external + fly;

      // Check if distribution exceeds total amount
      if (totalDistribution > amount) {
        setDistributionError('مجموع الحقول (داخلي + خارجي + فلاي) يتجاوز المبلغ الكلي');
        // Set gates to 0 when distribution exceeds amount
        setFormData(prev => ({
          ...prev,
          gates: '0'
        }));
        return;
      } else {
        // Clear error if distribution is valid
        setDistributionError(null);
      }

      // Calculate gates as amount minus other fields
      const calculatedGates = Math.max(0, amount - internal - external - fly);

      // Update gates field with calculated value
      setFormData(prev => ({
        ...prev,
        gates: calculatedGates.toString()
      }));
    } catch (error) {
      console.error('Error calculating distribution:', error);
    }

  }, [formData.amount, formData.internal, formData.external, formData.fly]);

  // Handle company selection
  const handleSelectCompany = async (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      companyId: id || 'custom',
      companyName: name
    }));
    setSearchQuery(name);
    setShowCompanyDropdown(false);
    setIsCustomCompany(false);

    // Fetch company details to check for WhatsApp group
    await fetchCompanyDetails(id);
  };

  // Handle custom company name input
  const handleCustomCompanyName = (name: string) => {
    if (!name || name.trim() === '') return;

    // Ask user to select the type of entity
    const entityType = window.confirm(
      `اختر نوع الكيان لـ "${name.trim()}":\n` +
      'اضغط "موافق" للإضافة كشركة، أو "إلغاء" للإضافة كعميل أو مصاريف'
    ) ? 'company' : 'client';

    setSearchQuery(name.trim());
    setFormData(prev => ({
      ...prev,
      companyId: 'custom',
      companyName: name.trim(),
      whatsAppGroupId: '',
      whatsAppGroupName: '',
      entityType: entityType
    }));
    setShowCompanyDropdown(false);
    setIsCustomCompany(true);
    setSelectedCompanyHasWhatsApp(false);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // For amount fields, only allow numbers and decimal point, but display with thousand separators
    if (['amount', 'gates', 'internal', 'external', 'fly', 'exchangeRate'].includes(name)) {
      // Remove any non-digit characters except decimal point for processing
      const cleanValue = value.replace(/[^\d.]/g, '');

      // Only allow one decimal point
      const parts = cleanValue.split('.');
      if (parts.length > 2) return;

      if (cleanValue === '' || /^[0-9]*\.?[0-9]*$/.test(cleanValue)) {
        setFormData(prev => ({ ...prev, [name]: cleanValue }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle currency change
  const handleCurrencyChange = (currency: 'USD' | 'IQD') => {
    setFormData(prev => ({
      ...prev,
      currency,
      // Reset amount and distribution fields when currency changes
      amount: '',
      gates: '0',
      internal: '0',
      external: '0',
      fly: '0'
    }));
  };

  // Handle safe selection
  const handleSafeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const safeId = e.target.value;
    const safeName = safes.find(safe => safe.id === safeId)?.name || '';

    setFormData(prev => ({
      ...prev,
      safeId,
      safeName
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee || !voucherId) {
      setError('لم يتم العثور على بيانات الموظف أو السند');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form - allow custom company names
      if (!formData.companyId && !formData.companyName) {
        throw new Error('يرجى اختيار شركة');
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('يرجى إدخال مبلغ صحيح');
      }

      // Check if distribution is valid
      if (distributionError) {
        throw new Error(distributionError);
      }

      // Check if safe is selected
      if (!formData.safeId) {
        throw new Error('يرجى اختيار صندوق');
      }

      // Validate phone number if sending to WhatsApp
      if (sendToWhatsApp && !formData.whatsAppGroupId && formData.phone.trim()) {
        const formattedPhone = formatPhoneNumber(formData.phone);
        if (!isValidPhoneNumber(formattedPhone)) {
          throw new Error('رقم الهاتف غير صالح للإرسال عبر واتساب. يجب أن يكون الرقم بتنسيق صحيح');
        }
      }

      // Create voucher object
      const voucherData = {
        // Keep the original type
        type: formData.type,
        companyId: isCustomCompany || !formData.companyId || formData.companyId === 'custom' ? 'custom' : formData.companyId,
        companyName: formData.companyName,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        currency: formData.currency,
        amount: parseFloat(formData.amount),
        gates: parseFloat(formData.gates) || 0,
        internal: parseFloat(formData.internal) || 0,
        external: parseFloat(formData.external) || 0,
        fly: parseFloat(formData.fly) || 0,
        phone: formData.phone,
        details: formData.details,
        safeId: formData.safeId,
        safeName: formData.safeName,
        exchangeRate: parseFloat(formData.exchangeRate),
        updatedAt: new Date(),
        updatedBy: employee.name,
        updatedById: employee.id,
        isCustomCompany: isCustomCompany
      };

      // Update in Firestore
      const voucherRef = doc(db, 'vouchers', voucherId);
      await updateDoc(voucherRef, voucherData);

      // If this is a custom company, save it to the companies collection for future use
      if (isCustomCompany && formData.companyName.trim()) {
        try {
          // Determine which collection to use based on entityType
          const collectionName = formData.entityType === 'company' ? 'companies' : 'clients';

          // Ask user if they want to add this entity to the database
          const entityTypeDisplay = formData.entityType === 'company' ? 'الشركات' : 'العملاء أو المصاريف';
          const shouldAddCompany = window.confirm(`هل تريد إضافة "${formData.companyName.trim()}" إلى قاعدة بيانات ${entityTypeDisplay}؟`);

          if (shouldAddCompany) {
            // Check if a company with this name already exists
            const companiesRef = collection(db, collectionName);
            const q = query(companiesRef, where("name", "==", formData.companyName.trim()));
            const existingCompanies = await getDocs(q);

            if (existingCompanies.empty) {
              // Create a new entity record
              await addDoc(companiesRef, {
                name: formData.companyName.trim(),
                paymentType: 'cash', // Default to cash
                phone: formData.phone || null,
                whatsAppGroupId: formData.whatsAppGroupId || null,
                whatsAppGroupName: formData.whatsAppGroupName || null,
                createdAt: serverTimestamp(),
                createdBy: employee.name,
                createdById: employee.id || '',
                isCustomCompany: true,
                entityType: formData.entityType
              });
              console.log(`Custom ${formData.entityType} saved to database:`, formData.companyName);
            }
          }
        } catch (companyError) {
          // Don't fail the voucher update if saving the company fails
          console.error(`Error saving custom ${formData.entityType || 'entity'}:`, companyError);
        }
      }

      // Record changes in history
      if (originalData) {
        const changes = detectChanges(originalData, voucherData);

        // Log detailed changes for debugging
        if (changes.length > 0) {
          console.log('Detected changes:', JSON.stringify(changes, null, 2));

          // Add history entry and get the ID
          const historyId = await addHistoryEntry(
            voucherId,
            employee.name,
            employee.id || '',
            changes
          );

          if (historyId) {
            console.log('History entry added successfully with ID:', historyId);
          } else {
            console.log('No history entry was created (possibly no valid changes)');
          }
        } else {
          console.log('No changes detected, skipping history entry');
        }
      }

      // Show success message
      setSuccess('تم تحديث سند القبض بنجاح');

      // Notify parent component
      onVoucherUpdated();

      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating voucher:', error);
      setError(error instanceof Error ? error.message : 'فشل في تحديث سند القبض');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                {formData.type === 'receipt' ? (
                  <ArrowDownRight className="w-7 h-7 text-white" />
                ) : (
                  <ArrowUpLeft className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">تعديل سند {formData.type === 'receipt' ? 'قبض' : 'دفع'}</h3>
                <p className="text-sm text-blue-100 mt-1 font-bold">تعديل بيانات السند #{originalData?.invoiceNumber || voucherId?.substring(0, 6)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 duration-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-gray-600">جاري تحميل بيانات السند...</p>
            </div>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto flex-1 bg-gray-50">
            <form onSubmit={handleSubmit}>
              {/* Main Content */}
              <div className="grid grid-cols-1 gap-5">
                {/* Company & Amount Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-black text-gray-800 dark:text-gray-100">معلومات الطرف الآخر والمبلغ</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        شركة / زبون
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowCompanyDropdown(true);
                          }}
                          onFocus={() => setShowCompanyDropdown(true)}
                          onBlur={() => {
                            setTimeout(() => {
                              setShowCompanyDropdown(false);
                            }, 200);
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 pr-9"
                          placeholder="ابحث عن شركة..."
                          required
                        />
                        <div className="absolute right-2.5 top-2.5">
                          <Search className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Dropdown for company search results */}
                        {showCompanyDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-gray-800">
                            {searchQuery.trim() !== '' && (
                              <div
                                className="sticky top-0 z-20 p-2 bg-blue-50 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => {
                                  handleCustomCompanyName(searchQuery);
                                  setShowCompanyDropdown(false);
                                }}
                              >
                                <div className="font-medium text-blue-600 flex items-center gap-1.5 text-sm">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>استخدام "{searchQuery}" كاسم شركة/زبون</span>
                                </div>
                                <div className="text-xs text-blue-500 mt-0.5">
                                  إضافة اسم مخصص غير موجود في قاعدة البيانات
                                </div>
                              </div>
                            )}

                            <div className="max-h-48 overflow-y-auto">
                              {isLoadingCompanies ? (
                                <div className="p-2 text-center text-gray-500">
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-gray-500" />
                                  <span className="text-xs">جاري التحميل...</span>
                                </div>
                              ) : filteredCompanies.length === 0 ? (
                                <div className="p-2 text-center text-gray-500 text-xs">
                                  لا توجد شركات مطابقة في قاعدة البيانات
                                </div>
                              ) : (
                                <>
                                  {filteredCompanies.length > 0 && (
                                    <div className="p-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                                      الشركات المسجلة ({filteredCompanies.length})
                                    </div>
                                  )}
                                  {filteredCompanies.map(company => (
                                    <div
                                      key={company.id}
                                      className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                      onClick={() => handleSelectCompany(company.id, company.name as string)}
                                    >
                                      <div className="font-medium text-gray-800 text-sm">{company.name}</div>
                                      {company.whatsAppGroupId && (
                                        <div className="flex items-center gap-1 mt-0.5 text-xs text-green-600">
                                          <MessageCircle className="w-3 h-3" />
                                          <span>مرتبطة بمجموعة واتساب</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {isCustomCompany && (
                        <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>تم اختيار "{formData.companyName}" كاسم مخصص</span>
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">المبلغ</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          name="amount"
                          value={formData.amount ? parseFloat(formData.amount).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: formData.amount.includes('.') ? 2 : 0
                          }) : ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left pl-10"
                          placeholder="0.00"
                          required
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-2 text-gray-500">
                          {formData.currency === 'USD' ? '$' : 'د.ع'}
                        </div>
                      </div>
                    </div>

                    {/* Currency Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">العملة</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="relative">
                          <input
                            type="radio"
                            name="currency"
                            checked={formData.currency === 'USD'}
                            onChange={() => handleCurrencyChange('USD')}
                            className="peer sr-only"
                          />
                          <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-blue-200 peer-checked:bg-blue-50 hover:border-blue-200">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-800">دولار أمريكي</span>
                          </div>
                        </label>
                        <label className="relative">
                          <input
                            type="radio"
                            name="currency"
                            checked={formData.currency === 'IQD'}
                            onChange={() => handleCurrencyChange('IQD')}
                            className="peer sr-only"
                          />
                          <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-purple-200 peer-checked:bg-purple-50 hover:border-purple-200">
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-800">دينار عراقي</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Exchange Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">سعر الصرف</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="exchangeRate"
                          value={formData.exchangeRate ? parseFloat(formData.exchangeRate).toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: formData.exchangeRate.includes('.') ? 2 : 0
                          }) : ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left"
                          placeholder="0.00"
                          required
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution Fields Section */}
                {settings.useCustomColumns && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <h4 className="font-medium text-gray-800">تقسيم المبلغ</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gates */}
                      {settings.showGatesColumn && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">
                            {settings.gatesColumnLabel || 'بوابات'}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="gates"
                              value={formData.gates ? parseFloat(formData.gates).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: formData.gates.includes('.') ? 2 : 0
                              }) : ''}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left pl-10 bg-gray-50"
                              placeholder="0.00"
                              readOnly
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-2 text-gray-500">
                              {formData.currency === 'USD' ? '$' : 'د.ع'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Internal */}
                      {settings.showInternalColumn && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">
                            {settings.internalColumnLabel || 'داخلي'}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="internal"
                              value={formData.internal ? parseFloat(formData.internal).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: formData.internal.includes('.') ? 2 : 0
                              }) : ''}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left pl-10"
                              placeholder="0.00"
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-2 text-gray-500">
                              {formData.currency === 'USD' ? '$' : 'د.ع'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* External */}
                      {settings.showExternalColumn && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">
                            {settings.externalColumnLabel || 'خارجي'}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="external"
                              value={formData.external ? parseFloat(formData.external).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: formData.external.includes('.') ? 2 : 0
                              }) : ''}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left pl-10"
                              placeholder="0.00"
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-2 text-gray-500">
                              {formData.currency === 'USD' ? '$' : 'د.ع'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fly */}
                      {settings.showFlyColumn && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">
                            {settings.flyColumnLabel || 'فلاي'}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="fly"
                              value={formData.fly ? parseFloat(formData.fly).toLocaleString('en-US', {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: formData.fly.includes('.') ? 2 : 0
                              }) : ''}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 text-left pl-10"
                              placeholder="0.00"
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-2 text-gray-500">
                              {formData.currency === 'USD' ? '$' : 'د.ع'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Distribution Error */}
                    {distributionError && (
                      <div className="mt-3 text-red-600 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{distributionError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Details Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-800">تفاصيل إضافية</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 pr-9"
                          placeholder="رقم الهاتف"
                          dir="ltr"
                        />
                        <div className="absolute right-2.5 top-2.5">
                          <Phone className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Safe Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">الصندوق</label>
                      <select
                        name="safeId"
                        value={formData.safeId}
                        onChange={handleSafeChange}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                        required
                      >
                        <option value="">اختر صندوق...</option>
                        {safes.map(safe => (
                          <option key={safe.id} value={safe.id}>{safe.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">تفاصيل</label>
                      <textarea
                        name="details"
                        value={formData.details}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 min-h-[100px]"
                        placeholder="أي تفاصيل إضافية..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{success}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 text-sm font-black text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
                >
                  إلغاء وتجاهل
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-12 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-blue-500/20 transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>حفظ كافة التغييرات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
} 