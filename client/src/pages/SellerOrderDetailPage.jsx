import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Banknote, Clock } from 'lucide-react';
import { api, formatAmd, formatDate, STATUS_META } from '../lib/api';
import SellerLayout from './SellerLayout';
import OrderProgressBar from '../components/OrderProgressBar';

const MOVE_BUTTON_META = {
  confirmed: { label: 'Confirm Order', cls: 'bg-blue-600 hover:bg-blue-500 text-white' },
  shipped: { label: 'Mark as Shipped', cls: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
  delivered: { label: 'Mark as Delivered', cls: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  cancelled: { label: 'Cancel Order', cls: 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-300' },
};

export default function SellerOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/seller/orders/${id}`);
      setOrder(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function moveStatus(to) {
    setMoving(true);
    setError('');
    try {
      const res = await api(`/seller/orders/${id}/status`, {
        method: 'POST',
        body: { to },
      });
      setOrder(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setMoving(false);
    }
  }

  const meta = order ? STATUS_META[order.status] || STATUS_META.placed : STATUS_META.placed;

  return (
    <SellerLayout>
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse" />
      ) : !order ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <p className="font-bold text-slate-900">{error || 'Order not found'}</p>
          <Link to="/seller/orders" className="text-sm text-amber-700 font-semibold hover:underline">
            Back to Orders
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Link to="/seller/orders" className="text-xs font-semibold text-amber-700 hover:underline">
                ← Back to Seller Orders
              </Link>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-extrabold text-slate-900">Order #{order.order_id}</h2>
                <span className={`px-3 py-0.5 rounded-full border text-xs font-bold ${meta.badge}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">Placed {formatDate(order.created_at)}</p>
            </div>

            {/* Allowed Status Transition Buttons ONLY */}
            {order.allowed_moves?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {order.allowed_moves.map((to) => {
                  const btn = MOVE_BUTTON_META[to];
                  return (
                    <button
                      key={to}
                      type="button"
                      disabled={moving}
                      onClick={() => moveStatus(to)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${btn.cls}`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Visual Lifecycle Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <OrderProgressBar status={order.status} />
          </div>

          {/* Delivery Details & Cash to Collect */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-bold text-slate-900">Buyer Delivery Details</p>
                <p className="text-slate-800">
                  <strong>{order.recipient}</strong> · <a href={`tel:${order.phone}`} className="text-amber-700 font-semibold">{order.phone}</a>
                </p>
                <p className="text-slate-700">
                  {order.street}
                  {order.apartment ? `, ${order.apartment}` : ''}, {order.city}, {order.region}
                </p>
                {order.note && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    Delivery note: {order.note}
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-4 bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex flex-col justify-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Banknote className="w-4 h-4" />
                Cash to Collect (COD)
              </div>
              <div className="text-2xl font-black text-emerald-950">{formatAmd(order.subtotal_amd)}</div>
              <p className="text-xs text-emerald-800">Collected in cash upon delivery</p>
            </div>
          </div>

          {/* Items (Snapshot prices at purchase time) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">
              Items (Prices at purchase time)
            </div>
            <div className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <div key={it.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      {it.thumb_url && <img src={it.thumb_url} alt={it.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{it.title}</p>
                      <p className="text-xs text-slate-500">
                        {it.quantity} × {formatAmd(it.unit_price_amd)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 shrink-0">
                    {formatAmd(it.line_total_amd)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Clock className="w-4 h-4" />
              Status History
            </div>
            <ol className="space-y-1.5 text-sm text-slate-700">
              {order.status_history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span>
                    {h.from_status ? `${h.from_status} → ` : ''}
                    <strong className="text-slate-900 capitalize">{h.to_status}</strong>
                    <span className="text-slate-400"> by {h.changed_by_name}</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(h.created_at)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
