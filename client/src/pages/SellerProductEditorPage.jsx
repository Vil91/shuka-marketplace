import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Upload, Trash2, Star, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import SellerLayout from './SellerLayout';

export default function SellerProductEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedMsg, setSavedMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    description: '',
    price_amd: '',
    stock: '1',
    is_published: true,
  });

  // Existing server images (edit mode) + pending files (create mode)
  const [images, setImages] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);

  useEffect(() => {
    api('/categories').then((d) => {
      const cats = d.categories || [];
      setCategories(cats);
      if (!isEdit && cats.length > 0) {
        setForm((prev) => ({ ...prev, category_id: prev.category_id || String(cats[0].id) }));
      }
    });

    if (isEdit) {
      api(`/seller/products/${id}`)
        .then((d) => {
          const p = d.product;
          setForm({
            title: p.title,
            category_id: String(p.category_id),
            description: p.description,
            price_amd: String(p.price_amd),
            stock: String(p.stock),
            is_published: Boolean(p.is_published),
          });
          setImages(p.images || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function validateClient() {
    const errs = {};
    if (form.title.trim().length < 3) errs.title = ['Title must be at least 3 characters'];
    if (!form.category_id) errs.category_id = ['Choose a category'];
    if (form.description.trim().length < 10) errs.description = ['Description must be at least 10 characters'];
    const price = Number(form.price_amd);
    if (!Number.isInteger(price) || price <= 0) errs.price_amd = ['Enter a whole number greater than 0 AMD'];
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) errs.stock = ['Stock must be 0 or greater'];
    return errs;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSavedMsg('');
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length > 0) {
      setFieldErrors(clientErrs);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        description: form.description.trim(),
        price_amd: Number(form.price_amd),
        stock: Number(form.stock),
        is_published: form.is_published,
      };

      if (isEdit) {
        const res = await api(`/seller/products/${id}`, { method: 'PATCH', body: payload });
        setImages(res.product.images || []);
        setSavedMsg('Product updated successfully.');
      } else {
        const res = await api('/seller/products', { method: 'POST', body: payload });
        const createdId = res.product.id;

        if (pendingFiles.length > 0) {
          const fd = new FormData();
          pendingFiles.slice(0, 5).forEach((f) => fd.append('images', f));
          await api(`/seller/products/${createdId}/images`, { method: 'POST', body: fd });
        }
        navigate(`/seller/products/${createdId}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
      if (err.details) setFieldErrors(err.details);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadFiles(fileList) {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    setError('');

    if (!isEdit) {
      setPendingFiles((prev) => [...prev, ...picked].slice(0, 5));
      return;
    }

    if (images.length + picked.length > 5) {
      setError(`You can upload up to 5 images per product (currently ${images.length}).`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      picked.forEach((f) => fd.append('images', f));
      const res = await api(`/seller/products/${id}/images`, { method: 'POST', body: fd });
      setImages(res.product.images || []);
      setSavedMsg('Images uploaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSetMain(imageId) {
    setError('');
    try {
      const res = await api(`/seller/products/${id}/images/${imageId}/main`, { method: 'PATCH' });
      setImages(res.product.images || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteImage(imageId) {
    setError('');
    try {
      const res = await api(`/seller/products/${id}/images/${imageId}`, { method: 'DELETE' });
      setImages(res.product.images || []);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SellerLayout>
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 h-96 animate-pulse" />
      ) : (
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/seller/products" className="text-xs font-semibold text-amber-700 hover:underline">
                ← Back to Products
              </Link>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
            </div>
            {isEdit && (
              <Link
                to={`/products/${id}`}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
              >
                View on storefront →
              </Link>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}
          {savedMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savedMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.title && <p className="text-xs text-rose-600 mt-1">{fieldErrors.title[0]}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {fieldErrors.category_id && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.category_id[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (AMD) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.price_amd}
                  onChange={(e) => setForm({ ...form, price_amd: e.target.value })}
                  placeholder="25000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {fieldErrors.price_amd && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.price_amd[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {fieldErrors.stock && <p className="text-xs text-rose-600 mt-1">{fieldErrors.stock[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe key specs, condition, and what is included in the box..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.description && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.description[0]}</p>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              Published (visible on the storefront)
            </label>

            {/* Images Upload Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Product Photos ({isEdit ? images.length : pendingFiles.length} / 5)
                  </h3>
                  <p className="text-xs text-slate-500">
                    JPEG, PNG, or WebP up to 5 MB each. First photo is the main storefront image.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Add Photos'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploading || (isEdit ? images.length >= 5 : pendingFiles.length >= 5)}
                    onChange={(e) => {
                      handleUploadFiles(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {isEdit ? (
                images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {images.map((img, idx) => (
                      <div key={img.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                        <div className="relative aspect-square">
                          <img src={img.thumb_url} alt="" className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                              MAIN
                            </span>
                          )}
                        </div>
                        <div className="p-1.5 flex items-center justify-between gap-1 bg-white border-t border-slate-100">
                          {idx !== 0 ? (
                            <button
                              type="button"
                              onClick={() => handleSetMain(img.id)}
                              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                            >
                              <Star className="w-3 h-3" />
                              Main
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Primary</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            aria-label="Delete image"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((f, idx) => (
                      <div
                        key={`${f.name}-${idx}`}
                        className="inline-flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="font-medium truncate max-w-44">
                          {idx === 0 ? '★ ' : ''}
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-600 font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
              </button>
              <Link
                to="/seller/products"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}
    </SellerLayout>
  );
}
