import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Megaphone, Loader2, Check, Users, Layout, Type } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDepartments, Department } from '../../../lib/collections/departments';
import ModernInput from '../../../components/ModernInput';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminNotificationModal({ isOpen, onClose }: Props) {
    const { employee } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'system_update', // system_update, system_broadcast, urgent
        targetDepartments: [] as string[], // Empty means all
        targetAll: true,
    });

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
        }
    }, [isOpen]);

    const fetchDepartments = async () => {
        try {
            const deps = await getDepartments();
            setDepartments(deps);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.message) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'system_notifications'), {
                ...formData,
                senderId: employee.id,
                senderName: employee.name,
                createdAt: serverTimestamp(),
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setFormData({ title: '', message: '', type: 'system_update', targetDepartments: [], targetAll: true });
            }, 2000);
        } catch (error) {
            console.error('Error adding notification:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDepartment = (id: string) => {
        setFormData(prev => {
            const newDeps = prev.targetDepartments.includes(id)
                ? prev.targetDepartments.filter(d => d !== id)
                : [...prev.targetDepartments, id];
            return { ...prev, targetDepartments: newDeps, targetAll: newDeps.length === 0 };
        });
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] backdrop-blur-md animate-in fade-in duration-200 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative">
                    <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-4 -mt-4 blur-3xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl ring-2 ring-white/30">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">إنشاء تبليغ نظام جديد</h3>
                                <p className="text-xs text-blue-100 mt-0.5">أرسل تحديثات أو تنبيهات للموظفين والأقسام</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <ModernInput
                            label="عنوان التبليغ"
                            placeholder="مثال: تحديث جديد للنظام 🚀"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            icon={<Type className="w-5 h-5 text-gray-400" />}
                            iconPosition="right"
                            required
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Layout className="w-4 h-4 text-blue-500" />
                                <span>محتوى الرسالة</span>
                            </label>
                            <textarea
                                className="w-full h-32 px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all resize-none font-bold"
                                placeholder="اكتب تفاصيل التحديث أو التبليغ هنا..."
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-500" />
                                <span>توجيه إلى الأقسام</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, targetAll: true, targetDepartments: [] }))}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${formData.targetAll
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500'}`}
                                >
                                    الجميع
                                </button>
                                {departments.map(dep => (
                                    <button
                                        key={dep.id}
                                        type="button"
                                        onClick={() => toggleDepartment(dep.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${formData.targetDepartments.includes(dep.id)
                                            ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500'}`}
                                    >
                                        {dep.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || success}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-lg font-black transition-all shadow-xl active:scale-95 ${success
                                ? 'bg-green-500 text-white'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'}`}
                        >
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : success ? <Check className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                            <span>{isSubmitting ? 'جاري الإرسال...' : success ? 'تم الإرسال بنجاح' : 'إرسال التبليغ الآن'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
