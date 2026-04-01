import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Check, X, Star, Eye } from 'lucide-react';
import { adminApi } from '../../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const debounceRef = useRef(null);

  const fetchStores = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await adminApi.stores(params);
      setStores(res.data.data || []);
      setPagination({ current: res.data.current_page, last: res.data.last_page, total: res.data.total });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStores(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchStores]);

  const updateStatus = async (id, status) => {
    try {
      await adminApi.updateStoreStatus(id, { status });
      toast.success(`Kedai di-${status}`);
      fetchStores(filters);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal');
    }
  };

  const toggleFeatured = async (id) => {
    try {
      const res = await adminApi.toggleFeatured(id);
      toast.success(res.data.message);
      fetchStores(filters);
    } catch { toast.error('Gagal'); }
  };

  const statusBadge = (status) => {
    const c = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
      suspended: 'bg-orange-500/20 text-orange-400',
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${c[status] || 'bg-coffee-800 text-coffee-400'}`}>{status}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 mb-6">Kelola Kedai</h1>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-coffee-500" />
          <input type="text" placeholder="Cari kedai..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="input-field pl-12" />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} className="input-field w-40">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <p className="text-sm text-coffee-400 mb-4">{pagination.total || 0} kedai</p>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" /></div>
      ) : stores.length === 0 ? (
        <p className="text-center text-coffee-500 py-20">Tidak ada kedai ditemukan</p>
      ) : (
        <div className="space-y-3">
          {stores.map(s => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={s.cover_image || 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=100&q=60'}
                    alt={s.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy"
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-coffee-100 truncate">{s.name}</h3>
                    <p className="text-xs text-coffee-400 truncate">{s.city?.name} · {s.owner?.name || 'Tanpa pemilik'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(s.status)}
                      {s.is_featured && <span className="text-xs bg-coffee-500/20 text-coffee-400 px-2 py-0.5 rounded">Featured</span>}
                      {s.is_imported && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Import</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link to={`/stores/${s.slug}`} className="p-2 hover:bg-coffee-800/50 rounded-lg transition" title="Lihat">
                    <Eye className="h-4 w-4 text-coffee-400" />
                  </Link>
                  {s.status !== 'approved' && (
                    <button onClick={() => updateStatus(s.id, 'approved')} className="p-2 hover:bg-green-900/30 rounded-lg transition" title="Approve">
                      <Check className="h-4 w-4 text-green-400" />
                    </button>
                  )}
                  {s.status !== 'rejected' && (
                    <button onClick={() => updateStatus(s.id, 'rejected')} className="p-2 hover:bg-red-900/30 rounded-lg transition" title="Reject">
                      <X className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                  <button onClick={() => toggleFeatured(s.id)} className="p-2 hover:bg-yellow-900/30 rounded-lg transition" title="Toggle Featured">
                    <Star className={`h-4 w-4 ${s.is_featured ? 'fill-yellow-500 text-yellow-500' : 'text-coffee-600'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.last > 1 && (
        <div className="flex justify-center gap-1 mt-8">
          {Array.from({ length: Math.min(pagination.last, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setFilters(prev => ({ ...prev, page: p }))}
              className={`px-3 py-1.5 rounded text-sm ${p === pagination.current ? 'bg-coffee-500 text-white' : 'bg-coffee-900/50 text-coffee-300 hover:bg-coffee-800/50'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
