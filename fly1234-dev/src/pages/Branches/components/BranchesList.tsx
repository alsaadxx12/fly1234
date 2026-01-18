import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Loader2, LocateFixed, Search } from 'lucide-react';
import useBranches from '../hooks/useBranches';
import { Branch } from '../types';
import ModernModal from '../../../components/ModernModal';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          setPosition([lat, lng]);
        },
      }}
    />
  );
};


const BranchesList: React.FC = () => {
  const { branches, loading, error, addBranch, updateBranch, deleteBranch } = useBranches();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Partial<Branch> | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([32.6167, 44.0333]); // Default to Karbala
  const [mapPosition, setMapPosition] = useState<[number, number]>([32.6167, 44.0333]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const openModal = (branch: Partial<Branch> | null = null) => {
    const initialLocation = branch?.location || { latitude: 32.6167, longitude: 44.0333 };
    const initialPosition: [number, number] = [initialLocation.latitude, initialLocation.longitude];

    setCurrentBranch(branch || { name: '', location: { latitude: initialLocation.latitude, longitude: initialLocation.longitude }, radius: 100 });
    setMapCenter(initialPosition);
    setMapPosition(initialPosition);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setCurrentBranch(null);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!currentBranch) return;

    try {
      if ('id' in currentBranch && currentBranch.id) {
        await updateBranch(currentBranch.id, {
          ...currentBranch,
          location: { latitude: mapPosition[0], longitude: mapPosition[1] }
        });
      } else {
        await addBranch({
          name: currentBranch.name || 'فرع جديد',
          location: { latitude: mapPosition[0], longitude: mapPosition[1] },
          radius: currentBranch.radius || 100
        } as Omit<Branch, 'id' | 'createdAt'>);
      }
      closeModal();
    } catch (err) {
      alert('فشل حفظ الفرع');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      await deleteBranch(id);
    }
  };

  const handleSetCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition([latitude, longitude]);
        setMapCenter([latitude, longitude]);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('فشل في الحصول على الموقع الحالي');
      }
    );
  };

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      } else {
        alert('لم يتم العثور على الموقع');
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end bg-white/40 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 h-11 px-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {branches.map(branch => (
          <div key={branch.id} className="bg-white dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center text-right">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">{branch.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(branch)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:scale-110 active:scale-95 transition-all"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(branch.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-xl hover:scale-110 active:scale-95 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-600/30">
                  <span className="text-[10px] font-black text-gray-400 block mb-0.5">خط العرض</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{branch.location.latitude.toFixed(4)}</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-600/30">
                  <span className="text-[10px] font-black text-gray-400 block mb-0.5">خط الطول</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{branch.location.longitude.toFixed(4)}</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <LocateFixed className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">نطاق الحضور</span>
                </div>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{branch.radius} <span className="text-[10px] opacity-70">متر</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ModernModal isOpen={isModalOpen} onClose={closeModal} title={currentBranch?.id ? 'تعديل فرع' : 'إضافة فرع جديد'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفرع</label>
            <input
              type="text"
              value={currentBranch?.name || ''}
              onChange={(e) => setCurrentBranch(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن موقع..."
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
            <button onClick={handleSearchLocation} disabled={isSearching} className="p-2 bg-blue-600 text-white rounded-md disabled:bg-blue-400">
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
            <button onClick={handleSetCurrentLocation} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-md"><LocateFixed className="w-5 h-5" /></button>
          </div>
          <div className="h-64 w-full">
            <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={mapPosition} setPosition={setMapPosition} />
              <Circle center={mapPosition} radius={currentBranch?.radius || 100} />
            </MapContainer>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">النطاق (بالمتر): {currentBranch?.radius || 100} متر</label>
            <input
              type="range"
              min="50"
              max="1000"
              step="10"
              value={currentBranch?.radius || 100}
              onChange={(e) => setCurrentBranch(prev => ({ ...prev, radius: parseInt(e.target.value, 10) }))}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded">إلغاء</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">حفظ</button>
          </div>
        </div>
      </ModernModal>
    </div>
  );
};

export default BranchesList;
