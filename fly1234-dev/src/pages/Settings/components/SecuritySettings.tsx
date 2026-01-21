import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { isBiometricSupported, registerBiometrics } from '../../../utils/biometrics';
import ModernButton from '../../../components/ModernButton';

const SecuritySettings: React.FC = () => {
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
            if (error.name !== 'NotAllowedError') { // NotAllowedError is usually user cancellation
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

    if (isSupported === false) {
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">التحقق الحيوي غير مدعوم</h3>
                <p className="text-sm text-gray-500">
                    هذا الجهاز أو المتصفح لا يدعم التحقق عبر البصمة أو الوجه (WebAuthn).
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-500/5 dark:to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl shadow-inner">
                            <Shield className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">الأمان والتحقق الحيوي</h3>
                            <p className="text-sm text-gray-500">تأمين عملية تسجيل الحضور عبر بصمة الإصبع أو الوجه</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                        <AlertCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                            عند تفعيل هذه الخاصية، سيطلب النظام منك التحقق من هويتك عبر بصمة الإصبع أو الوجه (المخزنة في جهازك) في كل مرة تقوم فيها بتسجيل الحضور أو الانصراف، وذلك لضمان أعلى مستويات الأمان.
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${employee?.biometricsEnabled
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                }`}>
                                <Fingerprint className="w-8 h-8" strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="font-black text-lg">بصمة الإصبع والوجه</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {employee?.biometricsEnabled ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">مفعلة</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">غير مفعلة</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {employee?.biometricsEnabled ? (
                            <ModernButton
                                variant="secondary"
                                onClick={handleDisable}
                                className="text-red-500 hover:bg-red-50"
                            >
                                إلغاء التفعيل
                            </ModernButton>
                        ) : (
                            <ModernButton
                                onClick={handleRegister}
                                loading={isRegistering}
                                icon={<Shield className="w-4 h-4" />}
                                className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                            >
                                تفعيل الآن
                            </ModernButton>
                        )}
                    </div>

                    {employee?.biometricsEnabled && (
                        <div className="flex justify-center">
                            <button
                                onClick={handleRegister}
                                disabled={isRegistering}
                                className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-2"
                            >
                                {isRegistering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Fingerprint className="w-3 h-3" />}
                                إعادة تسجيل البيانات الحيوية
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
