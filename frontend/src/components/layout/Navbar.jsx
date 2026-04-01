import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Heart, User, LogOut, LayoutDashboard, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-coffee-950/90 backdrop-blur-lg border-b border-coffee-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="KedaiKopi" className="h-8 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/stores" className="text-coffee-300 hover:text-coffee-100 transition">Jelajahi</Link>
            {user && (
              <>
                <Link to="/favorites" className="text-coffee-300 hover:text-coffee-100 transition flex items-center gap-1">
                  <Heart className="h-4 w-4" /> Favorit
                </Link>
                <Link to="/checkins" className="text-coffee-300 hover:text-coffee-100 transition flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Check-in
                </Link>
                <Link to="/my-stores" className="text-coffee-300 hover:text-coffee-100 transition">Kedai Saya</Link>
                {user.role === 'admin' || user.role === 'super_admin' ? (
                  <Link to="/admin" className="text-coffee-300 hover:text-coffee-100 transition flex items-center gap-1">
                    <LayoutDashboard className="h-4 w-4" /> Admin
                  </Link>
                ) : null}
              </>
            )}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2 text-coffee-300 hover:text-coffee-100">
                  <User className="h-4 w-4" /> {user.name}
                </Link>
                <button onClick={handleLogout} className="text-coffee-400 hover:text-red-400 transition">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">Masuk</Link>
                <Link to="/register" className="btn-primary text-sm">Daftar</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-coffee-300" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-coffee-800/50 bg-coffee-950/95 backdrop-blur-lg">
          <div className="px-4 py-3 space-y-2">
            <Link to="/stores" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Jelajahi</Link>
            {user ? (
              <>
                <Link to="/favorites" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Favorit</Link>
                <Link to="/checkins" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Check-in</Link>
                <Link to="/my-stores" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Kedai Saya</Link>
                <Link to="/profile" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Profil</Link>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Link to="/admin" className="block py-2 text-coffee-200" onClick={() => setOpen(false)}>Admin</Link>
                )}
                <button onClick={() => { handleLogout(); setOpen(false); }} className="block py-2 text-red-400">Keluar</button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="btn-secondary text-sm flex-1 text-center" onClick={() => setOpen(false)}>Masuk</Link>
                <Link to="/register" className="btn-primary text-sm flex-1 text-center" onClick={() => setOpen(false)}>Daftar</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
