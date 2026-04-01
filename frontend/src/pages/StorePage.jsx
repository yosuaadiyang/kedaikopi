import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { storeApi, locationApi } from '../services/api';
import StoreCard from '../components/store/StoreCard';

export default function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    province_id: searchParams.get('province_id') || '',
    city_id: searchParams.get('city_id') || '',
    price_range: searchParams.get('price_range') || '',
    min_rating: searchParams.get('min_rating') || '',
    amenities: searchParams.get('amenities') || '',
    sort: searchParams.get('sort') || 'created_at',
    featured: searchParams.get('featured') || '',
    page: 1,
  });

  useEffect(() => {
    locationApi.provinces().then(r => setProvinces(r.data || [])).catch(() => {});
    locationApi.amenities().then(r => setAmenities(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.province_id) {
      locationApi.cities(filters.province_id).then(r => setCities(r.data || [])).catch(() => {});
    } else {
      setCities([]);
    }
  }, [filters.province_id]);

  const fetchStores = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await storeApi.list(params);
      setStores(res.data.data || []);
      setPagination({
        current: res.data.current_page,
        last: res.data.last_page,
        total: res.data.total,
      });
    } catch {
      setStores([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchStores(filters);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchStores]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', province_id: '', city_id: '', price_range: '', min_rating: '', amenities: '', sort: 'created_at', featured: '', page: 1 });
    setSearchParams({});
  };

  // Smart pagination: show max 7 page buttons
  const renderPagination = () => {
    if (!pagination.last || pagination.last <= 1) return null;
    const { current, last } = pagination;
    const pages = [];
    const range = 2; // show 2 pages around current

    pages.push(1);
    if (current - range > 2) pages.push('...');
    for (let i = Math.max(2, current - range); i <= Math.min(last - 1, current + range); i++) {
      pages.push(i);
    }
    if (current + range < last - 1) pages.push('...');
    if (last > 1) pages.push(last);

    return (
      <div className="flex justify-center gap-1 mt-8">
        <button onClick={() => setFilters(p => ({ ...p, page: Math.max(1, current - 1) }))}
          disabled={current === 1}
          className="px-3 py-1.5 rounded text-sm bg-coffee-900/50 text-coffee-300 disabled:opacity-30">
          ←
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-2 py-1.5 text-sm text-coffee-500">…</span>
          ) : (
            <button key={p} onClick={() => setFilters(prev => ({ ...prev, page: p }))}
              className={`px-3 py-1.5 rounded text-sm ${p === current ? 'bg-coffee-500 text-white' : 'bg-coffee-900/50 text-coffee-300 hover:bg-coffee-800/50'}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => setFilters(p => ({ ...p, page: Math.min(last, current + 1) }))}
          disabled={current === last}
          className="px-3 py-1.5 rounded text-sm bg-coffee-900/50 text-coffee-300 disabled:opacity-30">
          →
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-coffee-500" />
          <input type="text" placeholder="Cari kedai kopi..." value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="input-field pl-12" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-coffee-500' : ''}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filter
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select value={filters.province_id}
            onChange={e => { updateFilter('province_id', e.target.value); updateFilter('city_id', ''); }}
            className="input-field">
            <option value="">Semua Provinsi</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.city_id} onChange={e => updateFilter('city_id', e.target.value)}
            className="input-field" disabled={!filters.province_id}>
            <option value="">Semua Kota</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.price_range} onChange={e => updateFilter('price_range', e.target.value)} className="input-field">
            <option value="">Semua Harga</option>
            {['$', '$$', '$$$', '$$$$'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.min_rating} onChange={e => updateFilter('min_rating', e.target.value)} className="input-field">
            <option value="">Semua Rating</option>
            {[4, 3, 2].map(r => <option key={r} value={r}>≥ {r} bintang</option>)}
          </select>
          <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="input-field">
            <option value="created_at">Terbaru</option>
            <option value="avg_rating">Rating Tertinggi</option>
            <option value="total_reviews">Review Terbanyak</option>
            <option value="name">Nama A-Z</option>
          </select>
          <button onClick={clearFilters} className="text-sm text-coffee-400 hover:text-coffee-200 flex items-center gap-1">
            <X className="h-4 w-4" /> Reset Filter
          </button>
        </div>
      )}

      <p className="text-sm text-coffee-400 mb-4">{pagination.total || 0} kedai ditemukan</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-coffee-400">
          <p className="text-lg mb-2">Tidak ada kedai ditemukan</p>
          <p className="text-sm">Coba ubah filter pencarian Anda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stores.map(s => <StoreCard key={s.id} store={s} />)}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
