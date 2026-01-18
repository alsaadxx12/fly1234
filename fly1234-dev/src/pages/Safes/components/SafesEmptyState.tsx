import React from 'react';
import { Box, Building2, Plus, Wallet } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface SafesEmptyStateProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SafesEmptyState: React.FC<SafesEmptyStateProps> = ({ searchQuery, setSearchQuery }) => {
  const { t } = useLanguage();

  return (
    <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center flex-1 shadow-inner">
      <div className="w-full">
        <div className="flex justify-center mb-6">
          <div className="p-6 bg-gray-50 rounded-full shadow-lg">
            <Wallet className="w-16 h-16 text-blue-500" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('noSafesFound')}</h3>
        <p className="text-gray-600 max-w-md mx-auto text-lg mb-6">
          {searchQuery 
            ? 'لم يتم العثور على أي صناديق تطابق معايير البحث. حاول تغيير كلمات البحث.'
            : 'لم يتم العثور على أي صناديق. قم بإضافة صندوق جديد للبدء.'}
        </p>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-6 py-3 text-blue-600 bg-blue-50 rounded-lg border border-blue-200 text-base font-medium hover:bg-blue-100 transition-colors shadow-sm"
          >
            مسح البحث
          </button>
        )}
        
        {!searchQuery && (
          <button
            onClick={() => {}}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 mx-auto text-base font-medium hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة صندوق جديد</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SafesEmptyState;