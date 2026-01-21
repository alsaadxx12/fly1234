import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { collection, getDocs, query, doc, updateDoc, getDoc, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CircleAlert as AlertCircle, ShieldCheck, Info, Trash2 } from 'lucide-react';
import PermissionGroupCard from './PermissionGroupCard';
import ModernModal from '../../../components/ModernModal';

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

    const queryTerm = searchQuery.toLowerCase();
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(queryTerm)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600 dark:text-gray-400 font-bold">جاري تحميل مجموعات الصلاحيات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold">
        {error}
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-1">نظام الصلاحيات</h3>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              يمكنك إنشاء وإدارة مجموعات الصلاحيات المختلفة وتحديد الإجراءات المسموح بها لكل مجموعة.
              قم بتعيين الموظفين لمجموعات الصلاحيات المناسبة من خلال صفحة الموظفين.
            </p>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700">
            <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">لا توجد مجموعات صلاحيات</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {searchQuery
                ? 'لم يتم العثور على أي مجموعات تطابق معايير البحث. حاول تغيير كلمات البحث.'
                : 'لم يتم العثور على أي مجموعات صلاحيات. قم بإضافة مجموعة جديدة للبدء.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-colors font-bold"
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        )}

        <ModernModal
          isOpen={!!deletingGroup}
          onClose={() => setDeletingGroup(null)}
          title="تأكيد الحذف"
        >
          <div className="p-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
              <Trash2 className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8 font-bold">
              هل أنت متأكد من حذف مجموعة الصلاحيات هذه؟ سيتم إزالة جميع الصلاحيات المرتبطة بها.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => deletingGroup && handleDeleteGroup(deletingGroup)}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeletingGroup(null)}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </ModernModal>
      </div>
    </React.Fragment>
  );
}
