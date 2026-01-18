import React, { useState } from 'react';
import { ShieldCheck, Pencil, Trash2, Star, Users, Check, ChevronDown, ChevronUp } from 'lucide-react';
import PermissionEditor from './PermissionEditor';

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: {
    isAdmin?: boolean;
    [key: string]: any;
  };
  created_at: string;
  employee_count?: number;
}

interface PermissionGroupCardProps {
  group: PermissionGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  employeeCount: number;
  windows: Array<{
    id: number;
    name: string;
    permissions: string[];
    description?: string;
  }>;
  onSave: (groupId: string, permissions: { [key: string]: string[] }) => Promise<void>;
}

const PermissionGroupCard: React.FC<PermissionGroupCardProps> = ({
  group,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  employeeCount,
  windows,
  onSave
}) => {
  const isAdmin = group.permissions.isAdmin === true;
  
  const getTotalPermissions = () => {
    let count = 0;
    Object.entries(group.permissions).forEach(([key, value]) => {
      if (key !== 'isAdmin' && Array.isArray(value)) {
        count += value.length;
      }
    });
    return count;
  };
  
  const totalPermissions = getTotalPermissions();
  
  return (
    <div className={`bg-gray-50 rounded-2xl border-2 ${
      isAdmin 
        ? 'border-indigo-200 shadow-lg' 
        : 'border-gray-200 hover:border-indigo-200'
      } overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
    >
      <div className={`p-5 flex items-center justify-between border-b-2 ${
        isAdmin 
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shadow-inner ${
            isAdmin 
              ? 'bg-gradient-to-br from-indigo-100 to-purple-100'
              : 'bg-gray-100'
          }`}>
            <ShieldCheck className={`w-7 h-7 ${isAdmin ? 'text-indigo-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isAdmin ? 'text-indigo-800' : 'text-gray-800'}`}>
              {group.name}
            </h3>
            {isAdmin && (
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-600">مدير النظام</span>
              </div>
            )}
            {group.description && !isAdmin && (
              <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="تعديل الصلاحيات"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="حذف المجموعة"
            disabled={employeeCount > 0}
          >
            <Trash2 className={`w-5 h-5 ${employeeCount > 0 ? 'opacity-50' : ''}`} />
          </button>
          <button
            onClick={onToggleExpand}
            className={`p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ${
              isExpanded ? 'bg-indigo-50' : ''
            }`}
            title={isExpanded ? 'إخفاء الصلاحيات' : 'عرض الصلاحيات'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white px-5 py-3">
        <div className="flex items-center gap-6">
          {employeeCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{employeeCount} {employeeCount === 1 ? 'موظف' : 'موظفين'}</span>
            </div>
          )}
          {!isAdmin && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-gray-500" />
              <span>{totalPermissions} صلاحية</span>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 bg-white border-t-2 border-gray-100">
          <PermissionEditor
            groupId={group.id}
            permissions={group.permissions}
            windows={windows}
            onSave={onSave}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
};

export default PermissionGroupCard;
