import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Users, Plus, ShieldCheck, UserCog, Paperclip } from 'lucide-react';
import EmployeesList from './Employees/components/EmployeesList';
import PermissionGroups from './Employees/components/PermissionGroups';
import AddEmployeeModal from './Employees/components/AddEmployeeModal';
import AddPermissionGroupModal from './Employees/components/AddPermissionGroupModal';
import EditEmployeeModal from './Employees/components/EditEmployeeModal'; // Import the new modal
import EmployeeFiles from './Employees/components/EmployeeFiles';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Employees() {
  const [activeTab, setActiveTab] = React.useState<'employees' | 'permissions' | 'files'>('employees');
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = React.useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = React.useState(false);
  const { theme } = useTheme();
  const [safes, setSafes] = React.useState<Array<{ id: string; name: string; }>>([]);
  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null);

  const webWindows = [
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
    { id: 14, name: 'مشاكل بوابة الماستر', permissions: ['view', 'add', 'edit', 'delete'] },
    { id: 15, name: 'التبليغات', permissions: ['view', 'add', 'edit', 'delete'] },
    { id: 16, name: 'الإجازات', permissions: ['view', 'add', 'edit', 'delete', 'approve'] }
  ];

  React.useEffect(() => {
    const fetchSafes = async () => {
      try {
        const safesRef = collection(db, 'safes');
        const q = query(safesRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);

        const safesData = snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data() as any).name }));

        setSafes(safesData);
      } catch (error) {
        console.error('Error fetching safes:', error);
      }
    };

    fetchSafes();
  }, []);

  const tabs = [
    {
      id: 'employees',
      label: 'الموظفين',
      icon: UserCog,
      description: 'إدارة بيانات الموظفين'
    },
    {
      id: 'permissions',
      label: 'الصلاحيات',
      icon: ShieldCheck,
      description: 'مجموعات الصلاحيات'
    },
    {
      id: 'files',
      label: 'ملفات',
      icon: Paperclip,
      description: 'مستمسكات ووثائق الموظفين'
    }
  ];

  return (
    <main className="flex-1 overflow-y-auto h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-24 md:pb-6">
      <div className="container mx-auto py-4 md:py-8 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col max-w-7xl">
        {/* Header - Hidden on mobile as requested */}
        <div className="hidden md:block mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${theme === 'dark'
                  ? 'from-gray-100 to-blue-400'
                  : 'from-gray-800 to-blue-600'
                  } bg-clip-text text-transparent`}>
                  إدارة الموظفين
                </h1>
                <p className={`text-sm mt-1 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  إدارة شاملة للموظفين والصلاحيات والملفات
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (activeTab === 'permissions') {
                  setIsAddGroupModalOpen(true);
                } else if (activeTab === 'employees') {
                  if (safes.length > 0) {
                    setIsAddEmployeeModalOpen(true);
                  }
                }
              }}
              className={`flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-medium ${activeTab === 'files' ? 'hidden' : ''
                }`}
            >
              <Plus className="w-5 h-5" />
              <span>
                {activeTab === 'employees' ? 'إضافة موظف' : 'إضافة مجموعة'}
              </span>
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-2 md:mb-6">
          <div className={`rounded-2xl shadow-lg border p-1 md:p-2 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/80'
            } border-gray-200/50`}>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all duration-300 ${isActive
                      ? `${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'} shadow-md`
                      : `${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}`
                      }`}
                  >
                    <Icon className={`w-4 h-4 md:w-5 h-5 transition-all ${isActive ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') : ''}`} />
                    <span className="text-[10px] md:text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 mt-2 md:mt-6">
          {activeTab === 'employees' && (
            <EmployeesList onEdit={(id: string) => setEditingEmployeeId(id)} />
          )}
          {activeTab === 'permissions' && (
            <PermissionGroups
              webWindows={webWindows}
              onDelete={(id: string) => console.log('Delete group:', id)}
            />
          )}
          {activeTab === 'files' && <EmployeeFiles />}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      {activeTab !== 'files' && (
        <button
          onClick={() => {
            if (activeTab === 'permissions') {
              setIsAddGroupModalOpen(true);
            } else if (activeTab === 'employees') {
              setIsAddEmployeeModalOpen(true);
            }
          }}
          className="md:hidden fixed bottom-24 left-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center transform active:scale-90 transition-all border-4 border-white dark:border-gray-800"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={!!editingEmployeeId}
        onClose={() => setEditingEmployeeId(null)}
        employeeId={editingEmployeeId}
        onUpdate={() => {
        }}
      />

      {/* Permission Group Modal */}
      {isAddGroupModalOpen && (
        <AddPermissionGroupModal
          isOpen={isAddGroupModalOpen}
          onClose={() => {
            setIsAddGroupModalOpen(false);
          }}
          webWindows={webWindows}
          onPermissionAdded={() => {
          }}
        />
      )}
    </main>
  );
}
