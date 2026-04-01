import { useState } from 'react';
import { Upload, FileJson, FileText, Trash2, Download, AlertTriangle, Eye, ArrowRight, ArrowLeft, Check, MapPin, Star, Settings2 } from 'lucide-react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const TARGET_FIELDS = [
  { value: '', label: '— Abaikan —' },
  { value: 'name', label: 'Nama Kedai *' },
  { value: 'address', label: 'Alamat' },
  { value: 'phone', label: 'Telepon' },
  { value: 'latitude', label: 'Latitude' },
  { value: 'longitude', label: 'Longitude' },
  { value: 'description', label: 'Deskripsi' },
  { value: 'price_range', label: 'Harga ($-$$$$)' },
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
  { value: 'google_maps_url', label: 'Google Maps URL' },
  { value: 'google_place_id', label: 'Google Place ID' },
  { value: 'rating', label: 'Rating (GMaps)' },
  { value: 'reviews_count', label: 'Jumlah Review' },
  { value: 'categories', label: 'Kategori' },
  { value: 'opening_hours', label: 'Jam Buka' },
  { value: 'cover_image', label: 'Foto URL' },
  { value: 'city_name', label: 'Kota' },
  { value: 'province_name', label: 'Provinsi' },
];

export default function AdminImport() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [options, setOptions] = useState({ skip_duplicates: true, auto_approve: true });
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'json', 'txt'].includes(ext)) {
      return toast.error('Format file harus CSV atau JSON');
    }
    if (f.size > 10 * 1024 * 1024) {
      return toast.error('Ukuran file maksimal 10MB');
    }
    setFile(f);
    setStep('upload');
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminApi.previewImport(formData);
      setPreview(res.data);
      setFieldMapping(res.data.mapped_fields || {});
      setStep('preview');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membaca file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep('importing');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skip_duplicates', options.skip_duplicates ? '1' : '0');
      formData.append('auto_approve', options.auto_approve ? '1' : '0');
      Object.entries(fieldMapping).forEach(([source, target]) => {
        if (target) formData.append(`field_mapping[${source}]`, target);
      });
      const res = await adminApi.importStores(formData);
      setResult(res.data);
      setStep('done');
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import gagal');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setFieldMapping({});
    const input = document.getElementById('import-file');
    if (input) input.value = '';
  };

  const updateMapping = (source, target) => {
    setFieldMapping(prev => ({ ...prev, [source]: target }));
  };

  const mappedCount = Object.values(fieldMapping).filter(v => v).length;
  const hasNameField = Object.values(fieldMapping).includes('name');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-coffee-100 mb-2">Import Data Kedai</h1>
      <p className="text-coffee-400 text-sm mb-6">
        Import dari Google Maps data extractor (Outscraper, Apify, dll.) atau file CSV/JSON lainnya.
      </p>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {['Upload File', 'Preview & Mapping', 'Import'].map((label, i) => {
          const steps = ['upload', 'preview', 'done'];
          const stepIdx = steps.indexOf(step === 'importing' ? 'done' : step);
          const isActive = i <= stepIdx;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isActive ? 'bg-coffee-400' : 'bg-coffee-800'}`} />}
              <div className={`flex items-center gap-1.5 text-sm ${isActive ? 'text-coffee-200' : 'text-coffee-600'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-coffee-500 text-white' : 'bg-coffee-800 text-coffee-600'}`}>
                  {i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="border-2 border-dashed border-coffee-700 rounded-lg p-8 text-center mb-4">
              <input type="file" accept=".csv,.json,.txt" onChange={handleFileSelect}
                className="hidden" id="import-file" />
              <label htmlFor="import-file" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {file.name.endsWith('.json') ? <FileJson className="h-10 w-10 text-coffee-400" /> : <FileText className="h-10 w-10 text-coffee-400" />}
                    <div className="text-left">
                      <span className="text-coffee-200 block font-medium">{file.name}</span>
                      <span className="text-xs text-coffee-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-coffee-600 mx-auto mb-3" />
                    <p className="text-coffee-300 font-medium">Klik atau drag file ke sini</p>
                    <p className="text-xs text-coffee-600 mt-2">CSV, JSON dari Google Maps extractor (max 10MB, 2000 rows)</p>
                  </>
                )}
              </label>
            </div>

            <button onClick={handlePreview} disabled={!file || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Membaca file...' : <><Eye className="h-4 w-4" /> Preview Data</>}
            </button>
          </div>

          {/* Supported formats */}
          <div className="card p-6">
            <h3 className="font-semibold text-coffee-200 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Format yang Didukung
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Outscraper', 'CSV / JSON export'],
                ['Apify Google Maps', 'JSON dataset export'],
                ['PhantomBuster', 'CSV export'],
                ['Data Miner', 'CSV / JSON export'],
                ['Google Takeout', 'JSON saved places'],
                ['Custom CSV', 'Dengan kolom name, address, dll.'],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-start gap-2 text-coffee-400">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div><span className="text-coffee-200">{name}</span> — {desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Export & Clear */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold text-coffee-200 mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" /> Export Data
              </h3>
              <p className="text-xs text-coffee-500 mb-3">Download semua kedai approved sebagai JSON.</p>
              <button onClick={async () => {
                try {
                  const res = await adminApi.exportStores();
                  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kedaikopi-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Export berhasil');
                } catch { toast.error('Export gagal'); }
              }} className="btn-secondary text-sm w-full">Export JSON</button>
            </div>
            <div className="card p-5 border-red-900/30">
              <h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Hapus Data Import
              </h3>
              <p className="text-xs text-coffee-500 mb-3">Hapus semua kedai yang ditandai sebagai import.</p>
              <button onClick={async () => {
                if (!confirm('Yakin hapus semua data import?')) return;
                try {
                  const res = await adminApi.clearImported();
                  toast.success(res.data.message);
                } catch { toast.error('Gagal menghapus'); }
              }} className="text-sm px-4 py-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 transition w-full">
                Hapus Semua Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Mapping */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Total Baris', preview.total_rows, 'text-coffee-200'],
              ['Field Terpetakan', `${mappedCount}/${preview.source_headers?.length || 0}`, 'text-coffee-200'],
              ['Duplikat Terdeteksi', preview.duplicates || 0, preview.duplicates > 0 ? 'text-yellow-400' : 'text-green-400'],
              ['Siap Import', preview.total_rows - (preview.duplicates || 0), 'text-green-400'],
            ].map(([label, val, cls]) => (
              <div key={label} className="card p-4 text-center">
                <div className={`text-2xl font-bold ${cls}`}>{val}</div>
                <div className="text-xs text-coffee-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Field Mapping */}
          <div className="card p-6">
            <h3 className="font-semibold text-coffee-200 mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Field Mapping
            </h3>
            <p className="text-xs text-coffee-500 mb-4">
              Kolom dari file Anda dipetakan otomatis. Sesuaikan jika perlu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-2">
              {(preview.source_headers || []).map(header => (
                <div key={header} className="flex items-center gap-2 p-2 rounded bg-coffee-900/30">
                  <span className="text-xs text-coffee-300 truncate w-32 shrink-0" title={header}>{header}</span>
                  <ArrowRight className="h-3 w-3 text-coffee-600 shrink-0" />
                  <select value={fieldMapping[header] || ''} onChange={e => updateMapping(header, e.target.value)}
                    className="text-xs bg-coffee-900/50 border border-coffee-700/50 rounded px-2 py-1.5 text-coffee-200 flex-1 min-w-0">
                    {TARGET_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!hasNameField && (
              <div className="mt-3 p-3 bg-red-900/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Field "Nama Kedai" wajib dipetakan.
              </div>
            )}
          </div>

          {/* Preview Table */}
          <div className="card p-6">
            <h3 className="font-semibold text-coffee-200 mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview (5 baris pertama)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-800">
                    {['#','Nama','Alamat','Telepon','Rating','Harga','Koordinat'].map(h => (
                      <th key={h} className="text-left text-coffee-400 py-2 px-3 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(preview.preview || []).map((row, i) => (
                    <tr key={i} className="border-b border-coffee-800/50">
                      <td className="py-2 px-3 text-coffee-500">{i + 1}</td>
                      <td className="py-2 px-3 text-coffee-200 max-w-48 truncate">{row.name || '—'}</td>
                      <td className="py-2 px-3 text-coffee-400 max-w-56 truncate">{row.address || '—'}</td>
                      <td className="py-2 px-3 text-coffee-400">{row.phone || '—'}</td>
                      <td className="py-2 px-3">
                        {row._rating ? (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Star className="h-3 w-3 fill-current" /> {row._rating}
                            {row._reviews_count && <span className="text-coffee-500 text-xs">({row._reviews_count})</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3 text-coffee-400">{row.price_range || '$$'}</td>
                      <td className="py-2 px-3 text-coffee-500 text-xs">
                        {row.latitude && row.longitude ? `${Number(row.latitude).toFixed(4)}, ${Number(row.longitude).toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Options */}
          <div className="card p-6">
            <h3 className="font-semibold text-coffee-200 mb-4">Opsi Import</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={options.skip_duplicates}
                  onChange={e => setOptions(p => ({ ...p, skip_duplicates: e.target.checked }))}
                  className="w-4 h-4 rounded border-coffee-600 bg-coffee-800 text-coffee-500 focus:ring-coffee-500" />
                <div>
                  <span className="text-coffee-200 text-sm">Lewati duplikat</span>
                  <span className="text-coffee-500 text-xs block">Deteksi via Google Place ID atau nama+alamat</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={options.auto_approve}
                  onChange={e => setOptions(p => ({ ...p, auto_approve: e.target.checked }))}
                  className="w-4 h-4 rounded border-coffee-600 bg-coffee-800 text-coffee-500 focus:ring-coffee-500" />
                <div>
                  <span className="text-coffee-200 text-sm">Auto-approve kedai</span>
                  <span className="text-coffee-500 text-xs block">Langsung tampil publik tanpa approve manual</span>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <button onClick={handleImport} disabled={!hasNameField || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Mengimport...' : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {preview.total_rows - (options.skip_duplicates ? (preview.duplicates || 0) : 0)} Kedai
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Importing spinner */}
      {step === 'importing' && (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-coffee-500 border-t-transparent mx-auto mb-4" />
          <p className="text-coffee-200 font-medium">Mengimport data...</p>
          <p className="text-coffee-500 text-sm mt-1">Mohon tunggu, jangan tutup halaman ini.</p>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'done' && result && (
        <div className="space-y-6">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-coffee-100 mb-2">Import Selesai!</h2>
            <p className="text-coffee-400">{result.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{result.imported || 0}</div>
              <div className="text-xs text-coffee-500">Berhasil</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{result.skipped || 0}</div>
              <div className="text-xs text-coffee-500">Duplikat Dilewati</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{result.failed || 0}</div>
              <div className="text-xs text-coffee-500">Gagal</div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="card p-4">
              <p className="text-red-400 text-sm font-medium flex items-center gap-1 mb-2">
                <AlertTriangle className="h-4 w-4" /> Error Detail:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-coffee-400 py-0.5 border-b border-coffee-800/30">{e}</p>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleReset} className="btn-primary w-full">Import Lagi</button>
        </div>
      )}
    </div>
  );
}
