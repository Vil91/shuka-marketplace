import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Store, Sparkles, Banknote } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

const QUICK_TAGS = ['Headphones', 'Coffee', 'Duduk', 'Keyboard', 'Backgammon', 'Skincare'];

export default function HomePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [newest, setNewest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/categories'),
      api('/products?sort=rating&limit=4'),
      api('/products?sort=newest&limit=16'),
    ])
      .then(([catRes, topRes, newRes]) => {
        setCategories(catRes.categories || []);
        setTopRated(topRes.products || []);
        setNewest(newRes.products || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      {/* Editorial Studio Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl border border-slate-800/60">
        <img
          src="/hero-shuka.webp"
          alt="Curated products available on Shuka Armenia"
          className="absolute inset-0 w-full h-full object-cover object-right opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/80 sm:via-[#0F172A]/70 to-[#0F172A]/15" />

        <div className="relative z-10 px-6 py-10 sm:px-12 sm:py-14 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 backdrop-blur-xs">
            <Truck className="w-3.5 h-3.5" />
            Armenia-wide delivery · Cash on Delivery
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight leading-[1.1]">
            Everything local.
            <br />
            Delivered to your <span className="text-amber-400">door.</span>
          </h1>

          <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed max-w-xl">
            Discover electronics, home essentials, books, and handmade Armenian crafts from verified local stores. Combine sellers in one cart and pay cash in AMD upon arrival.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition"
            >
              Shop Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={user ? (user.is_seller ? '/seller' : '/seller/activate') : '/register'}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xs text-white font-bold text-sm transition"
            >
              <Store className="w-4 h-4 text-amber-400" />
              {user?.is_seller ? 'Seller Dashboard' : 'Sell on Shuka'}
            </Link>
          </div>

          {/* Quick Popular Searches */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Popular:
            </span>
            {QUICK_TAGS.map((tag) => (
              <Link
                key={tag}
                to={`/search?q=${encodeURIComponent(tag)}`}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-white/10 transition"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Cash on Delivery (AMD)</p>
            <p className="text-xs text-slate-500">Inspect first, pay cash across Yerevan &amp; 10 Marzer</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Verified Real-Time Stock</p>
            <p className="text-xs text-slate-500">Live inventory protection &amp; status history per seller</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Multi-Seller Cart</p>
            <p className="text-xs text-slate-500">Order from multiple Armenian stores in one checkout</p>
          </div>
        </div>
      </section>

      {/* Visual Category Showcase */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Shop by Category
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Curated collections from local Armenian sellers
            </p>
          </div>
          <Link to="/search" className="text-sm font-bold text-amber-700 hover:text-amber-600">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${encodeURIComponent(cat.slug)}`}
              className="group relative h-32 sm:h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs hover:shadow-lg transition"
            >
              {cat.sample_thumb_url && (
                <img
                  src={cat.sample_thumb_url}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 opacity-85"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
              <div className="relative z-10 h-full p-4 flex flex-col justify-end">
                <span className="font-display font-bold text-sm sm:text-base text-white leading-tight group-hover:text-amber-300 transition">
                  {cat.name}
                </span>
                <span className="text-[11px] font-semibold text-slate-300 mt-0.5">
                  {cat.product_count} items
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rated Picks */}
      {!loading && topRated.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
                Top Rated on Shuka
              </h2>
            </div>
            <Link to="/search?sort=rating" className="text-sm font-bold text-amber-700 hover:text-amber-600">
              See top rated →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topRated.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Newest Arrivals */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Newest Arrivals
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Fresh listings across all 8 marketplace categories
            </p>
          </div>
          <Link to="/search?sort=newest" className="text-sm font-bold text-amber-700 hover:text-amber-600">
            Browse full catalog →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Become a Seller Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1 max-w-xl">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-950/70">
            For Local Shops &amp; Makers
          </p>
          <h3 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight">
            Ready to sell your products across Armenia?
          </h3>
          <p className="text-sm font-medium text-slate-900/80">
            Activate your seller storefront in one click, upload up to 5 photos per item, and manage cash-on-delivery orders from your dashboard.
          </p>
        </div>
        <Link
          to={user ? (user.is_seller ? '/seller' : '/seller/activate') : '/register'}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm shrink-0 transition"
        >
          <Store className="w-4 h-4 text-amber-400" />
          {user?.is_seller ? 'Go to Seller Hub' : 'Open Your Store'}
        </Link>
      </section>
    </div>
  );
}
