import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Store, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import { storeApi } from '../services/api';
import toast from 'react-hot-toast';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=100&q=60';

export default function MyStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    storeApi.myStores()
      .then(r => setStores(r.data.data || []))
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Yakin hapus kedai "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeleting(id);
    try {
      await storeApi.delete(id);
      setStores(prev => prev.filter(s => s.id !== id));
      toast.success('Kedai berhasil dihapus');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    } finally {
      setDeleting(null);
    }
  };

  const statusConfig = {
    pending: { class: 'bg-yellow-500/20 text-yellow-400', label: 'Menunggu Approval' },
    approved: { class: 'bg-green-500/20 text-green-400', label: 'Aktif' },
    rejected: { class: 'bg-red-500/20 text-red-400', label: 'Ditolak' },
    suspended: { class: 'bg-orange-500/20 text-orange-400', label: 'Disuspend' },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-coffee-100 flex items-center gap-2">
          <Store className="h-6 w-6" /> Kedai Saya
        </h1>
        <Link to="/stores/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Tambah Kedai
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-coffee-400">
          <Store className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="mb-4">Belum ada kedai terdaftar</p>
          <Link to="/stores/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Daftarkan Kedai Pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map(s => {
            const status = statusConfig[s.status] || statusConfig.pending;
            return (
              <div key={s.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={s.cover_image || PLACEHOLDER_IMG}
                    alt={`Foto ${s.name}`}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                    onError={e => { e.target.src = PLACEHOLDER_IMG; }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-coffee-100 truncate">{s.name}</h3>
                    <p className="text-sm text-coffee-400 truncate">{s.city?.name || s.province?.name || 'Lokasi belum diatur'}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {s.status === 'approved' && (
                    <Link to={`/stores/${s.slug}`} className="p-2 hover:bg-coffee-800/50 rounded-lg transition" title="Lihat">
                      <Eye className="h-4 w-4 text-coffee-400" />
                    </Link>
                  )}
                  <Link to={`/stores/${s.id}/edit`} className="p-2 hover:bg-coffee-800/50 rounded-lg transition" title="Edit">
                    <Edit className="h-4 w-4 text-coffee-400" />
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deleting === s.id}
                    className="p-2 hover:bg-red-900/30 rounded-lg transition disabled:opacity-50"
                    title="Hapus"
                  >
                    {deleting === s.id ? (
                      <Loader2 className="h-4 w-4 text-red-400 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
