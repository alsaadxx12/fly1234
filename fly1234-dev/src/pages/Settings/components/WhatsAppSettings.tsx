import React from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getWhatsAppSettings, makeWhatsAppAccountGlobal } from '../../../lib/collections/whatsapp';
import { Plus, MessageCircle, QrCode, Smartphone, Link2, CheckCircle2, XCircle, AlertTriangle, Loader2, Trash2, RefreshCw, Key, Check, BadgeCheck, Phone, Wifi, Edit, Pencil, X, Hash, Globe, Lock } from 'lucide-react';
import { useWhatsAppApi } from '../hooks/useWhatsAppApi'; 
import MessageTemplateEditor from './WhatsAppTemplateEditor';

interface WhatsAppSettingsProps {
  setActiveTab?: (tab: 'system' | 'profile' | 'whatsapp' | 'accounts') => void;
}

export default function WhatsAppSettings({ setActiveTab }: WhatsAppSettingsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [whatsappAccounts, setWhatsappAccounts] = React.useState<Array<{
    id?: string;
    instanceId: string;
    token: string;
    name: string;
    isActive: boolean;
    isGlobal?: boolean;
  }>>([]);
  const [activeAccountIndex, setActiveAccountIndex] = React.useState(0);
  const [newAccount, setNewAccount] = React.useState({
    instanceId: '',
    token: '',
    name: ''
  });
  const [isAddingAccount, setIsAddingAccount] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'success' | 'error' | null>(null);
  const [connectionMessage, setConnectionMessage] = React.useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [accountToEdit, setAccountToEdit] = React.useState<{
    index: number;
    id?: string;
    name: string;
    instanceId: string;
    token: string;
  } | null>(null);
  const { fetchWhatsAppAccount, testConnection } = useWhatsAppApi();
  const [activeSettingsTab, setActiveSettingsTab] = React.useState<'accounts' | 'templates'>('accounts');
  const [isGlobalSettings, setIsGlobalSettings] = React.useState(true);

  // WhatsApp account info
  const [whatsappAccountInfo, setWhatsappAccountInfo] = React.useState<{
    id: string;
    name: string;
    phone?: string;
    profile_picture: string;
    is_business: boolean;
  } | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = React.useState(false);
  const [accountError, setAccountError] = React.useState<string | null>(null);

  // Load saved settings
  React.useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) {
        console.log('No user ID available');
        return;
      }

      try {
        console.log('Loading WhatsApp settings for user:', user.uid);
        const settings = await getWhatsAppSettings(user.uid);
        console.log('Loaded WhatsApp settings:', settings);

        if (settings && settings.length > 0) {
          const accounts = settings.map(s => {
            const instanceId = s.instance_id || s.instanceId || '';
            const name = (s.name && s.name.trim()) ? s.name : (instanceId || 'حساب واتساب');

            return {
              id: s.id,
              instanceId: instanceId,
              token: s.token || s.apiKey || '',
              name: name,
              isActive: s.is_active || s.isActive || false,
              isGlobal: s.is_global || s.isGlobal || false
            };
          });

          console.log('Mapped accounts:', accounts);
          setWhatsappAccounts(accounts);

          // Set active account to the first active one, or the first one if none are active
          const activeIndex = settings.findIndex(s => s.is_active || s.isActive);
          setActiveAccountIndex(activeIndex >= 0 ? activeIndex : 0);
        } else {
          console.log('No WhatsApp settings found');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [user?.uid]);
  
  // Fetch account info when active account changes
  React.useEffect(() => {
    if (whatsappAccounts.length > 0) {
      const activeAccount = whatsappAccounts[activeAccountIndex];
      if (activeAccount?.instanceId && activeAccount?.token) {
        handleFetchAccount(activeAccount.instanceId, activeAccount.token);
      }
    }
  }, [activeAccountIndex, whatsappAccounts]);

  const handleTestConnection = async (instanceId: string, token: string) => {
    if (!instanceId || !token) return;
    
    setIsTestingConnection(true);
    setConnectionStatus(null);
    setConnectionMessage('');
    
    try {
      const result = await testConnection(instanceId, token);
      
      setConnectionStatus(result.success ? 'success' : 'error');
      setConnectionMessage(result.message);
      
      if (result.success) {
        // Fetch account info
        handleFetchAccount(instanceId, token);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage('فشل الاتصال. تأكد من صحة المعرف والرمز');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.instanceId || !newAccount.token) {
      setConnectionStatus('error');
      setConnectionMessage('يرجى إدخال معرف النسخة ورمز الوصول أولاً');
      return;
    }
    
    try {
      // Test connection first
      setIsTestingConnection(true);
      setConnectionStatus(null);
      setConnectionMessage('');

      // Format instance ID correctly
      const formattedInstanceId = newAccount.instanceId.startsWith('instance') 
        ? newAccount.instanceId 
        : `instance${newAccount.instanceId}`;
      
      const result = await testConnection(formattedInstanceId, newAccount.token);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Save the new account
      await addDoc(collection(db, 'whatsapp_settings'), {
        user_id: 'global',
        instance_id: formattedInstanceId,
        token: newAccount.token, 
        name: '', // Don't use a container name
        is_active: whatsappAccounts.length === 0, // Make active if it's the first account
        is_global: true, // Always global
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Refresh the accounts list
      const settings = await getWhatsAppSettings(user?.uid || '');
      setWhatsappAccounts(settings.map(s => ({
        id: s.id,
        instanceId: s.instance_id,
        token: s.token,
        name: s.name || s.instance_id,
        isActive: s.is_active || false,
        isGlobal: s.is_global || false
      })));
      
      setIsAddingAccount(false);
      setNewAccount({ instanceId: '', token: '', name: '' });
      
      // Fetch account info to display
      try {
        const accountInfo = await fetchWhatsAppAccount(formattedInstanceId, newAccount.token);
        
        // Make the new account available globally if it's the first or only account
        if (whatsappAccounts.length === 0) {
          window.selectedWhatsAppAccount = {
            instance_id: formattedInstanceId,
            token: newAccount.token
          };
          
          // Dispatch a custom event to notify other components about the account
          const event = new CustomEvent('whatsappAccountUpdated', { 
            detail: { account: { instance_id: formattedInstanceId, token: newAccount.token } } 
          });
          window.dispatchEvent(event);
        }
        
        setWhatsappAccountInfo(accountInfo);
        setConnectionStatus('success');
        setConnectionMessage('تم الاتصال بحساب ' + accountInfo.name + ' بنجاح');
      } catch (infoError) {
        console.error('Error fetching account info after adding:', infoError);
        setConnectionStatus('success');
        setConnectionMessage('تم إضافة الحساب بنجاح');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'فشل في إضافة الحساب');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const setAccountActive = async (index: number) => {
    if (index < 0 || index >= whatsappAccounts.length) return;
    
    const account = whatsappAccounts[index];
    
    try {
      // Update all accounts to be inactive first
      const updatePromises = whatsappAccounts.map(async (account, i) => {
        if (!account.id) return;
        
        // Check if document exists before updating
        const docRef = doc(db, 'whatsapp_settings', account.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          await updateDoc(docRef, {
            is_active: i === index,
            updated_at: new Date()
          });
        } else {
          // If document doesn't exist, remove it from local state
          setWhatsappAccounts(prev => prev.filter((_, idx) => idx !== i));
          if (i === index) {
            // If trying to activate a non-existent account, show error
            setConnectionStatus('error');
            setConnectionMessage('الحساب غير موجود. يرجى تحديث الصفحة وإعادة المحاولة');
            return;
          }
        }
      });
      
      await Promise.all(updatePromises);
      
      // Update local state for remaining accounts
      setWhatsappAccounts(prev => prev.map((account, i) => ({
        ...account,
        isActive: i === index
      })));
      
      setActiveAccountIndex(index);
      
      // Make the selected account available globally
      if (account) {
        window.selectedWhatsAppAccount = {
          instance_id: account.instanceId,
          token: account.token
        };
        
        // Dispatch a custom event to notify other components about the account
        const event = new CustomEvent('whatsappAccountUpdated', { 
          detail: { account: { instance_id: account.instanceId, token: account.token } } 
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error setting active account:', error);
      setConnectionStatus('error');
      setConnectionMessage('فشل في تحديث حالة الحساب');
    }
  };

  const deleteAccount = async (index: number) => {
    if (index < 0 || index >= whatsappAccounts.length) return;
    const account = whatsappAccounts[index];
    if (!account.id) {
      console.error('Cannot delete account without ID');
      return;
    }
    
    try {
      // Check if document exists before deleting
      const docRef = doc(db, 'whatsapp_settings', account.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Document already deleted, just update local state
        const newAccounts = whatsappAccounts.filter((_, i) => i !== index);
        setWhatsappAccounts(newAccounts);
        
        if (activeAccountIndex >= newAccounts.length) {
          setActiveAccountIndex(Math.max(0, newAccounts.length - 1));
        }
        
        setIsDeleteModalOpen(false);
        setAccountToDelete(null);
        setConnectionStatus('success');
        setConnectionMessage('تم حذف الحساب');
        return;
      }
      
      // Delete the account
      await deleteDoc(docRef);
      
      // Update local state
      const newAccounts = [...whatsappAccounts];
      newAccounts.splice(index, 1);
      setWhatsappAccounts(newAccounts);
      
      // If we deleted the active account, set a new active account
      if (account.isActive && newAccounts.length > 0) {
        const newActiveIndex = 0; // Set first account as active
        await setAccountActive(newActiveIndex);
      }
      
      // Adjust active index if needed
      if (activeAccountIndex >= newAccounts.length) {
        setActiveAccountIndex(Math.max(0, newAccounts.length - 1));
      }
      
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
      
      // Show success message
      setConnectionStatus('success');
      setConnectionMessage('تم حذف الحساب بنجاح');
    } catch (error) {
      console.error('Error deleting account:', error);
      setConnectionStatus('error');
      setConnectionMessage('فشل في حذف الحساب');
    }
  };

  // Toggle global status of an account
  const toggleGlobalStatus = async (index: number) => {
    if (index < 0 || index >= whatsappAccounts.length) return;
    // All accounts are always global in this implementation
    setConnectionStatus('success');
    setConnectionMessage('جميع الحسابات متاحة لجميع المستخدمين بشكل افتراضي');
  };

  // Wrapper for fetchWhatsAppAccount from the hook
  const handleFetchAccount = async (instanceId: string, token: string) => {
    setIsLoadingAccount(true);
    try {
      // Format instance ID correctly
      const formattedInstanceId = instanceId.startsWith('instance') 
        ? instanceId 
        : `instance${instanceId}`;
        
      const account = await fetchWhatsAppAccount(instanceId, token);
      setWhatsappAccountInfo(account);
      setAccountError(null);
    } catch (error) {
      console.error('Error in handleFetchAccount:', error);
      setAccountError(error instanceof Error ? error.message : 'فشل في جلب معلومات الحساب');
      setWhatsappAccountInfo(null);
    } finally {
      setIsLoadingAccount(false);
      setIsTestingConnection(false);
    }
  };

  // Edit account handler
  const handleEditAccount = () => {
    if (!accountToEdit) return;
    
    setIsEditModalOpen(false);
    
    // Update the account in the state
    const updatedAccounts = [...whatsappAccounts];
    updatedAccounts[accountToEdit.index] = {
      ...updatedAccounts[accountToEdit.index],
      name: accountToEdit.name,
      instanceId: accountToEdit.instanceId,
      token: accountToEdit.token
    };
    
    setWhatsappAccounts(updatedAccounts);
    
    // If there's an ID, update in Firestore
    if (accountToEdit.id) {
      updateDoc(doc(db, 'whatsapp_settings', accountToEdit.id), {
        name: accountToEdit.name,
        instance_id: accountToEdit.instanceId,
        token: accountToEdit.token,
        updated_at: new Date()
      }).catch(error => {
        console.error('Error updating account:', error);
      });
    }
    
    setAccountToEdit(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-gray-800">
      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl shadow-inner">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">إعدادات الواتساب</h3>
                <p className="text-sm text-gray-500 mt-1">إدارة حسابات الواتساب وقوالب الرسائل</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
              <button 
                onClick={() => setActiveSettingsTab('accounts')}
                className={`px-3 py-1.5 font-medium text-sm rounded-lg transition-colors ${
                  activeSettingsTab === 'accounts' 
                    ? 'bg-green-50 text-green-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                حسابات الواتساب
              </button>
              <button 
                onClick={() => setActiveSettingsTab('templates')}
                className={`px-3 py-1.5 font-medium text-sm rounded-lg transition-colors ${
                  activeSettingsTab === 'templates' 
                    ? 'bg-green-50 text-green-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                قوالب الرسائل
              </button>
            </div>
          </div>
        </div>

        {activeSettingsTab === 'accounts' && (
          <div className="space-y-6 p-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsAddingAccount(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حساب جديد</span>
              </button>
            </div>
            
            {/* Add New Account Form */}
            {isAddingAccount && (
              <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-green-200 transition-all shadow-sm hover:shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">ربط حساب واتساب</h3>
                      <p className="text-xs text-gray-500">أدخل معلومات الاتصال فقط</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddingAccount(false)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-gray-500" />
                          <span>معرف النسخة (Instance ID)</span>
                        </div>
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={newAccount.instanceId.replace(/^instance/, '')}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, instanceId: e.target.value.replace(/^instance/, '') }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-800 shadow-sm pl-10"
                          placeholder="123456"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-3">
                          <QrCode className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">يمكنك الحصول على معرف النسخة من لوحة تحكم UltraMsg</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-gray-500" />
                          <span>رمز الوصول (Token)</span>
                        </div>
                      </label>
                      <div className="relative"> 
                        <input 
                          type="text"
                          value={newAccount.token}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, token: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-800 shadow-sm pl-10 font-mono"
                          placeholder="abcdef1234567890"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-3">
                          <Key className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">رمز الوصول الخاص بحساب UltraMsg</p>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        onClick={() => handleTestConnection(newAccount.instanceId, newAccount.token)}
                        disabled={!newAccount.instanceId || !newAccount.token || isTestingConnection}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                      >
                        {isTestingConnection ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري الاختبار...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Link2 className="w-5 h-5" />
                            <span>اختبار الاتصال</span>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {connectionStatus && (
                      <div className={`flex items-center gap-2 p-4 rounded-lg border ${  
                        connectionStatus === 'success'
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {connectionStatus === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span>{connectionMessage}</span>
                      </div>
                    )}
                      
                    {connectionStatus === 'success' && (
                      <button
                        onClick={handleAddAccount}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg active:scale-95 mt-3 font-bold"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-5 h-5" />
                          <span>حفظ معلومات الاتصال</span>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex flex-col items-center justify-center py-8"> 
                      {whatsappAccountInfo && (
                        <div className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-100 flex-shrink-0 bg-gradient-to-br from-green-50 to-white shadow-inner">
                              {whatsappAccountInfo.profile_picture ? (
                                <img src={whatsappAccountInfo.profile_picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Smartphone className="w-8 h-8 text-green-500" />
                                </div>
                              )} 
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold text-gray-800">{whatsappAccountInfo.name || 'حساب واتساب'}</h4>
                                {whatsappAccountInfo.is_business && (
                                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-blue-100">
                                    <BadgeCheck className="w-3 h-3" />
                                    <span>Business</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span className="text-sm font-mono" dir="ltr">{whatsappAccountInfo.phone || whatsappAccountInfo.id?.split('@')[0]}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs">
                                  <Wifi className="w-3 h-3" />
                                  <span className="font-bold">متصل</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {isLoadingAccount ? (
                        <div className="flex items-center justify-center py-8"> 
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-200 border-t-green-600"></div>
                          <span className="mr-3 text-gray-600">جاري تحميل معلومات الحساب...</span>
                        </div>
                      ) : accountError ? (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
                          <span className="text-red-600">{accountError}</span>
                        </div> 
                      ) : !whatsappAccountInfo && (
                        <div className="text-center p-6 flex flex-col items-center justify-center py-8 text-gray-800">
                          <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 mb-2">لم يتم العثور على معلومات الحساب</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            قم بإدخال معلومات الاتصال واختبار الاتصال للتحقق من الحساب
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Accounts List */}
            {whatsappAccounts.length > 0 ? (
              <div className="space-y-4 mt-6">
                {/* Show only the active account */} 
                {whatsappAccounts.filter(account => account.isActive).map((account, index) => {
                  const actualIndex = whatsappAccounts.findIndex(a => a.id === account.id);
                  return (
                    <div key={account.id || index} className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-lg shadow-inner">
                            <MessageCircle className="w-6 h-6 text-green-600" />
                          </div>
                
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">الحساب النشط</h3>
                            <p className="text-sm text-gray-500">يتم استخدام هذا الحساب لإرسال الرسائل</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setAccountToEdit({
                                index: actualIndex,
                                id: account.id,
                                name: account.name,
                                instanceId: account.instanceId,
                                token: account.token
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setAccountToDelete(actualIndex);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {isLoadingAccount ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600"></div>
                            <span className="mr-3 text-gray-600 text-sm">جاري تحميل معلومات الحساب...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-100 flex-shrink-0 bg-gradient-to-br from-green-50 to-white shadow-inner">
                              {whatsappAccountInfo?.profile_picture ? (
                                <img src={whatsappAccountInfo.profile_picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Smartphone className="w-8 h-8 text-green-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-bold text-gray-800">
                                  {whatsappAccountInfo?.name || account.name || 'حساب واتساب'}
                                </h4>
                                {whatsappAccountInfo?.is_business && (
                                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-blue-100">
                                    <BadgeCheck className="w-3 h-3" />
                                    <span>Business</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Hash className="w-3.5 h-3.5" />
                                  <span className="text-sm font-mono" dir="ltr">{account.instanceId}</span>
                                </div>

                                {whatsappAccountInfo ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs">
                                    <Wifi className="w-3 h-3" />
                                    <span className="font-bold">متصل</span>
                                  </div>
                                ) : accountError ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">
                                    <XCircle className="w-3 h-3" />
                                    <span className="font-bold">خطأ في الاتصال</span>
                                  </div>
                                ) : null}

                                {account.isGlobal && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                                    <Globe className="w-3 h-3" />
                                    <span className="font-bold">عام</span>
                                  </div>
                                )}
                              </div>

                              {whatsappAccountInfo?.phone && (
                                <div className="flex items-center gap-1 text-gray-500 mt-1">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span className="text-sm font-mono" dir="ltr">{whatsappAccountInfo.phone}</span>
                                </div>
                              )}

                              {accountError && !isLoadingAccount && (
                                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{accountError}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Other Accounts */}
                {whatsappAccounts.filter(account => !account.isActive).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">الحسابات الأخرى</h3>
                    <div className="space-y-4">
                      {whatsappAccounts.filter(account => !account.isActive).map((account, index) => {
                        const actualIndex = whatsappAccounts.findIndex(a => a.id === account.id);
                        return (
                          <div key={account.id || index} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Smartphone className="w-6 h-6 text-gray-400" />
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="text-base font-bold text-gray-800">
                                    {account.name || 'حساب واتساب'}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <Hash className="w-3.5 h-3.5" />
                                      <span className="text-sm font-mono" dir="ltr">{account.instanceId}</span>
                                    </div>
                                    
                                    {account.isGlobal && (
                                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                                        <Globe className="w-3 h-3" />
                                        <span className="font-bold">عام</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setAccountActive(actualIndex)}
                                  className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                                >
                                  تفعيل
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setAccountToEdit({
                                      index: actualIndex,
                                      id: account.id,
                                      name: account.name,
                                      instanceId: account.instanceId,
                                      token: account.token
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setAccountToDelete(actualIndex);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد حسابات واتساب</h3>
                <p className="text-sm text-gray-500 mb-4">
                  قم بإضافة حساب واتساب جديد للبدء في إرسال الرسائل
                </p>
                <button
                  onClick={() => setIsAddingAccount(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    <span>إضافة حساب جديد</span>
                  </div>
                </button>
              </div>
            )}
            
            {/* Delete Account Modal */}
            {isDeleteModalOpen && accountToDelete !== null && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">حذف الحساب</h3>
                  <p className="text-gray-600 mb-6">
                    هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setAccountToDelete(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => deleteAccount(accountToDelete)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Account Modal */}
            {isEditModalOpen && accountToEdit && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800">تعديل الحساب</h3>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setAccountToEdit(null);
                      }}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم الحساب
                      </label>
                      <input
                        type="text"
                        value={accountToEdit.name}
                        onChange={(e) => setAccountToEdit(prev => ({ ...prev!, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="أدخل اسم الحساب"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        معرف النسخة (Instance ID)
                      </label>
                      <input
                        type="text"
                        value={accountToEdit.instanceId}
                        onChange={(e) => setAccountToEdit(prev => ({ ...prev!, instanceId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="أدخل معرف النسخة"
                        dir="ltr"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رمز الوصول (Token)
                      </label>
                      <input
                        type="text"
                        value={accountToEdit.token}
                        onChange={(e) => setAccountToEdit(prev => ({ ...prev!, token: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                        placeholder="أدخل رمز الوصول"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setAccountToEdit(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleEditAccount}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeSettingsTab === 'templates' && (
          <div className="p-6">
            <MessageTemplateEditor />
          </div>
        )}
      </div>
    </div>
  );
}