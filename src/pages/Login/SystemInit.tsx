import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Mail, Lock, User } from 'lucide-react';
import { initializeSuperAdmin } from '../../lib/collections/setup';

interface SystemInitProps {
    onComplete: () => void;
}

const SystemInit: React.FC<SystemInitProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await initializeSuperAdmin(email, password, name);
            onComplete();
        } catch (err: any) {
            setError(err.message || 'فشل في تهيئة النظام');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-6"
        >
            <div className="text-center space-y-2">
                <div className="inline-block p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 mb-2">
                    <ShieldCheck className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-black text-white">تهيئة النظام الجديد</h2>
                <p className="text-slate-400 text-sm">أهلاً بك! يرجى إنشاء حساب المدير الأول للبدء</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                    <div className="relative group">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block mr-2">الاسم الكامل</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-5 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-right transition-all font-bold placeholder:text-slate-700"
                                placeholder="الاسم الكامل"
                                required
                            />
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block mr-2">البريد الإلكتروني</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-5 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-right transition-all font-bold placeholder:text-slate-700"
                                placeholder="admin@system.com"
                                dir="ltr"
                                required
                            />
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block mr-2">كلمة المرور</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-5 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 text-white text-center transition-all font-bold placeholder:text-slate-700"
                                placeholder="••••••••"
                                dir="ltr"
                                required
                                minLength={6}
                            />
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg relative overflow-hidden group disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>تفعيل وحفظ المدير</span>}
                </button>
            </form>
        </motion.div>
    );
};

export default SystemInit;
