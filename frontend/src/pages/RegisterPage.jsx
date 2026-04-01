import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Registrasi berhasil!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registrasi gagal';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="KedaiKopi" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-coffee-100">Daftar</h1>
          <p className="text-sm text-coffee-400 mt-1">Buat akun KedaiKopi Anda</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Nama Lengkap" value={form.name}
            onChange={e => update('name', e.target.value)} className="input-field" required />
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => update('email', e.target.value)} className="input-field" required />
          <input type="password" placeholder="Password (min 8 karakter)" value={form.password}
            onChange={e => update('password', e.target.value)} className="input-field" required />
          <input type="password" placeholder="Konfirmasi Password" value={form.password_confirmation}
            onChange={e => update('password_confirmation', e.target.value)} className="input-field" required />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-sm text-coffee-400 mt-4">
          Sudah punya akun? <Link to="/login" className="text-coffee-300 hover:text-coffee-100 underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
