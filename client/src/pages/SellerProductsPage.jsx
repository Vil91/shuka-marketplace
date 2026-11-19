import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, EyeOff, Plus } from 'lucide-react';
import { api, formatAmd } from '../lib/api';
import SellerLayout from './SellerLayout';

export default function SellerProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await api('/seller/products');
      setProducts(res.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function togglePublish(p) {
    setBusyId(p.id);
    setError('');
    try {
      const res = await api(`/seller/products/${p.id}`, {
        method: 'PATCH',
        body: { is_published: !p.is_published },
      });
      setProducts((prev) => prev.map((row) => (row.id === p.id ? { ...row, ...res.product } : row)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SellerLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-900">Your Products ({products.length})</h2>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add product
          </Link>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 h-60 animate-pulse" />
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-base font-bold text-slate-900">No products listed yet</p>
            <p className="text-sm text-slate-500">Add your first item with photos, description, and price in AMD.</p>
            <Link
              to="/seller/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sold</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {p.thumb_url && (
                            <img src={p.thumb_url} alt={p.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/products/${p.id}`}
                            className="font-semibold text-slate-900 hover:text-amber-700 line-clamp-1"
                          >
                            {p.title}
                          </Link>
                          <div className="text-xs text-slate-400">{p.category_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {formatAmd(p.price_amd)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold ${
                          p.stock === 0 ? 'text-rose-600' : p.stock <= 3 ? 'text-amber-700' : 'text-slate-800'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.is_published ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{p.units_sold}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/seller/products/${p.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => togglePublish(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {p.is_published ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              Publish
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
