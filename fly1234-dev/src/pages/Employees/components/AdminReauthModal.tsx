import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { auth } from '../../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Loader2, AlertCircle, Check, X } from 'lucide-react';
import ModernModal from '../../../components/ModernModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    description?: string;
}

const AdminReauthModal = ({ isOpen, onClose, onSuccess, title, description }: Props) => {
    const { currentUser } = useAuth();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.email) return;

        setIsLoading(true);
        setError(null);

        try {
            // Attempt to sign in with the current user's email and the provided password
            // This verifies their identity without changing the current session state in a way that breaks other things
            // as long as we don't accidentally navigate or clear other states.
            await signInWithEmailAndPassword(auth, currentUser.email, password);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Re-auth failed:', err);
            if (err.code === 'auth/wrong-password') {
                setError('كلمة المرور غير صحيحة');
            } else {
                setError('فشل التحقق من الهوية. يرجى المحاولة مرة أخرى.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModernModal
            isOpen={isOpen}
            onClose={onClose}
            title={title || 'التحقق من الهوية'}
            description={description || 'يرجى إدخال كلمة مرورك للمتابعة'}
            icon={<Lock className="w-5 h-5 text-amber-600" />}
            size="sm"
            footer={
                <div className="flex items-center justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !password}
                        className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition disabled:opacity-50 shadow-lg shadow-amber-600/20"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isLoading ? 'جاري التحقق...' : 'تأكيد'}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800 text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 mr-2">كلمة مرورك الخاصة</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="أدخل كلمة مرور الإدمن"
                            className="w-full pr-4 pl-10 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-amber-500 focus:ring-0 outline-none transition"
                            autoFocus
                            required
                        />
                    </div>
                </div>
            </form>
        </ModernModal>
    );
};

export default AdminReauthModal;
