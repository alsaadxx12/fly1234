import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, AlertTriangle, CheckCircle, Clock, Search, Trash2, User, CheckCircle2, ChevronLeft, ChevronRight, Edit, Upload, Image as ImageIcon, DollarSign, X, Calendar, Activity, CreditCard, UserCircle, Shield, Wallet, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import useMastercardIssues from './MastercardIssues/hooks/useMastercardIssues';
import { MastercardIssue, IssuePriority } from './MastercardIssues/types';
import ModernModal from '../components/ModernModal';
import ArabicDatePicker from '../components/ArabicDatePicker';
import useImageUpload from '../hooks/useImageUpload';


const priorityConfig = {
  high: { label: 'عاجلة', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-500 text-white', cardColor: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
  medium: { label: 'متوسطة', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500 text-white', cardColor: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  low: { label: 'عادية', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-blue-500 text-white', cardColor: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
};

const statusConfig = {
  pending: { label: 'معلقة', color: 'text-yellow-500' },
  in_progress: { label: 'قيد المتابعة', color: 'text-blue-500' },
  resolved: { label: 'تم الإنجاز', color: 'text-green-500' },
};


export default function MastercardIssues() {
  const { theme } = useTheme();
  const { issues, addIssue, updateIssue, deleteIssue, updateIssueStatus, assignIssue, loading } = useMastercardIssues();
  const { uploadImage } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [isAddOrEditModalOpen, setIsAddOrEditModalOpen] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<MastercardIssue | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<MastercardIssue | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [newIssue, setNewIssue] = useState({
    title: 'المبلغ مستقطع من الزبون لم يتم شحن الحساب',
    description: '',
    issueDate: new Date(),
    priority: 'high' as IssuePriority,
    refundAmount: '',
    refundCurrency: 'USD' as 'USD' | 'IQD',
    refundMethod: 'balance' as 'mastercard' | 'balance',
    transactionImageFiles: [] as File[],
    transactionImageURLs: [] as string[],
    mastercardAccountNumber: '',
    cardholderName: '',
    customerEmail: '',
    customerUsername: '',
    transferType: 'ماستر كارد' as 'زين كاش' | 'ماستر كارد',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | IssuePriority>('all');
  const [issueToResolve, setIssueToResolve] = useState<MastercardIssue | null>(null);

  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<Date | undefined>(undefined);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const historyItemsPerPage = 5;
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setNewIssue(prev => ({
      ...prev,
      transactionImageFiles: [...prev.transactionImageFiles, ...newFiles]
    }));
  }, []);

  useEffect(() => {
    const pasteHandler = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileChange(new DataTransfer().files);
          }
        }
      }
    };

    const dropzone = dropzoneRef.current;
    if (dropzone) {
      dropzone.addEventListener('paste', pasteHandler as any);
    }

    return () => {
      if (dropzone) {
        dropzone.removeEventListener('paste', pasteHandler as any);
      }
    };
  }, [handleFileChange]);

  const openAddModal = () => {
    setIssueToEdit(null);
    setModalStep(1);
    setNewIssue({
      title: 'المبلغ مستقطع من الزبون لم يتم شحن الحساب',
      description: '',
      issueDate: new Date(),
      priority: 'high',
      refundAmount: '',
      refundCurrency: 'USD',
      refundMethod: 'balance',
      transactionImageFiles: [],
      transactionImageURLs: [],
      mastercardAccountNumber: '',
      cardholderName: '',
      customerEmail: '',
      customerUsername: '',
      transferType: 'ماستر كارد',
    });
    setIsAddOrEditModalOpen(true);
  };

  const openEditModal = (issue: MastercardIssue) => {
    setIssueToEdit(issue);
    setModalStep(1);
    setNewIssue({
      title: issue.title,
      description: issue.description || '',
      issueDate: new Date(issue.issueDate),
      priority: issue.priority,
      refundAmount: issue.refundAmount?.toString() || '',
      refundCurrency: issue.refundCurrency || 'USD',
      refundMethod: issue.refundMethod || 'balance',
      transactionImageFiles: [],
      transactionImageURLs: issue.transactionImageURLs || [],
      mastercardAccountNumber: issue.mastercardAccountNumber || '',
      cardholderName: issue.cardholderName || '',
      customerEmail: issue.customerEmail || '',
      customerUsername: issue.customerUsername || '',
      transferType: issue.transferType || 'ماستر كارد',
    });
    setIsAddOrEditModalOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!newIssue.title || !newIssue.mastercardAccountNumber) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    let upToDateImageURLs = [...newIssue.transactionImageURLs];
    if (newIssue.transactionImageFiles.length > 0) {
      for (const file of newIssue.transactionImageFiles) {
        const url = await uploadImage(file);
        if (url) upToDateImageURLs.push(url);
      }
    }

    const { transactionImageFiles, ...cleanIssueData } = newIssue;
    const issueData = {
      ...cleanIssueData,
      transactionImageURLs: upToDateImageURLs,
      refundAmount: newIssue.refundAmount ? parseFloat(newIssue.refundAmount) : 0,
    };

    if (issueToEdit) {
      await updateIssue(issueToEdit.id, issueData as any);
      toast.success('تم تحديث المشكلة بنجاح');
    } else {
      await addIssue(issueData as any);
      toast.success('تم إضافة المشكلة بنجاح');
    }

    setIsAddOrEditModalOpen(false);
  };

  const openGallery = (images: string[], index: number) => {
    setGalleryImages(images);
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setGalleryImages([]);
    setGalleryIndex(0);
  };

  const confirmResolveIssue = async () => {
    if (issueToResolve) {
      try {
        await updateIssueStatus(issueToResolve.id, 'resolved');
        toast.success('تم إنجاز المشكلة بنجاح');
        setIssueToResolve(null);
      } catch (error) {
        toast.error('حدث خطأ أثناء تحديث الحالة');
      }
    }
  };

  const confirmDeleteIssue = async () => {
    if (issueToDelete) {
      try {
        await deleteIssue(issueToDelete.id);
        toast.success('تم حذف المشكلة بنجاح');
        setIssueToDelete(null);
      } catch (error) {
        toast.error('حدث خطأ أثناء الحذف');
      }
    }
  };

  const filteredIssues = issues.filter(issue =>
    issue.status !== 'resolved' &&
    (issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (issue.mastercardAccountNumber && issue.mastercardAccountNumber.includes(searchTerm)) ||
      (issue.cardholderName && issue.cardholderName.toLowerCase().includes(searchTerm.toLowerCase()))) &&
    (filterPriority === 'all' || issue.priority === filterPriority)
  );

  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');

  const filteredHistoryIssues = resolvedIssues.filter(issue => {
    const matchesSearch = historySearchTerm === '' ||
      issue.mastercardAccountNumber?.includes(historySearchTerm) ||
      issue.cardholderName?.toLowerCase().includes(historySearchTerm.toLowerCase());
    const matchesDate = !historyDateFilter ||
      (issue.resolvedAt && new Date(issue.resolvedAt).toDateString() === new Date(historyDateFilter).toDateString());
    return matchesSearch && matchesDate;
  });

  const historyTotalPages = Math.ceil(filteredHistoryIssues.length / historyItemsPerPage);
  const historyPaginatedIssues = filteredHistoryIssues.slice(
    (historyCurrentPage - 1) * historyItemsPerPage,
    historyCurrentPage * historyItemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 lg:max-w-7xl lg:mx-auto text-right">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 backdrop-blur-md shadow-xl">
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
            مشاكل بوابة الماستر
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold flex items-center justify-center sm:justify-start gap-2">
            <Plus className="w-4 h-4 text-emerald-500" />
            إدارة ومتابعة مشاكل شحن بطاقات الماستر كارد
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-black shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>السجل</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-xl font-black shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة</span>
          </button>
        </div>
      </div>

      <div className={`rounded-xl p-4 space-y-4 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الحساب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-10 pl-4 py-2 rounded-lg border-2 text-sm font-medium ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'} focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
            />
          </div>
          <div className={`p-1 rounded-lg flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <button onClick={() => setFilterPriority('all')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'all' ? (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>الكل</button>
            <button onClick={() => setFilterPriority('high')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'high' ? (theme === 'dark' ? 'bg-red-500 text-white' : 'bg-red-500 text-white shadow-sm') : 'text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/50'}`}>عاجلة</button>
            <button onClick={() => setFilterPriority('medium')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'medium' ? (theme === 'dark' ? 'bg-yellow-500 text-white' : 'bg-yellow-500 text-white shadow-sm') : 'text-gray-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'}`}>متوسطة</button>
            <button onClick={() => setFilterPriority('low')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'low' ? (theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white shadow-sm') : 'text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}>عادية</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {Object.entries(priorityConfig).map(([key, config]) => (
          <div key={key} className={`p-4 rounded-3xl border-2 flex items-center justify-between transition-all hover:scale-[1.02] ${config.cardColor}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl shadow-lg ${config.color}`}>
                {config.icon}
              </div>
              <span className="font-black text-slate-800 dark:text-slate-100">{config.label}</span>
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {issues.filter(i => i.priority === key && i.status !== 'resolved').length}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['high', 'medium', 'low'].map(priority => (
          <div key={priority}>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              {priorityConfig[priority as IssuePriority].icon}
              {priorityConfig[priority as IssuePriority].label}
            </h2>
            <div className="space-y-4">
              {filteredIssues.filter(i => i.priority === priority).map(issue => (
                <div key={issue.id} className={`p-4 rounded-lg shadow-sm border ${priorityConfig[issue.priority].cardColor}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base">{issue.title}</h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-xs font-bold text-gray-500">حساب: {issue.mastercardAccountNumber}</p>
                        <p className="text-xs font-bold text-orange-600">نوع التحويل: {issue.transferType || 'ماستر كارد'}</p>
                        {issue.cardholderName && <p className="text-xs font-bold text-gray-400">الاسم: {issue.cardholderName}</p>}
                      </div>
                      {issue.refundAmount && (
                        <div className="flex items-center gap-2 text-sm mt-2 font-semibold text-gray-600 dark:text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          <span>{issue.refundAmount} {issue.refundMethod === 'mastercard' ? 'USD' : 'IQD'}</span>
                        </div>
                      )}
                      {issue.transactionImageURLs && issue.transactionImageURLs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {issue.transactionImageURLs.map((_, index) => (
                            <button key={index} onClick={() => openGallery(issue.transactionImageURLs!, index)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> عرض الصورة {issue.transactionImageURLs!.length > 1 ? index + 1 : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusConfig[issue.status].color} bg-opacity-10`}>
                      {statusConfig[issue.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{issue.description}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(issue.issueDate).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{issue.createdByName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    {issue.assignedToName ? (
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        المتابع: {issue.assignedToName}
                      </span>
                    ) : (
                      <button onClick={() => assignIssue(issue.id)} className="text-blue-500 hover:underline">
                        متابعة المشكلة
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(issue)} className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setIssueToDelete(issue)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                      {issue.status !== 'resolved' && (
                        <button
                          onClick={() => setIssueToResolve(issue)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold text-xs hover:bg-green-600 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          إنجاز
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <button onClick={closeGallery} className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full">
            <X className="w-8 h-8" />
          </button>

          <div className="relative w-full max-w-4xl aspect-video flex items-center justify-center">
            <img src={galleryImages[galleryIndex]} alt="Gallery" className="max-w-full max-h-full object-contain shadow-2xl" />

            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                  className="absolute left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
                <button
                  onClick={() => setGalleryIndex(prev => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setGalleryIndex(idx)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === galleryIndex ? 'border-orange-500 scale-110' : 'border-white/20'}`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <ModernModal
        isOpen={isAddOrEditModalOpen}
        onClose={() => setIsAddOrEditModalOpen(false)}
        title={issueToEdit ? 'تعديل مشكلة ماستر' : 'إضافة مشكلة ماستر'}
        description="أدخل تفاصيل المشكلة للمتابعة"
        size="lg"
        closeOnOutsideClick={false}
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              {modalStep > 1 && (
                <button
                  onClick={() => setModalStep(prev => prev - 1)}
                  className="px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  السابق
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsAddOrEditModalOpen(false)} className="px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">إلغاء</button>
              {modalStep < 3 ? (
                <button
                  onClick={() => setModalStep(prev => prev + 1)}
                  className="px-6 py-3 rounded-xl font-bold bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                >
                  التالي
                </button>
              ) : (
                <button
                  onClick={handleFormSubmit}
                  className="px-6 py-3 rounded-xl font-bold bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                >
                  {issueToEdit ? 'حفظ' : 'إضافة'}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="p-0 overflow-y-auto max-h-[calc(90vh-220px)]">
          {modalStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-1">
                  <Activity className="w-4 h-4 text-orange-500" />
                  نوع المشكلة
                </label>
                <select
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="المبلغ مستقطع من الزبون لم يتم شحن الحساب">المبلغ مستقطع من الزبون لم يتم شحن الحساب</option>
                  <option value="تم تحويل المبلغ ولم يوصل لبطاقة الزبون">تم تحويل المبلغ ولم يوصل لبطاقة الزبون</option>
                  <option value="مشكلة في تسجيل الدخول">مشكلة في تسجيل الدخول</option>
                  <option value="مبلغ مستلم من الزبون لم يتم تعزيزه">مبلغ مستلم من الزبون لم يتم تعزيزه</option>
                  <option value="مشكلة NOT PAID">مشكلة NOT PAID</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    تاريخ المشكلة
                  </label>
                  <ArabicDatePicker value={newIssue.issueDate} onChange={(date) => setNewIssue({ ...newIssue, issueDate: date })} />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    الأولوية
                  </label>
                  <select
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as IssuePriority })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="low">عادية</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عاجلة</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-1">
                  <Activity className="w-4 h-4 text-orange-500" />
                  وصف المشكلة
                </label>
                <textarea
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700 min-h-[100px]"
                  placeholder="أدخل وصفاً تفصيلياً للمشكلة..."
                />
              </div>
            </div>
          )}

          {modalStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    رقم الحساب (AccountNumber)
                  </label>
                  <input
                    type="text"
                    value={newIssue.mastercardAccountNumber}
                    onChange={(e) => setNewIssue({ ...newIssue, mastercardAccountNumber: e.target.value })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <UserCircle className="w-4 h-4 text-orange-500" />
                    اسم صاحب البطاقة
                  </label>
                  <input
                    type="text"
                    value={newIssue.cardholderName}
                    onChange={(e) => setNewIssue({ ...newIssue, cardholderName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <UserCircle className="w-4 h-4 text-orange-500" />
                    البريد الإلكتروني للزبون
                  </label>
                  <input
                    type="email"
                    value={newIssue.customerEmail}
                    onChange={(e) => setNewIssue({ ...newIssue, customerEmail: e.target.value })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <Shield className="w-4 h-4 text-orange-500" />
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    value={newIssue.customerUsername}
                    onChange={(e) => setNewIssue({ ...newIssue, customerUsername: e.target.value })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-1">
                    <Wallet className="w-4 h-4 text-orange-500" />
                    مبلغ الاسترجاع (اختياري)
                  </label>
                  <input
                    type="number"
                    value={newIssue.refundAmount}
                    onChange={(e) => setNewIssue({ ...newIssue, refundAmount: e.target.value })}
                    className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <select
                    value={newIssue.refundCurrency}
                    onChange={(e) => setNewIssue({ ...newIssue, refundCurrency: e.target.value as 'USD' | 'IQD' })}
                    className="flex-1 p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="USD">USD</option>
                    <option value="IQD">IQD</option>
                  </select>
                  <select
                    value={newIssue.refundMethod}
                    onChange={(e) => setNewIssue({ ...newIssue, refundMethod: e.target.value as 'mastercard' | 'balance' })}
                    className="flex-1 p-2.5 border rounded-xl dark:bg-gray-800 dark:border-gray-700"
                  >
                    <option value="mastercard">البطاقة</option>
                    <option value="balance">الرصيد</option>
                  </select>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-1 text-center font-bold">
                      <Repeat className="w-4 h-4 text-orange-500" />
                      نوع التحويل
                    </label>
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setNewIssue({ ...newIssue, transferType: 'ماستر كارد' })}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${newIssue.transferType === 'ماستر كارد' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                      >
                        ماستر كارد
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewIssue({ ...newIssue, transferType: 'زين كاش' })}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${newIssue.transferType === 'زين كاش' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                      >
                        زين كاش
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalStep === 3 && (
            <div className="space-y-4">
              <div
                ref={dropzoneRef}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files);
                }}
              >
                <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="font-bold text-gray-600 dark:text-gray-300">اسحب الصور هنا أو اضغط للاختيار</p>
                <p className="text-xs text-gray-500 mt-2">يمكنك أيضاً لصق الصور مباشرة (Ctrl+V)</p>
              </div>

              {(newIssue.transactionImageFiles.length > 0 || newIssue.transactionImageURLs.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-4">
                  {newIssue.transactionImageURLs.map((url, idx) => (
                    <div key={`url-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={url} alt="Uploaded" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewIssue(prev => ({ ...prev, transactionImageURLs: prev.transactionImageURLs.filter((_, i) => i !== idx) }));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newIssue.transactionImageFiles.map((file, idx) => (
                    <div key={`file-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 flex items-center justify-center">
                      <p className="text-[10px] p-2 text-center break-all">{file.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewIssue(prev => ({ ...prev, transactionImageFiles: prev.transactionImageFiles.filter((_, i) => i !== idx) }));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ModernModal>

      {/* Resolve Confirmation */}
      {issueToResolve && (
        <ModernModal isOpen={!!issueToResolve} onClose={() => setIssueToResolve(null)} title="تأكيد إنجاز المشكلة" icon={<CheckCircle className="w-6 h-6" />} iconColor="green">
          <p className="text-center text-lg text-gray-700 dark:text-gray-300">هل أنت متأكد من تحديد هذه المشكلة كـ "تم الإنجاز"؟</p>
          <div className="mt-6 flex justify-center gap-4">
            <button onClick={() => setIssueToResolve(null)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold">إلغاء</button>
            <button onClick={confirmResolveIssue} className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> تأكيد الإنجاز
            </button>
          </div>
        </ModernModal>
      )}

      {/* Delete Confirmation */}
      {issueToDelete && (
        <ModernModal isOpen={!!issueToDelete} onClose={() => setIssueToDelete(null)} title="تأكيد حذف المشكلة" icon={<Trash2 className="w-6 h-6" />} iconColor="red">
          <p className="text-center text-lg text-gray-700 dark:text-gray-300">هل أنت متأكد من حذف هذه المشكلة؟</p>
          <div className="mt-6 flex justify-center gap-4">
            <button onClick={() => setIssueToDelete(null)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold">إلغاء</button>
            <button onClick={confirmDeleteIssue} className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> تأكيد الحذف
            </button>
          </div>
        </ModernModal>
      )}

      {/* History Modal */}
      <ModernModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="سجل المشاكل المنجزة" icon={<CheckCircle2 className="w-6 h-6" />} iconColor="green" size="xl">
        <div className="flex flex-col h-[70vh]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="بحث برقم الحساب أو الاسم..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="w-full px-4 py-2 pr-10 border rounded-lg bg-gray-50 dark:bg-gray-900/50" />
            </div>
            <div className="w-56"><ArabicDatePicker value={historyDateFilter} onChange={(date) => setHistoryDateFilter(date)} placeholder="فلترة حسب التاريخ" /></div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {historyPaginatedIssues.length > 0 ? (
              historyPaginatedIssues.map(issue => (
                <div key={issue.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{issue.title}</span>
                      <div className="flex items-center gap-4 mt-0.5">
                        <p className="text-xs text-gray-500 font-bold">حساب: <span className="text-gray-700 dark:text-gray-300">{issue.mastercardAccountNumber}</span></p>
                        <p className="text-xs text-orange-600 font-bold">نوع: <span className="text-orange-600">{issue.transferType || 'ماستر كارد'}</span></p>
                        {issue.refundAmount && (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {issue.refundAmount} {issue.refundMethod === 'mastercard' ? 'USD' : 'IQD'}
                          </p>
                        )}
                      </div>
                      {issue.description && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{issue.description}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${priorityConfig[issue.priority].color}`}>
                      {priorityConfig[issue.priority].label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-6 gap-y-1">
                    <span>صاحب البطاقة: <span className="text-gray-700 dark:text-gray-300 font-bold">{issue.cardholderName || '-'}</span></span>
                    <span>بدأ المتابعة: <span className="text-gray-700 dark:text-gray-300 font-bold">{issue.assignedToName || '-'}</span></span>
                    <span>من أنجزها: <span className="text-gray-700 dark:text-gray-300 font-bold">{issue.resolvedByName || '-'}</span></span>
                    <span>تاريخ الإنجاز: <span className="text-gray-700 dark:text-gray-300 font-bold">{issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString('en-GB') : '-'}</span></span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد سجلات لعرضها.</p>
            )}
          </div>
          {historyTotalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
              <button
                onClick={() => setHistoryCurrentPage(p => Math.max(1, p - 1))}
                disabled={historyCurrentPage === 1}
                className="p-2 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold">صفحة {historyCurrentPage} من {historyTotalPages}</span>
              <button
                onClick={() => setHistoryCurrentPage(p => Math.min(historyTotalPages, p + 1))}
                disabled={historyCurrentPage === historyTotalPages}
                className="p-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </ModernModal>
    </div>
  );
}
