import { useState } from 'react';
import { User, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Nama wajib diisi');
    setProfileLoading(true);
    try {
      const res = await authApi.updateProfile(form);
      updateUser(res.data.user);
      toast.success('Profil diperbarui');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        toast.error(Object.values(errors)[0]?.[0] || 'Validasi gagal');
      } else {
        toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.password_confirmation) {
      return toast.error('Konfirmasi password tidak sesuai');
    }
    if (pwForm.password.length < 8) {
      return toast.error('Password minimal 8 karakter');
    }
    setPwLoading(true);
    try {
      await authApi.changePassword(pwForm);
      toast.success('Password berhasil diubah');
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 flex items-center gap-2 mb-6">
        <User className="h-6 w-6" /> Profil
      </h1>

      {/* Profile info */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-coffee-200 mb-4">Informasi Akun</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div>
            <label className="text-xs text-coffee-500 mb-1 block">Nama</label>
            <input type="text" placeholder="Nama" value={form.name} maxLength={255}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-coffee-500 mb-1 block">Email</label>
            <input type="email" value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
            <p className="text-xs text-coffee-600 mt-1">
              {user?.email_verified ? '✅ Terverifikasi' : '⚠️ Belum terverifikasi'}
            </p>
          </div>
          <div>
            <label className="text-xs text-coffee-500 mb-1 block">No. Telepon</label>
            <input type="tel" placeholder="No. Telepon" value={form.phone} maxLength={20}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-field" />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-primary flex items-center gap-2">
            {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {profileLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h2 className="font-semibold text-coffee-200 mb-4">Ubah Password</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <input type="password" placeholder="Password Lama" value={pwForm.current_password}
            onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} className="input-field" required />
          <input type="password" placeholder="Password Baru (min 8 karakter, huruf besar+kecil+angka)" value={pwForm.password}
            onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} className="input-field" required minLength={8} />
          <input type="password" placeholder="Konfirmasi Password Baru" value={pwForm.password_confirmation}
            onChange={e => setPwForm(p => ({ ...p, password_confirmation: e.target.value }))} className="input-field" required />
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
            {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pwLoading ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
