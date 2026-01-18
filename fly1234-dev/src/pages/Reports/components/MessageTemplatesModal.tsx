import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  MessageSquare, Save, Loader2, X, Copy, Info, Type, Clock,
  FastForward, XCircle, Hash, Combine, ChevronDown
} from 'lucide-react';
import ModernModal from '../../../components/ModernModal';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNotification } from '../../../contexts/NotificationContext';
import ModernInput from '../../../components/ModernInput';

interface MessageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationTypes = {
  delay: 'تأخير',
  advance: 'تقديم',
  cancel: 'إلغاء',
  number_change: 'تغيير رقم الرحلة',
  number_time_delay: 'تغيير الرقم والوقت (تأخير)',
  number_time_advance: 'تغيير الرقم والوقت (تقديم)',
};

type TemplateKeys = keyof typeof notificationTypes;

const placeholders = [
  { variable: '{{passengerName}}', description: 'اسم العميل/المسافر' },
  { variable: '{{pnr}}', description: 'رقم الحجز' },
  { variable: '{{route}}', description: 'مسار الرحلة (مثال: BGW - DXB)' },
  { variable: '{{reportDate}}', description: 'تاريخ الرحلة' },
  { variable: '{{reportAirline}}', description: 'شركة الطيران' },
  { variable: '{{reportFlightNumber}}', description: 'رقم الرحلة' },
  { variable: '{{oldTime}}', description: 'الوقت القديم' },
  { variable: '{{newTime}}', description: 'الوقت الجديد' },
  { variable: '{{newFlightNumber}}', description: 'رقم الرحلة الجديد' },
  { variable: '{{newAirline}}', description: 'شركة الطيران الجديدة' },
  { variable: '{{signature}}', description: 'التوقيع (من بطاقة بيانات الرحلة)' },
];

const defaultTemplates: Record<TemplateKeys, string> = {
    delay: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ تأخير رحلة*\n\nنود إعلامكم بتأخير رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\nرقم الرحلة : {{reportFlightNumber}}\nالوقت القديم : {{oldTime}}\nالوقت الجديد : *{{newTime}}*\n\nمع تحيات {{signature}}`,
    advance: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ تقديم رحلة*\n\nنود إعلامكم بتقديم موعد رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\nرقم الرحلة : {{reportFlightNumber}}\nالوقت القديم : {{oldTime}}\nالوقت الجديد : *{{newTime}}*\n\nمع تحيات {{signature}}`,
    cancel: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ إلغاء رحلة*\n\nنأسف لإعلامكم بإلغاء رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\nرقم الرحلة : {{reportFlightNumber}}\n\nمع تحيات {{signature}}`,
    number_change: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ تغيير رقم الرحلة*\n\nنود إعلامكم بتغيير رقم رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\nرقم الرحلة القديم : {{reportFlightNumber}}\nرقم الرحلة الجديد : *{{newFlightNumber}}*\n\nمع تحيات {{signature}}`,
    number_time_delay: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ تغيير موعد ورقم الرحلة*\n\nنود إعلامكم بالتغييرات التالية على رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\n\nرقم الرحلة القديم : {{reportFlightNumber}}\nالوقت القديم : {{oldTime}}\n\nرقم الرحلة الجديد : *{{newFlightNumber}}*\nالوقت الجديد : *{{newTime}}*\n\nمع تحيات {{signature}}`,
    number_time_advance: `عميلنا العزيز {{passengerName}} ({{pnr}})\n\n*تبليغ تغيير موعد ورقم الرحلة*\n\nنود إعلامكم بالتغييرات التالية على رحلتكم:\nالرحلة : {{route}}\nبتاريخ : *{{reportDate}}*\nعلى متن طيران: {{reportAirline}}\n\nرقم الرحلة القديم : {{reportFlightNumber}}\nالوقت القديم : {{oldTime}}\n\nرقم الرحلة الجديد : *{{newFlightNumber}}*\nالوقت الجديد : *{{newTime}}*\n\nمع تحيات {{signature}}`
};

export const MessageTemplatesModal: React.FC<MessageTemplatesModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const [templates, setTemplates] = useState<Record<TemplateKeys, string>>(defaultTemplates);
  const [labels, setLabels] = useState<Record<TemplateKeys, string>>(notificationTypes);
  const [activeTab, setActiveTab] = useState<TemplateKeys>('delay');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'message_templates', 'reports');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTemplates({ ...defaultTemplates, ...data.templates });
          setLabels({ ...notificationTypes, ...data.labels });
        } else {
          await setDoc(docRef, { templates: defaultTemplates, labels: notificationTypes });
          setTemplates(defaultTemplates);
          setLabels(notificationTypes);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        showNotification('فشل في تحميل القوالب', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      loadData();
    }
  }, [isOpen, showNotification]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'message_templates', 'reports');
      await setDoc(docRef, { templates, labels });
      showNotification('تم حفظ القوالب بنجاح', 'success');
      onClose();
    } catch (error) {
      console.error("Error saving templates:", error);
      showNotification('فشل في حفظ القوالب', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder).then(() => {
      showNotification(`تم نسخ: ${placeholder}`, 'info');
    });
  };

  const getIconForTemplate = (key: TemplateKeys) => {
    switch (key) {
      case 'delay':
        return <Clock className="w-4 h-4" />;
      case 'advance':
        return <FastForward className="w-4 h-4" />;
      case 'cancel':
        return <XCircle className="w-4 h-4" />;
      case 'number_change':
        return <Hash className="w-4 h-4" />;
      case 'number_time_delay':
        return <Combine className="w-4 h-4" />;
      case 'number_time_advance':
        return <Combine className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="إدارة قوالب الرسائل"
      description="تخصيص الرسائل التلقائية لتبليغات الرحلات"
      icon={<MessageSquare />}
      iconColor="blue"
      size="xl"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`rounded-lg border transition-all duration-300 ${showLabels ? (theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200') : 'border-transparent'}`}>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`w-full p-4 flex items-center justify-between ${!showLabels && (theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50')} rounded-lg`}
            >
              <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Type className="w-5 h-5 text-indigo-500" />
                <span>تسميات التبليغات</span>
              </h4>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showLabels ? 'rotate-180' : ''}`} />
            </button>
            {showLabels && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(notificationTypes) as TemplateKeys[]).map((key) => (
                    <ModernInput
                      key={key}
                      label={notificationTypes[key]}
                      value={labels[key]}
                      onChange={(e) => setLabels(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className={`p-2 rounded-lg flex flex-wrap gap-1 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                {Object.entries(labels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TemplateKeys)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold rounded-md transition-all ${
                      activeTab === key
                        ? 'bg-blue-600 text-white shadow'
                        : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200')
                    }`}
                  >
                    {getIconForTemplate(key as TemplateKeys)}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={templates[activeTab]}
                onChange={(e) => setTemplates(prev => ({ ...prev, [activeTab]: e.target.value }))}
                className={`w-full h-80 p-3 border rounded-lg text-sm font-mono leading-relaxed ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-gray-200'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                dir="rtl"
              />
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700/20 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className={`text-base font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                  <Info className="w-5 h-5" />
                  المتغيرات المتاحة
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {placeholders.map(p => (
                    <div key={p.variable} className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'}`}>
                      <div>
                        <code className={`text-xs font-mono font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                          {p.variable}
                        </code>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{p.description}</p>
                      </div>
                      <button onClick={() => handleCopyPlaceholder(p.variable)} className={`p-1.5 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} title="نسخ">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <button
          onClick={onClose}
          className={`px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
        >
          إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'جاري الحفظ...' : 'حفظ القوالب'}
        </button>
      </div>
    </ModernModal>
  );
};
