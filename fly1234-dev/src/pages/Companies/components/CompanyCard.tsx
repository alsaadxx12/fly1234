import React from 'react';
import { Building2, Pencil, Trash2, MessageCircle, User, Briefcase, Phone, Globe, Calendar, DollarSign } from 'lucide-react';
import { Company } from '../hooks/useCompanies';
import { useTheme } from '../../../contexts/ThemeContext';

interface CompanyCardProps {
  company: Company;
  gridView?: 'grid' | 'compact' | 'list';
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export default function CompanyCard({
  company,
  gridView = 'grid',
  onEdit,
  onDelete,
}: CompanyCardProps) {
  const { theme } = useTheme();

  const getEntityIcon = () => {
    if (company.entityType === 'client') {
      return <User className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />;
    }
    if (company.entityType === 'expense') {
      return <Briefcase className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />;
    }
    return <Building2 className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />;
  };

  const getEntityBadge = () => {
    if (company.entityType === 'client') {
      return (
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
        }`}>
          عميل
        </div>
      );
    }
    if (company.entityType === 'expense') {
      return (
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
        }`}>
          مصروف
        </div>
      );
    }
    return (
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        company.paymentType === 'cash'
          ? theme === 'dark'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-blue-100 text-blue-700'
          : theme === 'dark'
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-orange-100 text-orange-700'
      }`}>
        {company.paymentType === 'cash' ? 'نقدي' : 'آجل'}
      </div>
    );
  };

  const getAccentColor = () => {
    if (company.entityType === 'client') return theme === 'dark' ? 'bg-green-500/30' : 'bg-green-400';
    if (company.entityType === 'expense') return theme === 'dark' ? 'bg-red-500/30' : 'bg-red-400';
    return company.paymentType === 'cash'
      ? theme === 'dark' ? 'bg-blue-500/30' : 'bg-blue-400'
      : theme === 'dark' ? 'bg-orange-500/30' : 'bg-orange-400';
  };

  const getFooterColor = () => {
    if (company.entityType === 'client') return theme === 'dark' ? 'bg-green-900/30 border-green-800/30' : 'bg-green-50 border-green-100';
    if (company.entityType === 'expense') return theme === 'dark' ? 'bg-red-900/30 border-red-800/30' : 'bg-red-50 border-red-100';
    return company.paymentType === 'cash'
      ? theme === 'dark' ? 'bg-blue-900/30 border-blue-800/30' : 'bg-blue-50 border-blue-100'
      : theme === 'dark' ? 'bg-orange-900/30 border-orange-800/30' : 'bg-orange-50 border-orange-100';
  };

  if (gridView === 'list') {
    return (
      <div className={`rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}>
        <div className={`h-1 w-full ${getAccentColor()}`}></div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className={`p-3 rounded-xl ${
                company.entityType === 'client'
                  ? theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                  : company.entityType === 'expense'
                    ? theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                    : theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                {getEntityIcon()}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>{company.name}</h3>
                  {getEntityBadge()}
                  {company.whatsAppGroupId && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      theme === 'dark'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(company.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                  {company.phone && (
                    <div className={`flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <Phone className="w-4 h-4" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className={`flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <Globe className="w-4 h-4" />
                      <span className="text-xs">{company.website}</span>
                    </div>
                  )}
                </div>

                {company.details && (
                  <p className={`text-sm mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>{company.details}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(company)}
                className={`p-2.5 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
                title="تعديل"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(company)}
                className={`p-2.5 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
      gridView === 'compact' ? 'h-auto' : 'h-[240px]'
    } flex flex-col ${
      theme === 'dark'
        ? 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className={`h-1.5 w-full ${getAccentColor()}`}></div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              company.entityType === 'client'
                ? theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                : company.entityType === 'expense'
                  ? theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                  : theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              {getEntityIcon()}
            </div>
            <div className="flex-1">
              <h3 className={`text-base font-bold leading-tight ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>{company.name}</h3>
              <div className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {company.companyId || `#${company.id.substring(0, 8)}`}
              </div>
            </div>
          </div>

          {getEntityBadge()}
        </div>

        <div className="flex-1 space-y-2">
          {company.whatsAppGroupId && company.whatsAppGroupName && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              theme === 'dark'
                ? 'bg-green-900/30 text-green-400'
                : 'bg-green-50 text-green-700'
            }`}>
              <MessageCircle className="w-3.5 h-3.5" />
              <span>متصل بواتساب</span>
            </div>
          )}

          {company.phone && (
            <div className={`flex items-center gap-2 text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Phone className="w-3.5 h-3.5" />
              <span>{company.phone}</span>
            </div>
          )}

          {company.details && (
            <p className={`text-xs line-clamp-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>{company.details}</p>
          )}
        </div>

        <div className={`mt-auto pt-3 border-t flex items-center justify-between rounded-b-xl -mx-5 -mb-5 px-5 py-3 ${getFooterColor()}`}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(company.createdAt).toLocaleDateString('en-GB')}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(company)}
              className={`p-2 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title="تعديل"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(company)}
              className={`p-2 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
