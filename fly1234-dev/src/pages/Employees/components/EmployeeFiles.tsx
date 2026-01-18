import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Employee } from '../../../lib/collections/employees';
import UploadFileModal from './UploadFileModal';
import { generatePdf } from '../../../utils/pdfGenerator';
import { Loader2, Search, User, Download, Upload, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { deleteEmployeeFile } from '../../../lib/collections/employees';
import { useNotification } from '../../../contexts/NotificationContext';
import ModernModal from '../../../components/ModernModal';
import ModernButton from '../../../components/ModernButton';

const EmployeeFiles: React.FC = () => {
    const { theme } = useTheme();
    const { employee: currentUser } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { showNotification } = useNotification();
    const [fileToDelete, setFileToDelete] = useState<{employeeId: string, fileId: string, fileName: string} | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'employees'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const employeesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Employee));
            setEmployees(employeesData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUploadClick = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsUploadModalOpen(true);
    };

    const handleFileUploaded = () => {
        // The onSnapshot listener will automatically refresh the data
        setIsUploadModalOpen(false);
    };

    const handleExportPdf = async (employee: Employee) => {
        if (!employee.files || employee.files.length === 0) {
            alert('لا توجد ملفات لتصديرها.');
            return;
        }
        await generatePdf(employee);
    };

    const handleDeleteFileClick = (employeeId: string, fileId: string, fileName: string) => {
        setFileToDelete({ employeeId, fileId, fileName });
    };

    const confirmDeleteFile = async () => {
        if (!fileToDelete) return;

        setIsDeleting(true);
        try {
            await deleteEmployeeFile(fileToDelete.employeeId, fileToDelete.fileId);
            showNotification('success', 'تم حذف الملف بنجاح');
            setFileToDelete(null);
        } catch (error) {
            console.error("Failed to delete file:", error);
            showNotification('error', 'فشل حذف الملف');
        } finally {
            setIsDeleting(false);
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ابحث عن موظف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map(emp => (
                    <div key={emp.id} className="rounded-xl border shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{emp.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleUploadClick(emp)} className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"><Upload className="w-4 h-4"/></button>
                                <button onClick={() => handleExportPdf(emp)} disabled={!emp.files || emp.files.length === 0} className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400"><Download className="w-4 h-4"/></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-300">الملفات المرفقة ({emp.files?.length || 0})</h4>
                            {emp.files && emp.files.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {emp.files.map(file => (
                                        <div key={file.id} className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between gap-2 text-sm">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate flex-1">
                                                <FileText className="w-4 h-4 text-blue-500"/>
                                                <span className="truncate font-medium">{file.name}</span>
                                            </a>
                                            <button 
                                                onClick={() => emp.id && handleDeleteFileClick(emp.id, file.id, file.name)}
                                                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"
                                                title="حذف الملف"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">لا توجد ملفات مرفقة.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {selectedEmployee && (
                <UploadFileModal 
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    employee={selectedEmployee}
                    onFileUploaded={handleFileUploaded}
                />
            )}
             <ModernModal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                title="تأكيد الحذف"
                size='sm'
            >
                <div>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">حذف ملف</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                هل أنت متأكد من حذف ملف "{fileToDelete?.fileName}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-center gap-3">
                    <ModernButton variant="secondary" onClick={() => setFileToDelete(null)}>إلغاء</ModernButton>
                    <ModernButton variant="danger" onClick={confirmDeleteFile} loading={isDeleting}>
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                    </ModernButton>
                </div>
            </ModernModal>
        </div>
    );
};

export default EmployeeFiles;
