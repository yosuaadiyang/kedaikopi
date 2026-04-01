import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Phone, Globe, Heart, ArrowLeft, Send, Instagram, ExternalLink, LogIn, LogOut, Upload, Receipt, Clock, Users, Loader2 } from 'lucide-react';
import { storeApi, reviewApi, checkinApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function StoreDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Check-in state
  const [activeCheckin, setActiveCheckin] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ receipt_amount: '', notes: '' });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [checkinStats, setCheckinStats] = useState(null);

  useEffect(() => {
    setLoading(true);
    storeApi.detail(slug)
      .then(r => {
        setStore(r.data.store);
        setIsFav(r.data.is_favorited || false);
      })
      .catch(() => toast.error('Kedai tidak ditemukan'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load active checkin + store stats
  useEffect(() => {
    if (!store) return;
    if (user) {
      checkinApi.active()
        .then(r => setActiveCheckin(r.data.checkin))
        .catch(() => {});
    }
    checkinApi.storeStats(store.id)
      .then(r => setCheckinStats(r.data.stats))
      .catch(() => {});
  }, [store, user]);

  const handleCheckin = async () => {
    if (!user) return toast.error('Login terlebih dahulu');
    if (!store.latitude || !store.longitude) return toast.error('Kedai ini belum memiliki koordinat GPS');
    setCheckinLoading(true);

    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation tidak tersedia'));
        navigator.geolocation.getCurrentPosition(
          p => resolve(p),
          e => reject(e),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const res = await checkinApi.checkin(store.id, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      setActiveCheckin(res.data.checkin);
      setCheckinStats(prev => prev ? { ...prev, active_now: (prev.active_now || 0) + 1, total_checkins: (prev.total_checkins || 0) + 1 } : prev);
      toast.success(res.data.message);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Check-in gagal';
      toast.error(msg);
      if (err.response?.data?.active_checkin) {
        setActiveCheckin(err.response.data.active_checkin);
      }
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!activeCheckin) return;
    setCheckinLoading(true);

    try {
      const formData = new FormData();
      if (receiptFile) formData.append('receipt_image', receiptFile);
      if (checkoutForm.receipt_amount) formData.append('receipt_amount', checkoutForm.receipt_amount);
      if (checkoutForm.notes) formData.append('notes', checkoutForm.notes);

      const res = await checkinApi.checkout(activeCheckin.id, formData);
      setActiveCheckin(null);
      setCheckoutModal(false);
      setCheckoutForm({ receipt_amount: '', notes: '' });
      setReceiptFile(null);
      setReceiptPreview('');
      setCheckinStats(prev => prev ? { ...prev, active_now: Math.max(0, (prev.active_now || 1) - 1) } : prev);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout gagal');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleReceiptFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Ukuran struk maksimal 5MB');
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const isCheckedInHere = activeCheckin && activeCheckin.store?.id === store?.id;

  const handleFavorite = async () => {
    if (!user) return toast.error('Login terlebih dahulu');
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await storeApi.toggleFavorite(store.id);
      setIsFav(res.data.is_favorited);
      toast.success(res.data.message);
    } catch {
      toast.error('Gagal');
    } finally {
      setFavLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Login terlebih dahulu');
    if (!reviewForm.comment.trim() && !reviewForm.rating) return;
    setSubmitting(true);
    try {
      const res = await reviewApi.create(store.id, reviewForm);
      toast.success(res.data.message);
      setStore(prev => ({
        ...prev,
        reviews: [res.data.review, ...(prev.reviews || [])],
        total_reviews: (prev.total_reviews || 0) + 1,
      }));
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
    </div>
  );

  if (!store) return (
    <div className="text-center py-32 text-coffee-400">Kedai tidak ditemukan</div>
  );

  const rating = Number(store.avg_rating) || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/stores" className="inline-flex items-center gap-1 text-coffee-400 hover:text-coffee-200 mb-6 text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      {/* Header */}
      <div className="card overflow-hidden mb-6">
        <div className="relative h-64 md:h-80">
          <img src={store.cover_image || 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80'}
            alt={store.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950 via-coffee-950/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{store.name}</h1>
                <div className="flex items-center gap-3 text-sm text-coffee-300">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {store.city?.name}, {store.province?.name}</span>
                  <span className="font-bold text-coffee-400">{store.price_range}</span>
                </div>
              </div>
              <button onClick={handleFavorite} disabled={favLoading}
                className="p-3 rounded-full bg-coffee-950/60 hover:bg-coffee-950/80 transition disabled:opacity-50">
                <Heart className={`h-5 w-5 transition ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`h-5 w-5 ${i <= Math.round(rating) ? 'fill-yellow-500 text-yellow-500' : 'text-coffee-700'}`} />
              ))}
            </div>
            <span className="text-lg font-bold text-coffee-100">{rating.toFixed(1)}</span>
            <span className="text-sm text-coffee-400">({store.total_reviews || 0} review)</span>
          </div>

          {store.description && <p className="text-coffee-300 mb-4 whitespace-pre-line">{store.description}</p>}

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {store.address && <p className="flex items-center gap-2 text-coffee-300"><MapPin className="h-4 w-4 text-coffee-500 flex-shrink-0" /> {store.address}</p>}
            {store.phone && <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-coffee-300 hover:text-coffee-200"><Phone className="h-4 w-4 text-coffee-500" /> {store.phone}</a>}
            {store.website && <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-coffee-400 hover:text-coffee-200"><Globe className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" /></a>}
            {store.instagram && <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-coffee-400 hover:text-coffee-200"><Instagram className="h-4 w-4" /> @{store.instagram}</a>}
          </div>

          {/* Amenities */}
          {store.amenities?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-coffee-200 mb-2">Fasilitas</h3>
              <div className="flex flex-wrap gap-2">
                {store.amenities.map(a => (
                  <span key={a.id} className="text-xs bg-coffee-800/50 text-coffee-300 px-3 py-1 rounded-full">{a.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Specialties */}
          {store.specialties?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-coffee-200 mb-2">Spesialisasi</h3>
              <div className="flex flex-wrap gap-2">
                {store.specialties.map(s => (
                  <span key={s.id} className="text-xs bg-coffee-500/20 text-coffee-400 px-3 py-1 rounded-full">{s.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-coffee-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-coffee-400" /> Check-in
          </h2>
          {checkinStats && (
            <div className="flex items-center gap-4 text-xs text-coffee-400">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {checkinStats.active_now} di sini</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {checkinStats.total_checkins} total</span>
            </div>
          )}
        </div>

        {!user && (
          <div className="text-center py-4">
            <p className="text-coffee-400 text-sm"><Link to="/login" className="text-coffee-300 underline hover:text-coffee-100">Login</Link> untuk check-in di kedai ini</p>
          </div>
        )}

        {user && !isCheckedInHere && !activeCheckin && (
          <div className="text-center py-4">
            <p className="text-coffee-400 text-sm mb-3">Sedang di sini? Check-in untuk catat kunjungan Anda!</p>
            <button onClick={handleCheckin} disabled={checkinLoading}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {checkinLoading ? 'Mendapatkan lokasi...' : 'Check-in di Sini'}
            </button>
            <p className="text-xs text-coffee-600 mt-2">GPS akan digunakan untuk verifikasi lokasi (maks 500m)</p>
          </div>
        )}

        {user && activeCheckin && !isCheckedInHere && (
          <div className="text-center py-4">
            <p className="text-coffee-400 text-sm">Anda sedang check-in di <span className="text-coffee-200 font-medium">{activeCheckin.store?.name}</span>.</p>
            <p className="text-xs text-coffee-500 mt-1">Checkout terlebih dahulu sebelum check-in di kedai lain.</p>
          </div>
        )}

        {user && isCheckedInHere && (
          <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Anda sedang check-in di sini
                </p>
                <p className="text-xs text-coffee-400 mt-1">
                  Sejak {new Date(activeCheckin.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {activeCheckin.distance_meters && ` · ${Math.round(activeCheckin.distance_meters)}m dari kedai`}
                </p>
              </div>
              <button onClick={() => setCheckoutModal(true)}
                className="px-4 py-2 bg-coffee-500 hover:bg-coffee-600 text-white rounded-lg transition text-sm flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCheckoutModal(false)} />
          <div className="relative card w-full max-w-md p-6 bg-coffee-950 border border-coffee-800">
            <h3 className="text-lg font-bold text-coffee-100 mb-1 flex items-center gap-2">
              <LogOut className="h-5 w-5 text-coffee-400" /> Checkout
            </h3>
            <p className="text-sm text-coffee-400 mb-4">Upload struk dan catat pengeluaran Anda (opsional).</p>

            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Receipt Upload */}
              <div>
                <label className="block text-sm text-coffee-300 mb-2">Foto Struk</label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReceiptFile}
                  className="hidden" id="receipt-upload" />
                <label htmlFor="receipt-upload" className="cursor-pointer block">
                  {receiptPreview ? (
                    <div className="relative h-40 rounded-lg overflow-hidden border border-coffee-700">
                      <img src={receiptPreview} alt="Struk" className="w-full h-full object-contain bg-coffee-900" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 border-2 border-dashed border-coffee-700 rounded-lg flex flex-col items-center justify-center text-coffee-500 hover:border-coffee-500 transition">
                      <Receipt className="h-8 w-8 mb-1" />
                      <p className="text-xs">Klik untuk upload foto struk</p>
                      <p className="text-xs mt-0.5 text-coffee-600">JPG, PNG, WebP (max 5MB)</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-coffee-300 mb-1">Total Belanja (Rp)</label>
                <input type="number" placeholder="Contoh: 45000" value={checkoutForm.receipt_amount}
                  onChange={e => setCheckoutForm(p => ({ ...p, receipt_amount: e.target.value }))}
                  className="input-field" min="0" max="99999999" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-coffee-300 mb-1">Catatan (opsional)</label>
                <textarea placeholder="Menu favorit, suasana, dll." value={checkoutForm.notes}
                  onChange={e => setCheckoutForm(p => ({ ...p, notes: e.target.value }))}
                  className="input-field resize-none" rows={2} maxLength={500} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCheckoutModal(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={checkinLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {checkinLoading ? 'Proses...' : 'Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu */}
      {store.menus?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-coffee-100 mb-4">Menu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {store.menus.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-coffee-900/30 rounded-lg">
                <div>
                  <p className="font-medium text-coffee-100">{m.name}</p>
                  <p className="text-xs text-coffee-400">{m.category}</p>
                </div>
                <span className="font-bold text-coffee-400">Rp {Number(m.price).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-coffee-100 mb-4">Review</h2>

        {user && (
          <form onSubmit={handleReview} className="mb-6 p-4 bg-coffee-900/30 rounded-lg">
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => setReviewForm(p => ({ ...p, rating: i }))}>
                  <Star className={`h-6 w-6 cursor-pointer transition ${i <= reviewForm.rating ? 'fill-yellow-500 text-yellow-500' : 'text-coffee-700 hover:text-coffee-500'}`} />
                </button>
              ))}
            </div>
            <textarea placeholder="Tulis review Anda..." value={reviewForm.comment}
              onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
              className="input-field mb-3 resize-none" rows={3} maxLength={2000} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-coffee-600">{reviewForm.comment.length}/2000</span>
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 text-sm">
                <Send className="h-4 w-4" /> {submitting ? 'Mengirim...' : 'Kirim Review'}
              </button>
            </div>
          </form>
        )}

        {!user && (
          <div className="mb-6 p-4 bg-coffee-900/30 rounded-lg text-center">
            <p className="text-coffee-400 text-sm">
              <Link to="/login" className="text-coffee-300 underline hover:text-coffee-100">Login</Link> untuk memberikan review
            </p>
          </div>
        )}

        <div className="space-y-4">
          {(store.reviews || []).map(r => (
            <div key={r.id} className="p-4 bg-coffee-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-coffee-700 flex items-center justify-center text-sm font-bold text-coffee-200">
                    {r.user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="font-medium text-coffee-200">{r.user?.name || 'Anonim'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-yellow-500 text-yellow-500' : 'text-coffee-700'}`} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-coffee-300 whitespace-pre-line">{r.comment}</p>}
            </div>
          ))}
          {(store.reviews || []).length === 0 && (
            <p className="text-center text-coffee-500 py-4">Belum ada review</p>
          )}
        </div>
      </div>
    </div>
  );
}
