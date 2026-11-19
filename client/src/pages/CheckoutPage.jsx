import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Banknote, Lock, Store } from 'lucide-react';
import { api, ARMENIA_REGIONS, formatAmd } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function makeRequestKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function CheckoutPage() {
  const { user, loading: authLoading, refreshUser, setCartCount } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [priceChanges, setPriceChanges] = useState([]);
  const requestKeyRef = useRef(makeRequestKey());

  const [form, setForm] = useState({
    recipient: '',
    phone: '',
    region: 'Yerevan',
    city: 'Yerevan',
    street: '',
    apartment: '',
    note: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/checkout');
      return;
    }
    if (user) {
      const last = user.last_address;
      setForm({
        recipient: last?.recipient || user.name || '',
        phone: last?.phone || user.phone || '',
        region: last?.region || 'Yerevan',
        city: last?.city || 'Yerevan',
        street: last?.street || '',
        apartment: last?.apartment || '',
        note: last?.note || '',
      });
      api('/cart')
        .then((d) => {
          setCart(d);
          setCartCount(d.item_count);
        })
        .finally(() => setLoading(false));
    }
  }, [user, authLoading]);

  async function handleAcceptPrices() {
    const updated = await api('/cart/sync-prices', { method: 'POST', body: {} });
    setCart(updated);
    setPriceChanges([]);
    setError('');
    setLocked(false);
    requestKeyRef.current = makeRequestKey();
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (submitting || locked) return;
    setSubmitting(true);
    setLocked(true);
    setError('');
    setFieldErrors({});
    setPriceChanges([]);

    try {
      const res = await api('/orders', {
        method: 'POST',
        body: {
          ...form,
          request_key: requestKeyRef.current,
        },
      });
      await refreshUser();
      navigate(`/orders/${res.order.id}?placed=1`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not place order');
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        setFieldErrors(err.details);
        setLocked(false);
      } else if (err.code === 'PRICE_CHANGED' && err.details?.changed_items) {
        setPriceChanges(err.details.changed_items);
        setLocked(false);
      } else {
        setLocked(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse" />;
  }

  if (!cart || cart.groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
        <p className="text-lg font-bold text-slate-900">Your cart is empty</p>
        <Link to="/search" className="text-sm font-semibold text-amber-700 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>
        <p className="text-sm text-slate-500">Delivery across Armenia · Pay cash on delivery</p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-2 text-sm text-rose-900">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {priceChanges.length > 0 && (
            <div className="pl-7 space-y-2">
              <ul className="list-disc pl-4 text-xs space-y-1">
                {priceChanges.map((c) => (
                  <li key={c.product_id}>
                    <strong>{c.title}</strong>: {formatAmd(c.old_price_amd)} →{' '}
                    <strong>{formatAmd(c.new_price_amd)}</strong>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleAcceptPrices}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Accept new prices &amp; continue
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Delivery Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Delivery Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chk-recipient" className="block text-xs font-bold text-slate-700 mb-1">Recipient Name *</label>
              <input
                id="chk-recipient"
                type="text"
                required
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.recipient && <p className="text-xs text-rose-600 mt-1">{fieldErrors.recipient[0]}</p>}
            </div>

            <div>
              <label htmlFor="chk-phone" className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                id="chk-phone"
                type="tel"
                required
                placeholder="+374 91 000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.phone && <p className="text-xs text-rose-600 mt-1">{fieldErrors.phone[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chk-region" className="block text-xs font-bold text-slate-700 mb-1">Region (Yerevan / Marz) *</label>
              <select
                id="chk-region"
                value={form.region}
                onChange={(e) =>
                  setForm({
                    ...form,
                    region: e.target.value,
                    city: e.target.value === 'Yerevan' ? 'Yerevan' : form.city === 'Yerevan' ? '' : form.city,
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {ARMENIA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {fieldErrors.region && <p className="text-xs text-rose-600 mt-1">{fieldErrors.region[0]}</p>}
            </div>

            <div>
              <label htmlFor="chk-city" className="block text-xs font-bold text-slate-700 mb-1">City or Village *</label>
              <input
                id="chk-city"
                type="text"
                required
                placeholder="e.g. Yerevan, Gyumri, Dilijan"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.city && <p className="text-xs text-rose-600 mt-1">{fieldErrors.city[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="chk-street" className="block text-xs font-bold text-slate-700 mb-1">Street &amp; Building *</label>
              <input
                id="chk-street"
                type="text"
                required
                placeholder="e.g. 24 Mashtots Ave"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {fieldErrors.street && <p className="text-xs text-rose-600 mt-1">{fieldErrors.street[0]}</p>}
            </div>

            <div>
              <label htmlFor="chk-apt" className="block text-xs font-bold text-slate-700 mb-1">Apartment / Floor</label>
              <input
                id="chk-apt"
                type="text"
                placeholder="Apt 14"
                value={form.apartment}
                onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chk-note" className="block text-xs font-bold text-slate-700 mb-1">Delivery Note (optional)</label>
            <textarea
              id="chk-note"
              rows={2}
              placeholder="Entrance code, call before arrival, preferred hours..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
            <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong>Payment: cash on delivery</strong> — pay directly in AMD when your order arrives.
            </div>
          </div>
        </div>

        {/* Review Items per Seller & Submit */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Items per Seller</h2>

          <div className="space-y-4">
            {cart.groups.map((grp) => (
              <div key={grp.seller_id} className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-600" />
                    {grp.seller_store_name}
                  </span>
                  <span>{formatAmd(grp.subtotal_amd)}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {grp.items.map((it) => (
                    <li key={it.product_id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {it.quantity} × {it.title}
                      </span>
                      <span className="font-medium text-slate-900 shrink-0">
                        {formatAmd(it.line_total_amd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-lg font-extrabold text-slate-900">
            <span>Total</span>
            <span>{formatAmd(cart.grand_total_amd)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting || locked}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 disabled:text-slate-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Placing order...' : 'Place order (Cash on Delivery)'}
          </button>
        </div>
      </form>
    </div>
  );
}
