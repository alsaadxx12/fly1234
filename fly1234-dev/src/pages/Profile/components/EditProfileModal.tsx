import React, { useState } from 'react';
import { Employee } from '../../../lib/collections/employees';
import { useAuth } from '../../../contexts/AuthContext';
import ModernModal from '../../../components/ModernModal';
import ModernInput from '../../../components/ModernInput';
import ModernButton from '../../../components/ModernButton';
import { Mail, Phone, Key, User, Save, Loader2 } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useNotification } from '../../../contexts/NotificationContext';


interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, employee }) => {
  const { updateEmployeeProfile } = useAuth();
  const [phone, setPhone] = useState(employee.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const { showNotification } = useNotification();

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      // Update phone number
      if (phone !== employee.phone) {
        await updateEmployeeProfile(employee.id!, { phone });
      }

      // Update password
      if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('كلمات المرور الجديدة غير متطابقة');
        }
        if (newPassword.length < 6) {
          throw new Error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
        }
        const user = auth.currentUser;
        if (user && user.email) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
        }
      }
      showNotification('success', 'تم تحديث الملف الشخصي بنجاح');
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الملف الشخصي');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل الملف الشخصي"
      icon={<User className="w-5 h-5"/>}
      size="md"
    >
      <div className="space-y-4">
        {error && <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">{error}</div>}
        <ModernInput
          label="الاسم الكامل"
          value={employee.name}
          disabled
          icon={<User className="w-4 h-4"/>}
        />
        <ModernInput
          label="البريد الإلكتروني"
          value={employee.email}
          disabled
          icon={<Mail className="w-4 h-4"/>}
        />
        <ModernInput
          label="رقم الهاتف"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone className="w-4 h-4"/>}
        />
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-bold mb-2">تغيير كلمة المرور</h4>
          <div className="space-y-3">
             <ModernInput
                label="كلمة المرور الحالية"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                icon={<Key className="w-4 h-4"/>}
             />
             <ModernInput
                label="كلمة المرور الجديدة"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Key className="w-4 h-4"/>}
             />
             <ModernInput
                label="تأكيد كلمة المرور الجديدة"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Key className="w-4 h-4"/>}
             />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <ModernButton variant="secondary" onClick={onClose}>إلغاء</ModernButton>
          <ModernButton onClick={handleSave} loading={isSaving} icon={<Save className="w-4 h-4"/>}>
            حفظ التغييرات
          </ModernButton>
        </div>
      </div>
    </ModernModal>
  );
};

export default EditProfileModal;
