import React from 'react';
import { Building2, Pencil, Trash2, MessageCircle, User, Briefcase } from 'lucide-react';
import { Company } from '../hooks/useCompanies';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CompanyListItemProps {
  company: Company;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CompanyListItem({ company, onEdit, onDelete }: CompanyListItemProps) {
  const { t } = useLanguage();
  
  // Enhanced card styles with visual distinction
  const getCardStyles = () => {
    if (company.entityType === 'client') return { border: 'border-green-200' };
    if (company.entityType === 'expense') return { border: 'border-red-200' };
    return { 
      border: company.paymentType === 'cash' ? 'border-blue-200' : 'border-amber-200'
    };
  };
  
  // Get icon based on entity type
  const getEntityIcon = () => {
    if (company.entityType === 'client') return <User className="w-4 h-4 text-green-600" />;
    if (company.entityType === 'expense') return <Briefcase className="w-4 h-4 text-red-600" />;
    return <Building2 className="w-4 h-4 text-gray-600" />;
  };

  // Get color based on entity type
  const getEntityColor = () => {
    if (company.entityType === 'client') return 'bg-green-500';
    if (company.entityType === 'expense') return 'bg-red-500';
    return company.paymentType === 'cash' ? 'bg-red-500' : 'bg-amber-500';
  };

  return (
    <div className="bg-white rounded-lg border hover:shadow-md transition-all h-[200px] flex flex-col" style={getCardStyles()}>
      {/* Top colored strip based on payment type */}
      <div className={`h-2 w-full ${getEntityColor()}`}></div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              {getEntityIcon()}
            </div>
            <div>
              <h3 className="font-bold text-secondary-800 truncate max-w-[180px]">{company.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-xs text-gray-500">
                  {company.companyId || company.id.substring(0, 8)}
                </div>
              </div>
            </div>
          </div>
          
          {company.entityType === 'company' && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              company.paymentType === 'cash' 
                ? 'bg-primary-50 text-primary' 
                : 'bg-primary-50 text-primary'
            }`}>
              {company.paymentType === 'cash' ? 'نقدي' : 'آجل'}
            </div>
          )}
          
          {company.entityType === 'client' && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary">
              عميل
            </div>
          )}
          
          {company.entityType === 'expense' && (
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary">
              مصروف
            </div>
          )}
        </div>
        
        <div className="flex-1 mt-2">
          {company.whatsAppGroupId && company.whatsAppGroupName && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary rounded-md text-xs mb-2">
              <MessageCircle className="w-3 h-3" />
              <span>واتساب</span>
            </div>
          )}
          
          {company.details && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-2">{company.details}</p>
          )}
        </div>
        
        {/* Bottom section with secondary-800 background */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between bg-secondary-800 -mx-4 -mb-4 px-4 py-2">
          <div className="text-xs text-white">
            {new Date(company.createdAt).toLocaleDateString('en-GB')}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md"
              title="تعديل"
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: 'rgb(255 95 10 / var(--tw-bg-opacity))' }} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 rounded-md"
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
