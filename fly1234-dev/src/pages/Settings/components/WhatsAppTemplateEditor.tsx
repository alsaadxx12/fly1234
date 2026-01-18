import React from 'react';
import { MessageCircle, Pencil, Check, X, Loader2, FileText, MessageSquare, Save, ArrowDownRight, ArrowUpLeft, Info, AlertTriangle, Copy, LayoutTemplate, Building2, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useEffect } from 'react';

interface MessageTemplateEditorProps {
  settings?: {
    gatesColumnLabel?: string;
    internalColumnLabel?: string;
    externalColumnLabel?: string;
    flyColumnLabel?: string;
  };
}

export default function MessageTemplateEditor({ settings = {} }: MessageTemplateEditorProps) {
  const { user } = useAuth();
  const [columnSettings, setColumnSettings] = React.useState({
    gatesColumnLabel: 'العمود الأول',
    internalColumnLabel: 'العمود الثاني',
    externalColumnLabel: 'العمود الثالث',
    flyColumnLabel: 'العمود الرابع'
  });
  const [templates, setTemplates] = React.useState({
    receiptVoucher: '',
    receiptVoucherClient: '',
    paymentVoucher: '',
    paymentVoucherClient: ''
  });
  const [activeTemplate, setActiveTemplate] = React.useState<'receiptVoucher' | 'receiptVoucherClient' | 'paymentVoucher' | 'paymentVoucherClient'>('receiptVoucher');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(true);
  const [isGlobalTemplates, setIsGlobalTemplates] = React.useState(true);

  // Update column settings when props change
  useEffect(() => {
    if (settings) {
      setColumnSettings({
        gatesColumnLabel: settings.gatesColumnLabel || 'العمود الأول',
        internalColumnLabel: settings.internalColumnLabel || 'العمود الثاني',
        externalColumnLabel: settings.externalColumnLabel || 'العمود الثالث',
        flyColumnLabel: settings.flyColumnLabel || 'العمود الرابع'
      });
    }
  }, [settings]);

  // Load column settings from account_settings
  React.useEffect(() => {
    const loadColumnSettings = async () => {
      if (!user?.uid) return;
      
      try {
        const settingsRef = doc(db, 'account_settings', user.uid);
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setColumnSettings({
            gatesColumnLabel: data.gatesColumnLabel || 'العمود الأول',
            internalColumnLabel: data.internalColumnLabel || 'العمود الثاني',
            externalColumnLabel: data.externalColumnLabel || 'العمود الثالث',
            flyColumnLabel: data.flyColumnLabel || 'العمود الرابع'
          });
          
          // Update templates with new column labels
          setTemplates(prev => {
            const updatedReceiptTemplate = prev.receiptVoucher.replace(
              /العمود الأول|العمود الثاني|العمود الثالث|العمود الرابع|جات|داخلي|خارجي|فلاي/g, 
              (match) => {
                if (match.includes('الأول') || match === 'جات') return data.gatesColumnLabel || 'العمود الأول';
                if (match.includes('الثاني') || match === 'داخلي') return data.internalColumnLabel || 'العمود الثاني';
                if (match.includes('الثالث') || match === 'خارجي') return data.externalColumnLabel || 'العمود الثالث';
                if (match.includes('الرابع') || match === 'فلاي') return data.flyColumnLabel || 'العمود الرابع';
                return match;
              }
            );
            
            return {
              ...prev,
              receiptVoucher: updatedReceiptTemplate
            };
          });
        }
      } catch (error) {
        console.error('Error loading column settings:', error);
      }
    };
    
    loadColumnSettings();
  }, [user?.uid]);

  // Load templates from Firestore
  React.useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to load global templates
        const globalTemplatesRef = doc(db, 'whatsapp_templates', 'global');
        const globalDocSnap = await getDoc(globalTemplatesRef);
        
        if (globalDocSnap.exists()) {
          const data = globalDocSnap.data();
          // Create a new object with the loaded templates
          let loadedTemplates = {
            receiptVoucher: data.receiptVoucher || getDefaultReceiptTemplate(),
            receiptVoucherClient: data.receiptVoucherClient || getDefaultReceiptClientTemplate(),
            paymentVoucher: data.paymentVoucher || getDefaultPaymentTemplate(),
            paymentVoucherClient: data.paymentVoucherClient || getDefaultPaymentClientTemplate()
          }; 
          
          // Use the templates from the database
          setTemplates({
            receiptVoucher: loadedTemplates.receiptVoucher,
            receiptVoucherClient: loadedTemplates.receiptVoucherClient,
            paymentVoucher: loadedTemplates.paymentVoucher,
            paymentVoucherClient: loadedTemplates.paymentVoucherClient
          });
          setIsGlobalTemplates(true);
          
          // Update template with current column labels
          const updatedReceiptTemplate = data.receiptVoucher?.replace(
            /العمود الأول|العمود الثاني|العمود الثالث|العمود الرابع|جات|داخلي|خارجي|فلاي/g, 
            (match) => {
              if (match.includes('الأول') || match === 'جات') return settings?.gatesColumnLabel || columnSettings.gatesColumnLabel;
              if (match.includes('الثاني') || match === 'داخلي') return settings?.internalColumnLabel || columnSettings.internalColumnLabel;
              if (match.includes('الثالث') || match === 'خارجي') return settings?.externalColumnLabel || columnSettings.externalColumnLabel;
              if (match.includes('الرابع') || match === 'فلاي') return settings?.flyColumnLabel || columnSettings.flyColumnLabel;
              return match;
            }
          );
          
          if (updatedReceiptTemplate) {
            setTemplates(prev => ({
              ...prev,
              receiptVoucher: updatedReceiptTemplate
            }));
          }
        } else {
          // Create empty templates if they don't exist
          await setDoc(globalTemplatesRef, {
            receiptVoucher: getDefaultReceiptTemplate(),
            receiptVoucherClient: getDefaultReceiptClientTemplate(),
            paymentVoucher: getDefaultPaymentTemplate(),
            paymentVoucherClient: getDefaultPaymentClientTemplate(),
            exchangeRate: ''
          });
          
          setTemplates({
            receiptVoucher: getDefaultReceiptTemplate(),
            receiptVoucherClient: getDefaultReceiptClientTemplate(),
            paymentVoucher: getDefaultPaymentTemplate(),
            paymentVoucherClient: getDefaultPaymentClientTemplate()
          });
          
          setIsGlobalTemplates(true);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setError('فشل في تحميل قوالب الرسائل');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTemplates();
  }, []);

  // Default templates
  const getDefaultReceiptTemplate = () => {
    return `*رقم الفاتـــــــــــــــــــــــــورة*: {{invoiceNumber}}
{{#if_usd}}*الرقم التــــــــــــــعريفي* : {{GN}}{{/if_usd}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*استلمــــــــت من* : {{companyName}}
*المبــــــــــــــــــــلغ*: {{amount}} {{currency}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
{{#if_has_distribution}}
{{#if_has_gates}}*السستـــــم الجـــــــــــــــات* : {{gates}}{{/if_has_gates}}
{{#if_has_internal}}*السستــــم الايــراني*: {{internal}}{{/if_has_internal}}
{{#if_has_external}}*السستــــم الايــراني*: {{external}}{{/if_has_external}}
{{#if_has_fly}}*سستـــــم فــــــــــــــلاي 4 اول* : {{fly}}{{/if_has_fly}}
{{/if_has_distribution}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المـــــلاحظــــــــــة*: {{details}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المُستلــــــم*: {{employeeName}}
*تاريــــــخ الاســتلام*: {{datetime}}`;
  };
  
  const getDefaultReceiptClientTemplate = () => {
    return `*رقم الفاتـــــــــــــــــــــــــورة*: {{invoiceNumber}}
{{#if_usd}}*الرقم التــــــــــــــعريفي* : {{GN}}{{/if_usd}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*استلمــــــــت من* : {{companyName}}
*المبــــــــــــــــــــلغ*: {{amount}} {{currency}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
{{#if_has_distribution}}
{{#if_has_gates}}*السستـــــم الجـــــــــــــــات* : {{gates}}{{/if_has_gates}}
{{#if_has_internal}}*السستــــم الايــراني*: {{internal}}{{/if_has_internal}}
{{#if_has_external}}*السستــــم الايــراني*: {{external}}{{/if_has_external}}
{{#if_has_fly}}*سستـــــم فــــــــــــــلاي 4 اول* : {{fly}}{{/if_has_fly}}
{{/if_has_distribution}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المـــــلاحظــــــــــة*: {{details}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المُستلــــــم*: {{employeeName}}
*تاريــــــخ الاســتلام*: {{datetime}}`;
  };
  
  const getDefaultPaymentTemplate = () => {
    return `*رقم الفاتـــــــــــــــــــــــــورة*: {{invoiceNumber}}
{{#if_usd}}*الرقم التــــــــــــــعريفي* : {{GN}}{{/if_usd}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*سلمــــــــت الى* : {{companyName}}
*المبــــــــــــــــــــلغ*: {{amount}} {{currency}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المـــــلاحظــــــــــة*: {{details}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المُستلــــــم*: {{employeeName}}
*تاريــــــخ الاســتلام*: {{datetime}}`;
  };
  
  const getDefaultPaymentClientTemplate = () => {
    return `*رقم الفاتـــــــــــــــــــــــــورة*: {{invoiceNumber}}
{{#if_usd}}*الرقم التــــــــــــــعريفي* : {{GN}}{{/if_usd}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*سلمــــــــت الى* : {{companyName}}
*المبــــــــــــــــــــلغ*: {{amount}} {{currency}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المـــــلاحظــــــــــة*: {{details}}
ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
*المُستلــــــم*: {{employeeName}}
*تاريــــــخ الاســتلام*: {{datetime}}`;
  };

  // Save templates to Firestore
  const saveTemplates = async () => {
    // Exit editing mode if active
    setIsEditing(false);
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const templatesRef = doc(db, 'whatsapp_templates', 'global');
      const docSnap = await getDoc(templatesRef);
      
      if (docSnap.exists()) {
        await updateDoc(templatesRef, templates);
      } else {
        await setDoc(templatesRef, templates);
      }

      setSuccess('تم حفظ قوالب الرسائل العامة بنجاح لجميع المستخدمين');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving templates:', error);
      setError('فشل في حفظ قوالب الرسائل');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply template preset
  const applyTemplatePreset = (preset: string) => {
    let newTemplate = '';

    switch (preset) {
      case 'receipt-simple':
        newTemplate = `تم إنشاء سند قبض جديد
رقم السند: {{invoiceNumber}}

الشركة: {{companyName}}
المبلغ: {{amount}} {{currency}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'receipt-client':
        newTemplate = `تم إنشاء سند قبض جديد
رقم السند: {{invoiceNumber}}

العميل: {{companyName}}
المبلغ: {{amount}} {{currency}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'receipt-detailed':
        // Create a template that conditionally includes sections based on placeholders
        newTemplate = `تم إنشاء سند قبض جديد
رقم السند: {{invoiceNumber}}

الشركة: {{companyName}}
المبلغ: {{amount}} {{currency}}
{{#if_usd}}سعر الصرف: {{exchangeRate}} دينار/دولار{{/if_usd}}

{{#if_has_distribution}}التقسيمات:
{{#if_has_gates}}${settings?.gatesColumnLabel || 'العمود الأول'}: {{gates}} {{currency}}{{/if_has_gates}}
{{#if_has_internal}}${settings?.internalColumnLabel || 'العمود الثاني'}: {{internal}} {{currency}}{{/if_has_internal}}
{{#if_has_external}}${settings?.externalColumnLabel || 'العمود الثالث'}: {{external}} {{currency}}{{/if_has_external}}
{{#if_has_fly}}${settings?.flyColumnLabel || 'العمود الرابع'}: {{fly}} {{currency}}{{/if_has_fly}}
{{/if_has_distribution}}

التفاصيل: {{details}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'receipt-client-detailed':
        newTemplate = `تم إنشاء سند قبض جديد
رقم السند: {{invoiceNumber}}

العميل: {{companyName}}
المبلغ: {{amount}} {{currency}}
{{#if_usd}}سعر الصرف: {{exchangeRate}} دينار/دولار{{/if_usd}}

{{#if_has_distribution}}التقسيمات:
{{#if_has_gates}}${settings?.gatesColumnLabel || 'العمود الأول'}: {{gates}} {{currency}}{{/if_has_gates}}
{{#if_has_internal}}${settings?.internalColumnLabel || 'العمود الثاني'}: {{internal}} {{currency}}{{/if_has_internal}}
{{#if_has_external}}${settings?.externalColumnLabel || 'العمود الثالث'}: {{external}} {{currency}}{{/if_has_external}}
{{#if_has_fly}}${settings?.flyColumnLabel || 'العمود الرابع'}: {{fly}} {{currency}}{{/if_has_fly}}
{{/if_has_distribution}}

التفاصيل: {{details}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'payment-simple':
        newTemplate = `تم إنشاء سند دفع جديد للشركة
رقم السند: {{invoiceNumber}}

الشركة: {{companyName}}
المبلغ: {{amount}} {{currency}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'payment-client':
        newTemplate = `تم إنشاء سند دفع جديد للعميل
رقم السند: {{invoiceNumber}}

العميل: {{companyName}}
المبلغ: {{amount}} {{currency}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'payment-detailed':
        newTemplate = `تم إنشاء سند دفع جديد للشركة
رقم السند: {{invoiceNumber}}

الشركة: {{companyName}}
المبلغ: {{amount}} {{currency}}
سعر الصرف: {{exchangeRate}} دينار/دولار

التفاصيل: {{details}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      case 'payment-client-detailed':
        newTemplate = `تم إنشاء سند دفع جديد للعميل
رقم السند: {{invoiceNumber}}

العميل: {{companyName}}
المبلغ: {{amount}} {{currency}}
سعر الصرف: {{exchangeRate}} دينار/دولار

التفاصيل: {{details}}

تم الإنشاء بواسطة: {{employeeName}}
التاريخ والوقت: {{datetime}}`;
        break;
      default:
        return;
    }
    
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: newTemplate
    }));
    
    setIsTemplateMenuOpen(false);
  };

  // Copy template to clipboard
  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(templates[activeTemplate])
      .then(() => {
        setSuccess('تم نسخ القالب إلى الحافظة');
        setTimeout(() => setSuccess(null), 3000);
      })
      .catch(err => {
        setError('فشل في نسخ القالب');
        console.error('Failed to copy template:', err);
      });
  };

  // Handle template change
  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: e.target.value
    }));
  };

  if (isLoading) {
    return null;
  }
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 min-h-[500px] flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl shadow-inner">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">قوالب رسائل الواتساب</h3>
              <p className="text-sm text-gray-500 mt-1">تخصيص قوالب الرسائل المرسلة عبر الواتساب</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-800">
          <button
            onClick={() => {
              setActiveTemplate('receiptVoucher');
              setIsEditing(false);
            }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              activeTemplate === 'receiptVoucher'
                ? 'bg-green-50 border-green-200 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-green-600" />
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">قالب سند القبض - شركة</div>
              <div className="text-xs text-gray-500">رسالة إشعار سند القبض للشركات</div>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTemplate('receiptVoucherClient');
              setIsEditing(false);
            }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              activeTemplate === 'receiptVoucherClient'
                ? 'bg-green-50 border-green-200 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-green-600" />
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">قالب سند القبض - عميل</div>
              <div className="text-xs text-gray-500">رسالة إشعار سند القبض للعملاء</div>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTemplate('paymentVoucher');
              setIsEditing(false);
            }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              activeTemplate === 'paymentVoucher'
                ? 'bg-red-50 border-red-200 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-50 rounded-lg">
              <ArrowUpLeft className="w-5 h-5 text-red-600" />
              <Building2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">قالب سند الدفع - شركة</div>
              <div className="text-xs text-gray-500">رسالة إشعار سند الدفع للشركات</div>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveTemplate('paymentVoucherClient');
              setIsEditing(false);
            }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              activeTemplate === 'paymentVoucherClient'
                ? 'bg-red-50 border-red-200 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-50 rounded-lg">
              <ArrowUpLeft className="w-5 h-5 text-red-600" />
              <User className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-800">قالب سند الدفع - عميل</div>
              <div className="text-xs text-gray-500">رسالة إشعار سند الدفع للعملاء</div>
            </div>
          </button>
        </div>
        
        {/* Template Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                isEditing 
                  ? 'bg-green-50 text-green-600 border border-green-200' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Pencil className="w-4 h-4" />
              <span>{isEditing ? 'إنهاء التعديل' : 'تعديل القالب'}</span>
            </button>
            
            <button
              onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>قوالب جاهزة</span>
            </button>
            
            <button
              onClick={copyTemplateToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ</span>
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            {activeTemplate === 'receiptVoucher' ? 'قالب سند القبض - شركة' : 
             activeTemplate === 'receiptVoucherClient' ? 'قالب سند القبض - عميل' :
             activeTemplate === 'paymentVoucher' ? 'قالب سند الدفع - شركة' : 
             'قالب سند الدفع - عميل'}
          </div>
        </div>
        
        {/* Template Editor */}
        {isEditing && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>تعديل القالب</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={saveTemplates}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </div>
            <textarea
              value={templates[activeTemplate]}
              onChange={handleTemplateChange}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-800 font-mono text-sm resize-none"
              dir="rtl"
            />
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">المتغيرات المتاحة وطريقة استخدامها:</span>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium mb-1 text-blue-800">المتغيرات المشتركة:</h5>
                  <ul className="list-disc list-inside space-y-1 mr-5">
                    <li><code className="bg-blue-100 px-1 rounded">{'{{invoiceNumber}}'}</code> - رقم الفاتورة</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{companyName}}'}</code> - اسم الشركة/العميل</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{amount}}'}</code> - المبلغ</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{currency}}'}</code> - العملة (دائماً د.ع)</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{exchangeRate}}'}</code> - سعر الصرف</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{details}}'}</code> - التفاصيل</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{GN}}'}</code> - المبلغ الأصلي بالدولار (يظهر فقط للعملة دولار وبدون فواصل)</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{employeeName}}'}</code> - اسم الموظف</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{datetime}}'}</code> - التاريخ والوقت</li>
                  </ul>
                </div>
                
                {(activeTemplate === 'receiptVoucher' || activeTemplate === 'receiptVoucherClient') && (
                  <div>
                    <h5 className="font-medium mb-1 text-blue-800">متغيرات التقسيمات (سند القبض فقط):</h5>
                    <ul className="list-disc list-inside space-y-1 mr-5">
                      <li><code className="bg-blue-100 px-1 rounded">{'{{gates}}'}</code> - قيمة {settings?.gatesColumnLabel || 'العمود الأول'}</li>
                      <li><code className="bg-blue-100 px-1 rounded">{'{{internal}}'}</code> - قيمة {settings?.internalColumnLabel || 'العمود الثاني'}</li>
                      <li><code className="bg-blue-100 px-1 rounded">{'{{external}}'}</code> - قيمة {settings?.externalColumnLabel || 'العمود الثالث'}</li>
                      <li><code className="bg-blue-100 px-1 rounded">{'{{fly}}'}</code> - قيمة {settings?.flyColumnLabel || 'العمود الرابع'}</li>
                    </ul>
                  </div>
                )}
                
                <div>
                  <h5 className="font-medium mb-1 text-blue-800">الأقسام الشرطية:</h5>
                  <ul className="list-disc list-inside space-y-1 mr-5">
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_usd}}...{{/if_usd}}'}</code> - يظهر المحتوى فقط إذا كانت العملة دولار</li>
                    <li><code className="bg-yellow-100 px-1 rounded text-yellow-800">ملاحظة: المبالغ بالدولار يتم تحويلها تلقائياً للدينار في الرسائل</code></li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_has_distribution}}...{{/if_has_distribution}}'}</code> - يظهر المحتوى فقط إذا كان هناك تقسيمات</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_has_gates}}...{{/if_has_gates}}'}</code> - يظهر المحتوى فقط إذا كان هناك قيمة للعمود الأول</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_has_internal}}...{{/if_has_internal}}'}</code> - يظهر المحتوى فقط إذا كان هناك قيمة للعمود الثاني</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_has_external}}...{{/if_has_external}}'}</code> - يظهر المحتوى فقط إذا كان هناك قيمة للعمود الثالث</li>
                    <li><code className="bg-blue-100 px-1 rounded">{'{{#if_has_fly}}...{{/if_has_fly}}'}</code> - يظهر المحتوى فقط إذا كان هناك قيمة للعمود الرابع</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}