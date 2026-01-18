import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, AlertTriangle, CheckCircle, Clock, Search, Calendar, Trash2, User, CheckCircle2, ChevronLeft, ChevronRight, Building2, Phone, Edit, RefreshCw, Sparkles } from 'lucide-react';
import useIssues from '../../hooks/useIssues';
import { Issue, IssuePriority, IssueStatus } from './types';
import ModernModal from '../../components/ModernModal';
import ArabicDatePicker from '../../components/ArabicDatePicker';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import BeneficiarySelector from '../Accounts/components/BeneficiarySelector';


const priorityConfig = {
  high: { label: 'عاجلة', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-500 text-white', cardColor: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
  medium: { label: 'متوسطة', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-500 text-white', cardColor: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  low: { label: 'عادية', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-blue-500 text-white', cardColor: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  open_transfer_pending: { label: 'تحويل اوبن معلق', icon: <RefreshCw className="w-4 h-4" />, color: 'bg-purple-500 text-white', cardColor: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' }
};

const statusConfig = {
  pending: { label: 'معلقة', color: 'text-yellow-500' },
  in_progress: { label: 'قيد المتابعة', color: 'text-blue-500' },
  resolved: { label: 'تم الإنجاز', color: 'text-green-500' },
};

interface Company {
  id: string;
  name: string;
  entityType?: 'company' | 'client' | 'expense';
  phone?: string;
}

export default function PendingIssues() {
  const { theme } = useTheme();
  const { issues, addIssue, updateIssue, deleteIssue, updateIssueStatus, assignIssue, loading } = useIssues();

  const [isAddOrEditModalOpen, setIsAddOrEditModalOpen] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<Issue | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newIssue, setNewIssue] = useState({
    pnr: [''],
    title: '',
    description: '',
    issueDate: new Date(),
    priority: 'open_transfer_pending' as IssuePriority,
    companyId: '',
    companyName: '',
    phone: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | IssuePriority>('all');
  const [issueToResolve, setIssueToResolve] = useState<Issue | null>(null);

  // State for history modal filters and pagination
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState<Date | undefined>(undefined);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const historyItemsPerPage = 5;

  useEffect(() => {
    const fetchCompanies = async () => {
      const collectionsToFetch = [
        { name: 'companies', type: 'company' },
        { name: 'clients', type: 'client' },
        { name: 'expenses', type: 'expense' }
      ];

      let allEntities: Company[] = [];

      for (const coll of collectionsToFetch) {
        const snapshot = await getDocs(collection(db, coll.name));
        const entities = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          phone: doc.data().phone,
          entityType: coll.type as 'company' | 'client' | 'expense'
        }));
        allEntities = [...allEntities, ...entities];
      }
      setCompanies(allEntities);
    }
    fetchCompanies();
  }, []);

  const openAddModal = () => {
    setIssueToEdit(null);
    setNewIssue({ pnr: [''], title: '', description: '', issueDate: new Date(), priority: 'open_transfer_pending', companyId: '', companyName: '', phone: '' });
    setIsAddOrEditModalOpen(true);
  };

  const openEditModal = (issue: Issue) => {
    setIssueToEdit(issue);
    setNewIssue({
      pnr: issue.pnr,
      title: issue.title,
      description: issue.description || '',
      issueDate: new Date(issue.issueDate),
      priority: issue.priority,
      companyId: issue.companyId || '',
      companyName: issue.companyName || '',
      phone: issue.phone || '',
    });
    setIsAddOrEditModalOpen(true);
  };

  const handleFormSubmit = async () => {
    const validPnrs = newIssue.pnr.map(p => p.trim().toUpperCase()).filter(p => p);
    if (!newIssue.title || validPnrs.length === 0) {
      alert('يرجى ملء حقلي PNR وعنوان المشكلة');
      return;
    }

    if (issueToEdit) {
      await updateIssue(issueToEdit.id, {
        pnr: validPnrs,
        title: newIssue.title,
        description: newIssue.description,
        issueDate: newIssue.issueDate,
        priority: newIssue.priority,
        companyId: newIssue.companyId,
        companyName: newIssue.companyName,
        phone: newIssue.phone,
      });
    } else {
      await addIssue({
        pnr: validPnrs,
        title: newIssue.title,
        description: newIssue.description,
        issueDate: newIssue.issueDate,
        priority: newIssue.priority,
        companyId: newIssue.companyId,
        companyName: newIssue.companyName,
        phone: newIssue.phone,
      });
    }

    setIsAddOrEditModalOpen(false);
  };

  const handlePnrChange = (index: number, value: string) => {
    const newPnrs = [...newIssue.pnr];
    newPnrs[index] = value.toUpperCase();
    setNewIssue({ ...newIssue, pnr: newPnrs });
  };

  const addPnrField = () => {
    setNewIssue({ ...newIssue, pnr: [...newIssue.pnr, ''] });
  };

  const removePnrField = (index: number) => {
    if (newIssue.pnr.length > 1) {
      const newPnrs = newIssue.pnr.filter((_, i) => i !== index);
      setNewIssue({ ...newIssue, pnr: newPnrs });
    }
  };

  const openResolveModal = (issue: Issue) => {
    setIssueToResolve(issue);
  };

  const confirmResolveIssue = () => {
    if (issueToResolve) {
      updateIssueStatus(issueToResolve.id, 'resolved');
      setIssueToResolve(null);
    }
  };

  const confirmDeleteIssue = async () => {
    if (issueToDelete) {
      await deleteIssue(issueToDelete.id);
      setIssueToDelete(null);
    }
  };

  const filteredIssues = issues.filter(issue =>
    issue.status !== 'resolved' &&
    (issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (issue.companyName && issue.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (Array.isArray(issue.pnr) && issue.pnr.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())))) &&
    (filterPriority === 'all' || issue.priority === filterPriority)
  );

  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');

  // Logic for history modal filtering and pagination
  const filteredHistoryIssues = resolvedIssues.filter(issue => {
    const matchesSearch = historySearchTerm === '' || (Array.isArray(issue.pnr) && issue.pnr.some(p => p.toLowerCase().includes(historySearchTerm.toLowerCase())));
    const matchesDate = !historyDateFilter || (issue.resolvedAt && new Date(issue.resolvedAt).toDateString() === new Date(historyDateFilter).toDateString());
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 lg:max-w-7xl lg:mx-auto text-right">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 backdrop-blur-md shadow-xl">
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-rose-600 to-orange-600 dark:from-rose-400 dark:to-orange-400 bg-clip-text text-transparent">
            المشاكل المعلقة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-bold flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            متابعة وإدارة القضايا المعلقة لقسم الكونترول
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
            className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
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
              placeholder="بحث بالاسم, PNR, أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-10 pl-4 py-2 rounded-lg border-2 text-sm font-medium ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            />
          </div>
          <div className={`p-1 rounded-lg flex items-center gap-1 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <button onClick={() => setFilterPriority('all')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'all' ? (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow-sm') : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>الكل</button>
            <button onClick={() => setFilterPriority('high')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'high' ? (theme === 'dark' ? 'bg-red-500 text-white' : 'bg-red-500 text-white shadow-sm') : 'text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/50'}`}>عاجلة</button>
            <button onClick={() => setFilterPriority('medium')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'medium' ? (theme === 'dark' ? 'bg-yellow-500 text-white' : 'bg-yellow-500 text-white shadow-sm') : 'text-gray-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'}`}>متوسطة</button>
            <button onClick={() => setFilterPriority('low')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'low' ? (theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white shadow-sm') : 'text-gray-500 hover:bg-blue-100 dark:hover:bg-blue-900/50'}`}>عادية</button>
            <button onClick={() => setFilterPriority('open_transfer_pending')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filterPriority === 'open_transfer_pending' ? (theme === 'dark' ? 'bg-purple-500 text-white' : 'bg-purple-500 text-white shadow-sm') : 'text-gray-500 hover:bg-purple-100 dark:hover:bg-purple-900/50'}`}>تحويل اوبن معلق</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {['high', 'medium', 'low', 'open_transfer_pending'].map(priority => (
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
                      {Array.isArray(issue.pnr) && issue.pnr.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issue.pnr.map(p => (
                            <p key={p} className="text-xs font-mono bg-gray-200 dark:bg-gray-700 inline-block px-2 py-0.5 rounded-md text-gray-700 dark:text-gray-300">{p}</p>
                          ))}
                        </div>
                      )}
                      {issue.companyName && (
                        <div className="flex items-center gap-2 text-sm mt-2 font-semibold text-gray-600 dark:text-gray-300">
                          <Building2 className="w-4 h-4" />
                          <span>{issue.companyName}</span>
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
                      {issue.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{issue.phone}</span>
                        </div>
                      )}
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
                          onClick={() => openResolveModal(issue)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold text-xs hover:bg-green-600 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          تم الإنجاز
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

      <ModernModal
        isOpen={isAddOrEditModalOpen}
        onClose={() => setIsAddOrEditModalOpen(false)}
        title={issueToEdit ? 'تعديل مشكلة' : 'إضافة مشكلة جديدة'}
        description="أدخل تفاصيل المشكلة الجديدة لمتابعتها"
        iconColor="red"
        icon={<AlertTriangle className="w-6 h-6" />}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAddOrEditModalOpen(false)} className="px-6 py-3 rounded-xl font-bold transition-all duration-200 bg-gray-200/50 hover:bg-gray-300 text-gray-800 shadow-lg shadow-gray-300/50 hover:shadow-gray-400/40">إلغاء</button>
            <button onClick={handleFormSubmit} className="px-6 py-3 rounded-xl font-bold transition-all duration-200 bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/40 hover:shadow-blue-600/50">
              {issueToEdit ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        }
      >
        <div className="p-0 overflow-y-auto max-h-[calc(90vh-220px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">الشركة / العميل</label>
              <BeneficiarySelector
                value={newIssue.companyName}
                onChange={(name, id, phone) => setNewIssue({ ...newIssue, companyName: name, companyId: id || '', phone: phone || '' })}
                companies={companies}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">عنوان المشكلة *</label>
              <input
                type="text"
                placeholder="عنوان موجز للمشكلة"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">أرقام الحجز (PNR) *</label>
              {newIssue.pnr.map((pnr, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={`PNR ${index + 1}`}
                    value={pnr}
                    onChange={(e) => handlePnrChange(index, e.target.value)}
                    className="w-full p-2 border rounded"
                    required={index === 0}
                  />
                  {newIssue.pnr.length > 1 && (
                    <button onClick={() => removePnrField(index)} type="button" className="p-2 text-red-500 hover:bg-red-100 rounded-full">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addPnrField} type="button" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                <Plus className="w-4 h-4" /> إضافة PNR آخر
              </button>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">وصف المشكلة (اختياري)</label>
              <textarea
                placeholder="وصف تفصيلي للمشكلة"
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                className="w-full p-2 border rounded min-h-[100px] resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">الأولوية</label>
              <select
                value={newIssue.priority}
                onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as IssuePriority })}
                className="w-full p-2 border rounded"
              >
                <option value="low">عادية</option>
                <option value="medium">متوسطة</option>
                <option value="high">عاجلة</option>
                <option value="open_transfer_pending">تحويل اوبن معلق</option>
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-bold mb-1 text-center">تاريخ المشكلة</label>
              <ArabicDatePicker
                value={newIssue.issueDate}
                onChange={(date) => setNewIssue({ ...newIssue, issueDate: date })}
              />
            </div>
          </div>
        </div>
      </ModernModal>

      {issueToResolve && (
        <ModernModal isOpen={!!issueToResolve} onClose={() => setIssueToResolve(null)} title="تأكيد إنجاز المشكلة" icon={<CheckCircle className="w-6 h-6" />} iconColor="green">
          <p className="text-center text-lg text-gray-700 dark:text-gray-300">هل أنت متأكد من أنك تريد تحديد هذه المشكلة كـ "تم الإنجاز"؟</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setIssueToResolve(null)}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={confirmResolveIssue}
              className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> تأكيد الإنجاز
            </button>
          </div>
        </ModernModal>
      )}

      {issueToDelete && (
        <ModernModal isOpen={!!issueToDelete} onClose={() => setIssueToDelete(null)} title="تأكيد حذف المشكلة" icon={<Trash2 className="w-6 h-6" />} iconColor="red">
          <p className="text-center text-lg text-gray-700 dark:text-gray-300">
            هل أنت متأكد من حذف هذه المشكلة؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setIssueToDelete(null)}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={confirmDeleteIssue}
              className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> تأكيد الحذف
            </button>
          </div>
        </ModernModal>
      )}

      <ModernModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="سجل المشاكل المنجزة" icon={<CheckCircle2 className="w-6 h-6" />} iconColor="green" size="xl">
        <div className="flex flex-col h-[70vh]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="بحث..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="w-full px-4 py-2 pr-10 border rounded-lg bg-gray-50 dark:bg-gray-900/50" />
            </div>
            <div className="w-56"><ArabicDatePicker value={historyDateFilter} onChange={(date) => setHistoryDateFilter(date)} placeholder="فلترة حسب التاريخ" /></div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {historyPaginatedIssues.length > 0 ? (
              historyPaginatedIssues.map(issue => (
                <div key={issue.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{issue.title}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${priorityConfig[issue.priority].color}`}>
                      {priorityConfig[issue.priority].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{issue.description}</p>
                  <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                    <span>أضيف بواسطة: {issue.createdByName}</span>
                    <span>أنجز بواسطة: {issue.resolvedByName || 'غير معروف'}</span>
                    <span>تاريخ الإنجاز: {issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString('en-GB') : '-'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد مشاكل منجزة لعرضها.</p>
            )}
          </div>
          {historyTotalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
              <button
                onClick={() => setHistoryCurrentPage(p => Math.max(1, p - 1))}
                disabled={historyCurrentPage === 1}
                className="p-2 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium">صفحة {historyCurrentPage} من {historyTotalPages}</span>
              <button
                onClick={() => setHistoryCurrentPage(p => Math.min(historyTotalPages, p + 1))}
                disabled={historyCurrentPage === historyTotalPages}
                className="p-2 rounded-lg disabled:opacity-50"
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
