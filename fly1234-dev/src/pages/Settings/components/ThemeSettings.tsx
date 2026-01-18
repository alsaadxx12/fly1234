import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Palette, Image as ImageIcon, Save, Check, Loader2, Upload } from 'lucide-react';
import SettingsCard from '../../../components/SettingsCard';

interface ThemePreset {
  name: string;
  gradient: string;
}

const THEME_PRESETS: ThemePreset[] = [
  { name: 'افتراضي', gradient: 'from-indigo-700 via-indigo-800 to-blue-800' },
  { name: 'محيطي', gradient: 'from-blue-600 via-cyan-600 to-teal-600' },
  { name: 'غروب', gradient: 'from-red-500 via-orange-500 to-yellow-500' },
  { name: 'غابة', gradient: 'from-green-600 via-teal-700 to-green-800' },
  { name: 'ملكي', gradient: 'from-purple-600 via-violet-700 to-purple-800' },
  { name: 'أنيق', gradient: 'from-gray-700 via-gray-800 to-gray-900' },
  { name: 'وردي', gradient: 'from-pink-500 via-rose-500 to-red-500' },
  { name: 'سماوي', gradient: 'from-sky-400 via-cyan-400 to-blue-400' },
  { name: 'ليموني', gradient: 'from-lime-400 via-yellow-400 to-green-400' },
  { name: 'برتقالي', gradient: 'from-orange-400 via-amber-500 to-red-500' },
  { name: 'ياقوتي', gradient: 'from-fuchsia-600 via-pink-600 to-rose-500' },
  { name: 'معدني', gradient: 'from-slate-500 via-slate-600 to-slate-700' },
  { name: 'أكوا', gradient: 'from-cyan-300 via-sky-400 to-blue-400' },
  { name: 'ماغما', gradient: 'from-red-700 via-orange-600 to-amber-500' },
  { name: 'نيون', gradient: 'from-lime-400 via-green-500 to-emerald-600' },
  { name: 'أرجواني', gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' },
  { name: 'كهربائي', gradient: 'from-blue-400 via-indigo-500 to-purple-600' },
  { name: 'استوائي', gradient: 'from-teal-400 via-cyan-500 to-sky-600' },
  { name: 'خريفي', gradient: 'from-amber-400 via-orange-500 to-red-600' },
  { name: 'غسق', gradient: 'from-slate-800 via-gray-800 to-zinc-900' },
  { name: 'ياقوت أزرق', gradient: 'from-blue-800 via-indigo-900 to-purple-900' },
  { name: 'زمرد', gradient: 'from-emerald-700 via-green-800 to-teal-900' },
  { name: 'عقيق', gradient: 'from-red-800 via-rose-900 to-pink-900' },
  { name: 'جمشت', gradient: 'from-violet-800 via-purple-900 to-fuchsia-900' },
  { name: 'فجر', gradient: 'from-sky-300 via-blue-400 to-indigo-400' },
  { name: 'شفق', gradient: 'from-rose-300 via-pink-400 to-purple-400' },
  { name: 'صيف', gradient: 'from-yellow-300 via-orange-400 to-red-400' },
  { name: 'ربيع', gradient: 'from-lime-300 via-green-400 to-teal-400' },
  { name: 'شاطئ', gradient: 'from-cyan-200 via-sky-300 to-blue-300' },
  { name: 'حلوى', gradient: 'from-pink-300 via-fuchsia-400 to-purple-400' },
  { name: 'محيط هادئ', gradient: 'from-gray-600 via-slate-700 to-gray-800' },
  { name: 'مجرة', gradient: 'from-gray-900 via-purple-900 to-blue-900' },
];


export default function ThemeSettings() {
  const { theme, customSettings, setCustomSettings } = useTheme();
  const [logoUrl, setLogoUrl] = useState(customSettings.logoUrl || '');
  const [selectedGradient, setSelectedGradient] = useState(customSettings.headerGradient || THEME_PRESETS[0].gradient);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setCustomSettings({
      logoUrl: logoUrl,
      headerGradient: selectedGradient,
    }).then(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }).catch((e) => {
      console.error("Failed to save settings:", e);
      setIsSaving(false);
    });
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={Palette}
        title="تخصيص الألوان"
        description="اختر نظام الألوان المفضل لديك لواجهة النظام"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              اختر لون الشريط العلوي والجانبي:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSelectedGradient(preset.gradient)}
                  className={`relative p-4 rounded-xl border-4 transition-all duration-300 transform hover:scale-105 ${
                    selectedGradient === preset.gradient
                      ? 'border-blue-500 shadow-2xl'
                      : 'border-transparent hover:border-blue-200'
                  }`}
                >
                  <div className={`w-full h-16 rounded-lg bg-gradient-to-r ${preset.gradient}`}></div>
                  <p className="text-center text-sm font-bold mt-3 text-gray-800 dark:text-gray-200">
                    {preset.name}
                  </p>
                  {selectedGradient === preset.gradient && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={ImageIcon}
        title="تخصيص الشعار"
        description="تغيير الشعار المعروض في النظام"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              رفع شعار جديد
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-gray-600 hover:border-blue-500 bg-gray-900/50'
                  : 'border-gray-300 hover:border-blue-500 bg-gray-50'
              }`}
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className={`w-10 h-10 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  انقر هنا أو اسحب الصورة
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF (بحد أقصى 2MB)
                </p>
              </div>
            </div>
          </div>
          {logoUrl && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">معاينة الشعار:</p>
              <div className={`p-4 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
              }`}>
                <img src={logoUrl} alt="معاينة الشعار" className="max-h-20" />
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="fixed bottom-10 right-10 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <Check className="w-6 h-6" />
          <span className="font-bold">تم حفظ الإعدادات بنجاح!</span>
        </div>
      )}
    </div>
  );
}
