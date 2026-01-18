import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { X, Building2, Phone, Globe, FileText, Loader as Loader2, Save, CircleAlert as AlertCircle, Check, Info, DollarSign, CreditCard } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface CompanyFormData {
  name: string;
  paymentType: 'cash' | 'credit';
  companyId?: string;
  whatsAppGroupId?: string | null;
  whatsAppGroupName?: string | null;
  phone: string;
  website: string;
  details: string;
}

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyAdded?: (company: any) => void;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyAdded
}) => {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [formData, setFormData] = React.useState<CompanyFormData>({
    name: '',
    paymentType: 'cash',
    companyId: '',
    whatsAppGroupId: null,
    whatsAppGroupName: null,
    phone: '',
    website: '',
    details: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        paymentType: 'cash',
        companyId: '',
        whatsAppGroupId: null,
        whatsAppGroupName: null,
        phone: '',
        website: '',
        details: ''
      });
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('يرجى إدخال اسم الشركة');
      }

      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('name', '==', formData.name.trim()));
      const existingCompanies = await getDocs(q);

      if (!existingCompanies.empty) {
        throw new Error('يوجد شركة بهذا الاسم بالفعل');
      }

      const companyData = {
        name: formData.name.trim(),
        paymentType: formData.paymentType,
        companyId: formData.companyId || null,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        phone: formData.phone || null,
        website: formData.website || null,
        details: formData.details || null,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };

      const docRef = await addDoc(companiesRef, companyData);

      setSuccess('تم إضافة الشركة بنجاح');

      if (onCompanyAdded) {
        onCompanyAdded({
          id: docRef.id,
          ...companyData,
          createdAt: new Date()
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding company:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة الشركة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl p-0 max-w-2xl mx-4 w-full overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-50/5 backdrop-blur-sm"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">إضافة شركة جديدة</h3>
                <p className="text-sm text-indigo-100 mt-0.5">قم بإدخال معلومات الشركة بدقة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 duration-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3 border-2 border-red-200 dark:border-red-700 text-sm shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              </div>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3 border-2 border-green-200 dark:border-green-700 text-sm shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                <Check className="w-5 h-5 flex-shrink-0" />
              </div>
              <p className="font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>اسم الشركة</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200"
                    placeholder="أدخل اسم الشركة الكامل"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span>رقم الهاتف</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:border-green-300 dark:hover:border-green-600 transition-all duration-200"
                    placeholder="964xxxxxxxxx"
                    dir="ltr"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <span>نوع التعامل</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paymentType: 'cash' }))}
                  className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all duration-200 ${
                    formData.paymentType === 'cash'
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 shadow-md transform scale-105'
                      : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    formData.paymentType === 'cash'
                      ? 'bg-green-100 dark:bg-green-800/50'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      formData.paymentType === 'cash'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${
                      formData.paymentType === 'cash'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>نقدي</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">دفع فوري</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paymentType: 'credit' }))}
                  className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all duration-200 ${
                    formData.paymentType === 'credit'
                      ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 shadow-md transform scale-105'
                      : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-600 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    formData.paymentType === 'credit'
                      ? 'bg-orange-100 dark:bg-orange-800/50'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <CreditCard className={`w-6 h-6 ${
                      formData.paymentType === 'credit'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-base ${
                      formData.paymentType === 'credit'
                        ? 'text-orange-700 dark:text-orange-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>آجل</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">دفع مؤجل</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>البريد الإلكتروني</span>
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                  placeholder="example@company.com"
                  dir="ltr"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>ملاحظات</span>
              </label>
              <div className="relative group">
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 resize-none"
                  placeholder="أدخل أي ملاحظات أو تفاصيل إضافية..."
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">الشركات هي المؤسسات التي تتعامل معها بشكل رسمي، بينما العملاء هم الأفراد أو الكيانات التي تتعامل معها بشكل مباشر.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t-2 border-gray-100 dark:border-gray-700 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>حفظ الشركة</span>
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

export default AddCompanyModal;
