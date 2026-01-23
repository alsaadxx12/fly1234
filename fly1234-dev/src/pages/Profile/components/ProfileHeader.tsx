import React, { useState, useRef } from 'react';
import { Mail, Phone, Edit, Download, Camera, Loader2 } from 'lucide-react';
import { Employee } from '../../../lib/collections/employees';
import { useTheme } from '../../../contexts/ThemeContext';
import EditProfileModal from './EditProfileModal';
import { generatePdf } from '../../../utils/pdfGenerator';
import { storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';

interface ProfileHeaderProps {
  employee: Employee;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ employee }) => {
  const { theme } = useTheme();
  const { updateEmployeeProfile } = useAuth();
  const { showNotification } = useNotification();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPdf = async () => {
    if (!employee.files || employee.files.length === 0) {
      alert('لا توجد ملفات لتصديرها.');
      return;
    }
    await generatePdf(employee);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification('error', 'خطأ في الحجم', 'يجب أن يكون حجم الصورة أقل من 2 ميجابايت');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'خطأ في النوع', 'يرجى اختيار ملف صورة صالح');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profile-pictures/${employee.userId}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateEmployeeProfile(employee.id!, { image: downloadURL });
      showNotification('success', 'نجاح', 'تم تحديث الصورة الشخصية بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('error', 'فشل الرفع', 'فشل في رفع الصورة. يرجى المحاولة مرة أخرى');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className={`p-8 rounded-[32px] shadow-xl border transition-all ${theme === 'dark' ? 'bg-gray-800/50 border-white/5 backdrop-blur-md' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative group">
            <div className={`w-36 h-36 rounded-full flex items-center justify-center text-white text-6xl font-black shadow-2xl overflow-hidden ring-4 ring-offset-4 ${theme === 'dark' ? 'ring-blue-500/20 ring-offset-gray-900' : 'ring-blue-100 ring-offset-white'
              } ${!employee.image ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : ''}`}>
              {employee.image ? (
                <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                employee.name.charAt(0)
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              )}

              <button
                onClick={handleImageClick}
                disabled={isUploading}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
              >
                <Camera className="w-8 h-8" />
                <span className="text-[10px] font-bold uppercase tracking-wider">تغيير الصورة</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {employee.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-gray-400">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span>{employee.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mt-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Edit className="w-5 h-5" />
              تعديل الملف الشخصي
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!employee.files || employee.files.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <Download className="w-5 h-5" />
              سحب المستمسكات
            </button>
          </div>
        </div>
      </div>
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
      />
    </>
  );
};

export default ProfileHeader;
