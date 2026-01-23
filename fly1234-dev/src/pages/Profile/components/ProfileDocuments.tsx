import React, { useState } from 'react';
import { Employee, EmployeeFile } from '../../../lib/collections/employees';
import { useTheme } from '../../../contexts/ThemeContext';
import { Paperclip, FileText, Trash2 } from 'lucide-react';
import UploadFileModal from '../../Employees/components/UploadFileModal';
import { deleteEmployeeFile } from '../../../lib/collections/employees';
import { useNotification } from '../../../contexts/NotificationContext';
import ModernModal from '../../../components/ModernModal';
import ModernButton from '../../../components/ModernButton';


interface ProfileDocumentsProps {
  employee: Employee;
}

const ProfileDocuments: React.FC<ProfileDocumentsProps> = ({ employee }) => {
  const { theme } = useTheme();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<EmployeeFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();


  const handleDeleteFile = async () => {
    if (!fileToDelete || !employee.id) return;
    setIsDeleting(true);
    try {
      await deleteEmployeeFile(employee.id, fileToDelete.id);
      showNotification('success', 'نجاح', 'تم حذف الملف بنجاح');
      setFileToDelete(null);
      // Force refresh
    } catch (err) {
      showNotification('error', 'خطأ', 'فشل حذف الملف');
    } finally {
      setIsDeleting(false);
    }
  }


  return (
    <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employee.files && employee.files.length > 0 ? (
          employee.files.map(file => (
            <div key={file.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:shadow-md'
              }`}>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50 text-blue-600'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{file.name}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Document File</span>
                </div>
              </a>
              <button
                onClick={() => setFileToDelete(file)}
                className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'
                  }`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        ) : (
          <div className={`col-span-full p-12 rounded-3xl border-2 border-dashed flex flex-col items-center gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'
            }`}>
            <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
              <Paperclip className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-bold">لا توجد ملفات مرفقة حالياً</p>
          </div>
        )}
      </div>

      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        employee={employee}
        onFileUploaded={() => { }}
      />

      <ModernModal isOpen={!!fileToDelete} onClose={() => setFileToDelete(null)} title="تأكيد الحذف" size="sm">
        <p>هل أنت متأكد من حذف ملف "{fileToDelete?.name}"؟</p>
        <div className="flex justify-end gap-3 mt-4">
          <ModernButton variant="secondary" onClick={() => setFileToDelete(null)}>إلغاء</ModernButton>
          <ModernButton variant="danger" loading={isDeleting} onClick={handleDeleteFile}>
            {isDeleting ? 'جاري الحذف...' : 'حذف'}
          </ModernButton>
        </div>
      </ModernModal>
    </div>
  );
}

export default ProfileDocuments;
