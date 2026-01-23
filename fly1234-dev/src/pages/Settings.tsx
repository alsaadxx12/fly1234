import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  MessageCircle,
  Table,
  Building2,
  Bell,
  Shield,
  Search,
  Palette,
  Printer,
  Megaphone,
  FileText
} from 'lucide-react';

import WhatsAppSettings from './Settings/components/WhatsAppSettings';
import NetworkStatusBanner from './Settings/components/NetworkStatusBanner';
import AccountSettings from './Settings/AccountSettings';
import CompanySettings from './Settings/components/CompanySettings';
import NotificationSettings from './Settings/components/NotificationSettings';
import ThemeSettings from './Settings/components/ThemeSettings';
import PrintTemplateEditor from './Settings/components/PrintTemplateEditor';
import StatementTemplateEditor from './Settings/components/StatementTemplateEditor';
import AdSettings from './Settings/components/AdSettings';

type TabId = 'theme' | 'print' | 'statement-template' | 'companies' | 'accounts' | 'notifications' | 'whatsapp' | 'ads';

interface TabConfig {
  id: TabId;
  label: string;
  icon: any;
  description: string;
  category: 'general' | 'business' | 'communications';
}

function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('theme');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as TabId;
    if (tab && ['theme', 'companies', 'notifications', 'whatsapp', 'accounts', 'print', 'statement-template', 'ads'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    navigate(`/settings?tab=${activeTab}`, { replace: true });
  }, [activeTab, navigate]);

  const tabs: TabConfig[] = [
    {
      id: 'theme',
      label: 'التخصيص',
      icon: Palette,
      description: 'تغيير ألوان وشعار النظام',
      category: 'general'
    },
    {
      id: 'print',
      label: 'الطباعة',
      icon: Printer,
      description: 'تخصيص قوالب الطباعة',
      category: 'general'
    },
    {
      id: 'statement-template',
      label: 'قالب طباعة الكشف',
      icon: FileText,
      description: 'بناء قالب HTML لطباعة كشف الحساب',
      category: 'general'
    },
    {
      id: 'companies',
      label: 'الشركات والكيانات',
      icon: Building2,
      description: 'إدارة الشركات والعملاء',
      category: 'business'
    },
    {
      id: 'accounts',
      label: 'الحسابات والجداول',
      icon: Table,
      description: 'تخصيص أعمدة الجداول',
      category: 'business'
    },
    {
      id: 'notifications',
      label: 'الإشعارات والتنبيهات',
      icon: Bell,
      description: 'إدارة الإشعارات',
      category: 'communications'
    },
    {
      id: 'whatsapp',
      label: 'واتساب',
      icon: MessageCircle,
      description: 'إدارة حسابات الواتساب',
      category: 'communications'
    },
    {
      id: 'ads',
      label: 'إعلانات التطبيق',
      icon: Megaphone,
      description: 'إدارة صور لوحة التحكم',
      category: 'general'
    },
  ];

  const categories = {
    general: 'الإعدادات العامة',
    business: 'إعدادات الأعمال',
    communications: 'الاتصالات والتواصل'
  };

  const filteredTabs = tabs.filter(tab =>
    searchQuery === '' ||
    tab.label.includes(searchQuery) ||
    tab.description.includes(searchQuery)
  );

  const groupedTabs = useMemo(() => {
    const grouped: Record<string, TabConfig[]> = {
      general: [],
      business: [],
      communications: []
    };

    filteredTabs.forEach(tab => {
      grouped[tab.category].push(tab);
    });

    return grouped;
  }, [filteredTabs]);

  return (
    <main className="flex-1 overflow-y-auto h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="w-full py-4 md:py-6 px-3 md:px-4 lg:px-6 flex-1 flex flex-col">
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 md:p-3 bg-blue-600 rounded-lg">
              <SettingsIcon className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {t('settings')}
              </h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                إدارة وتخصيص جميع إعدادات النظام
              </p>
            </div>
          </div>

          <div className="relative mt-3 md:mt-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث في الإعدادات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 md:pr-10 pl-4 py-2 md:py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <NetworkStatusBanner />

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 h-full mt-3 md:mt-4 w-full">
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:sticky lg:top-6 h-fit">
              <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  أقسام الإعدادات
                </h2>
              </div>

              <div className="p-2 md:p-3 space-y-4 md:space-y-6">
                {Object.entries(categories).map(([categoryKey, categoryLabel]) => {
                  const categoryTabs = groupedTabs[categoryKey];
                  if (categoryTabs.length === 0) return null;

                  return (
                    <div key={categoryKey}>
                      <h3 className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                        {categoryLabel}
                      </h3>
                      <div className="space-y-1">
                        {categoryTabs.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;

                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg text-right ${isActive
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                              <div className={`p-1.5 md:p-2 rounded-lg ${isActive
                                ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 text-right min-w-0">
                                <div className="text-xs md:text-sm font-semibold truncate">{tab.label}</div>
                                {!isActive && (
                                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 truncate">
                                    {tab.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4 md:p-6 overflow-auto">
            {activeTab === 'theme' && <ThemeSettings />}
            {activeTab === 'print' && <PrintTemplateEditor />}
            {activeTab === 'statement-template' && <StatementTemplateEditor />}
            {activeTab === 'companies' && <CompanySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'whatsapp' && <WhatsAppSettings setActiveTab={(id: any) => setActiveTab(id)} />}
            {activeTab === 'accounts' && <AccountSettings />}
            {activeTab === 'ads' && <AdSettings />}
          </div>
        </div>
      </div>
    </main>
  );
}

export default Settings;
