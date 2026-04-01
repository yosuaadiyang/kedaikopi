import { Link } from 'react-router-dom';
import { Star, MapPin, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { storeApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=60';

export default function StoreCard({ store, onFavoriteToggle }) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error('Login untuk menyimpan favorit');
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await storeApi.toggleFavorite(store.id);
      setIsFav(res.data.is_favorited);
      toast.success(res.data.message);
      onFavoriteToggle?.();
    } catch {
      toast.error('Gagal');
    } finally {
      setFavLoading(false);
    }
  };

  const imgSrc = imgError ? PLACEHOLDER_IMG : (store.cover_image || PLACEHOLDER_IMG);
  const rating = Number(store.avg_rating) || 0;

  return (
    <Link to={`/stores/${store.slug}`} className="card group hover:border-coffee-600/50 transition-all duration-300 block">
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgSrc}
          alt={`Foto kedai ${store.name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/80 to-transparent" />
        <button
          onClick={handleFav}
          disabled={favLoading}
          className="absolute top-3 right-3 p-2 rounded-full bg-coffee-950/60 hover:bg-coffee-950/80 transition disabled:opacity-50"
          aria-label={isFav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
        {store.is_featured && (
          <span className="absolute top-3 left-3 bg-coffee-500 text-white text-xs font-bold px-2 py-1 rounded">
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-coffee-100 group-hover:text-coffee-400 transition truncate">
            {store.name}
          </h3>
          <span className="text-coffee-400 font-bold text-sm shrink-0">{store.price_range}</span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-sm text-coffee-400">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{store.city?.name || store.address}</span>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          <span className="text-sm font-medium text-coffee-200">{rating.toFixed(1)}</span>
          <span className="text-xs text-coffee-500">({store.total_reviews || 0})</span>
        </div>
        {store.amenities?.length > 0 && (
          <div className="flex gap-1 mt-3 flex-wrap">
            {store.amenities.slice(0, 3).map(a => (
              <span key={a.id} className="text-xs bg-coffee-800/50 text-coffee-300 px-2 py-0.5 rounded">{a.name}</span>
            ))}
            {store.amenities.length > 3 && (
              <span className="text-xs text-coffee-500">+{store.amenities.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
