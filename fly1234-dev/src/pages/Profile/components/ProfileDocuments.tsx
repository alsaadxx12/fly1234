import React, { useState } from 'react';
import { Employee, EmployeeFile } from '../../../lib/collections/employees';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Paperclip, FileText, Trash2, Upload, Loader2, AlertCircle } from 'lucide-react';
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
  
  // to force re-render after upload
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeleteFile = async () => {
    if (!fileToDelete || !employee.id) return;
    setIsDeleting(true);
    try {
        await deleteEmployeeFile(employee.id, fileToDelete.id);
        showNotification('success', 'تم حذف الملف بنجاح');
        setFileToDelete(null);
        // Force refresh
        setRefreshKey(prev => prev + 1);
    } catch(err) {
        showNotification('error', 'فشل حذف الملف');
    } finally {
        setIsDeleting(false);
    }
  }


  return (
    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2"><Paperclip className="w-5 h-5"/>المستمسكات</h3>
      </div>
      <div className="space-y-3">
        {employee.files && employee.files.length > 0 ? (
          employee.files.map(file => (
            <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500"/>
                <span className="font-medium text-sm">{file.name}</span>
              </a>
              <button onClick={() => setFileToDelete(file)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">لا توجد ملفات مرفقة.</p>
        )}
      </div>

       <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        employee={employee}
        onFileUploaded={() => setRefreshKey(p => p+1)}
      />

       <ModernModal isOpen={!!fileToDelete} onClose={() => setFileToDelete(null)} title="تأكيد الحذف" size="sm">
            <p>هل أنت متأكد من حذف ملف "{fileToDelete?.name}"؟</p>
             <div className="flex justify-end gap-3 mt-4">
                <ModernButton variant="secondary" onClick={() => setFileToDelete(null)}>إلغاء</ModernButton>
                <ModernButton variant="danger" loading={isDeleting} onClick={handleDeleteFile}>
                    {isDeleting ? 'جاري الحذف...': 'حذف'}
                </ModernButton>
             </div>
        </ModernModal>
    </div>
  );
}

export default ProfileDocuments;
