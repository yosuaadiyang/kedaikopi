import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserX, UserCheck } from 'lucide-react';
import { adminApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: '', page: 1 });
  const debounceRef = useRef(null);

  const fetchUsers = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await adminApi.users(params);
      setUsers(res.data.data || []);
      setPagination({ current: res.data.current_page, last: res.data.last_page, total: res.data.total });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchUsers]);

  const updateUser = async (id, data) => {
    try {
      await adminApi.updateUser(id, data);
      toast.success('User diperbarui');
      fetchUsers(filters);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal');
    }
  };

  const roleBadge = (role) => {
    const c = {
      super_admin: 'bg-red-500/20 text-red-400',
      admin: 'bg-purple-500/20 text-purple-400',
      store_owner: 'bg-blue-500/20 text-blue-400',
      user: 'bg-coffee-800/50 text-coffee-400',
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${c[role] || ''}`}>{role?.replace('_', ' ')}</span>;
  };

  const isProtected = (u) => u.role === 'super_admin' || u.id === currentUser?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 mb-6">Kelola Users</h1>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-coffee-500" />
          <input type="text" placeholder="Cari user..." value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            className="input-field pl-12" />
        </div>
        <select value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value, page: 1 }))} className="input-field w-40">
          <option value="">Semua Role</option>
          <option value="user">User</option>
          <option value="store_owner">Store Owner</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      <p className="text-sm text-coffee-400 mb-4">{pagination.total || 0} users</p>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" /></div>
      ) : users.length === 0 ? (
        <p className="text-center text-coffee-500 py-20">Tidak ada user ditemukan</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-coffee-700 flex items-center justify-center text-sm font-bold text-coffee-200 flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-coffee-100 truncate">
                    {u.name}
                    {u.id === currentUser?.id && <span className="text-xs text-coffee-500 ml-2">(Anda)</span>}
                  </h3>
                  <p className="text-xs text-coffee-400 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {roleBadge(u.role)}
                    <span className={`text-xs ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>
              {!isProtected(u) && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}
                    className="text-xs bg-coffee-900 border border-coffee-700 rounded px-2 py-1.5 text-coffee-300">
                    <option value="user">User</option>
                    <option value="store_owner">Store Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                    className="p-2 hover:bg-coffee-800/50 rounded-lg transition"
                    title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {u.is_active ? <UserX className="h-4 w-4 text-red-400" /> : <UserCheck className="h-4 w-4 text-green-400" />}
                  </button>
                </div>
              )}
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
