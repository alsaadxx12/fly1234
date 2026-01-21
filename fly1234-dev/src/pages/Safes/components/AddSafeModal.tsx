import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { X, DollarSign, Plus, Loader2, Wallet, User, Image as ImageIcon } from 'lucide-react';

interface AddSafeModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSafe: {
    name: string;
    balance_usd: number;
    balance_iqd: number;
    is_main?: boolean;
    custodian_name?: string;
    custodian_image?: string;
  };
  setNewSafe: React.Dispatch<React.SetStateAction<{
    name: string;
    balance_usd: number;
    balance_iqd: number;
    is_main?: boolean;
    custodian_name?: string;
    custodian_image?: string;
  }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const AddSafeModal: React.FC<AddSafeModalProps> = ({
  isOpen,
  onClose,
  newSafe,
  setNewSafe,
  isSubmitting,
  onSubmit
}) => {
  const { t } = useLanguage();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 2 ميغابايت');
      return;
    }

    setIsUploadingImage(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setImagePreview(base64String);
      setNewSafe(prev => ({ ...prev, custodian_image: base64String }));
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      alert('فشل في تحميل الصورة');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setNewSafe(prev => ({ ...prev, custodian_image: undefined }));
  };

  if (!isOpen) return null;

  const modalContent = (

    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300">
        <div className="p-5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-700 dark:via-cyan-700 dark:to-teal-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">إضافة صندوق جديد</h3>
                <p className="text-sm text-blue-100 mt-1">أدخل بيانات الصندوق وأمين الصندوق</p>
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

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Custodian Image Section */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border-2 border-blue-200 dark:border-gray-600">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">أمين الصندوق</h4>
              </div>

              <div className="flex items-start gap-6">
                {/* Image Upload */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    {imagePreview || newSafe.custodian_image ? (
                      <div className="relative group">
                        <img
                          src={imagePreview || newSafe.custodian_image}
                          alt="صورة أمين الصندوق"
                          className="w-32 h-32 rounded-xl object-cover border-4 border-white dark:border-gray-600 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-gray-800">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {isUploadingImage ? (
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-blue-400 dark:text-blue-300 mb-2" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">رفع صورة</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                {/* Custodian Name */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم أمين الصندوق
                  </label>
                  <input
                    type="text"
                    value={newSafe.custodian_name || ''}
                    onChange={(e) => setNewSafe(prev => ({ ...prev, custodian_name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
                    placeholder="أدخل اسم أمين الصندوق"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    الحد الأقصى لحجم الصورة: 2 ميغابايت
                  </p>
                </div>
              </div>
            </div>

            {/* Safe Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">بيانات الصندوق</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم الصندوق <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSafe.name}
                  onChange={(e) => setNewSafe(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
                  placeholder="أدخل اسم الصندوق"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الرصيد الابتدائي (دولار)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newSafe.balance_usd}
                    onChange={(e) => setNewSafe(prev => ({ ...prev, balance_usd: +e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 text-base shadow-sm"
                    placeholder="0"
                    min="0"
                    required
                  />
                  <DollarSign className="w-5 h-5 text-blue-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الرصيد الابتدائي (دينار)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newSafe.balance_iqd}
                    onChange={(e) => setNewSafe(prev => ({ ...prev, balance_iqd: +e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 text-base shadow-sm"
                    placeholder="0"
                    min="0"
                    required
                  />
                  <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-blue-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_main"
                  checked={newSafe.is_main || false}
                  onChange={(e) => setNewSafe(prev => ({ ...prev, is_main: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is_main" className="text-sm font-medium text-blue-700 dark:text-blue-300 cursor-pointer">
                  صندوق رئيسي (يمكن التحويل إليه)
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الإضافة...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>إضافة الصندوق</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AddSafeModal;