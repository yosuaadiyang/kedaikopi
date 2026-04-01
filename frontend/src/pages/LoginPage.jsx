import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Login berhasil!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login gagal');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="KedaiKopi" className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-coffee-100">Masuk</h1>
          <p className="text-sm text-coffee-400 mt-1">Selamat datang kembali di KedaiKopi</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm(p => ({...p, email: e.target.value}))}
            className="input-field" required />
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} placeholder="Password" value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))}
              className="input-field pr-12" required />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-500">
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p className="text-center text-sm text-coffee-400 mt-4">
          Belum punya akun? <Link to="/register" className="text-coffee-300 hover:text-coffee-100 underline">Daftar</Link>
        </p>
      </div>
    </div>
  );
}
