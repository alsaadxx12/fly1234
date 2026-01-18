import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Settings, Key, Link2, Brain, Save, Loader2, X, CheckCircle, AlertCircle, User } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';
import ModernInput from '../../../components/ModernInput';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { theme } = useTheme();
  const [flightApiEndpoint, setFlightApiEndpoint] = useState('');
  const [flightApiToken, setFlightApiToken] = useState('');
  const [userSyncApiEndpoint, setUserSyncApiEndpoint] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      if (isOpen) {
        try {
          const settingsRef = doc(db, 'settings', 'api_config');
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFlightApiEndpoint(data.flightApiEndpoint || '');
            setFlightApiToken(data.flightApiToken || '');
            setUserSyncApiEndpoint(data.userSyncApiEndpoint || '');
            setAiApiKey(data.aiApiKey || '');
          }
        } catch (err) {
          console.error("Failed to load API settings from Firestore", err);
          setError("فشل في تحميل الإعدادات.");
        }
        setError('');
        setSuccess('');
      }
    };
    loadSettings();
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const settingsRef = doc(db, 'settings', 'api_config');
      await setDoc(settingsRef, {
        flightApiEndpoint,
        flightApiToken,
        userSyncApiEndpoint,
        aiApiKey
      }, { merge: true });

      // Also save to localStorage for components that might still use it as a fallback
      localStorage.setItem('flight_api_endpoint', flightApiEndpoint);
      localStorage.setItem('flight_api_token', flightApiToken);
      localStorage.setItem('user_sync_api_endpoint', userSyncApiEndpoint);
      localStorage.setItem('ai_api_key', aiApiKey);
      localStorage.setItem('openai_api_key', aiApiKey);

      setSuccess('تم حفظ الإعدادات بنجاح!');
      onSave();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e) {
      console.error("Failed to save API settings to Firestore", e);
      setError('فشل حفظ الإعدادات في قاعدة البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title="إعدادات الـ API"
      description="إدارة مفاتيح و روابط الـ API"
      icon={<Settings className="w-6 h-6" />}
      iconColor="blue"
      size="md"
    >
      <div className="space-y-6">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>}

        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Link2 className="w-5 h-5" />
            إعدادات API الرحلات
          </h3>
          <div className="space-y-4">
            <ModernInput
              label="نقطة نهاية API الرحلات (Endpoint)"
              value={flightApiEndpoint}
              onChange={(e) => setFlightApiEndpoint(e.target.value)}
              placeholder="https://api.example.com/flights"
            />
            <ModernInput
              label="رمز المصادقة (Token)"
              value={flightApiToken}
              onChange={(e) => setFlightApiToken(e.target.value)}
              placeholder="Bearer ..."
            />
            <ModernInput
              label="نقطة نهاية API مزامنة المستخدم"
              value={userSyncApiEndpoint}
              onChange={(e) => setUserSyncApiEndpoint(e.target.value)}
              placeholder="https://.../syncFly4allUser"
              icon={<User className="w-4 h-4"/>}
            />
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Brain className="w-5 h-5" />
            إعدادات AI (Gemini)
          </h3>
          <ModernInput
            label="مفتاح Gemini API"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder="AIzaSy..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">إلغاء</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </ModernModal>
  );
};

export default ApiSettingsModal;
