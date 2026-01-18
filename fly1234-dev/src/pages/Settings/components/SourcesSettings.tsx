import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Plus, Edit2, Trash2, Package, DollarSign, Check, X } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

interface Source {
  id: string;
  name: string;
  createdAt: Date;
}

export default function SourcesSettings() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSources();
  }, [user]);

  const loadSources = async () => {
    if (!user) return;

    try {
      const sourcesRef = collection(db, 'sources');
      const q = query(sourcesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const sourcesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Source[];

      setSources(sourcesData);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const handleAddSource = async () => {
    if (!user || !newSourceName.trim()) return;

    setLoading(true);
    try {
      const sourcesRef = collection(db, 'sources');
      await addDoc(sourcesRef, {
        name: newSourceName.trim(),
        createdAt: new Date(),
        userId: user.uid
      });

      setNewSourceName('');
      setIsAddModalOpen(false);
      await loadSources();
    } catch (error) {
      console.error('Error adding source:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSource = async () => {
    if (!editingSource || !newSourceName.trim()) return;

    setLoading(true);
    try {
      const sourceRef = doc(db, 'sources', editingSource.id);
      await updateDoc(sourceRef, {
        name: newSourceName.trim()
      });

      setEditingSource(null);
      setNewSourceName('');
      await loadSources();
    } catch (error) {
      console.error('Error updating source:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'sources', sourceId));
      await loadSources();
    } catch (error) {
      console.error('Error deleting source:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setNewSourceName(source.name);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingSource(null);
    setNewSourceName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            إعدادات المصادر
          </h2>
          <p className={`text-sm mt-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            إدارة مصادر التذاكر
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة مصدر
        </button>
      </div>

      {/* Sources List */}
      <div className={`rounded-lg border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {sources.length === 0 ? (
          <div className="p-12 text-center">
            <Package className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-bold mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              لا توجد مصادر
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              ابدأ بإضافة مصادر التذاكر الخاصة بك
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                  theme === 'dark' ? '' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                  </div>

                  <div>
                    <h3 className={`font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {source.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(source)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-blue-400'
                        : 'hover:bg-gray-100 text-blue-600'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-gray-700 text-red-400'
                        : 'hover:bg-gray-100 text-red-600'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingSource) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {editingSource ? 'تعديل المصدر' : 'إضافة مصدر جديد'}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  اسم المصدر *
                </label>
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="مثال: شركة الطيران العربي"
                  className={`w-full px-4 py-2 rounded-lg border text-sm font-bold ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-blue-500 outline-none`}
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={closeModal}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                إلغاء
              </button>

              <button
                onClick={editingSource ? handleUpdateSource : handleAddSource}
                disabled={loading || !newSourceName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingSource ? 'حفظ التعديلات' : 'إضافة'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
