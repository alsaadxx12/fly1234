import React, { useState, useEffect } from 'react';
import { Save, Target, Star, Loader2, Award } from 'lucide-react';
import { useNotification } from '../../../contexts/NotificationContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { saveRewardConfig, subscribeToRewardConfig, RewardConfig } from '../../../lib/services/rewardSettingsService';

const RewardSettings: React.FC = () => {
    const { showNotification } = useNotification();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<RewardConfig>({
        targetFollowing: 50,
        targetMasterResolved: 50,
        targetPendingResolved: 50,
        pointsValue: 10
    });

    useEffect(() => {
        const unsubscribe = subscribeToRewardConfig((newConfig) => {
            setConfig(newConfig);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveRewardConfig(config);
            showNotification('success', 'تم الحفظ', 'تم تحديث إعدادات المكافآت بنجاح');
        } catch (error) {
            showNotification('error', 'خطأ', 'فشل حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-sm font-black text-slate-500">جاري تحميل الإعدادات...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-4 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 mb-2">
                    <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">إعدادات المكافآت</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">حدد الأهداف المطلوبة للتأهل للحصول على النقاط</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Following */}
                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center gap-3 text-indigo-500">
                        <Target className="w-5 h-5" />
                        <h3 className="font-black text-sm uppercase">هدف المتابعة</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-2">تذكرة / شهر</label>
                        <input
                            type="number"
                            value={config.targetFollowing}
                            onChange={(e) => setConfig({ ...config, targetFollowing: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-3 px-4 text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all text-center"
                        />
                    </div>
                </div>

                {/* Target Master Resolved */}
                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center gap-3 text-emerald-500">
                        <Target className="w-5 h-5" />
                        <h3 className="font-black text-sm uppercase">هدف حل الماستر</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-2">حل / شهر</label>
                        <input
                            type="number"
                            value={config.targetMasterResolved}
                            onChange={(e) => setConfig({ ...config, targetMasterResolved: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-3 px-4 text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all text-center"
                        />
                    </div>
                </div>

                {/* Target Pending Resolved */}
                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center gap-3 text-orange-500">
                        <Target className="w-5 h-5" />
                        <h3 className="font-black text-sm uppercase">هدف المشاكل المعلقة</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-2">حل / شهر</label>
                        <input
                            type="number"
                            value={config.targetPendingResolved}
                            onChange={(e) => setConfig({ ...config, targetPendingResolved: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-3 px-4 text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20 transition-all text-center"
                        />
                    </div>
                </div>

                {/* Points Value */}
                <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                    <div className="flex items-center gap-3 text-amber-500">
                        <Star className="w-5 h-5" />
                        <h3 className="font-black text-sm uppercase">قيمة المكافأة</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase pr-2">نقطة / إنجاز</label>
                        <input
                            type="number"
                            value={config.pointsValue}
                            onChange={(e) => setConfig({ ...config, pointsValue: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-3 px-4 text-lg font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 transition-all text-center"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/30 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>حفظ جميع الإعدادات</span>
                </button>
            </div>
        </div>
    );
};

export default RewardSettings;
