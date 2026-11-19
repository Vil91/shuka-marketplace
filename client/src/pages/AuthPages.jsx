import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Truck,
  Store,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function AuthShell({ mode, next, children }) {
  const qs = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <div className="max-w-4xl mx-auto my-2 sm:my-6 bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 overflow-hidden grid grid-cols-1 md:grid-cols-12">
      {/* Left Brand Showcase Panel */}
      <div className="md:col-span-5 relative bg-[#0F172A] text-white p-7 sm:p-8 flex flex-col justify-between overflow-hidden">
        <img
          src="/hero-shuka.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-right opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/85 via-[#0F172A]/80 to-[#0F172A]/95" />

        <div className="relative z-10 space-y-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black text-lg shadow-sm">
              S
            </span>
            <div className="leading-none">
              <div className="font-display font-extrabold text-xl tracking-tight text-white">shuka</div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">
                armenia
              </div>
            </div>
          </Link>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-extrabold leading-tight">
              {mode === 'login'
                ? 'Welcome back to Shuka.'
                : 'One account to shop & sell across Armenia.'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Order from trusted local stores in Yerevan and all 10 marzer with cash on delivery.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-3 pt-8 text-xs text-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <span>Cash on delivery across all Armenian regions</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-400/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Live order tracking &amp; status history per seller</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-400/15 text-blue-400 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <span>Activate your own storefront in seconds</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="md:col-span-7 p-6 sm:p-9 flex flex-col justify-center space-y-6">
        {/* Clean Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
          <Link
            to={`/login${qs}`}
            className={`text-center py-2 rounded-lg text-sm font-bold transition ${
              mode === 'login'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign in
          </Link>
          <Link
            to={`/register${qs}`}
            className={`text-center py-2 rounded-lg text-sm font-bold transition ${
              mode === 'register'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create account
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { setUser, setCartCount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setUser(res.user);
      setCartCount(res.user.cart_count || 0);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="login" next={next}>
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950">Sign in to Shuka</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and password to access your cart, orders, and store.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-11 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
          {!submitting && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Don&apos;t have an account yet?{' '}
        <Link
          to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-bold text-amber-700 hover:underline"
        >
          Create one now
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { setUser, setCartCount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api('/auth/register', { method: 'POST', body: form });
      setUser(res.user);
      setCartCount(0);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="register" next={next}>
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">
          Start shopping right away or activate your store anytime from your menu.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="reg-name" className="block text-xs font-bold text-slate-700 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              placeholder="e.g. Aram Grigoryan"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+374 91 000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 mb-1">
            Password (at least 6 characters)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Create a strong password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-11 py-2.5 text-sm bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>{submitting ? 'Creating account...' : 'Create account'}</span>
          {!submitting && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link
          to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-bold text-amber-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login?next=/profile');
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user, loading]);

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      const res = await api('/me', { method: 'PATCH', body: { name, phone } });
      setUser(res.user);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 font-display font-black text-xl flex items-center justify-center">
          {user.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-xl font-display font-extrabold text-slate-950">Account Settings</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Profile updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="prof-name" className="block text-xs font-bold text-slate-700 mb-1.5">
            Full Name
          </label>
          <input
            id="prof-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label htmlFor="prof-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
            Phone Number
          </label>
          <input
            id="prof-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition cursor-pointer"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
