import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db, storage } from '../../../lib/firebase';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Employee, EmployeeFile } from '../../../lib/collections/employees';
import { X, Upload, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';
import ModernButton from '../../../components/ModernButton';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onFileUploaded: () => void;
}

const DOCUMENT_TYPES = [
    'الهوية الوطنية', 'بطاقة السكن', 'جواز السفر', 'عقد التوظيف', 'صورة شخصية', 'أخرى'
];

export function UploadFileModal({ isOpen, onClose, employee, onFileUploaded }: UploadFileModalProps) {
    const { employee: currentUser } = useAuth();
    const [filesToUpload, setFilesToUpload] = useState<{ file: File; name: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                name: DOCUMENT_TYPES[0]
            }));
            setFilesToUpload(prev => [...prev, ...newFiles]);
        }
    };
    
    const handleNameChange = (index: number, name: string) => {
        setFilesToUpload(prev => prev.map((item, i) => i === index ? { ...item, name } : item));
    };

    const handleRemoveFile = (index: number) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        const auth = getAuth();
        if (!auth.currentUser) {
            setError("لا يوجد مستخدم مسجّل دخول. يرجى إعادة تسجيل الدخول والمحاولة مرة أخرى.");
            setIsUploading(false);
            return;
        }

        if (filesToUpload.length === 0) {
            setError('الرجاء اختيار ملف واحد على الأقل');
            return;
        }
        
        setIsUploading(true);
        setError('');

        try {
            const uploadPromises = filesToUpload.map(async ({ file, name }) => {
                const storageRef = ref(storage, `employee-files/${employee.userId}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);

                const newFile: EmployeeFile = {
                    id: crypto.randomUUID(),
                    name: name || file.name,
                    url: downloadURL,
                    uploadedAt: new Date(),
                    uploadedBy: currentUser?.name || 'Unknown'
                };
                return newFile;
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            const employeeRef = doc(db, 'employees', employee.id!);
            await updateDoc(employeeRef, {
                files: arrayUnion(...uploadedFiles)
            });

            onFileUploaded();
            onClose();
        } catch (err) {
            console.error(err);
            setError('فشل رفع الملفات. قد تكون هناك مشكلة في الصلاحيات أو الاتصال. حاول مرة أخرى.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ModernModal isOpen={isOpen} onClose={onClose} title={`رفع ملفات لـ ${employee.name}`}>
            <div className="space-y-4">
                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                >
                    <input id="file-upload-input" type="file" multiple onChange={handleFileChange} className="hidden" />
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">اسحب وأفلت الملفات هنا، أو انقر للتصفح</p>
                </div>

                {filesToUpload.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {filesToUpload.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                                    <select 
                                        value={item.name}
                                        onChange={(e) => handleNameChange(index, e.target.value)}
                                        className="w-full mt-1 text-xs bg-transparent border-gray-300 rounded"
                                    >
                                        {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => handleRemoveFile(index)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <ModernButton variant="secondary" onClick={onClose}>إلغاء</ModernButton>
                    <ModernButton onClick={handleUpload} loading={isUploading}>
                        <Upload className="w-4 h-4"/>
                        {isUploading ? 'جاري الرفع...' : `رفع (${filesToUpload.length})`}
                    </ModernButton>
                </div>
            </div>
        </ModernModal>
    );
}

export default UploadFileModal;