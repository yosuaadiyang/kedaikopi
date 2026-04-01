import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Coffee, MapPin, Star, ArrowRight } from 'lucide-react';
import { storeApi, locationApi } from '../services/api';
import StoreCard from '../components/store/StoreCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    storeApi.list({ featured: true, per_page: 4 }).then(r => setFeatured(r.data.data || [])).catch(() => {});
    storeApi.list({ per_page: 8, sort: 'created_at' }).then(r => setLatest(r.data.data || [])).catch(() => {});
    locationApi.provinces().then(r => setProvinces(r.data || [])).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/stores?search=${encodeURIComponent(search)}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-coffee-950 via-coffee-900/50 to-coffee-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <img src="/logo.png" alt="KedaiKopi" className="h-14 md:h-16 w-auto mx-auto mb-6" />
          <div className="inline-flex items-center gap-2 bg-coffee-800/40 border border-coffee-700/30 rounded-full px-4 py-1.5 mb-6">
            <Coffee className="h-4 w-4 text-coffee-400" />
            <span className="text-sm text-coffee-300">Direktori Kedai Kopi #1 Indonesia</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-coffee-50 mb-4">
            Temukan <span className="text-coffee-400">Kedai Kopi</span> Terbaik
          </h1>
          <p className="text-lg text-coffee-300 mb-8 max-w-2xl mx-auto">
            Jelajahi ribuan kedai kopi di seluruh Indonesia. Dari kopi spesialti hingga warung kopi legendaris.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-coffee-500" />
              <input
                type="text"
                placeholder="Cari kedai kopi, kota, atau menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-12 py-3"
              />
            </div>
            <button type="submit" className="btn-primary px-8">Cari</button>
          </form>

          {/* Province quick links */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {provinces.slice(0, 8).map(p => (
              <Link key={p.id} to={`/stores?province_id=${p.id}`}
                className="text-sm text-coffee-400 hover:text-coffee-200 bg-coffee-800/30 px-3 py-1 rounded-full transition">
                <MapPin className="inline h-3 w-3 mr-1" />{p.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-coffee-100">
              <Star className="inline h-6 w-6 text-yellow-500 mr-2" />Kedai Pilihan
            </h2>
            <Link to="/stores?featured=true" className="text-coffee-400 hover:text-coffee-200 text-sm flex items-center gap-1">
              Lihat semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(s => <StoreCard key={s.id} store={s} />)}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-coffee-100">Baru Ditambahkan</h2>
          <Link to="/stores" className="text-coffee-400 hover:text-coffee-200 text-sm flex items-center gap-1">
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {latest.map(s => <StoreCard key={s.id} store={s} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 md:p-12 text-center bg-gradient-to-br from-coffee-800/40 to-coffee-900/40">
          <h2 className="text-2xl md:text-3xl font-bold text-coffee-100 mb-3">Punya Kedai Kopi?</h2>
          <p className="text-coffee-300 mb-6">Daftarkan kedai kopi Anda dan jangkau lebih banyak pelanggan.</p>
          <Link to="/stores/new" className="btn-primary inline-flex items-center gap-2">
            Daftarkan Kedai
          </Link>
        </div>
      </section>
    </div>
  );
}
