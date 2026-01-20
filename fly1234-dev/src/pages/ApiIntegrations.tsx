import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Plus,
  Edit2,
  Trash2,
  Link as LinkIcon,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertCircle,
  Search,
  Activity
} from 'lucide-react';
import ModernModal from '../components/ModernModal';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';
import { useNotification } from '../contexts/NotificationContext';
import { apiSyncService, SyncStatus } from '../lib/services/apiSyncService';
import axios from 'axios';

interface ApiConnection {
  id: string;
  name: string;
  email: string;
  password: string;
  apiUrl: string;
  sourceId: string;
  sourceName: string;
  currency: 'IQD' | 'USD' | 'AED';
  isActive: boolean;
  lastSync?: Date;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  autoSync: boolean;
  syncInterval: number;
  createdAt: Date;
  apiMethod?: 'POST' | 'GET';
  authToken?: string;
}

interface SupplierSource {
  id: string;
  name: string;
  type: 'airline' | 'supplier';
}

function ApiIntegrations() {
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [sources, setSources] = useState<SupplierSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [exploringApi, setExploringApi] = useState(false);
  const [explorationResults, setExplorationResults] = useState<any[]>([]);
  const [showExplorationModal, setShowExplorationModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isRunning: false });
  const [continuousSyncEnabled, setContinuousSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState(30);
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    apiUrl: '',
    sourceId: '',
    currency: 'USD' as 'IQD' | 'USD' | 'AED',
    isActive: true,
    autoSync: false,
    syncInterval: 60,
    apiMethod: 'POST' as 'POST' | 'GET',
    authToken: ''
  });

  useEffect(() => {
    const initializeData = async () => {
      await loadSources();

      const config = await apiSyncService.getGlobalSyncConfig();
      setContinuousSyncEnabled(config.enabled);
      setSyncFrequency(config.frequency);
    };
    initializeData();

    // Setup real-time listener for connections
    const connectionsRef = collection(db, 'api_connections');
    const unsubscribeConnections = onSnapshot(
      connectionsRef,
      (snapshot) => {
        const connectionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastSync: doc.data().lastSync?.toDate(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as ApiConnection[];
        connectionsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setConnections(connectionsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading connections:', error);
        showNotification('error', 'خطأ', 'فشل تحميل الاتصالات');
        setLoading(false);
      }
    );

    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
      // No need to reload - real-time listener will handle updates
    };

    apiSyncService.addListener(handleSyncStatus);

    return () => {
      unsubscribeConnections();
      apiSyncService.removeListener(handleSyncStatus);
    };
  }, []);


  const loadSources = async () => {
    try {
      const sourcesRef = collection(db, 'balance_sources');
      const snapshot = await getDocs(sourcesRef);
      const sourcesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.sourceName || 'غير معروف',
          type: data.type || 'airline'
        };
      }) as SupplierSource[];

      const airlineSources = sourcesData.filter(s => s.type === 'airline');

      if (airlineSources.length === 0) {
        const companiesRef = collection(db, 'companies');
        const companiesSnapshot = await getDocs(companiesRef);
        const companiesData = companiesSnapshot.docs
          .filter(doc => doc.data().isAirline)
          .map(doc => ({
            id: doc.id,
            name: doc.data().name,
            type: 'airline' as const
          }));
        setSources(companiesData);
      } else {
        setSources(airlineSources);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
      showNotification('error', 'خطأ', 'فشل تحميل قائمة خطوط الطيران');
    }
  };

  const testApiConnection = async () => {
    if (!formData.apiUrl?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال رابط API أولاً');
      return;
    }

    if (formData.apiMethod === 'POST' && (!formData.email?.trim() || !formData.password?.trim())) {
      showNotification('error', 'خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (formData.apiMethod === 'GET' && !formData.authToken?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال رمز المصادقة (Token)');
      return;
    }

    setTestingConnection(true);
    try {
      console.log('Testing API connection to:', formData.apiUrl);
      console.log('Method:', formData.apiMethod);

      const config: any = {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      let response;

      if (formData.apiMethod === 'POST') {
        console.log('Sending POST request with login credentials...');
        response = await axios.post(formData.apiUrl, {
          email: formData.email,
          password: formData.password,
          type: 'login'
        }, config);
      } else {
        if (formData.authToken) {
          config.headers['Authorization'] = `Bearer ${formData.authToken}`;
        }
        response = await axios.get(formData.apiUrl, config);
      }

      console.log('Test Response:', response.data);

      let foundBalance = false;
      let balanceValue = 0;
      const responseData = response.data?.data || response.data;

      if (responseData?.wallets && Array.isArray(responseData.wallets)) {
        const wallet = responseData.wallets.find((w: any) => w.currency === formData.currency);
        if (wallet && typeof wallet.balance === 'number') {
          foundBalance = true;
          balanceValue = wallet.balance;
        }
      } else if (responseData?.wallet && typeof responseData.wallet.balance === 'number') {
        if (responseData.wallet.currency === formData.currency) {
          foundBalance = true;
          balanceValue = responseData.wallet.balance;
        }
      } else if (responseData &&
        (typeof responseData.balance === 'number' ||
          typeof responseData.amount === 'number' ||
          typeof responseData.credit === 'number')) {
        foundBalance = true;
        balanceValue = responseData.balance || responseData.amount || responseData.credit;
      }

      if (foundBalance) {
        showNotification('success', 'نجاح', `✓ الاتصال ناجح! الرصيد الحالي: ${balanceValue.toLocaleString()} ${formData.currency}`);
      } else {
        showNotification('error', 'خطأ', '⚠ الاتصال تم لكن لم يتم العثور على رصيد للعملة المحددة. البيانات: ' + JSON.stringify(response.data).substring(0, 200));
      }
    } catch (error: any) {
      console.error('Test connection error:', error);

      let errorMessage = 'فشل اختبار الاتصال';

      if (error.code === 'ERR_BAD_REQUEST' || error.response?.status === 404) {
        errorMessage = 'خطأ 404: الرابط غير موجود. تحقق من الرابط الصحيح مع مزود الخدمة';
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'خطأ في الصلاحيات: رمز المصادقة أو بيانات الدخول غير صحيحة';
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'انتهت مهلة الاتصال. الخادم لا يستجيب';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'خطأ في الشبكة. تحقق من الاتصال بالإنترنت';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showNotification('error', 'خطأ', errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  const exploreApi = async () => {
    if (!formData.apiUrl?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال رابط API أولاً');
      return;
    }

    if (!formData.email?.trim() || !formData.password?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setExploringApi(true);
    setExplorationResults([]);
    setShowExplorationModal(true);

    const baseUrl = formData.apiUrl.replace(/\/$/, '');

    const endpoints = [
      { path: '/api/b2b/v1/auth/login', method: 'POST', name: 'تسجيل الدخول' },
      { path: '/api/b2b/v1/profile', method: 'GET', name: 'الملف الشخصي' },
      { path: '/api/b2b/v1/balance', method: 'GET', name: 'الرصيد' },
      { path: '/api/b2b/v1/wallet', method: 'GET', name: 'المحفظة' },
      { path: '/api/b2b/v1/account', method: 'GET', name: 'الحساب' },
      { path: '/api/b2b/v1/account/balance', method: 'GET', name: 'رصيد الحساب' },
      { path: '/api/auth/login', method: 'POST', name: 'تسجيل دخول بديل' },
      { path: '/auth/login', method: 'POST', name: 'تسجيل دخول مباشر' },
      { path: '/login', method: 'POST', name: 'تسجيل دخول بسيط' },
      { path: '/api/balance', method: 'GET', name: 'رصيد بسيط' },
      { path: '/balance', method: 'GET', name: 'رصيد مباشر' },
      { path: '/api/v1/balance', method: 'GET', name: 'رصيد v1' },
    ];

    const results: any[] = [];
    let authToken: string | null = null;

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint.path}`;
        const config: any = {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: () => true
        };

        if (authToken && endpoint.method === 'GET') {
          config.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = endpoint.method === 'POST'
          ? await axios.post(url, {
            email: formData.email,
            password: formData.password
          }, config)
          : await axios.get(url, config);

        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          name: endpoint.name,
          status: response.status,
          statusText: response.statusText,
          success: response.status >= 200 && response.status < 300,
          data: response.data,
          headers: response.headers
        };

        if (result.success && response.data?.token) {
          authToken = response.data.token;
        }

        if (result.success && response.data?.access_token) {
          authToken = response.data.access_token;
        }

        results.push(result);
        setExplorationResults([...results]);

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          name: endpoint.name,
          status: error.response?.status || 0,
          statusText: error.message,
          success: false,
          error: error.message
        });
        setExplorationResults([...results]);
      }
    }

    setExploringApi(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      showNotification('success', 'نجاح', `تم العثور على ${successCount} نقطة نهاية صالحة!`);
    } else {
      showNotification('error', 'خطأ', 'لم يتم العثور على نقاط نهاية صالحة');
    }
  };

  const handleAddConnection = async () => {
    if (!formData.name?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال اسم الاتصال');
      return;
    }

    if (!formData.email?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال البريد الإلكتروني');
      return;
    }

    if (!formData.password?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال كلمة المرور');
      return;
    }

    if (!formData.apiUrl?.trim()) {
      showNotification('error', 'خطأ', 'يرجى إدخال رابط API');
      return;
    }

    if (!formData.sourceId) {
      showNotification('error', 'خطأ', 'يرجى اختيار خط الطيران');
      return;
    }

    try {
      const source = sources.find(s => s.id === formData.sourceId);
      if (!source) {
        showNotification('error', 'خطأ', 'خط الطيران المختار غير موجود');
        return;
      }

      await addDoc(collection(db, 'api_connections'), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        apiUrl: formData.apiUrl.trim(),
        sourceId: formData.sourceId,
        sourceName: source.name,
        currency: formData.currency,
        isActive: formData.isActive,
        autoSync: formData.autoSync,
        syncInterval: formData.syncInterval,
        apiMethod: formData.apiMethod,
        authToken: formData.authToken || '',
        createdAt: Timestamp.now()
      });

      // Real-time listener will update the state automatically

      showNotification('success', 'نجاح', 'تم إضافة الاتصال بنجاح');
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding connection:', error);
      showNotification('error', 'خطأ', error.message || 'فشل إضافة الاتصال');
    }
  };

  const handleEditConnection = (connection: ApiConnection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      email: connection.email,
      password: connection.password,
      apiUrl: connection.apiUrl,
      sourceId: connection.sourceId,
      currency: connection.currency,
      isActive: connection.isActive,
      autoSync: connection.autoSync,
      syncInterval: connection.syncInterval,
      apiMethod: connection.apiMethod || 'POST',
      authToken: connection.authToken || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateConnection = async () => {
    if (!editingConnection) return;

    try {
      const source = sources.find(s => s.id === formData.sourceId);
      if (!source) {
        showNotification('error', 'خطأ', 'المصدر غير موجود');
        return;
      }

      await updateDoc(doc(db, 'api_connections', editingConnection.id), {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        apiUrl: formData.apiUrl,
        sourceId: formData.sourceId,
        sourceName: source.name,
        currency: formData.currency,
        isActive: formData.isActive,
        autoSync: formData.autoSync,
        syncInterval: formData.syncInterval,
        apiMethod: formData.apiMethod,
        authToken: formData.authToken || ''
      });

      showNotification('success', 'نجاح', 'تم تحديث الاتصال بنجاح');
      // Real-time listener will update the state automatically

      setShowEditModal(false);
      setEditingConnection(null);
      resetForm();
    } catch (error) {
      console.error('Error updating connection:', error);
      showNotification('error', 'خطأ', 'فشل تحديث الاتصال');
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاتصال؟')) return;

    try {
      await deleteDoc(doc(db, 'api_connections', connectionId));

      // Real-time listener will update the state automatically

      showNotification('success', 'نجاح', 'تم حذف الاتصال بنجاح');
    } catch (error) {
      console.error('Error deleting connection:', error);
      showNotification('error', 'خطأ', 'فشل حذف الاتصال');
    }
  };



  const toggleConnectionStatus = async (connection: ApiConnection) => {
    try {
      await updateDoc(doc(db, 'api_connections', connection.id), {
        isActive: !connection.isActive
      });

      // Real-time listener will update the state automatically
    } catch (error) {
      console.error('Error toggling status:', error);
      showNotification('error', 'خطأ', 'فشل تغيير حالة الاتصال');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      apiUrl: '',
      sourceId: '',
      currency: 'USD',
      isActive: true,
      autoSync: false,
      syncInterval: 60,
      apiMethod: 'POST',
      authToken: ''
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleContinuousSync = async () => {
    const newState = !continuousSyncEnabled;
    setContinuousSyncEnabled(newState);

    try {
      await apiSyncService.updateGlobalSyncConfig(newState, syncFrequency);

      if (newState) {
        showNotification('success', 'نجاح', `تم تفعيل المزامنة العالمية (كل ${syncFrequency} ثانية)`);
      } else {
        showNotification('info', 'معلومات', 'تم إيقاف المزامنة العالمية');
      }
    } catch (error) {
      console.error('Error updating sync config:', error);
      showNotification('error', 'خطأ', 'فشل تحديث إعدادات المزامنة');
      setContinuousSyncEnabled(!newState);
    }
  };

  const handleSyncFrequencyChange = async (newFrequency: number) => {
    setSyncFrequency(newFrequency);

    if (continuousSyncEnabled) {
      try {
        await apiSyncService.updateGlobalSyncConfig(true, newFrequency);
        showNotification('success', 'نجاح', `تم تحديث فترة المزامنة إلى ${newFrequency} ثانية`);
      } catch (error) {
        console.error('Error updating sync frequency:', error);
        showNotification('error', 'خطأ', 'فشل تحديث فترة المزامنة');
      }
    }
  };

  const handleSyncNow = async () => {
    try {
      await apiSyncService.syncNow();
      showNotification('success', 'نجاح', 'تمت المزامنة بنجاح');
    } catch (error) {
      showNotification('error', 'خطأ', 'فشلت المزامنة');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            ربط API خطوط الطيران
          </h1>
          <p className="text-gray-600 mt-1">إدارة الاتصالات التلقائية مع مواقع خطوط الطيران</p>
        </div>
        <ModernButton
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          إضافة اتصال جديد
        </ModernButton>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">المزامنة العالمية</h3>
                <p className="text-xs text-gray-600">تعمل لجميع المستخدمين تلقائياً</p>
              </div>
              <button
                onClick={toggleContinuousSync}
                className={`relative w-12 h-6 rounded-full transition-colors ${continuousSyncEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${continuousSyncEnabled ? 'right-0.5' : 'right-6.5'
                    }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-gray-600 mb-1">الحالة</p>
                <div className="flex items-center gap-1.5">
                  {continuousSyncEnabled ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-xs font-semibold text-emerald-700">نشطة</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs font-semibold text-gray-600">متوقفة</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-blue-700 mb-1">التكرار</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={syncFrequency}
                    onChange={(e) => handleSyncFrequencyChange(parseInt(e.target.value) || 30)}
                    min="10"
                    max="300"
                    disabled={!continuousSyncEnabled}
                    className="w-12 px-1.5 py-0.5 border border-blue-300 rounded text-xs text-center font-bold disabled:bg-gray-100 disabled:border-gray-300"
                  />
                  <span className="text-xs text-blue-900 font-medium">ث</span>
                </div>
              </div>

              {syncStatus.lastSyncTime && !syncStatus.isRunning && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-emerald-700 mb-1">آخر تحديث</p>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs text-emerald-900 font-medium">
                      {syncStatus.lastSyncTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}

              {syncStatus.isRunning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-blue-700 mb-1">جاري التنفيذ</p>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                    <span className="text-xs text-blue-900 font-medium">
                      {syncStatus.syncedCount || 0}/{syncStatus.totalConnections || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncNow}
                disabled={syncStatus.isRunning}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus.isRunning ? 'animate-spin' : ''}`} />
                مزامنة الآن
              </button>

              {syncStatus.isRunning && syncStatus.currentConnection && (
                <span className="text-xs text-gray-600 truncate">
                  {syncStatus.currentConnection}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>


      {connections.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <LinkIcon className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-xl font-bold mb-2">لا توجد اتصالات</p>
            <p className="text-sm mb-4">ابدأ بإضافة اتصال جديد لربط حسابات خطوط الطيران</p>
            <ModernButton
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              إضافة اتصال جديد
            </ModernButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center gap-4">
                  {/* أيقونة الاتصال */}
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${connection.isActive
                    ? 'bg-emerald-100'
                    : 'bg-gray-100'
                    }`}>
                    <LinkIcon className={`w-7 h-7 ${connection.isActive ? 'text-emerald-600' : 'text-gray-400'
                      }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* العنوان والحالة */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{connection.name}</h3>
                        <span className="text-sm text-gray-600">•</span>
                        <p className="text-sm font-medium text-gray-600 truncate">{connection.sourceName}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${connection.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {connection.isActive ? 'نشط' : 'متوقف'}
                      </span>
                    </div>

                    {/* البيانات الرئيسية */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-blue-700 mb-1">البريد الإلكتروني</p>
                        <p className="text-xs font-semibold text-blue-900 truncate">{connection.email}</p>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-purple-700 mb-1">كلمة المرور</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono font-semibold text-purple-900">
                            {showPassword[connection.id] ? connection.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(connection.id)}
                            className="p-0.5 hover:bg-purple-100 rounded"
                          >
                            {showPassword[connection.id] ? (
                              <EyeOff className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Eye className="w-3 h-3 text-purple-600" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className={`border rounded-lg px-3 py-2 ${connection.currency === 'IQD'
                        ? 'bg-teal-50 border-teal-200'
                        : connection.currency === 'USD'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                        }`}>
                        <p className={`text-[10px] font-bold mb-1 ${connection.currency === 'IQD'
                          ? 'text-teal-700'
                          : connection.currency === 'USD'
                            ? 'text-green-700'
                            : 'text-amber-700'
                          }`}>العملة</p>
                        <p className={`text-sm font-black ${connection.currency === 'IQD'
                          ? 'text-teal-900'
                          : connection.currency === 'USD'
                            ? 'text-green-900'
                            : 'text-amber-900'
                          }`}>{connection.currency}</p>
                      </div>

                      {connection.lastSync && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold text-gray-600 mb-1">آخر مزامنة</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-700 font-medium truncate">
                              {connection.lastSync.toLocaleTimeString('en-GB')}
                            </span>
                            {connection.lastSyncStatus === 'success' ? (
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* رسالة الخطأ */}
                    {connection.lastSyncError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700">{connection.lastSyncError}</p>
                        </div>
                      </div>
                    )}

                    {/* أزرار التحكم */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleConnectionStatus(connection)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${connection.isActive
                          ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                      >
                        {connection.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        onClick={() => handleEditConnection(connection)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteConnection(connection.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModernModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="إضافة اتصال API جديد"
      >
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white p-2 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 mb-2">إعداد سريع لـ AK-Booking</h4>
                <div className="text-xs text-blue-800 space-y-1.5 bg-white bg-opacity-60 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold mb-1">الرابط:</p>
                    <code className="block bg-blue-100 px-2 py-1 rounded text-blue-900 text-left text-[10px]">
                      https://api.ak-booking.com/api/b2b/v1/login
                    </code>
                  </div>
                  <p>• <strong>الطريقة:</strong> POST مع email وpassword وtype: "login"</p>
                  <p>• <strong>الاستجابة:</strong> token + wallet + actor</p>
                  <p>• <strong>يدعم:</strong> محافظ IQD, USD, AED</p>
                </div>
              </div>
            </div>
          </div>

          <ModernInput
            label="اسم الاتصال *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: AK-Booking - حساب IQD"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              خط الطيران *
            </label>
            {sources.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-800 mb-2">لا توجد خطوط طيران متاحة</p>
                <p className="text-xs text-yellow-700">يرجى إضافة خط طيران أولاً من صفحة الشركات</p>
              </div>
            ) : (
              <select
                value={formData.sourceId}
                onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
                required
              >
                <option value="">اختر خط الطيران</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              طريقة API *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, apiMethod: 'POST' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.apiMethod === 'POST'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">POST</p>
                <p className="text-xs mt-1">مع بيانات الدخول</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, apiMethod: 'GET' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.apiMethod === 'GET'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">GET</p>
                <p className="text-xs mt-1">مع Token</p>
              </button>
            </div>
          </div>

          {formData.apiMethod === 'POST' ? (
            <>
              <ModernInput
                label="البريد الإلكتروني *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                required
              />

              <ModernInput
                label="كلمة المرور *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </>
          ) : (
            <ModernInput
              label="رمز المصادقة (Token) *"
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              placeholder="Bearer token أو session token"
              required
            />
          )}

          <div>
            <ModernInput
              label="رابط API *"
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              placeholder={formData.apiMethod === 'POST'
                ? "https://api.ak-booking.com/api/b2b/v1/login"
                : "https://api.example.com/balance"}
              required
            />
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-2 font-semibold">
                {formData.apiMethod === 'POST'
                  ? 'استجابة POST (يرجع الرصيد مباشرة):'
                  : 'تنسيق الاستجابة المتوقع:'}
              </p>
              <pre className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                {formData.apiMethod === 'POST' ? `{
  "data": {
    "token": "eyJhbGc...",
    "wallet": {
      "currency": "IQD",
      "balance": 24723299.95
    }
  }
}` : `{ "balance": 15000 }

أو محافظ متعددة:
{
  "wallets": [
    {"currency": "IQD", "balance": 25109543.95}
  ]
}`}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                {formData.apiMethod === 'POST'
                  ? '✓ يتم إرسال: email, password, type: "login"'
                  : 'يدعم: balance, amount, credit, wallets'}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={exploreApi}
                disabled={exploringApi || !formData.apiUrl || !formData.email || !formData.password}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {exploringApi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الاستكشاف...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    استكشاف API
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={testApiConnection}
                disabled={testingConnection || !formData.apiUrl || !formData.email || !formData.password}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الاختبار...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    اختبار الاتصال
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              العملة *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'IQD' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'IQD'
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">دينار عراقي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'USD' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'USD'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">دولار أمريكي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'AED' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'AED'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">درهم إماراتي</p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-gray-700">تفعيل الاتصال</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative w-14 h-7 rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.isActive ? 'right-1' : 'right-8'
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-gray-700">مزامنة تلقائية</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, autoSync: !formData.autoSync })}
              className={`relative w-14 h-7 rounded-full transition-colors ${formData.autoSync ? 'bg-blue-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.autoSync ? 'right-1' : 'right-8'
                  }`}
              />
            </button>
          </div>

          {formData.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                فترة المزامنة (بالدقائق)
              </label>
              <input
                type="number"
                value={formData.syncInterval}
                onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) || 60 })}
                min="5"
                max="1440"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <ModernButton
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              إلغاء
            </ModernButton>
            <ModernButton onClick={handleAddConnection}>
              إضافة الاتصال
            </ModernButton>
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingConnection(null);
          resetForm();
        }}
        title="تعديل اتصال API"
      >
        <div className="space-y-5">
          <ModernInput
            label="اسم الاتصال *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: حساب طيران العربية الرئيسي"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              خط الطيران *
            </label>
            {sources.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-800 mb-2">لا توجد خطوط طيران متاحة</p>
                <p className="text-xs text-yellow-700">يرجى إضافة خط طيران أولاً من صفحة الشركات</p>
              </div>
            ) : (
              <select
                value={formData.sourceId}
                onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
                required
              >
                <option value="">اختر خط الطيران</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              طريقة API *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, apiMethod: 'POST' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.apiMethod === 'POST'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">POST</p>
                <p className="text-xs mt-1">مع بيانات الدخول</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, apiMethod: 'GET' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.apiMethod === 'GET'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">GET</p>
                <p className="text-xs mt-1">مع Token</p>
              </button>
            </div>
          </div>

          {formData.apiMethod === 'POST' ? (
            <>
              <ModernInput
                label="البريد الإلكتروني *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                required
              />

              <ModernInput
                label="كلمة المرور *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </>
          ) : (
            <ModernInput
              label="رمز المصادقة (Token) *"
              value={formData.authToken}
              onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
              placeholder="Bearer token أو session token"
              required
            />
          )}

          <div>
            <ModernInput
              label="رابط API *"
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              placeholder={formData.apiMethod === 'POST'
                ? "https://api.ak-booking.com/api/b2b/v1/login"
                : "https://api.example.com/balance"}
              required
            />
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-2 font-semibold">
                {formData.apiMethod === 'POST'
                  ? 'استجابة POST (يرجع الرصيد مباشرة):'
                  : 'تنسيق الاستجابة المتوقع:'}
              </p>
              <pre className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                {formData.apiMethod === 'POST' ? `{
  "data": {
    "token": "eyJhbGc...",
    "wallet": {
      "currency": "IQD",
      "balance": 24723299.95
    }
  }
}` : `{ "balance": 15000 }

أو محافظ متعددة:
{
  "wallets": [
    {"currency": "IQD", "balance": 25109543.95}
  ]
}`}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                {formData.apiMethod === 'POST'
                  ? '✓ يتم إرسال: email, password, type: "login"'
                  : 'يدعم: balance, amount, credit, wallets'}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={exploreApi}
                disabled={exploringApi || !formData.apiUrl || !formData.email || !formData.password}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {exploringApi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الاستكشاف...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    استكشاف API
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={testApiConnection}
                disabled={testingConnection || !formData.apiUrl || !formData.email || !formData.password}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الاختبار...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    اختبار الاتصال
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              العملة *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'IQD' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'IQD'
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">دينار عراقي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'USD' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'USD'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">دولار أمريكي</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: 'AED' })}
                className={`p-3 rounded-xl border-2 transition-all ${formData.currency === 'AED'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-bold text-sm">درهم إماراتي</p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-gray-700">تفعيل الاتصال</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`relative w-14 h-7 rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.isActive ? 'right-1' : 'right-8'
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-gray-700">مزامنة تلقائية</label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, autoSync: !formData.autoSync })}
              className={`relative w-14 h-7 rounded-full transition-colors ${formData.autoSync ? 'bg-blue-500' : 'bg-gray-300'
                }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${formData.autoSync ? 'right-1' : 'right-8'
                  }`}
              />
            </button>
          </div>

          {formData.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                فترة المزامنة (بالدقائق)
              </label>
              <input
                type="number"
                value={formData.syncInterval}
                onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) || 60 })}
                min="5"
                max="1440"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <ModernButton
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingConnection(null);
                resetForm();
              }}
            >
              إلغاء
            </ModernButton>
            <ModernButton onClick={handleUpdateConnection}>
              حفظ التعديلات
            </ModernButton>
          </div>
        </div>
      </ModernModal>

      <ModernModal
        isOpen={showExplorationModal}
        onClose={() => setShowExplorationModal(false)}
        title="نتائج استكشاف API"
      >
        <div className="space-y-4">
          {exploringApi && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="text-blue-800 font-medium">جاري استكشاف نقاط النهاية المحتملة...</p>
              <p className="text-xs text-blue-600 mt-1">تم اختبار {explorationResults.length} endpoint حتى الآن</p>
            </div>
          )}

          {explorationResults.length > 0 && (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {explorationResults.map((result, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-4 ${result.success
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="font-bold text-sm">{result.name}</span>
                      </div>
                      <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                        {result.method} {result.endpoint}
                      </code>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.success
                      ? 'bg-green-200 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                      }`}>
                      {result.status}
                    </span>
                  </div>

                  {result.success && result.data && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">البيانات المستلمة:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>

                      {(() => {
                        const data = result.data?.data || result.data;
                        return (data.balance !== undefined ||
                          data.wallets ||
                          data.amount !== undefined ||
                          data.credit !== undefined) && (
                            <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded p-2">
                              <p className="text-xs font-bold text-yellow-800 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                يمكن استخدام هذا Endpoint!
                              </p>
                              {data.wallets && (
                                <p className="text-xs text-yellow-700 mt-1">
                                  يحتوي على محافظ متعددة - مثالي لتعدد العملات
                                </p>
                              )}
                            </div>
                          );
                      })()}

                      {result.data.token && (
                        <button
                          onClick={() => {
                            setFormData({ ...formData, authToken: result.data.token, apiMethod: 'GET' });
                            showNotification('success', 'نجاح', 'تم نسخ Token تلقائياً!');
                          }}
                          className="mt-2 w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium"
                        >
                          استخدام Token الناتج
                        </button>
                      )}
                    </div>
                  )}

                  {!result.success && result.error && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                      {result.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!exploringApi && explorationResults.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">اضغط على زر "استكشاف API" للبدء</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <ModernButton onClick={() => setShowExplorationModal(false)}>
              إغلاق
            </ModernButton>
          </div>
        </div>
      </ModernModal>
    </div>
  );
}

export default ApiIntegrations;
