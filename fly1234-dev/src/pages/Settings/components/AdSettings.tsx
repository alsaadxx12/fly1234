import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import {
    Plus,
    Trash2,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    Link as LinkIcon,
    CheckCircle2,
    AlertCircle,
    FileText
} from 'lucide-react';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    updateDoc
} from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useNotification } from '../../../contexts/NotificationContext';
import ModernButton from '../../../components/ModernButton';

interface AppAd {
    id: string;
    imageUrl: string;
    link?: string;
    title?: string;
    order: number;
    isActive: boolean;
    createdAt: any;
}

const AdSettings: React.FC = () => {
    const { theme } = useTheme();
    const { showNotification } = useNotification();
    const [ads, setAds] = useState<AppAd[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Form state
    const [newAd, setNewAd] = useState<{
        imageFile: File | null;
        imageUrl: string;
        link: string;
        title: string;
    }>({
        imageFile: null,
        imageUrl: '',
        link: '',
        title: ''
    });

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'app_ads'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            const adsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AppAd));
            setAds(adsData);
        } catch (error) {
            console.error('Error fetching ads:', error);
            showNotification('error', 'خطأ', 'فشل في تحميل الإعلانات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                showNotification('error', 'خطأ', 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
                return;
            }
            setNewAd(prev => ({
                ...prev,
                imageFile: file,
                imageUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleAddAd = async () => {
        if (!newAd.imageFile) {
            showNotification('warning', 'تنبيه', 'يرجى اختيار صورة أولاً');
            return;
        }

        setIsUploading(true);
        try {
            const fileName = `${Date.now()}_${newAd.imageFile.name}`;
            const storageRef = ref(storage, `app_ads/${fileName}`);

            // Upload to storage
            const uploadSnapshot = await uploadBytes(storageRef, newAd.imageFile);
            const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

            // Add to firestore
            const adData = {
                imageUrl: downloadUrl,
                link: newAd.link,
                title: newAd.title,
                order: ads.length,
                isActive: true,
                createdAt: new Date()
            };

            await addDoc(collection(db, 'app_ads'), adData);
            showNotification('success', 'نجاح', 'تمت إضافة الإعلان بنجاح');

            setNewAd({
                imageFile: null,
                imageUrl: '',
                link: '',
                title: ''
            });
            fetchAds();
        } catch (error) {
            console.error('Error adding ad:', error);
            showNotification('error', 'خطأ', 'فشل في إضافة الإعلان');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAd = async (ad: AppAd) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;

        try {
            // Delete from firestore
            await deleteDoc(doc(db, 'app_ads', ad.id));

            // Delete from storage if it exists (Optional, depends on how sensitive storage usage is)
            try {
                const storageRef = ref(storage, ad.imageUrl);
                await deleteObject(storageRef);
            } catch (storageErr) {
                console.warn('Storage deletion failed (already deleted or external link)', storageErr);
            }

            showNotification('success', 'نجاح', 'تم حذف الإعلان');
            fetchAds();
        } catch (error) {
            console.error('Error deleting ad:', error);
            showNotification('error', 'خطأ', 'فشل في حذف الإعلان');
        }
    };

    const toggleAdStatus = async (ad: AppAd) => {
        try {
            await updateDoc(doc(db, 'app_ads', ad.id), {
                isActive: !ad.isActive
            });
            setAds(prev => prev.map(item => item.id === ad.id ? { ...item, isActive: !item.isActive } : item));
        } catch (error) {
            console.error('Error toggling status:', error);
            showNotification('error', 'خطأ', 'فشل في تحديث الحالة');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with Premium design */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 rounded-3xl border border-indigo-500/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white">إعلانات لوحة التحكم</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الصور التي تظهر في الواجهة الرئيسية للمشتركين</p>
                    </div>
                </div>
            </div>

            {/* Quick Add Form */}
            <div className={`p-6 rounded-3xl border transition-all duration-300 ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Image Preview / Upload Area */}
                    <div className="relative group">
                        <input
                            type="file"
                            id="ad-image"
                            hidden
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <label
                            htmlFor="ad-image"
                            className={`flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${newAd.imageUrl
                                ? 'border-transparent'
                                : 'border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                                }`}
                        >
                            {newAd.imageUrl ? (
                                <>
                                    <img src={newAd.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2">
                                            <Upload className="w-4 h-4" />
                                            <span>تغيير الصورة</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setNewAd(prev => ({ ...prev, imageFile: null, imageUrl: '' }));
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-transform"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-2">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full inline-block">
                                        <ImageIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="text-sm font-bold text-gray-500">انقر هنا لرفع صورة</div>
                                    <div className="text-[10px] text-gray-400"> (PNG, JPG - بحد أقصى 5MB)</div>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Metadata Area */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> عنوان الإعلان (اختياري)
                            </label>
                            <input
                                type="text"
                                value={newAd.title}
                                onChange={(e) => setNewAd(p => ({ ...p, title: e.target.value }))}
                                placeholder="مثلاً: خصومات شهر رمضان"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> رابط التوجيه (اختياري)
                            </label>
                            <input
                                type="url"
                                value={newAd.link}
                                onChange={(e) => setNewAd(p => ({ ...p, link: e.target.value }))}
                                placeholder="https://example.com"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition"
                            />
                        </div>

                        <div className="pt-2">
                            <ModernButton
                                onClick={handleAddAd}
                                loading={isUploading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                icon={<Plus className="w-4 h-4" />}
                            >
                                إضافة إعلان جديد
                            </ModernButton>
                        </div>
                    </div>
                </div>
            </div>

            {/* List of Ads */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="font-black text-gray-800 dark:text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-400" /> الإعلانات الحالية ({ads.length})
                    </h4>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                        <span className="text-sm text-gray-500 animate-pulse">جاري تحميل البيانات...</span>
                    </div>
                ) : ads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 text-center px-6">
                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                            <AlertCircle className="w-8 h-8 text-gray-400" />
                        </div>
                        <h5 className="font-bold text-gray-800 dark:text-white mb-1">لا توجد إعلانات حالياً</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ابدأ بإضافة أول إعلان ليظهر للمشتركين في لوحة التحكم</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        {ads.map((ad) => (
                            <div
                                key={ad.id}
                                className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                    } ${!ad.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            >
                                <div className="aspect-[21/8] relative bg-gray-100 dark:bg-gray-950/50">
                                    <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        className="w-full h-full object-cover relative z-10"
                                    />

                                    {/* Action Overlays - Fixed z-index and visibility */}
                                    <div className="absolute top-2 right-2 flex gap-2 z-[30] translate-y-[-5px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <button
                                            onClick={() => toggleAdStatus(ad)}
                                            className={`p-1.5 rounded-lg border backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-90 ${ad.isActive
                                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                                                : 'bg-gray-500/20 border-gray-500/30 text-gray-500'
                                                }`}
                                            title={ad.isActive ? 'إيقاف التفعيل' : 'تفعيل'}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAd(ad)}
                                            className="p-1.5 bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg backdrop-blur-md shadow-lg transition-transform hover:scale-110 active:scale-90"
                                            title="حذف الإعلان"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {!ad.isActive && (
                                        <div className="absolute inset-0 bg-black/30 z-[20] flex items-center justify-center pointer-events-none">
                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-white font-bold text-[10px] uppercase tracking-widest border border-white/20">
                                                معطل
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 space-y-1">
                                    <h5 className="font-bold text-gray-800 dark:text-white truncate text-sm">
                                        {ad.title || 'بدون عنوان'}
                                    </h5>
                                    {ad.link && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-indigo-500 dark:text-indigo-400 font-bold truncate">
                                            <LinkIcon className="w-3 h-3" />
                                            <span>{ad.link}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdSettings;
