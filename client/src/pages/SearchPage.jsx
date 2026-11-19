import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Number.parseInt(searchParams.get('page') || '1', 10) || 1;

  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  useEffect(() => {
    setMinInput(minPrice);
    setMaxInput(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (sort) qs.set('sort', sort);
    qs.set('page', String(page));

    api(`/products?${qs.toString()}`)
      .then((res) => {
        setProducts(res.products || []);
        setPagination(res.pagination || { page: 1, total: 0, total_pages: 1 });
      })
      .finally(() => setLoading(false));
  }, [q, category, minPrice, maxPrice, sort, page]);

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    }
    if (!('page' in patch)) {
      next.delete('page');
    }
    setSearchParams(next);
  }

  function applyPriceFilter(e) {
    e.preventDefault();
    updateParams({ minPrice: minInput.trim(), maxPrice: maxInput.trim() });
  }

  const activeCategoryName = categories.find((c) => c.slug === category)?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {q
              ? `Search results for "${q}"`
              : activeCategoryName
                ? activeCategoryName
                : 'All Products'}
          </h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${pagination.total} product${pagination.total === 1 ? '' : 's'} found`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold text-slate-600">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                Filters
              </div>
              {(q || category || minPrice || maxPrice) && (
                <button
                  type="button"
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Category filter */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Category
              </h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => updateParams({ category: '' })}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition ${
                    !category ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateParams({ category: c.slug })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition ${
                      category === c.slug
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.product_count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price range filter */}
            <form onSubmit={applyPriceFilter} className="space-y-2.5 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Price Range (AMD)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Apply Price
              </button>
            </form>
          </div>
        </aside>

        {/* Results Grid */}
        <section className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 h-72 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <p className="text-lg font-bold text-slate-900">No products match your search</p>
              <p className="text-sm text-slate-500">
                Try removing a filter or browsing all products in the catalog.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
              >
                Back to all products
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: page - 1 })}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 px-2">
                    Page <strong>{page}</strong> of {pagination.total_pages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.total_pages}
                    onClick={() => updateParams({ page: page + 1 })}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
