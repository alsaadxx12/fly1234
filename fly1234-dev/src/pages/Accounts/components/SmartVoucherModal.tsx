import React, { useState, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { X, Sparkles, Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';
import { smartVoucherExtractor, ExtractedVoucherData } from '../../../lib/services/smartVoucherExtractor';

interface SmartVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoucherCreated: () => void;
}

export default function SmartVoucherModal({ isOpen, onClose, onVoucherCreated }: SmartVoucherModalProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedVoucherData | null>(null);
  const { showNotification } = useNotification();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setSelectedFile(file);
        setError('');
        handleExtractData(file);
      } else {
        setError('يرجى اختيار ملف صورة أو PDF صالح');
      }
    }
  };

  const handleExtractData = async (file: File) => {
    setExtracting(true);
    setError('');
    try {
      const data = await smartVoucherExtractor(file);
      setExtractedData(data);
      showNotification('success', 'تم استخراج البيانات بنجاح!');
      // Here you would typically open the NewVoucherModal with the extracted data
      // For now, we just log it and reset
      console.log('Extracted Data:', data);
      setTimeout(() => {
        onClose();
        resetModal();
      }, 3000); // Close after 3 seconds for demonstration
    } catch (err: any) {
      setError(err.message || 'فشل استخراج البيانات');
    } finally {
      setExtracting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setError('');
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة سند ذكي</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                استخراج البيانات تلقائيًا من ملف
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); resetModal(); }}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              theme === 'dark'
                ? 'border-gray-600 hover:border-blue-500 bg-gray-900/50'
                : 'border-gray-300 hover:border-blue-500 bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {extracting ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  جاري تحليل الملف...
                </p>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-blue-500 mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-full">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  اسحب وأفلت ملف PDF أو صورة هنا
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أو انقر للتصفح</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}