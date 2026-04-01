import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { storeApi } from '../services/api';
import StoreCard from '../components/store/StoreCard';

export default function FavoritesPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    storeApi.myFavorites().then(r => setStores(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 flex items-center gap-2 mb-6">
        <Heart className="h-6 w-6 text-red-500" /> Kedai Favorit
      </h1>
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" /></div>
      ) : stores.length === 0 ? (
        <p className="text-center text-coffee-400 py-20">Belum ada kedai favorit</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {stores.map(s => <StoreCard key={s.id} store={s} onFavoriteToggle={fetch} />)}
        </div>
      )}
    </div>
  );
}
