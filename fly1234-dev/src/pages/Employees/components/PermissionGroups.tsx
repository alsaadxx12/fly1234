import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { X, CircleAlert as AlertCircle, Shield, CircleCheck as CheckCircle2, Lock, Building2, Users, Wallet, Box, Check, Megaphone, Settings, Save, Loader as Loader2, Star, ShieldCheck, Info, Home, Plane, CheckSquare, TrendingUp, DollarSign, Link as LinkIcon, CreditCard, AlertTriangle } from 'lucide-react';
import PermissionGroupCard from './PermissionGroupCard';

interface Props {
  webWindows: Array<{
    id: number;
    name: string;
    permissions: string[];
  }>,
  onDelete: (id: string) => void;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: Record<string, string[] | boolean>;
  created_at: string;
}

export default function PermissionGroups({ webWindows, onDelete }: Props) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [groupsWithUsers, setGroupsWithUsers] = useState<Record<string, number>>({});
  const [allWindows, setAllWindows] = useState<Array<{
    id: number;
    name: string;
    permissions: string[];
    description?: string;
  }>>(webWindows);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<PermissionGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Add any missing windows from the app's master list
    const appPages = [
      { id: 1, name: 'الشركات', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 2, name: 'الموظفين', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 3, name: 'الحسابات', permissions: ['view', 'add', 'edit', 'delete', 'print', 'currency', 'settlement', 'confirm'] },
      { id: 4, name: 'الصناديق', permissions: ['view', 'add', 'edit', 'delete', 'reset'] },
      { id: 5, name: 'لوحة التحكم', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 6, name: 'اعلان', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 7, name: 'الأرصدة', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 8, name: 'API', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 9, name: 'الاعدادات', permissions: ['view', 'edit'] },
      { id: 10, name: 'الأرباح', permissions: ['view', 'filter'] },
      { id: 11, name: 'التذاكر', permissions: ['view', 'add', 'edit', 'delete', 'auditTransfer', 'auditEntry'] },
      { id: 12, name: 'التدقيق', permissions: ['view', 'delete', 'edit', 'auditTransfer', 'auditEntry'] },
      { id: 13, name: 'المشاكل المعلقة', permissions: ['view', 'add', 'edit', 'delete'] },
      { id: 14, name: 'مشاكل بوابة الماستر', permissions: ['view', 'add', 'edit', 'delete'] }
    ];
    
    const mergedWindows = [...webWindows];
    appPages.forEach(page => {
      if (!mergedWindows.some(w => w.name === page.name)) {
        mergedWindows.push(page);
      }
    });
    
    setAllWindows(mergedWindows);
  }, [webWindows]);

  useEffect(() => {
    const fetchEmployeesCount = async () => {
      try {
        const employeesRef = collection(db, 'employees');
        const employeesSnapshot = await getDocs(employeesRef);
        
        const counts: Record<string, number> = {};
        employeesSnapshot.forEach(doc => {
          const employeeData = doc.data();
          const roleId = employeeData.role;
          if (roleId) {
            counts[roleId] = (counts[roleId] || 0) + 1;
          }
        });
        
        setGroupsWithUsers(counts);
      } catch (error) {
        console.error('Error counting employees per permission group:', error);
      }
    };
    
    if (groups.length > 0) fetchEmployeesCount();
  }, [groups]);

  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const permissionsRef = collection(db, 'permissions');
        const q = query(permissionsRef, orderBy('created_at', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
          })) as PermissionGroup[];

          setGroups(data);
          setIsLoading(false);
        }, (error) => {
          console.error('Error in snapshot listener:', error);
          setError('فشل في تحميل مجموعات الصلاحيات');
          setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setError('فشل في تحميل مجموعات الصلاحيات');
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(groups);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(query)
    );
    
    setFilteredGroups(filtered);
  }, [groups, searchQuery]);
  
  const handleSavePermissions = async (groupId: string, editedPermissions: { [key: string]: string[] }) => {
    try {
      const groupRef = doc(db, 'permissions', groupId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) {
        throw new Error("Group not found");
      }
  
      const existingData = groupDoc.data();
      const existingPermissions = existingData.permissions || {};
  
      // Create a clean, updated permissions object
      const updatedPermissions: { [key: string]: string[] | boolean } = {
        ...existingPermissions,
        isAdmin: existingPermissions.isAdmin || false, // Preserve isAdmin flag
      };
  
      // Iterate over all possible windows to ensure no data is lost
      allWindows.forEach(window => {
        // Use the new permissions if they exist, otherwise use existing, or default to empty array
        updatedPermissions[window.name] = editedPermissions[window.name] || existingPermissions[window.name] || [];
      });
  
      await updateDoc(groupRef, { permissions: updatedPermissions });
      
    } catch (error) {
      console.error("Save failed in editor:", error);
      throw error;
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'permissions', groupId));
      setDeletingGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="mr-3 text-gray-600">جاري تحميل مجموعات الصلاحيات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-center">
        {error}
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">لا توجد مجموعات صلاحيات</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-4">
          {searchQuery 
            ? 'لم يتم العثور على أي مجموعات تطابق معايير البحث. حاول تغيير كلمات البحث.'
            : 'لم يتم العثور على أي مجموعات صلاحيات. قم بإضافة مجموعة جديدة للبدء.'}
        </p>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors font-medium"
          >
            مسح البحث
          </button>
        )}
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-700 mb-1">نظام الصلاحيات</h3>
            <p className="text-sm text-blue-600">
              يمكنك إنشاء وإدارة مجموعات الصلاحيات المختلفة وتحديد الإجراءات المسموح بها لكل مجموعة.
              قم بتعيين الموظفين لمجموعات الصلاحيات المناسبة من خلال صفحة الموظفين.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group) => (
            <PermissionGroupCard
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              onToggleExpand={() => toggleExpanded(group.id)}
              onEdit={() => toggleExpanded(group.id)}
              onDelete={() => setDeletingGroup(group.id)}
              employeeCount={groupsWithUsers[group.id] || 0}
              windows={allWindows}
              onSave={handleSavePermissions}
            />
          ))}
        </div>
        
        {deletingGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-0 max-w-md mx-4 w-full shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-red-600 to-red-700 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-50/20 rounded-lg shadow-inner">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">تأكيد الحذف</h3>
                    <p className="text-white/80 mt-1">هذا الإجراء لا يمكن التراجع عنه</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف مجموعة الصلاحيات هذه؟ سيتم إزالة جميع الصلاحيات المرتبطة بها.
                </p>
                
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeletingGroup(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(deletingGroup)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف المجموعة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
