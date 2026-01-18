import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Printer, Save, Check, Loader2, Palette, Image as ImageIcon, Type, MapPin, Upload } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { generateVoucherHTML } from '../../Accounts/components/PrintTemplate';
import ModernInput from '../../../components/ModernInput';

interface PrintSettings {
  gatesColumnLabel: string;
  internalColumnLabel: string;
  externalColumnLabel: string;
  flyColumnLabel: string;
  primaryColor: string;
  textColor: string;
  logoUrl: string;
  footerAddress: string;
  companyNameLabel: string;
  receiptNoLabel: string;
  dateLabel: string;
  dayLabel: string;
  receivedFromLabel: string;
  amountReceivedLabel: string;
  amountInWordsLabel: string;
  detailsLabel: string;
  phoneLabel: string;
  cashierLabel: string;
  recipientSignatureLabel: string;
  directorSignatureLabel: string;
}

export default function PrintTemplateEditor() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<PrintSettings>({
    gatesColumnLabel: 'العمود الأول',
    internalColumnLabel: 'العمود الثاني',
    externalColumnLabel: 'العمود الثالث',
    flyColumnLabel: 'العمود الرابع',
    primaryColor: '#4A0E6B',
    textColor: '#111827',
    logoUrl: "https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp",
    footerAddress: '9647730308111 - 964771800033 | كربلاء - شارع الإسكان - قرب مستشفى احمد الوائلي',
    companyNameLabel: 'شركة الروضتين للسفر والسياحة',
    receiptNoLabel: 'Receipt No:',
    dateLabel: 'Date:',
    dayLabel: 'Day:',
    receivedFromLabel: 'Received From',
    amountReceivedLabel: 'Amount Received',
    amountInWordsLabel: 'The amount is written',
    detailsLabel: 'Details',
    phoneLabel: 'Phone Number',
    cashierLabel: 'منظم الوصل',
    recipientSignatureLabel: 'توقيع المستلم',
    directorSignatureLabel: 'المدير'
  });
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'print');
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.error("Error loading print settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const generatePreview = async () => {
      const sampleVoucher = {
        type: 'receipt',
        invoiceNumber: '12345',
        createdAt: new Date(),
        companyName: 'شركة وهمية للسفر',
        amount: 5000,
        currency: 'USD',
        details: 'دفعة أولى لتذاكر طيران',
        employeeName: 'موظف تجريبي',
        gates: 1000,
        internal: 1500,
        external: 2000,
        fly: 500,
        phone: '07701234567',
        ...settings,
      };
      const html = await generateVoucherHTML(sampleVoucher, settings);
      setPreviewHtml(html);
    };

    generatePreview();
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'print'), settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving print settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
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
      setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl border ${
        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-500" />
              <span>تخصيص الألوان</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللون الأساسي</label>
                <input type="color" name="primaryColor" value={settings.primaryColor} onChange={handleInputChange} className="w-full h-10 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لون النص</label>
                <input type="color" name="textColor" value={settings.textColor} onChange={handleInputChange} className="w-full h-10 rounded-md" />
              </div>
            </div>

            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              <span>تخصيص الشعار</span>
            </h4>
            <div className="flex items-center gap-4">
              <img src={settings.logoUrl} alt="Logo Preview" className="w-16 h-16 object-contain rounded-lg bg-gray-100 p-1" />
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400">
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">تغيير الشعار</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Type className="w-5 h-5 text-indigo-500" />
              <span>تخصيص العناوين</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <input name="companyNameLabel" value={settings.companyNameLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="عنوان الشركة" />
              <input name="receiptNoLabel" value={settings.receiptNoLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية رقم الإيصال" />
              <input name="dateLabel" value={settings.dateLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية التاريخ" />
              <input name="dayLabel" value={settings.dayLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية اليوم" />
              <input name="receivedFromLabel" value={settings.receivedFromLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية المستلم منه" />
              <input name="amountReceivedLabel" value={settings.amountReceivedLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية المبلغ المستلم" />
              <input name="amountInWordsLabel" value={settings.amountInWordsLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية المبلغ كتابة" />
              <input name="detailsLabel" value={settings.detailsLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية التفاصيل" />
              <input name="phoneLabel" value={settings.phoneLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية الهاتف" />
              <input name="cashierLabel" value={settings.cashierLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية الكاشير" />
              <input name="recipientSignatureLabel" value={settings.recipientSignatureLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية توقيع المستلم" />
              <input name="directorSignatureLabel" value={settings.directorSignatureLabel} onChange={handleInputChange} className="w-full px-3 py-2 text-sm border rounded-md" placeholder="تسمية توقيع المدير" />
            </div>

            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <span>تخصيص التذييل</span>
            </h4>
            <textarea
              name="footerAddress"
              value={settings.footerAddress}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-sm border rounded-md h-20 resize-none"
              placeholder="العنوان، أرقام الهواتف، إلخ..."
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-bold"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600 ml-4">
            <Check className="w-5 h-5" />
            تم الحفظ بنجاح!
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 shadow-inner`}>
            <Printer className="w-5 h-5 text-indigo-600" />
          </div>
          معاينة مباشرة
        </h3>
        <div className="flex justify-center w-full bg-gray-200 dark:bg-gray-900 p-8 rounded-2xl">
          <div className="w-full aspect-[210/148] border-4 border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xl bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-none"
              title="Voucher Preview"
              style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
