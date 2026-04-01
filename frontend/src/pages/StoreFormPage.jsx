import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { storeApi, locationApi } from '../services/api';
import toast from 'react-hot-toast';

export default function StoreFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '', description: '', address: '', province_id: '', city_id: '', district_id: '',
    latitude: '', longitude: '', phone: '', email: '', website: '', instagram: '',
    price_range: '$$', amenity_ids: [], specialty_ids: [],
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  // Load metadata
  useEffect(() => {
    Promise.all([
      locationApi.provinces(),
      locationApi.amenities(),
      locationApi.specialties(),
    ]).then(([prov, amen, spec]) => {
      setProvinces(prov.data || []);
      setAmenities(amen.data || []);
      setSpecialties(spec.data || []);
    });
  }, []);

  // Load store data for edit
  useEffect(() => {
    if (!isEdit) return;
    setPageLoading(true);

    // Fetch from my-stores endpoint since we need our own store by ID
    storeApi.myStores({ per_page: 50 })
      .then(res => {
        const store = (res.data.data || []).find(s => String(s.id) === String(id));
        if (!store) {
          toast.error('Kedai tidak ditemukan');
          navigate('/my-stores');
          return;
        }

        setForm({
          name: store.name || '',
          description: store.description || '',
          address: store.address || '',
          province_id: store.province_id || store.province?.id || '',
          city_id: store.city_id || store.city?.id || '',
          district_id: store.district_id || '',
          latitude: store.latitude || '',
          longitude: store.longitude || '',
          phone: store.phone || '',
          email: store.email || '',
          website: store.website || '',
          instagram: store.instagram || '',
          price_range: store.price_range || '$$',
          amenity_ids: (store.amenities || []).map(a => a.id),
          specialty_ids: (store.specialties || []).map(s => s.id),
        });

        if (store.cover_image) {
          setCoverPreview(store.cover_image);
        }

        // Load cities for province
        if (store.province_id || store.province?.id) {
          locationApi.cities(store.province_id || store.province?.id)
            .then(r => setCities(r.data || []));
        }
      })
      .catch(() => {
        toast.error('Gagal memuat data kedai');
        navigate('/my-stores');
      })
      .finally(() => setPageLoading(false));
  }, [id, isEdit, navigate]);

  // Load cities when province changes
  useEffect(() => {
    if (form.province_id) {
      locationApi.cities(form.province_id).then(r => setCities(r.data || []));
    } else {
      setCities([]);
    }
  }, [form.province_id]);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleArray = (key, val) => {
    setForm(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val]
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      // Append all form fields
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'amenity_ids' || key === 'specialty_ids') {
          (value || []).forEach(v => formData.append(`${key}[]`, v));
        } else if (value !== '' && value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (coverImage) {
        formData.append('cover_image', coverImage);
      }

      if (isEdit) {
        await storeApi.update(id, formData);
        toast.success('Kedai berhasil diperbarui');
      } else {
        await storeApi.create(formData);
        toast.success('Kedai berhasil didaftarkan! Menunggu persetujuan admin.');
      }
      navigate('/my-stores');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)[0]?.[0];
        toast.error(firstError || 'Validasi gagal');
      } else {
        toast.error(err.response?.data?.message || 'Gagal menyimpan');
      }
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coffee-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-coffee-400 hover:text-coffee-200 mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <h1 className="text-2xl font-bold text-coffee-100 mb-6">{isEdit ? 'Edit Kedai' : 'Daftarkan Kedai Baru'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image */}
        <div className="card p-6">
          <h2 className="font-semibold text-coffee-200 mb-4">Foto Cover</h2>
          <div className="relative">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange}
              className="hidden" id="cover-upload" />
            <label htmlFor="cover-upload" className="cursor-pointer block">
              {coverPreview ? (
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-48 border-2 border-dashed border-coffee-700 rounded-lg flex flex-col items-center justify-center text-coffee-500">
                  <Upload className="h-8 w-8 mb-2" />
                  <p className="text-sm">Klik untuk upload foto cover</p>
                  <p className="text-xs mt-1">JPG, PNG, WebP (max 5MB)</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-coffee-200">Informasi Dasar</h2>
          <input placeholder="Nama Kedai *" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required maxLength={255} />
          <textarea placeholder="Deskripsi" value={form.description} onChange={e => update('description', e.target.value)} className="input-field resize-none" rows={3} maxLength={5000} />
          <input placeholder="Alamat Lengkap *" value={form.address} onChange={e => update('address', e.target.value)} className="input-field" required maxLength={500} />
          <div className="grid grid-cols-2 gap-4">
            <select value={form.province_id} onChange={e => { update('province_id', e.target.value); update('city_id', ''); }} className="input-field" required>
              <option value="">Provinsi *</option>
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.city_id} onChange={e => update('city_id', e.target.value)} className="input-field" required disabled={!form.province_id}>
              <option value="">Kota *</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={e => update('latitude', e.target.value)} className="input-field" />
            <input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={e => update('longitude', e.target.value)} className="input-field" />
          </div>
        </div>

        {/* Contact */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-coffee-200">Kontak & Harga</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="No. Telepon" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" maxLength={20} />
            <input type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" />
            <input placeholder="Website" value={form.website} onChange={e => update('website', e.target.value)} className="input-field" />
            <input placeholder="Instagram (tanpa @)" value={form.instagram} onChange={e => update('instagram', e.target.value)} className="input-field" maxLength={100} />
          </div>
          <select value={form.price_range} onChange={e => update('price_range', e.target.value)} className="input-field">
            <option value="$">$ — Murah</option>
            <option value="$$">$$ — Sedang</option>
            <option value="$$$">$$$ — Mahal</option>
            <option value="$$$$">$$$$ — Premium</option>
          </select>
        </div>

        {/* Amenities */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-coffee-200">Fasilitas</h2>
          <div className="flex flex-wrap gap-2">
            {amenities.map(a => (
              <button key={a.id} type="button" onClick={() => toggleArray('amenity_ids', a.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${form.amenity_ids.includes(a.id)
                  ? 'bg-coffee-500 border-coffee-500 text-white'
                  : 'bg-coffee-900/30 border-coffee-700/50 text-coffee-300 hover:border-coffee-500'
                }`}>{a.name}</button>
            ))}
          </div>
        </div>

        {/* Specialties */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-coffee-200">Spesialisasi Kopi</h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map(s => (
              <button key={s.id} type="button" onClick={() => toggleArray('specialty_ids', s.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${form.specialty_ids.includes(s.id)
                  ? 'bg-coffee-500 border-coffee-500 text-white'
                  : 'bg-coffee-900/30 border-coffee-700/50 text-coffee-300 hover:border-coffee-500'
                }`}>{s.name}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? 'Menyimpan...' : isEdit ? 'Perbarui Kedai' : 'Daftarkan Kedai'}
        </button>
      </form>
    </div>
  );
}
