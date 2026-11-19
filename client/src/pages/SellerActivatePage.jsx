import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SellerActivatePage() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login?next=/seller/activate');
      return;
    }
    if (user?.is_seller) {
      navigate('/seller', { replace: true });
      return;
    }
    if (user) {
      setPhone(user.phone || '');
    }
  }, [user, loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api('/seller/activate', {
        method: 'POST',
        body: { store_name: storeName, phone },
      });
      await refreshUser();
      navigate('/seller', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
        <Store className="w-6 h-6" />
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Sell on Shuka</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose your store name and contact phone. Your seller dashboard activates immediately.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Store Name *</label>
          <input
            type="text"
            required
            minLength={2}
            placeholder="e.g. Cascade Electronics"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Store Phone *</label>
          <input
            type="tel"
            required
            placeholder="+374 91 000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
        >
          {submitting ? 'Activating...' : 'Activate Seller Account'}
        </button>
      </form>
    </div>
  );
}
