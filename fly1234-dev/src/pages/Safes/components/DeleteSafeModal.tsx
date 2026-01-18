import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Safe } from '../types';

interface DeleteSafeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSafe: string | null;
  safes: Safe[];
  onDelete: () => Promise<void>;
}

const DeleteSafeModal: React.FC<DeleteSafeModalProps> = ({
  isOpen,
  onClose,
  selectedSafe,
  safes,
  onDelete
}) => {
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  if (!isOpen || !selectedSafe) return null;

  const safeName = safes.find(s => s.id === selectedSafe)?.name || '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-md border border-gray-300 p-0 max-w-sm mx-4 w-full overflow-hidden">
        <div className="p-2 bg-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gray-50/20 rounded-md">
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold">تأكيد الحذف</h3>
                <p className="text-white/80 text-[10px]">حذف صندوق {safeName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-0.5 text-white/80 rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="p-2">
          <p className="text-gray-700 text-xs mb-2">
            هل أنت متأكد من حذف صندوق <span className="font-bold">{safeName}</span>؟
          </p>
          
          <div className="p-1.5 bg-red-50 rounded-md border border-red-100 mb-2">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
              <span className="text-[10px] text-red-600">
                هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-2 py-1 text-gray-700 bg-gray-50 border border-gray-200 rounded-md text-xs"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-white bg-red-600 rounded-md disabled:opacity-50 text-xs"
            >
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSafeModal;