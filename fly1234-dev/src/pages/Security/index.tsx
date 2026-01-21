import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, CheckCircle2, XCircle, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { isBiometricSupported, registerBiometrics } from '../../utils/biometrics';
import ModernButton from '../../components/ModernButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const SecurityPage: React.FC = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { employee, updateEmployeeProfile } = useAuth();
    const { showNotification } = useNotification();
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        checkSupport();
    }, []);

    const checkSupport = async () => {
        const supported = await isBiometricSupported();
        setIsSupported(supported);
    };

    const handleRegister = async () => {
        if (!employee) return;

        setIsRegistering(true);
        try {
            const credentialId = await registerBiometrics(employee.userId, employee.email);
            await updateEmployeeProfile(employee.id!, {
                biometricsEnabled: true,
                biometricCredentialId: credentialId
            });
            showNotification('success', 'نجاح', 'تم تفعيل التحقق الحيوي بنجاح');
        } catch (error: any) {
            console.error('Biometric registration error:', error);
            if (error.name !== 'NotAllowedError') {
                showNotification('error', 'فشل إعداد التحقق الحيوي', error.message);
            }
        } finally {
            setIsRegistering(false);
        }
    };

    const handleDisable = async () => {
        if (!employee) return;

        try {
            await updateEmployeeProfile(employee.id!, {
                biometricsEnabled: false
            });
            showNotification('success', 'نجاح', 'تم إلغاء تفعيل التحقق الحيوي');
        } catch (error: any) {
            showNotification('error', 'خطأ', 'فشل إلغاء التفعيل');
        }
    };

    return (
        <main className="flex-1 overflow-y-auto h-full bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="container mx-auto py-6 px-4 max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">الأمان والحماية</h1>
                            <p className="text-sm text-gray-500">إدارة الخصوصية والتحقق الحيوي</p>
                        </div>
                    </div>
                </div>

                {isSupported === false ? (
                    <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">التحقق الحيوي غير مدعوم</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            هذا الجهاز أو المتصفح لا يدعم التحقق عبر البصمة أو الوجه (WebAuthn). يرجى التأكد من استخدام جهاز حديث ومتصفح محدث.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl shadow-gray-200/50 dark:shadow-none">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center border-2 transition-all duration-700 ${employee?.biometricsEnabled
                                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-2xl shadow-emerald-500/40 rotate-12 scale-110'
                                            : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
                                        }`}>
                                        <Fingerprint className="w-12 h-12" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black">بصمة الإصبع والوجه</h2>
                                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                                            تأمين تسجيل الحضور والانصراف عبر المقاييس الحيوية الخاصة بك
                                        </p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${employee?.biometricsEnabled
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                        }`}>
                                        {employee?.biometricsEnabled ? 'نشط ومفعل' : 'غير مفعل'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="flex items-start gap-4 p-5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-3xl border border-indigo-500/10">
                                    <AlertCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <div className="text-sm text-indigo-600/80 dark:text-indigo-300 leading-relaxed font-bold">
                                        سيطلب النظام التحقق الحيوي في كل مرة تقوم فيها بعملية تسجيل للحضور أو الانصراف لضمان دقة البيانات وأمان الحساب.
                                    </div>
                                </div>

                                <div className="pt-2">
                                    {employee?.biometricsEnabled ? (
                                        <div className="space-y-4">
                                            <ModernButton
                                                variant="secondary"
                                                onClick={handleDisable}
                                                className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl h-14"
                                            >
                                                إيقاف تشغيل التحقق الحيوي
                                            </ModernButton>
                                            <button
                                                onClick={handleRegister}
                                                disabled={isRegistering}
                                                className="w-full text-xs font-black text-gray-400 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors py-2"
                                            >
                                                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                                تحديث البيانات الحيوية المسجلة
                                            </button>
                                        </div>
                                    ) : (
                                        <ModernButton
                                            onClick={handleRegister}
                                            loading={isRegistering}
                                            icon={<Shield className="w-5 h-5" />}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 rounded-2xl h-14 text-white"
                                        >
                                            تفعيل التحقق الحيوي
                                        </ModernButton>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 text-center">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-60">Security standard</span>
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                يتم تشفير ومعالجة بياناتك الحيوية بالكامل داخل جهازك عبر المتصفح، ولا يتم إرسال أي بصمات إلى خوادم النظام.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SecurityPage;
