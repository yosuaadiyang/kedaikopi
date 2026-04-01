import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Store, Users, Star, Clock, TrendingUp, FileText } from 'lucide-react';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
    </div>
  );

  const stats = data?.stats || {};

  const cards = [
    { label: 'Total Kedai', value: stats.total_stores ?? 0, icon: Store, color: 'text-blue-400', link: '/admin/stores' },
    { label: 'Menunggu Approval', value: stats.pending_stores ?? 0, icon: Clock, color: 'text-yellow-400', link: '/admin/stores?status=pending' },
    { label: 'Kedai Approved', value: stats.approved_stores ?? 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Total Users', value: stats.total_users ?? 0, icon: Users, color: 'text-green-400', link: '/admin/users' },
    { label: 'Total Review', value: stats.total_reviews ?? 0, icon: Star, color: 'text-purple-400' },
    { label: 'Pending Claims', value: stats.total_claims ?? 0, icon: FileText, color: 'text-orange-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6" /> Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-coffee-400">{c.label}</p>
                <p className="text-3xl font-bold text-coffee-100 mt-1">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color} opacity-70`} />
            </div>
            {c.link && (
              <Link to={c.link} className="text-xs text-coffee-500 hover:text-coffee-300 mt-3 inline-block">
                Lihat detail →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent stores */}
        <div className="card p-5">
          <h2 className="font-semibold text-coffee-200 mb-3">Kedai Terbaru</h2>
          <div className="space-y-2">
            {(data?.recent_stores || []).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-coffee-800/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-coffee-100">{s.name}</p>
                  <p className="text-xs text-coffee-500">{s.city?.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.status === 'approved' ? 'bg-green-500/20 text-green-400'
                  : s.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
                }`}>{s.status}</span>
              </div>
            ))}
            {(data?.recent_stores || []).length === 0 && (
              <p className="text-sm text-coffee-500">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="card p-5">
          <h2 className="font-semibold text-coffee-200 mb-3">Review Terbaru</h2>
          <div className="space-y-2">
            {(data?.recent_reviews || []).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-coffee-800/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-coffee-100">{r.user?.name || 'User'}</p>
                  <p className="text-xs text-coffee-500">{r.store?.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-yellow-500 text-yellow-500' : 'text-coffee-700'}`} />
                  ))}
                </div>
              </div>
            ))}
            {(data?.recent_reviews || []).length === 0 && (
              <p className="text-sm text-coffee-500">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/stores" className="card p-5 hover:border-coffee-600 transition text-center">
          <Store className="h-8 w-8 text-coffee-400 mx-auto mb-2" />
          <p className="font-semibold text-coffee-200">Kelola Kedai</p>
          <p className="text-xs text-coffee-500 mt-1">Approve, reject, featured</p>
        </Link>
        <Link to="/admin/users" className="card p-5 hover:border-coffee-600 transition text-center">
          <Users className="h-8 w-8 text-coffee-400 mx-auto mb-2" />
          <p className="font-semibold text-coffee-200">Kelola Users</p>
          <p className="text-xs text-coffee-500 mt-1">Roles, status</p>
        </Link>
        <Link to="/admin/import" className="card p-5 hover:border-coffee-600 transition text-center">
          <TrendingUp className="h-8 w-8 text-coffee-400 mx-auto mb-2" />
          <p className="font-semibold text-coffee-200">Import Data</p>
          <p className="text-xs text-coffee-500 mt-1">CSV, JSON import/export</p>
        </Link>
      </div>
    </div>
  );
}
