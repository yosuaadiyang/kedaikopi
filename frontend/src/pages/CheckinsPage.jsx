import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Receipt, LogIn, LogOut, Coffee, Wallet, Store } from 'lucide-react';
import { checkinApi } from '../services/api';
import toast from 'react-hot-toast';

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const loadCheckins = (p = 1) => {
    setLoading(true);
    checkinApi.history({ page: p, per_page: 15 })
      .then(r => {
        const data = r.data.checkins;
        setCheckins(p === 1 ? data.data : [...checkins, ...data.data]);
        setLastPage(data.last_page);
        setPage(data.current_page);
        if (r.data.stats) setStats(r.data.stats);
      })
      .catch(() => toast.error('Gagal memuat riwayat'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCheckins(); }, []);

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatRupiah = (amount) => {
    if (!amount) return null;
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 mb-6 flex items-center gap-2">
        <MapPin className="h-6 w-6 text-coffee-400" /> Riwayat Check-in
      </h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            [stats.total_checkins, 'Total Check-in', LogIn, 'text-coffee-200'],
            [stats.total_checkouts, 'Checkout', LogOut, 'text-green-400'],
            [stats.unique_stores, 'Kedai Dikunjungi', Store, 'text-coffee-400'],
            [stats.total_spent ? formatRupiah(stats.total_spent) : 'Rp 0', 'Total Pengeluaran', Wallet, 'text-yellow-400'],
          ].map(([val, label, Icon, cls], i) => (
            <div key={i} className="card p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-2 ${cls}`} />
              <div className={`text-xl font-bold ${cls}`}>{val}</div>
              <div className="text-xs text-coffee-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Check-in list */}
      {loading && checkins.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
        </div>
      ) : checkins.length === 0 ? (
        <div className="card p-12 text-center">
          <Coffee className="h-12 w-12 text-coffee-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-coffee-300 mb-2">Belum ada check-in</h3>
          <p className="text-coffee-500 text-sm mb-4">Kunjungi kedai kopi dan check-in untuk mencatat perjalanan ngopi Anda!</p>
          <Link to="/stores" className="btn-primary inline-block">Jelajahi Kedai</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map(c => (
            <div key={c.id} className="card p-4">
              <div className="flex gap-4">
                {/* Store image */}
                <Link to={`/stores/${c.store?.slug}`} className="shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-coffee-800">
                    {c.store?.cover_image ? (
                      <img src={c.store.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Coffee className="h-6 w-6 text-coffee-600" /></div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/stores/${c.store?.slug}`} className="font-medium text-coffee-100 hover:text-coffee-50 block truncate">
                    {c.store?.name || 'Kedai'}
                  </Link>
                  <p className="text-xs text-coffee-500 truncate">{c.store?.address}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    {/* Status badge */}
                    {c.status === 'checked_in' && (
                      <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 font-medium">Sedang di sini</span>
                    )}
                    {c.status === 'checked_out' && (
                      <span className="px-2 py-0.5 rounded-full bg-coffee-800/50 text-coffee-400">Selesai</span>
                    )}
                    {c.status === 'expired' && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-500">Expired</span>
                    )}

                    {/* Date & time */}
                    <span className="text-coffee-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(c.checked_in_at)} {formatTime(c.checked_in_at)}
                      {c.checked_out_at && ` — ${formatTime(c.checked_out_at)}`}
                    </span>

                    {/* Duration */}
                    {c.duration && <span className="text-coffee-500">{c.duration}</span>}
                  </div>

                  {/* Receipt info */}
                  {(c.receipt_amount || c.receipt_image || c.notes) && (
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      {c.receipt_amount && (
                        <span className="text-yellow-400 flex items-center gap-1 font-medium">
                          <Wallet className="h-3 w-3" /> {formatRupiah(c.receipt_amount)}
                        </span>
                      )}
                      {c.receipt_image && (
                        <a href={c.receipt_image} target="_blank" rel="noopener noreferrer"
                          className="text-coffee-400 flex items-center gap-1 hover:text-coffee-200">
                          <Receipt className="h-3 w-3" /> Lihat struk
                        </a>
                      )}
                      {c.notes && <span className="text-coffee-500 italic">"{c.notes}"</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load more */}
          {page < lastPage && (
            <div className="text-center pt-4">
              <button onClick={() => loadCheckins(page + 1)} disabled={loading}
                className="btn-secondary text-sm disabled:opacity-50">
                {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
