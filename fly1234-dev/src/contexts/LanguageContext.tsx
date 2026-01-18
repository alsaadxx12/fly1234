import React, { createContext, useContext } from 'react';

// Create a simple context that provides Arabic translations without language switching
const translations = {
  // Dashboard
  approvedExchangeRate: 'سعر الصرف المعتمد',
  totalCompanies: 'اجمالي الشركات',
  registeredCompanies: 'شركة مسجلة',
  creditCompanies: 'الشركات الآجل',
  creditSystemCompanies: 'شركة بنظام الآجل',
  cashCompanies: 'الشركات النقد',
  cashSystemCompanies: 'شركة بنظام النقد',
  userActions: 'اجراءات المستخدم',
  newCompanyAdded: 'تم اضافة شركة جديدة',
  alNoorTradingCompany: 'شركة النور للتجارة العامة',
  fiveMinutesAgo: 'منذ 5 دقائق',
  exchangeRateUpdate: 'تحديث سعر الصرف',
  rateUpdatedTo: 'تم تحديث السعر الى',
  oneHourAgo: 'منذ ساعة',
  employeeDataModified: 'تعديل بيانات موظف',
  ahmadInfoUpdated: 'تحديث معلومات احمد محمد',
  threeHoursAgo: 'منذ 3 ساعات',

  // Common
  search: 'بحث',
  
  // Accounts
  paymentVoucher: 'سند دفع',
  receiptVoucher: 'سند قبض',
  exchangeRate: 'سعر الصرف',
  paymentVouchers: 'سندات الدفع',
  receiptVouchers: 'سندات القبض',
  exchangeRateHistory: 'سجل تغيرات سعر الصرف',
  searchInHistory: 'البحث في السجل...',
  searchInVouchers: 'البحث في السندات...',
  newPaymentVoucher: 'سند دفع جديد',
  newReceiptVoucher: 'سند قبض جديد',
  updateExchangeRate: 'تحديث سعر الصرف',
  settlement: 'تحاسب',
  confirmation: 'تأكيد',
  invoice: 'الفاتورة',
  total: 'الكلي',
  received: 'المستلم',
  exchange: 'الصرف',
  gates: 'جات',
  internal: 'داخلي',
  external: 'خارجي',
  fly: 'فلاي',
  phone: 'الهاتف',
  details: 'التفاصيل',
  date: 'التاريخ',
  employee: 'الموظف',
  safe: 'الصندوق',
  actions: 'الإجراءات',
  sequence: 'التسلسل',
  updatedBy: 'تم التحديث بواسطة',
  notes: 'ملاحظات',
  currentRate: 'السعر الحالي',
  dinarPerDollar: 'دينار/دولار',
  lastUpdated: 'تم التحديث',
  newExchangeRate: 'سعر الصرف الجديد',
  addExchangeRateNotes: 'اضف ملاحظات حول تحديث سعر الصرف...',
  updateRate: 'تحديث السعر',
  cancel: 'الغاء',
  searchCompanies: 'البحث عن شركة...',
  add: 'اضافة',
  edit: 'تعديل',
  delete: 'حذف',
  view: 'عرض',
  print: 'طباعة',
  close: 'اغلاق',
  confirm: 'تأكيد',
  loading: 'جاري التحميل...',
  success: 'تم بنجاح',
  error: 'خطأ',
  
  // Menu Items
  dashboard: 'لوحة التحكم',
  companies: 'الشركات',
  employees: 'الموظفين',
  accounts: 'الحسابات',
  safes: 'الصناديق',
  debitCards: 'بطاقات الخصم',
  debts: 'الديون',
  announcements: 'اعلان', 
  settings: 'الاعدادات', 
  
  // Companies
  companyList: 'قائمة الشركات',
  addCompany: 'اضافة شركة',
  manageCompanies: 'إدارة الشركات والمعلومات',
  fillCompanyDetails: 'املأ معلومات الشركة الجديدة',
  company: 'الشركة',
  companyName: 'اسم الشركة',
  companyId: 'معرف الشركة',
  paymentType: 'نوع التعامل',
  cash: 'نقدي',
  credit: 'آجل',
  website: 'الموقع الالكتروني',
  enterCompanyName: 'ادخل اسم الشركة...',
  addCompanyDetails: 'اضف تفاصيل عن الشركة...',
  instantPayment: 'دفع فوري',
  deferredPayment: 'دفع آجل',
  
  // Employees
  employeeList: 'قائمة الموظفين',
  addEmployee: 'اضافة موظف',
  fullName: 'الاسم الكامل',
  email: 'البريد الالكتروني',
  salary: 'الراتب',
  shift: 'الشفت',
  selectShift: 'اختر الشفت',
  morningShift: 'شفت صباحي',
  eveningShift: 'شفت مسائي',
  nightShift: 'شفت ليلي',
  password: 'كلمة المرور',
  role: 'الدور',
  status: 'الحالة',
  active: 'نشط',
  inactive: 'غير نشط',
  permissionGroup: 'مجموعة الصلاحيات',
  selectGroup: 'اختر المجموعة',
  permissionGroups: 'مجموعات الصلاحيات',
  addGroup: 'إضافة مجموعة',
  employeeSalaries: 'رواتب الموظفين',
  searchEmployees: 'البحث عن موظف...',
  searchGroups: 'البحث في المجموعات...',
  searchSalaries: 'البحث في الرواتب...',
  
  // Safes
  safeList: 'قائمة الصناديق',
  addSafe: 'اضافة صندوق',
  noSafesFound: 'لا توجد صناديق',
  safeName: 'اسم الصندوق',
  enterSafeName: 'ادخل اسم الصندوق...',
  initialBalance: 'الرصيد الافتتاحي',
  safeDetails: 'تفاصيل صندوق القاصة',
  currentBalance: 'الرصيد الحالي',
  transactionCount: 'عدد المعاملات',
  lastUpdate: 'اخر تحديث',
  resetSafe: 'تصفير الصندوق',
  resetHistory: 'سجل تصفير الصندوق',
  viewDetails: 'عرض التفاصيل',
  reason: 'السبب',
  doneBy: 'تم بواسطة',
  warning: 'تحذير',
  resetConfirmation: 'هل أنت متأكد من تصفير صندوق القاصة {safe}؟ سيتم تصفير الرصيد الى 0.',
  resetWarning: 'هذا الإجراء لا يمكن التراجع عنه. سيتم تسجيل هذا الإجراء في سجل النظام.',
  confirmReset: 'تأكيد التصفير',
  selectSafe: 'اختر صندوق',
  
  // Announcements
  addAnnouncement: 'اضافة اعلان',
  manageAndSendAnnouncements: 'إدارة وإرسال الإعلانات إلى مجموعات الواتساب',
  sendNewAnnouncement: 'إرسال إعلان جديد',
  addNewAnnouncementDesc: 'قم بإضافة إعلان جديد لإرساله إلى مجموعات الواتساب',
  message: 'الرسالة',
  uploadImage: 'رفع صورة',
  whatsappGroups: 'مجموعات الواتساب',
  searchInGroups: 'البحث في المجموعات...',
  viewParticipants: 'عرض المشاركين',
  activeGroup: 'مجموعة نشطة',
  loadingParticipants: 'جاري تحميل المشاركين...',
  loadingGroupParticipants: 'جاري تحميل مشاركين {group}...',
  unselectAllParticipants: 'إلغاء تحديد جميع المشاركين',
  selectAllParticipants: 'تحديد جميع المشاركين',
  admin: 'مشرف',
  noParticipantsFound: 'لم يتم العثور على مشاركين',
  availableGroups: 'المجموعات المتوفرة',
  groups: 'مجموعة',
  selectedParticipants: 'المشاركين المحددين',
  selectedGroups: 'المجموعات المحددة',
  participant: 'مشارك',
  showing: 'عرض',
  inPage: 'في الصفحة',
  chooseOrDragImage: 'اختر صورة او اسحبها هنا',
  writeYourMessage: 'اكتب رسالتك هنا...',
  paused: 'تم الإيقاف المؤقت',
  sending: 'جاري الإرسال...',
  sendToParticipants: 'ارسال الى المشارك ({count})',
  sendAnnouncement: 'ارسال الاعلان',
  selectAll: 'تحديد الكل',
  unselectAll: 'الغاء تحديد الكل',
  sendStatus: 'حالة الإرسال',
  sendingProgress: 'تقدم الإرسال',
  sendSpeed: 'سرعة الإرسال',
  pause: 'إيقاف مؤقت',
  resume: 'استئناف',
  seconds: 'ثانية',
  sentSuccessfully: 'تم الإرسال بنجاح',
  sendFailed: 'فشل الإرسال',
  done: 'تم',
  
  // Header
  systemName: 'نظام الإدارة',
  controlPanel: 'لوحة التحكم',
  
  // User Info
  adminRole: 'مدير النظام',
  
  // Settings
  language: 'اللغة',
  timeZone: 'المنطقة الزمنية',
  dateFormat: 'تنسيق التاريخ',
  languageAndRegion: 'اعدادات اللغة والمنطقة',
  systemSettings: 'اعدادات النظام',
  autoUpdateRate: 'تحديث سعر الصرف تلقائياً',
  systemNotifications: 'تنبيهات النظام',
  profile: 'الملف الشخصي',
  whatsappConnection: 'ربط الواتساب',
  personalInfo: 'المعلومات الشخصية',
  contactInfo: 'معلومات الاتصال',
  security: 'الأمان',
  currentPassword: 'كلمة المرور الحالية',
  newPassword: 'كلمة المرور الجديدة',
  confirmPassword: 'تأكيد كلمة المرور',
  updatePassword: 'تحديث كلمة المرور',
  savePersonalInfo: 'حفظ المعلومات الشخصية',
  updateEmail: 'تحديث البريد الالكتروني',
  whatsappConnectionInfo: 'معلومات الاتصال بالواتساب',
  instanceId: 'معرف النسخة',
  accessToken: 'رمز الوصول',
  testConnection: 'اختبار الاتصال',
  testing: 'جاري الاختبار...',
  saveConnectionData: 'هل تريد حفظ بيانات الاتصال؟',
  yesSaveData: 'نعم، احفظ البيانات',
  no: 'لا',
  
  // Actions
  logout: 'تسجيل الخروج',
  save: 'حفظ'
};

type LanguageContextType = {
  language: 'ar';
  setLanguage: (lang: 'ar') => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always use Arabic
  const language = 'ar';

  // This function is kept for compatibility but doesn't change the language
  const setLanguage = () => {
    // No-op - we always use Arabic
  };

  // Set RTL direction
  React.useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.classList.add('lang-ar');
  }, []);

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}