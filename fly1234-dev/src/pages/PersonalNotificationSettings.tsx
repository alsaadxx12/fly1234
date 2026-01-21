import React, { useState, useEffect } from 'react';
import { Bell, Coins, DollarSign, Cpu, TrendingUp, Clock, Megaphone, ShieldAlert, CreditCard, Send, Plus, Sparkles, ChevronRight } from 'lucide-react';
import SettingsCard from '../components/SettingsCard';
import SettingsToggle from '../components/SettingsToggle';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AdminNotificationModal from './Profile/components/AdminNotificationModal';
import { useNavigate } from 'react-router-dom';

export default function PersonalNotificationSettings() {
    const { employee, checkPermission } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        pointsAddition: true,
        pointsDeduction: true,
        salaryReady: true,
        systemUpdate: true,
        exchangeRateUpdate: true,
        attendanceReminder: true,
        systemBroadcast: true,
        mastercardIssueNew: true,
        mastercardIssuePending: true,
    });
    const [loading, setLoading] = useState(true);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

    const isAdmin = checkPermission('settings', 'isAdmin') || checkPermission('accounts', 'confirm');

    useEffect(() => {
        if (employee?.id) {
            loadSettings();
        }
    }, [employee?.id]);

    const loadSettings = async () => {
        try {
            const settingsRef = doc(db, 'employee_notification_settings', employee.id);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
        } catch (error) {
            console.error('Error loading employee notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key: string, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        try {
            const settingsRef = doc(db, 'employee_notification_settings', employee.id);
            await setDoc(settingsRef, newSettings, { merge: true });
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 lg:max-w-4xl lg:mx-auto text-right">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className={`p-3 rounded-2xl transition-all active:scale-95 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm border border-gray-100'
                            }`}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>إعدادات الإشعارات</h1>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Custom Alerts</p>
                    </div>
                </div>
            </div>

            <SettingsCard
                icon={Bell}
                title="إدارة الإشعارات"
                description="تخصيص تنبيهات النظام التي ترغب في استلامها"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsToggle
                        icon={Coins}
                        title="إشعارات إضافة نقاط"
                        description="تنبهك عند حصولك على نقاط حوافز جديدة"
                        checked={settings.pointsAddition}
                        onChange={(val) => handleToggle('pointsAddition', val)}
                        color="green"
                    />
                    <SettingsToggle
                        icon={ShieldAlert}
                        title="إشعارات خصم نقاط"
                        description="تنبهك عند وجود خصومات في نقاط الحضور"
                        checked={settings.pointsDeduction}
                        onChange={(val) => handleToggle('pointsDeduction', val)}
                        color="purple"
                    />
                    <SettingsToggle
                        icon={DollarSign}
                        title="إشعارات نزول الراتب"
                        description="رسالة تفضل للاستلام عند جاهزية الرواتب"
                        checked={settings.salaryReady}
                        onChange={(val) => handleToggle('salaryReady', val)}
                        color="green"
                    />
                    <SettingsToggle
                        icon={Cpu}
                        title="تحديثات النظام"
                        description="إشعارات عند إضافة مميزات جديدة للنظام"
                        checked={settings.systemUpdate}
                        onChange={(val) => handleToggle('systemUpdate', val)}
                        color="blue"
                    />
                    <SettingsToggle
                        icon={TrendingUp}
                        title="تغير سعر الصرف"
                        description="تنبيهات فورية عند تحديث سعر الصرف"
                        checked={settings.exchangeRateUpdate}
                        onChange={(val) => handleToggle('exchangeRateUpdate', val)}
                        color="blue"
                    />
                    <SettingsToggle
                        icon={Clock}
                        title="موعد تسجيل الحضور"
                        description="تذكير عندما يحين موعد تسجيل البصمة"
                        checked={settings.attendanceReminder}
                        onChange={(val) => handleToggle('attendanceReminder', val)}
                        color="purple"
                    />
                    <SettingsToggle
                        icon={Megaphone}
                        title="تبليغات النظام"
                        description="إشعارات عامة وتنبيهات من إدارة النظام"
                        checked={settings.systemBroadcast}
                        onChange={(val) => handleToggle('systemBroadcast', val)}
                        color="blue"
                    />
                    <SettingsToggle
                        icon={CreditCard}
                        title="مشاكل الماستر المعلقة"
                        description="تحديثات حول مشاكل الماستركارد قيد المعالجة"
                        checked={settings.mastercardIssuePending}
                        onChange={(val) => handleToggle('mastercardIssuePending', val)}
                        color="purple"
                    />
                    <SettingsToggle
                        icon={Plus}
                        title="إضافة مشكلة ماستر"
                        description="تنبيه عند إضافة مشكلة ماستر كارد جديدة"
                        checked={settings.mastercardIssueNew}
                        onChange={(val) => handleToggle('mastercardIssueNew', val)}
                        color="blue"
                    />
                </div>

                {isAdmin && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-200 dark:border-blue-900/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-xl shadow-lg ring-4 ring-blue-500/10">
                                    <Send className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 dark:text-white">إرسال إشعار إداري</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">يمكنك إرسال تبليغ أو تحديث للموظفين حسب الأقسام</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAdminModalOpen(true)}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                إنشاء تبليغ
                            </button>
                        </div>
                    </div>
                )}
            </SettingsCard>

            {isAdmin && (
                <AdminNotificationModal
                    isOpen={isAdminModalOpen}
                    onClose={() => setIsAdminModalOpen(false)}
                />
            )}
        </div>
    );
}
