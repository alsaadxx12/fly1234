import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { FileSpreadsheet, X, Upload, AlertTriangle, Check, Download, FileText, Info, Loader2, Table } from 'lucide-react';
import { readExcelFile, validateExcelFile, cleanString } from '../../../lib/services/excelService';

interface ImportCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  importFile: File | null;
  setImportFile: (file: File | null) => void;
  importPreview: any[];
  setImportPreview: (data: any[]) => void;  // Added missing prop
  isImporting: boolean;
  importSuccess: string | null;
  onImport: () => Promise<boolean>;
  downloadTemplate: () => void;
}

const ImportCompaniesModal: React.FC<ImportCompaniesModalProps> = ({
  isOpen,
  onClose,
  importFile,
  setImportFile,
  importPreview,
  setImportPreview,  // Added missing prop
  isImporting,
  importSuccess,
  onImport,
  downloadTemplate
}) => {
  const { t } = useLanguage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [importProgress, setImportProgress] = React.useState(0); 
  const [dragActive, setDragActive] = React.useState(false);
  const [processingFile, setProcessingFile] = React.useState(false); 
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };
  
  const processFile = async (file: File) => {
    setError(null);
    setProcessingFile(true);
    setImportFile(file);
    setImportPreview([]);
    setImportProgress(0);
    
    // Simulate progress
    let progress = 0; 
    const interval = setInterval(() => {
      progress += 10;
      setImportProgress(Math.min(progress, 90));
      if (progress >= 90) clearInterval(interval);
    }, 100);
    
    try {
      // Validate file first
      const validation = validateExcelFile(file);
      if (!validation.valid) {
        setProcessingFile(false);
        setError(validation.error || 'ملف غير صالح');
        setImportProgress(100);
        clearInterval(interval);
        return;
      }
      
      // Read Excel file with our utility function
      const rows = await readExcelFile(file);
      
      console.log('Excel rows:', rows);
      if (rows.length <= 1) {
        setError('الملف فارغ أو يحتوي على عناوين فقط');
        setProcessingFile(false);
        setImportProgress(100);
        clearInterval(interval);
        return;
      }
      
      // Skip header row and map data - ensure we have valid rows
      const data = rows.slice(1)
        .filter(row => Array.isArray(row) && row.length >= 1)
        .map((row) => {
          // Get and clean the first three columns
          const name = row[0] !== undefined ? cleanString(String(row[0])) : '';
          const id = row[1] !== undefined ? cleanString(String(row[1])) : '';
          const paymentTypeStr = row[2] !== undefined ? String(row[2]) : '';
          
          // Determine payment type based on text content
          const paymentType = (
            paymentTypeStr.toLowerCase().includes('credit') || 
            paymentTypeStr.toLowerCase().includes('آجل') ||
            paymentTypeStr.toLowerCase().includes('اجل')
          ) ? 'credit' : 'cash';
          
          return {
            name,
            id,
            paymentType
        }; 
      });
      
      // Filter out rows with empty names
      const validData = data.filter(item => item.name && item.name.trim() !== '');
      
      console.log('Valid data for preview:', validData);
      console.log('Setting import preview with', validData.length, 'items');
      setImportPreview(validData);
      setImportProgress(100);
      clearInterval(interval);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setError('فشل في قراءة ملف الإكسل. تأكد من أن الملف بتنسيق Excel صحيح (.xlsx)');
      clearInterval(interval);
      setImportProgress(100);
    }
    
    setProcessingFile(false);
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Check if file is Excel
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')) {
        processFile(file);
      } else {
        setError('يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV (.csv)');
      }
    }
  };
  
  const handleImport = async () => {
    setError(null);
    const success = await onImport(); 
    if (success) {
      setTimeout(() => {
        onClose();
        setImportFile(null);
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xl mx-4 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-secondary-800" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-secondary-800">استيراد الشركات من ملف إكسل</h3>
              <p className="text-sm text-gray-500">قم بتحميل ملف إكسل يحتوي على بيانات الشركات</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setImportFile(null);
            }}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {!importFile ? (
            <div 
              className={`border-2 border-dashed ${dragActive ? 'border-primary bg-primary-50' : 'border-gray-300'} rounded-xl p-8 text-center`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-secondary-50 rounded-full">
                  <FileSpreadsheet className="w-8 h-8 text-secondary-800" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-secondary-800 mb-2">اختر ملف إكسل</h4>
                  <p className="text-gray-500 mb-4">قم بسحب وإفلات ملف Excel هنا أو انقر للاختيار</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    اختيار ملف
                  </button>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل قالب</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <div>
                      <span className="font-medium text-secondary-800">{importFile.name}</span>
                      <div className="text-xs text-gray-500">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {importProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                )}
                
                {importPreview.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border rounded-lg shadow-inner bg-gray-50">
                    <table className="w-full border-collapse text-right min-w-full">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 border-b border-r">اسم الشركة</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 border-b border-r">معرف الشركة</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 border-b">نوع التعامل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreview.map((company, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-800 font-medium border-r">{company.name || '-'}</td>
                            <td className="px-4 py-2 text-xs text-gray-800 border-r">{company.id || company.companyId || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                company.paymentType === 'cash' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {company.paymentType === 'cash' ? 'نقدي' : 'آجل'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-gray-600 min-h-[60px]">
                  {importPreview.length > 0 ? `تم العثور على ${importPreview.length} شركة في الملف` : ''}
                  {importPreview.length === 0 && error === null && !processingFile && (
                    <div className="mt-2 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-sm flex items-center gap-2">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>لم يتم العثور على بيانات في الملف. تأكد من أن الملف يحتوي على الأعمدة الثلاثة: اسم الشركة، معرف الشركة، نوع التعامل.</span>
                    </div>
                  )}
                  {processingFile && (
                    <div className="flex items-center justify-center gap-2 mt-2 p-3 bg-primary-50 rounded-lg border border-primary-100">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-primary">جاري معالجة الملف...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {importPreview.length === 0 && !error && !processingFile && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <div className="flex justify-center mb-3">
                    <Table className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">لم يتم العثور على بيانات في الملف. تأكد من أن الملف يحتوي على الأعمدة المطلوبة.</p>
                </div>
              )}
              
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {importSuccess && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => {
              onClose();
              setImportFile(null);
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
          {importFile && (
            <button
              onClick={handleImport}
              disabled={isImporting || importPreview.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الاستيراد...</span>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>استيراد الشركات{importPreview.length > 0 ? ` (${importPreview.length})` : ''}</span>
                  {importPreview.length > 0 && <span className="px-2 py-0.5 bg-primary-100 text-primary rounded-full text-xs">({importPreview.length})</span>}
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCompaniesModal;