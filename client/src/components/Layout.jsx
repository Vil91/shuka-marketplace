import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Store,
  User,
  Package,
  LogOut,
  ChevronDown,
  Menu,
  X,
  MapPin,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ShukaLogo from './ShukaLogo';

export default function Layout({ children }) {
  const { user, cartCount, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchCat, setSearchCat] = useState(searchParams.get('category') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api('/categories')
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname === '/search') {
      setQuery(searchParams.get('q') || '');
      setSearchCat(searchParams.get('category') || '');
    } else {
      setSearchCat('');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (searchCat) params.set('category', searchCat);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const activeCategorySlug = location.pathname === '/search' ? searchParams.get('category') || '' : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9]">
      {/* Flagship Marketplace Header */}
      <header className="bg-[#0F172A] text-white sticky top-0 z-40 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Primary Row */}
          <div className="h-16 flex items-center justify-between gap-3 sm:gap-5">
            {/* Logo + Location */}
            <div className="flex items-center gap-4 shrink-0">
              <Link to="/" aria-label="Shuka Home">
                <ShukaLogo size="md" showTagline />
              </Link>

              <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-300 border-l border-slate-700/80 pl-4">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="leading-tight">
                  <div className="text-[10px] text-slate-400">Deliver across</div>
                  <div className="font-bold text-white">Armenia · COD</div>
                </div>
              </div>
            </div>

            {/* Desktop Search bar with integrated Category Select */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl">
              <div className="flex w-full rounded-xl overflow-hidden bg-white text-slate-900 shadow-sm ring-2 ring-transparent focus-within:ring-amber-400 transition">
                <select
                  aria-label="Search category"
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold px-3 py-2.5 border-r border-slate-200 focus:outline-none cursor-pointer max-w-36 truncate"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search electronics, coffee, crafts, books..."
                  aria-label="Search products"
                  className="w-full px-3.5 py-2.5 text-sm focus:outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="px-5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-bold flex items-center justify-center transition cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {user && (
                <Link
                  to={user.is_seller ? '/seller' : '/seller/activate'}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 transition"
                >
                  <Store className="w-4 h-4" />
                  {user.is_seller ? 'Seller Hub' : 'Sell on Shuka'}
                </Link>
              )}

              <Link
                to="/cart"
                className="relative inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition"
              >
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-amber-400" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center ring-2 ring-[#0F172A]">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span>Cart</span>
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold flex items-center justify-center">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span className="max-w-28 truncate">{user.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        {user.is_seller && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {user.store_name}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/orders"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                      >
                        <Package className="w-4 h-4 text-slate-500" />
                        My orders
                      </Link>
                      <Link
                        to={user.is_seller ? '/seller' : '/seller/activate'}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                      >
                        <Store className="w-4 h-4 text-amber-600" />
                        {user.is_seller ? 'Seller dashboard' : 'Sell on Shuka'}
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        Account settings
                      </Link>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-slate-800 transition"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-sm transition"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile right icons */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <Link
                to="/cart"
                aria-label="Cart"
                className="relative p-2.5 rounded-xl hover:bg-slate-800"
              >
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                aria-label="Menu"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="p-2.5 rounded-xl hover:bg-slate-800"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Dedicated full-width Mobile Search Bar (zero placeholder clipping!) */}
          <form onSubmit={handleSearchSubmit} className="md:hidden pb-3">
            <div className="flex rounded-xl overflow-hidden bg-white text-slate-900 shadow-sm">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products on Shuka..."
                aria-label="Search products"
                className="w-full px-3.5 py-2 text-sm focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="px-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Sleek Category Bar (hidden scrollbar) */}
        <nav className="bg-[#1E293B] border-t border-slate-700/60">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 py-2 text-xs sm:text-[13px] whitespace-nowrap">
              <Link
                to="/search"
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  location.pathname === '/search' && !activeCategorySlug
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-200 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/search?category=${encodeURIComponent(cat.slug)}`}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    activeCategorySlug === cat.slug
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile menu drawer */}
        {mobileNavOpen && (
          <div className="md:hidden bg-[#0F172A] border-t border-slate-800 px-4 py-4 space-y-2 text-sm shadow-2xl">
            {user ? (
              <>
                <div className="pb-3 border-b border-slate-800">
                  <div className="font-bold text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <Link to="/orders" className="flex items-center gap-2 py-2 text-slate-200 font-medium">
                  <Package className="w-4 h-4 text-slate-400" />
                  My orders
                </Link>
                <Link
                  to={user.is_seller ? '/seller' : '/seller/activate'}
                  className="flex items-center gap-2 py-2 text-amber-400 font-semibold"
                >
                  <Store className="w-4 h-4" />
                  {user.is_seller ? 'Seller dashboard' : 'Sell on Shuka'}
                </Link>
                <Link to="/profile" className="flex items-center gap-2 py-2 text-slate-200 font-medium">
                  <User className="w-4 h-4 text-slate-400" />
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 py-2 text-rose-400 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </>
            ) : (
              <div className="flex gap-2.5 pt-1">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2.5 rounded-xl bg-slate-800 text-white font-semibold"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Rich Footer */}
      <footer className="bg-[#0F172A] text-slate-400 text-xs mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="space-y-2">
            <Link to="/" aria-label="Shuka Home">
              <ShukaLogo size="sm" showTagline={false} />
            </Link>
            <p className="text-slate-400 leading-relaxed max-w-xs">
              Armenia&apos;s local marketplace. Shop across independent Armenian stores in one cart and pay cash in AMD upon delivery.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Shop</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  to={`/search?category=${encodeURIComponent(c.slug)}`}
                  className="hover:text-amber-400 transition"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Marketplace</p>
            <div className="space-y-1.5 flex flex-col">
              <Link to="/orders" className="hover:text-amber-400 transition">Track My Orders</Link>
              <Link to={user?.is_seller ? '/seller' : '/seller/activate'} className="hover:text-amber-400 transition">
                Sell on Shuka
              </Link>
              <span className="text-slate-500">Yerevan &amp; all 10 Marzer · Cash on Delivery</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800/80 py-4 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Shuka Marketplace · Prices in Armenian Dram (AMD)
        </div>
      </footer>
    </div>
  );
}
