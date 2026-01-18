import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Brain, Key, AlertCircle, Check, Eye, EyeOff, Sparkles, TrendingUp, Zap, Shield, Save, Loader2 } from 'lucide-react';
import SettingsCard from '../../../components/SettingsCard';
import SettingsToggle from '../../../components/SettingsToggle';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

export default function AISettingsTab() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [enableAI, setEnableAI] = useState(true);
  const [enableAutoSuggest, setEnableAutoSuggest] = useState(true);
  const [enableInsights, setEnableInsights] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settingsRef = doc(db, 'settings', 'api_config');
        const settingsDoc = await getDoc(settingsRef);

        let currentApiKey = '';
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.aiApiKey) {
            currentApiKey = data.aiApiKey;
          }
        }
        
        setApiKey(currentApiKey);
        // Also update localStorage for immediate use by other components
        if (currentApiKey) {
          localStorage.setItem('ai_api_key', currentApiKey);
          localStorage.setItem('openai_api_key', currentApiKey);
        } else {
          localStorage.removeItem('ai_api_key');
          localStorage.removeItem('openai_api_key');
        }

      } catch (error) {
        console.error('Error loading AI settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyTestResult({ success: false, message: 'يرجى إدخال مفتاح API أولاً' });
      return;
    }

    setIsTestingKey(true);
    setKeyTestResult(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'مرحبا' }]
          }]
        })
      });

      if (response.ok) {
        setKeyTestResult({ success: true, message: '✓ المفتاح صالح ويعمل بشكل صحيح!' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = 'المفتاح غير صالح';

        if (response.status === 400) {
          errorMsg = 'المفتاح غير صحيح';
        } else if (response.status === 429) {
          errorMsg = 'تم تجاوز حد الاستخدام';
        }

        setKeyTestResult({ success: false, message: `✗ ${errorMsg}` });
      }
    } catch (error) {
      setKeyTestResult({ success: false, message: '✗ فشل الاتصال بخادم Google AI' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'api_config');
      
      await setDoc(settingsRef, { aiApiKey: apiKey.trim() }, { merge: true });

      if (apiKey.trim()) {
        localStorage.setItem('ai_api_key', apiKey.trim());
        localStorage.setItem('openai_api_key', apiKey.trim());
      } else {
        localStorage.removeItem('ai_api_key');
        localStorage.removeItem('openai_api_key');
      }

      window.dispatchEvent(new CustomEvent('apikey-updated', {
        detail: { apiKey: apiKey.trim() }
      }));
    } catch (error) {
      console.error('Error saving AI settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={Key}
        title="مفتاح API"
        description="إعداد مفتاح Google Gemini API"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">كيفية الحصول على مفتاح API مجاني:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>قم بزيارة <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google AI Studio</a></li>
                  <li>سجل الدخول بحساب Google</li>
                  <li>انقر على "Get API Key" أو "Create API Key"</li>
                  <li>انسخ المفتاح والصقه هنا</li>
                  <li>المفتاح مجاني تماماً!</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Key className="w-4 h-4" />
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-lg border pr-12 focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400`}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يتم حفظ المفتاح في قاعدة البيانات ومحلياً
              </p>
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={isTestingKey || !apiKey.trim()}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isTestingKey ? 'جاري الاختبار...' : 'اختبار المفتاح'}
              </button>
            </div>
            {keyTestResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm border ${
                keyTestResult.success
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
              }`}>
                {keyTestResult.message}
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Zap}
        title="ميزات الذكاء الصناعي"
        description="تفعيل وإدارة ميزات AI"
      >
        <div className="space-y-3">
          <SettingsToggle
            icon={Brain}
            title="تفعيل المساعد الذكي"
            description="إتاحة المساعد الذكي في جميع الصفحات"
            checked={enableAI}
            onChange={setEnableAI}
            color="blue"
          />

          <SettingsToggle
            icon={Sparkles}
            title="الاقتراحات التلقائية"
            description="عرض اقتراحات ذكية أثناء الكتابة"
            checked={enableAutoSuggest}
            onChange={setEnableAutoSuggest}
            color="purple"
          />

          <SettingsToggle
            icon={TrendingUp}
            title="الرؤى المالية الذكية"
            description="تحليل البيانات وتقديم رؤى مالية"
            checked={enableInsights}
            onChange={setEnableInsights}
            color="green"
          />
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </div>
        </button>
      </div>
    </div>
  );
}

```
  <change>
    <file>/src/pages/Reports/hooks/useBookingReports.ts</file>
    <content><![CDATA[import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BookingReport, Trip, MatchResult } from '../types';
import {
  parseTrips,
  checkMatch,
  convertJalaliToGregorian,
  normalizeDateForCompare
} from '../../../lib/services/flightLogic';

const PROXY_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/flightProxy";

export default function useBookingReports() {
  const [reports, setReports] = useState<BookingReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightNumberToSearch, setFlightNumberToSearch] = useState<string | null>(null);
  const [dateToSearch, setDateToSearch] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!flightNumberToSearch || !dateToSearch) {
      setReports([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const apiEndpoint = localStorage.getItem('flight_api_endpoint');
      const apiToken = localStorage.getItem('flight_api_token');

      if (!apiEndpoint || !apiToken) {
        throw new Error('لم يتم تعيين نقطة نهاية API أو رمز المصادقة في الإعدادات.');
      }

      const convertedDate = convertJalaliToGregorian(dateToSearch);
      const formattedDate = normalizeDateForCompare(convertedDate);
      
      const payload = {
        endpoint: apiEndpoint,
        token: apiToken,
        params: {
          flight_number: flightNumberToSearch, // Corrected parameter name
          flight: flightNumberToSearch, // Add alternative
          flight_no: flightNumberToSearch, // Add alternative
          date: formattedDate,
          "pagination[page]": 1,
          "pagination[perpage]": 1000,
        },
      };

      const { data } = await axios.post(PROXY_URL, payload);

      if (data.error) {
        throw new Error(data.error.message || 'Error from proxy function');
      }
      
      const trips = parseTrips(JSON.stringify(data.data || data));
      
      const matchedReports = trips
        .map(trip => {
          const matchResult = checkMatch(trip, { flightNumber: flightNumberToSearch, date: formattedDate });
          return {
            ...trip,
            id: trip.id || `${trip.pnr}-${trip.date}`,
            booking_status: trip.booking_status || 'UNKNOWN',
            invoice_status: trip.invoice_status || 'UNKNOWN',
            userSearchTitle: trip.title,
            flight_airline: trip.airline || '',
            tripType: 'oneWay',
            adults: 1,
            children: 0,
            infants: 0,
            serviceDetails: {
              tripType: 'oneWay',
              legsInfo: [],
              allBooking: false,
            },
            match_status: matchResult,
          } as BookingReport;
        })
        .filter(report => report.match_status === 'EXACT');


      setReports(matchedReports);
      
    } catch (err) {
      console.error('Error fetching booking reports:', err);
      let errorMessage = 'فشل في تحميل بيانات التبليغات.';
      if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_NETWORK') {
          errorMessage = 'خطأ في الشبكة. يرجى التحقق من صحة الرابط والاتصال بالإنترنت.';
        } else if (err.response?.status === 401) {
          errorMessage = 'فشل المصادقة. يرجى التحقق من رمز الـ Token في الإعدادات.'
        } else if (err.response) {
          errorMessage = `حدث خطأ من الخادم: ${err.response.status} - ${err.response.data?.message || err.message}`;
        }
      }
      setError(errorMessage);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [flightNumberToSearch, dateToSearch]);

  useEffect(() => {
    if (flightNumberToSearch && dateToSearch) {
      fetchReports();
    }
  }, [fetchReports, flightNumberToSearch, dateToSearch]);

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    setFlightNumberToSearch,
    setDateToSearch
  };
}
