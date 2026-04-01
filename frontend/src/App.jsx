import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import StorePage from './pages/StorePage';
import StoreDetailPage from './pages/StoreDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import MyStoresPage from './pages/MyStoresPage';
import StoreFormPage from './pages/StoreFormPage';
import CheckinsPage from './pages/CheckinsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStores from './pages/admin/AdminStores';
import AdminUsers from './pages/admin/AdminUsers';
import AdminImport from './pages/admin/AdminImport';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" />;
  if (!['admin', 'super_admin'].includes(user.role)) return <Navigate to="/" />;
  return children;
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/stores" element={<StorePage />} />
          <Route path="/stores/:slug" element={<StoreDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated */}
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/checkins" element={<ProtectedRoute><CheckinsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/my-stores" element={<ProtectedRoute><MyStoresPage /></ProtectedRoute>} />
          <Route path="/stores/new" element={<ProtectedRoute><StoreFormPage /></ProtectedRoute>} />
          <Route path="/stores/:id/edit" element={<ProtectedRoute><StoreFormPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/stores" element={<AdminRoute><AdminStores /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center py-32">
              <img src="/logo.png" alt="KedaiKopi" className="h-10 w-auto mb-6 opacity-30" />
              <h1 className="text-6xl font-bold text-coffee-500">404</h1>
              <p className="mt-4 text-coffee-300">Halaman tidak ditemukan</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
