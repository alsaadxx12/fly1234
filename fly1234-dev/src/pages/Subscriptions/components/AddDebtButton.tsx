import React from 'react';
import { Plus } from 'lucide-react';

interface AddDebtButtonProps {
  onClick: () => void;
  hasAddPermission: boolean;
}

const AddDebtButton: React.FC<AddDebtButtonProps> = ({ onClick, hasAddPermission }) => {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-bold shadow-md text-sm bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={!hasAddPermission}
    >
      <Plus className="w-5 h-5" />
      <span>إضافة دين جديد</span>
    </button>
  );
};

export default AddDebtButton;