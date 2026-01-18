import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import useDebts from '../hooks/useDebts';
import { 
  X, Building2, CreditCard, DollarSign, Calendar, FileText, 
  Loader2, Check, AlertTriangle, Search, Plus, Info, AlertCircle
} from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DebtFormData, Company } from '../types';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ar from 'date-fns/locale/ar';
import "react-datepicker/dist/react-datepicker.css";

// Register Arabic locale
registerLocale('ar', ar);

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDebtAdded: () => void;
}

const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onDebtAdded
}) => {
  const { addDebt, debts } = useDebts();
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [formData, setFormData] = useState<DebtFormData>({
    companyId: '',
    companyName: '',
    debtType: '',
    amount: '',
    currency: 'USD',
    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    notes: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyHasDebt, setCompanyHasDebt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companyExists, setCompanyExists] = useState(false);
  const [debtTypes, setDebtTypes] = useState<string[]>([
    'قرض',
    'فاتورة',
    'مستحقات',
    'تمويل',
    'أخرى'
  ]);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        
        const companiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          paymentType: doc.data().paymentType,
          phone: doc.data().phone,
          website: doc.data().website,
          details: doc.data().details
        }));
        
        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };
    
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSearchQuery('');
        setCompanyExists(false);
        setCompanyHasDebt(false);
      }, 300);
      setFormData({
        companyId: '',
        companyName: '',
        debtType: '',
        amount: '',
        currency: 'USD',
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        notes: ''
      });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Filter companies based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchQuery, companies]);

  // Check if company already has a debt
  useEffect(() => {
    if (formData.companyId && formData.companyName) {
      const existingDebt = debts.find(debt => 
        debt.companyId === formData.companyId || 
        debt.companyName.toLowerCase() === formData.companyName.toLowerCase()
      );
      
      setCompanyHasDebt(!!existingDebt);
    } else {
      setCompanyHasDebt(false);
    }
  }, [formData.companyId, formData.companyName, debts]);

  // Handle company selection
  const handleSelectCompany = (company: Company) => {
    setFormData(prev => ({
      ...prev,
      companyId: company.id,
      companyName: company.name
    }));
    setSearchQuery(company.name);
    setShowCompanyDropdown(false);
    
    // Check if this company already has a debt
    const existingDebt = debts.find(debt => 
      debt.companyId === company.id || 
      debt.companyName.toLowerCase() === company.name.toLowerCase()
    );
    
    setCompanyHasDebt(!!existingDebt);
    setCompanyExists(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate form
      if (!formData.companyId || !formData.companyName) {
        throw new Error('يرجى اختيار شركة');
      }

      // Check if company already has a debt
      if (companyHasDebt) {
        throw new Error('هذه الشركة لديها دين مسجل بالفعل. لا يمكن إضافة دين آخر لنفس الشركة');
      }
      
      if (!formData.debtType) {
        throw new Error('يرجى اختيار نوع الدين');
      }
      
      if (!formData.amount) {
        throw new Error('يرجى إدخال المبلغ');
      }
      
      if (isNaN(parseFloat(formData.amount))) {
        throw new Error('يرجى إدخال مبلغ صحيح');
      }
      
      // Check if company exists
      if (!companyExists) {
        throw new Error('يجب اختيار شركة موجودة في النظام');
      }
      
      // Add debt
      await addDebt(formData);
      
      // Show success message
      setSuccess('تم إضافة الدين بنجاح');
      
      // Refresh debts
      onDebtAdded();
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding debt:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[#230058] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">إضافة دين جديد</h3>
                <p className="text-sm text-white/80">أدخل بيانات الدين الجديد</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2 border border-green-100 text-sm">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#ff5f0a]" />
                    <span>الشركة</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { 
                      setSearchQuery(e.target.value);
                      setCompanyExists(false);
                      setShowCompanyDropdown(true);
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    onBlur={(e) => {
                      // تأخير إغلاق القائمة للسماح بالنقر على العناصر
                      setTimeout(() => {
                        if (!e.currentTarget.contains(document.activeElement)) {
                          setShowCompanyDropdown(false);
                        }
                      }, 150);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm pr-9"
                    placeholder="ابحث عن شركة..."
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Company Dropdown */}
                {showCompanyDropdown && searchQuery.trim() !== '' && (
                  <div 
                    className="absolute z-10 mt-1 w-full bg-gray-50 rounded-lg shadow-lg max-h-60 overflow-y-auto border border-gray-200"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredCompanies.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        لا توجد شركات مطابقة
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-700 flex items-center gap-1">
                          <Info className="w-3 h-3 flex-shrink-0" />
                          <span>يجب اختيار شركة موجودة في النظام</span>
                        </div>
                      </div>
                    ) : (
                      filteredCompanies.map(company => (
                        <div
                          key={company.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectCompany(company)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gray-100 rounded-lg">
                              <Building2 className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{company.name}</div>
                              {company.phone && (
                                <div className="text-xs text-gray-500">{company.phone}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              {/* Company Has Debt Warning */}
              {companyHasDebt && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>هذه الشركة لديها دين مسجل بالفعل. لا يمكن إضافة دين آخر لنفس الشركة</span>
                </div>
              )}
              
              {/* Debt Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#ff5f0a]" />
                    <span>نوع الدين</span>
                  </div>
                </label>
                <select
                  value={formData.debtType}
                  onChange={(e) => setFormData(prev => ({ ...prev, debtType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm"
                  required
                >
                  <option value="">اختر نوع الدين...</option>
                  {debtTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#ff5f0a]" />
                    <span>المبلغ</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => {
                      // Only allow numbers and decimal point
                      const value = e.target.value.replace(/[^\d.]/g, '');
                      // Prevent multiple decimal points
                      const parts = value.split('.');
                      if (parts.length > 2) return;
                      
                      setFormData(prev => ({ ...prev, amount: value }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm pl-10"
                    placeholder="0.00"
                    dir="ltr"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#ff5f0a]" />
                    <span>العملة</span>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="relative">
                    <input
                      type="radio"
                      name="currency"
                      checked={formData.currency === 'USD'}
                      onChange={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-blue-200 peer-checked:bg-blue-50 hover:border-blue-200">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900">دولار أمريكي</span>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="currency"
                      checked={formData.currency === 'IQD'}
                      onChange={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
                      className="peer sr-only"
                    />
                    <div className="flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer transition-all peer-checked:border-green-200 peer-checked:bg-green-50 hover:border-green-200">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">دينار عراقي</span>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#ff5f0a]" />
                    <span>تاريخ الاستحقاق</span>
                  </div>
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.dueDate}
                    onChange={(date: Date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm"
                    locale="ar"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff5f0a]" />
                    <span>ملاحظات</span>
                  </div>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5f0a] bg-gray-50 text-gray-900 shadow-sm resize-none h-24"
                  placeholder="أدخل أي ملاحظات إضافية..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCompanyExists(false);
                  setCompanyHasDebt(false);
                  onClose();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || companyHasDebt || !companyExists}
                className="px-4 py-2 bg-[#ff5f0a] text-white rounded-lg hover:bg-[#ff5f0a]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>إضافة الدين</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDebtModal;