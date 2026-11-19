import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { setUser, setCartCount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sign in to Shuka</h1>
        <p className="text-sm text-slate-500 mt-1">Buy from local sellers or manage your store.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1">Password</label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition cursor-pointer"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        New to Shuka?{' '}
        <Link to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-amber-700 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-600">Seeded accounts (password: <code>shuka123</code>):</p>
        <p>Seller: <code>seller1@shuka.am</code> · Buyer: <code>buyer1@shuka.am</code></p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { setUser, setCartCount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
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
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Create your Shuka account</h1>
        <p className="text-sm text-slate-500 mt-1">One account lets you buy and open your own store anytime.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            required
            placeholder="+374 91 000000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Password (min 6 characters)</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition cursor-pointer"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-amber-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
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
    <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">Account Settings</h1>
      <p className="text-xs text-slate-500">Email: <strong>{user.email}</strong></p>

      {error && <div className="rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
      {saved && <div className="rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm font-medium">Profile updated.</div>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
