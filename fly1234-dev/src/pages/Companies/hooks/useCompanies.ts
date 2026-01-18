import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc, addDoc, serverTimestamp, updateDoc, where, limit, startAfter, getCountFromServer, onSnapshot, endBefore, limitToLast, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { readExcelFile, cleanString, validateExcelFile, createCompanyTemplate, downloadFile } from '../../../lib/services/excelService';

export interface Company {
  id: string;
  name: string;
  paymentType: 'cash' | 'credit';
  phone?: string;
  website?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  details?: string;
  companyId?: string;
  whatsAppGroupId?: string;
  whatsAppGroupName?: string;
  entityType?: 'company' | 'client' | 'expense';
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface CompanyFormData {
  name: string;
  paymentType: 'cash' | 'credit';
  companyId?: string;
  whatsAppGroupId?: string | null;
  whatsAppGroupName?: string | null;
  phone: string;
  website: string;
  details: string;
  entityType?: 'company' | 'client' | 'expense';
}

export default function useCompanies(
  searchQuery: string,
  filterPaymentType: 'all' | 'cash' | 'credit',
  filterWhatsApp: boolean = false,
  filterEntityType: 'all' | 'company' | 'client' | 'expense' = 'all'
) {
  const { employee } = useAuth();
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [paginatedCompanies, setPaginatedCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    paymentType: 'cash',
    companyId: '',
    whatsAppGroupId: null,
    whatsAppGroupName: null,
    phone: '',
    website: '',
    details: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'paymentType' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const collectionsToFetch: { name: string, type: 'company' | 'client' | 'expense' }[] = [
    { name: 'companies', type: 'company' },
    { name: 'clients', type: 'client' },
    { name: 'expenses', type: 'expense' }
  ];

  const fetchData = useCallback(async (page: number = 1, direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    setError(null);
    try {
      const collectionsToQuery = filterEntityType === 'all'
          ? collectionsToFetch
          : collectionsToFetch.filter(c => c.type === filterEntityType);

      let allDocs: Company[] = [];
      for (const coll of collectionsToQuery) {
        let q = query(collection(db, coll.name));
        
        // Apply filters
        if (filterPaymentType !== 'all') {
          q = query(q, where('paymentType', '==', filterPaymentType));
        }
        if (filterWhatsApp) {
          q = query(q, where('whatsAppGroupId', '!=', null));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          entityType: coll.type,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Company));
        allDocs.push(...data);
      }

      // Client-side search
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        allDocs = allDocs.filter(c => c.name.toLowerCase().includes(term));
      }

      // Client-side sort
      allDocs.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'createdAt') {
            comparison = b.createdAt.getTime() - a.createdAt.getTime();
        } else {
            comparison = a.paymentType.localeCompare(b.paymentType);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });

      setAllCompanies(allDocs);
      setTotalCount(allDocs.length);
      setIsLoading(false);

    } catch (err) {
        console.error("Error fetching data: ", err);
        setError("فشل في تحميل البيانات");
        setIsLoading(false);
    }
  }, [searchQuery, sortBy, sortDirection, filterPaymentType, filterWhatsApp, filterEntityType]);

  useEffect(() => {
    fetchData(1, 'first');
  }, [fetchData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [allCompanies, currentPage, itemsPerPage]);

  useEffect(() => {
      setPaginatedCompanies(paginatedData);
  }, [paginatedData]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);


  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return false;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const collectionName = formData.entityType === 'client' ? 'clients' :
                             formData.entityType === 'expense' ? 'expenses' : 'companies';
      
      const companyData = {
        name: formData.name,
        paymentType: formData.paymentType,
        companyId: formData.companyId || null,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        phone: formData.phone || null,
        website: formData.website || null,
        details: formData.details || null,
        entityType: formData.entityType || 'company',
        createdAt: serverTimestamp(),
        createdBy: employee.name,
        createdById: employee.id || ''
      };

      await addDoc(collection(db, collectionName), companyData);
      
      fetchData(1); // Refetch data
      
      setFormData({
        name: '', companyId: '', paymentType: 'cash',
        whatsAppGroupId: null, whatsAppGroupName: null,
        phone: '', website: '', details: ''
      });
      
      return true;
    } catch (error) {
      console.error('Error adding entity:', error);
      setError('فشل في إضافة الكيان');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !selectedCompany) return false;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const collectionName = selectedCompany.entityType === 'client' ? 'clients' : 
                            selectedCompany.entityType === 'expense' ? 'expenses' : 'companies';
      
      const companyRef = doc(db, collectionName, selectedCompany.id);
      
      const updateData = {
        name: formData.name,
        paymentType: formData.paymentType,
        whatsAppGroupId: formData.whatsAppGroupId || null,
        whatsAppGroupName: formData.whatsAppGroupName || null,
        phone: formData.phone || null,
        website: formData.website || null,
        details: formData.details || null,
        entityType: selectedCompany.entityType || 'company',
        updatedAt: serverTimestamp(),
        updatedBy: employee.name,
        updatedById: employee.id || ''
      };
      
      await updateDoc(companyRef, updateData);
      
      fetchData(currentPage);
      
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      setError('فشل في تحديث الشركة');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return false;
    
    try {
      const collectionName = selectedCompany.entityType === 'client' ? 'clients' : 
                            selectedCompany.entityType === 'expense' ? 'expenses' : 'companies';
      
      await deleteDoc(doc(db, collectionName, selectedCompany.id));

      fetchData(1);
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('فشل في حذف الشركة');
      return false;
    }
  };
  
  const handleFileChange = async (file: File) => {
    if (!file) return;
    
    setImportFile(file);
    setError(null);
    setImportPreview([]);
    
    try {
      const validation = validateExcelFile(file);
      if (!validation.valid) {
        setError(validation.error || 'ملف غير صالح');
        return;
      }
      
      const rows = await readExcelFile(file);
      
      if (rows.length <= 1) {
        setError('الملف فارغ أو يحتوي على عناوين فقط');
        setImportPreview([]);
        return;
      }

      const data = rows.slice(1)
        .filter(row => Array.isArray(row) && row.length >= 1)
        .map((row) => {
          const name = row[0] !== undefined ? cleanString(String(row[0])) : '';
          const id = row[1] !== undefined ? cleanString(String(row[1])) : '';
          const paymentTypeStr = row[2] !== undefined ? String(row[2]) : '';
          
          const paymentType = (
            paymentTypeStr.toLowerCase().includes('credit') || 
            paymentTypeStr.toLowerCase().includes('آجل') ||
            paymentTypeStr.toLowerCase().includes('اجل')
          ) ? 'credit' : 'cash';
          
          return { name, id, paymentType }; 
      });

      const validData = data.filter(item => item.name && item.name.trim().length > 0);
      
      if (validData.length === 0) setError('لم يتم العثور على بيانات صالحة في الملف');
      
      setImportPreview(data);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setError('فشل في قراءة ملف الإكسل');
    }
  };

  const handleImportCompanies = async () => {
    if (!importPreview.length || !employee) return false;
    
    setIsImporting(true);
    setError(null);
    
    try {
      const importedCompanies = [];
      
      for (const company of importPreview) {
        if (!company.name || company.name.trim().length === 0) continue;
        
        const cleanName = company.name.replace(/x000D/gi, '').trim();
        const cleanId = company.id ? company.id.replace(/x000D/gi, '').trim() : null;
        
        const companyData = {
          name: cleanName,
          companyId: cleanId, 
          paymentType: company.paymentType,
          entityType: 'company',
          createdAt: serverTimestamp(),
          createdBy: employee.name,
          createdById: employee.id || ''
        };
        
        const docRef = await addDoc(collection(db, 'companies'), companyData);
        
        importedCompanies.push({
          id: docRef.id,
          ...companyData,
          createdAt: new Date()
        });
      }
      
      fetchData(1);
      
      setImportSuccess(`تم استيراد ${importedCompanies.length} شركة بنجاح`);
      return true;
    } catch (error) {
      console.error('Error importing companies:', error);
      setError('فشل في استيراد الشركات');
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const downloadExcelTemplate = () => {
    const template = createCompanyTemplate();
    downloadFile(template, 'companies_template.csv');
  };

  return {
    companies: allCompanies,
    filteredCompanies: paginatedCompanies,
    isLoading,
    error,
    selectedCompany,
    setSelectedCompany,
    formData,
    setFormData,
    isSubmitting,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    paginatedCompanies, // Keep this for backward compatibility
    handleAddCompany,
    handleEditCompany,
    handleDeleteCompany,
    importFile,
    setImportFile,
    importPreview,
    setImportPreview,
    isImporting,
    importSuccess,
    handleImportCompanies,
    downloadExcelTemplate,
    handleFileChange,
    fetchData
  };
}
