import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Table, Check, X, Eye, EyeOff, Columns, Database, Hash, ArrowUpRight, ArrowDownRight, DollarSign, Plane, LayoutGrid, Save, Info, AlertTriangle, Loader2, LayoutList, LayoutTemplate, Globe, Users } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface AccountSettings {
  id?: string;
  userId: string;
  useCustomColumns: boolean;
  showGatesColumn: boolean;
  showInternalColumn: boolean;
  showExternalColumn: boolean;
  showFlyColumn: boolean;
  visibleColumns: string[];
  gatesColumnLabel: string;
  internalColumnLabel: string;
  externalColumnLabel: string;
  flyColumnLabel: string;
  nextInvoiceNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function AccountSettingsManager() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccountSettings>({
    userId: user?.uid || '',
    useCustomColumns: true,
    showGatesColumn: true,
    showInternalColumn: true,
    showExternalColumn: true,
    showFlyColumn: true,
    visibleColumns: [],
    gatesColumnLabel: 'العمود الأول',
    internalColumnLabel: 'العمود الثاني',
    externalColumnLabel: 'العمود الثالث',
    flyColumnLabel: 'العمود الرابع',
    nextInvoiceNumber: '1000'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isGlobalSettings, setIsGlobalSettings] = useState(true);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // First check if global settings exist
        const globalSettingsRef = doc(db, 'account_settings', 'global');
        const globalDocSnap = await getDoc(globalSettingsRef);
        
        if (globalDocSnap.exists()) {
          const data = globalDocSnap.data() as AccountSettings;
          setSettings({
            id: 'global',
            userId: 'global',
            useCustomColumns: data.useCustomColumns ?? true,
            showGatesColumn: data.showGatesColumn ?? true,
            showInternalColumn: data.showInternalColumn ?? true,
            showExternalColumn: data.showExternalColumn ?? true,
            showFlyColumn: data.showFlyColumn ?? true,
            visibleColumns: data.visibleColumns ?? [],
            gatesColumnLabel: data.gatesColumnLabel ?? 'العمود الأول',
            internalColumnLabel: data.internalColumnLabel ?? 'العمود الثاني',
            externalColumnLabel: data.externalColumnLabel ?? 'العمود الثالث',
            flyColumnLabel: data.flyColumnLabel ?? 'العمود الرابع',
            nextInvoiceNumber: data.nextInvoiceNumber || '1000'
          });
          setIsGlobalSettings(true);
        } else {
            // Create default settings if global settings don't exist
            const defaultSettings: AccountSettings = {
              userId: 'global',
              useCustomColumns: true,
              showGatesColumn: true,
              showInternalColumn: true,
              showExternalColumn: true,
              showFlyColumn: true,
              visibleColumns: [],
              gatesColumnLabel: 'العمود الأول',
              internalColumnLabel: 'العمود الثاني',
              externalColumnLabel: 'العمود الثالث',
              flyColumnLabel: 'العمود الرابع',
              nextInvoiceNumber: '1000'
            };
            
            // Create global settings
            await setDoc(globalSettingsRef, {
              ...defaultSettings,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            setSettings(defaultSettings);
            setIsGlobalSettings(true);
        }
      } catch (error) {
        console.error('Error loading account settings:', error);
        setError('فشل في تحميل إعدادات الحسابات');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [user?.uid]);

  // Save settings to Firestore
  const saveSettings = async () => {
    if (!isGlobalSettings) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Always use global settings
      const settingsRef = doc(db, 'account_settings', 'global');
      
      // Ensure nextInvoiceNumber is a string
      const nextInvoiceNumber = settings.nextInvoiceNumber || '1000';
      
      // Check if document exists first
      const docSnap = await getDoc(settingsRef);
      
      const settingsData = {
        useCustomColumns: settings.useCustomColumns,
        showGatesColumn: settings.showGatesColumn,
        showInternalColumn: settings.showInternalColumn,
        showExternalColumn: settings.showExternalColumn,
        showFlyColumn: settings.showFlyColumn,
        visibleColumns: settings.visibleColumns,
        gatesColumnLabel: settings.gatesColumnLabel,
        internalColumnLabel: settings.internalColumnLabel,
        externalColumnLabel: settings.externalColumnLabel,
        flyColumnLabel: settings.flyColumnLabel,
        nextInvoiceNumber: nextInvoiceNumber,
        updatedAt: new Date()
      };
      
      if (docSnap.exists()) {
        await updateDoc(settingsRef, settingsData);
      } else {
        await setDoc(settingsRef, {
          ...settingsData,
          createdAt: new Date()
        });
      }
      
      setSuccess('تم حفظ الإعدادات العامة بنجاح لجميع المستخدمين');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving account settings:', error);
      setError('فشل في حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle column visibility
  const toggleColumn = (column: 'showGatesColumn' | 'showInternalColumn' | 'showExternalColumn' | 'showFlyColumn') => {
    setSettings(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="mr-3 text-gray-600">جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-800">
      {/* Global Settings Toggle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 mb-6">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl shadow-inner">
              <Globe className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">إعدادات عامة مشتركة</h3>
              <p className="text-sm text-gray-500 mt-1">الإعدادات الحالية مشتركة لجميع المستخدمين</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">إعدادات عامة مشتركة</h4>
              <p className="text-sm text-gray-500 mt-1">
                الإعدادات الحالية مشتركة لجميع المستخدمين
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-blue-700">ملاحظة هامة</span>
            </div>
            <p className="text-sm text-blue-600">
              الإعدادات العامة تؤثر على جميع المستخدمين في النظام. أي تغييرات تقوم بها ستظهر لجميع المستخدمين.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl shadow-inner">
              <LayoutTemplate className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">إعدادات الأعمدة والجداول</h3>
              <p className="text-sm text-gray-500 mt-1">تخصيص ظهور وتسميات الأعمدة في الجداول</p>
            </div>
          </div>
        </div>
        
        {/* Invoice Sequence Settings */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-800">إعدادات تسلسل الفواتير</h4>
          </div>
          
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
            <div className="flex items-center gap-2 text-indigo-700">
              <Info className="w-5 h-5 flex-shrink-0 text-indigo-600" />
              <p className="text-sm">يمكنك تحديد رقم البداية لتسلسل الفواتير الخاصة بسندات القبض والدفع.</p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-800">تسلسل الفواتير</span>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">رقم بداية تسلسل الفواتير</label>
              <input
                type="text"
                value={settings.nextInvoiceNumber}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setSettings(prev => ({ ...prev, nextInvoiceNumber: value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                placeholder="1000"
                dir="rtl"
              />
              <p className="mt-1 text-xs text-gray-500">سيبدأ ترقيم الفواتير من هذا الرقم</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Column Visibility Settings */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-800">إعدادات ظهور الأعمدة</h4>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Info className="w-5 h-5 flex-shrink-0 text-indigo-600" />
                <p className="text-sm">يمكنك التحكم في ظهور الأعمدة في الجداول من خلال زر "الأعمدة" الموجود أعلى كل جدول.</p>
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ backgroundColor: settings.useCustomColumns ? '#3b82f6' : '#9ca3af' }}
                  onClick={() => setSettings(prev => ({ ...prev, useCustomColumns: !prev.useCustomColumns }))}
                >
                  <span
                    className={`${
                      settings.useCustomColumns ? 'translate-x-1' : 'translate-x-7'
                    } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                  />
                </div> 
                <span className="text-gray-800 font-medium">تفعيل تخصيص الأعمدة</span>
              </label>
            </div>
          </div>
          
          {/* Custom Columns Settings */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Table className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-800">تخصيص تسميات الأعمدة</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
                      <Plane className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-800">العمود الأول</span>
                  </div>
                  <button
                    onClick={() => settings.useCustomColumns && toggleColumn('showGatesColumn')}
                    className="relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ 
                      backgroundColor: settings.showGatesColumn ? '#3b82f6' : '#9ca3af',
                      opacity: settings.useCustomColumns ? 1 : 0.5,
                      cursor: settings.useCustomColumns ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <span
                      className={`${
                        settings.showGatesColumn ? 'translate-x-1' : 'translate-x-7'
                      } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                    />
                    <span className="sr-only">
                      {settings.showGatesColumn ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>
                {settings.showGatesColumn && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">تسمية العمود</label>
                    <input
                      type="text"
                      value={settings.gatesColumnLabel} 
                      onChange={(e) => setSettings(prev => ({ ...prev, gatesColumnLabel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                      placeholder="العمود الأول"
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                      <ArrowUpRight className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">العمود الثاني</span>
                  </div>
                  <button
                    onClick={() => settings.useCustomColumns && toggleColumn('showInternalColumn')}
                    className="relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ 
                      backgroundColor: settings.showInternalColumn ? '#3b82f6' : '#9ca3af',
                      opacity: settings.useCustomColumns ? 1 : 0.5,
                      cursor: settings.useCustomColumns ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <span
                      className={`${
                        settings.showInternalColumn ? 'translate-x-1' : 'translate-x-7'
                      } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                    />
                    <span className="sr-only">
                      {settings.showInternalColumn ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>
                {settings.showInternalColumn && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">تسمية العمود</label>
                    <input
                      type="text"
                      value={settings.internalColumnLabel}
                      onChange={(e) => setSettings(prev => ({ ...prev, internalColumnLabel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                      placeholder="العمود الثاني"
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                      <ArrowDownRight className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-800">العمود الثالث</span>
                  </div>
                  <button
                    onClick={() => settings.useCustomColumns && toggleColumn('showExternalColumn')}
                    className="relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ 
                      backgroundColor: settings.showExternalColumn ? '#3b82f6' : '#9ca3af',
                      opacity: settings.useCustomColumns ? 1 : 0.5,
                      cursor: settings.useCustomColumns ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <span
                      className={`${
                        settings.showExternalColumn ? 'translate-x-1' : 'translate-x-7'
                      } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                    />
                    <span className="sr-only">
                      {settings.showExternalColumn ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>
                {settings.showExternalColumn && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">تسمية العمود</label>
                    <input
                      type="text"
                      value={settings.externalColumnLabel}
                      onChange={(e) => setSettings(prev => ({ ...prev, externalColumnLabel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                      placeholder="العمود الثالث"
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg">
                      <Plane className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="font-medium text-gray-800">العمود الرابع</span>
                  </div>
                  <button
                    onClick={() => settings.useCustomColumns && toggleColumn('showFlyColumn')}
                    className="relative inline-flex h-6 w-12 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ 
                      backgroundColor: settings.showFlyColumn ? '#3b82f6' : '#9ca3af',
                      opacity: settings.useCustomColumns ? 1 : 0.5,
                      cursor: settings.useCustomColumns ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <span
                      className={`${
                        settings.showFlyColumn ? 'translate-x-1' : 'translate-x-7'
                      } inline-block h-4 w-4 transform rounded-full bg-gray-50 transition-transform`}
                    />
                    <span className="sr-only">
                      {settings.showFlyColumn ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>
                {settings.showFlyColumn && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">تسمية العمود</label>
                    <input
                      type="text"
                      value={settings.flyColumnLabel}
                      onChange={(e) => setSettings(prev => ({ ...prev, flyColumnLabel: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                      placeholder="العمود الرابع"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            {error && (
              <div className="flex-1 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex-1 p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2 border border-green-100">
                <Check className="w-5 h-5 flex-shrink-0 text-green-600" />
                <span>{success}</span>
              </div>
            )}
            
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 text-white" />
                  <span>حفظ الإعدادات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}