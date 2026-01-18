import React from 'react';
import BranchesList from './components/BranchesList';

const BranchesContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الفروع</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            إضافة وتعديل مواقع الفروع ونطاقات الحضور
          </p>
        </div>
      </div>
      <BranchesList />
    </div>
  );
};

export default BranchesContent;
