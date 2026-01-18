import React, { useState, useEffect } from 'react';
import { Shield, Search, Info, Check, AlertCircle, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: {
    isAdmin?: boolean;
    [key: string]: any;
  };
}

interface EmployeePermissionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const EmployeePermissionSelector: React.FC<EmployeePermissionSelectorProps> = ({
  value,
  onChange,
  error
}) => {
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch permission groups
  useEffect(() => {
    const fetchPermissionGroups = async () => {
      try {
        setIsLoading(true);
        const permissionsRef = collection(db, 'permissions');
        const q = query(permissionsRef, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        
        const groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PermissionGroup[];
        
        setPermissionGroups(groups);
      } catch (error) {
        console.error('Error fetching permission groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPermissionGroups();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter groups based on search query
  const filteredGroups = permissionGroups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get selected group
  const selectedGroup = permissionGroups.find(group => group.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        مجموعة الصلاحيات <span className="text-red-500">*</span>
      </label>
      
      <div 
        className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer ${
          isDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300 hover:border-indigo-300'
        } bg-gray-50 transition-all`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {selectedGroup ? (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              selectedGroup.permissions.isAdmin ? 'bg-indigo-100' : 'bg-gray-100'
            }`}>
              <Shield className={`w-4 h-4 ${
                selectedGroup.permissions.isAdmin ? 'text-indigo-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedGroup.name}</div>
              {selectedGroup.description && (
                <div className="text-xs text-gray-500">{selectedGroup.description}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">اختر مجموعة الصلاحيات</div>
        )}
        
        <div className="text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
      
      {isDropdownOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-900 text-sm"
                placeholder="البحث في المجموعات..."
                onClick={(e) => e.stopPropagation()}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" />
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-48">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="mr-2 text-gray-600 text-sm">جاري التحميل...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                لا توجد مجموعات مطابقة
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={`p-2.5 hover:bg-gray-50 cursor-pointer ${
                    value === group.id ? 'bg-indigo-50' : ''
                  }`}
                  onClick={() => {
                    onChange(group.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      group.permissions.isAdmin ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Shield className={`w-4 h-4 ${
                        group.permissions.isAdmin ? 'text-indigo-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center gap-1">
                        {group.name}
                        {value === group.id && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      {group.description && (
                        <div className="text-xs text-gray-500">{group.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>يمكنك إدارة مجموعات الصلاحيات من صفحة الصلاحيات</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePermissionSelector;