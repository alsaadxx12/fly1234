import React, { useState } from 'react';
import { User, Mail, Phone, Edit, Download } from 'lucide-react';
import { Employee } from '../../../lib/collections/employees';
import { useTheme } from '../../../contexts/ThemeContext';
import EditProfileModal from './EditProfileModal';
import { generatePdf } from '../../../utils/pdfGenerator';

interface ProfileHeaderProps {
  employee: Employee;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ employee }) => {
  const { theme } = useTheme();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleExportPdf = async () => {
    if (!employee.files || employee.files.length === 0) {
      alert('لا توجد ملفات لتصديرها.');
      return;
    }
    await generatePdf(employee);
  };

  return (
    <>
      <div className={`p-6 rounded-2xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {employee.name.charAt(0)}
            </div>
          </div>
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-3xl font-bold">{employee.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={handleExportPdf}
              disabled={!employee.files || employee.files.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:bg-gray-400"
            >
              <Download className="w-4 h-4" />
              سحب المستمسكات
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              تعديل الملف الشخصي
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
