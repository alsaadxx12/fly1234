import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { X, User, Phone, FileText, Loader as Loader2, Save, CircleAlert as AlertCircle, Check, Info } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ClientFormData {
  name: string;
  phone: string;
  details: string;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: (client: any) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onClientAdded
}) => {
  const { t } = useLanguage();
  const { employee } = useAuth();
  const [formData, setFormData] = React.useState<ClientFormData>({
    name: '',
    phone: '',
    details: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  
  // Get the selected WhatsApp account from the window object
  const selectedAccount = window.selectedWhatsAppAccount;
  
  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        phone: '',
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
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('يرجى إدخال اسم العميل');
      }
      
      // Check if client with same name already exists
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('name', '==', formData.name.trim()));
      const existingClients = await getDocs(q);
      
      if (!existingClients.empty) {
        throw new Error('يوجد عميل بهذا الاسم بالفعل');
      }
      
      // Create client object
      const clientData = {
        name: formData.name.trim(),
        phone: formData.phone || null,
        details: formData.details || null,
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || '',
        entityType: 'client',
        paymentType: 'cash' // Default to cash
      };
      
      // Add to Firestore
      const docRef = await addDoc(clientsRef, clientData);
      
      // Show success message
      setSuccess('تم إضافة العميل بنجاح');

      // Call onClientAdded callback if provided
      if (onClientAdded) {
        onClientAdded({
          id: docRef.id,
          ...clientData,
          createdAt: new Date()
        });
      } else {
        // Only auto-close if no callback provided (backward compatibility)
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error adding client:', error);
      setError(error instanceof Error ? error.message : 'فشل في إضافة العميل');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl p-0 max-w-lg mx-4 w-full overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-50/5 backdrop-blur-sm"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">إضافة عميل جديد</h3>
                <p className="text-sm text-blue-100 mt-0.5">قم بإدخال معلومات العميل بدقة</p>
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
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>اسم العميل</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                  placeholder="أدخل اسم العميل الكامل"
                  required
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>رقم هاتف العميل</span>
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
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">العملاء هم الأفراد أو الكيانات التي تتعامل معها بشكل مباشر، بينما الشركات هي المؤسسات التي تتعامل معها بشكل رسمي.</p>
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
                className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>حفظ العميل</span>
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

export default AddClientModal;