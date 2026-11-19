import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Store, Clock, Star, XCircle } from 'lucide-react';
import { api, formatAmd, formatDate, STATUS_META } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import OrderProgressBar from '../components/OrderProgressBar';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busySellerId, setBusySellerId] = useState(null);

  // Review modal/inline state per productId
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [reviewErr, setReviewErr] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  async function loadOrder() {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?next=/orders/${id}`);
      return;
    }
    if (user) loadOrder();
  }, [id, user, authLoading]);

  async function handleCancel(sellerOrderId) {
    setBusySellerId(sellerOrderId);
    setError('');
    try {
      const res = await api(`/orders/${order.id}/sellers/${sellerOrderId}/cancel`, {
        method: 'POST',
      });
      setOrder(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusySellerId(null);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!reviewingProduct) return;
    setReviewSaving(true);
    setReviewErr('');
    try {
      await api(`/products/${reviewingProduct.product_id}/reviews`, {
        method: 'POST',
        body: { rating, body },
      });
      setReviewingProduct(null);
      setBody('');
      setRating(5);
      await loadOrder();
    } catch (err) {
      setReviewErr(err.message);
    } finally {
      setReviewSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse" />;
  }

  if (error && !order) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
        <p className="text-lg font-bold text-slate-900">{error}</p>
        <Link to="/orders" className="text-sm font-semibold text-amber-700 hover:underline">
          Back to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {justPlaced && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-extrabold text-emerald-950">
              Order #{order.id} placed successfully!
            </h2>
            <p className="text-sm text-emerald-800 mt-0.5">
              Payment is Cash on Delivery ({formatAmd(order.total_amd)}). Each seller has received their part of your order.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Link to="/orders" className="text-xs font-semibold text-amber-700 hover:underline">
            ← Back to My Orders
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Order #{order.id}</h1>
          <p className="text-xs text-slate-500">Placed on {formatDate(order.created_at)}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-500 uppercase font-semibold">Order Total (COD)</div>
          <div className="text-2xl font-black text-slate-900">{formatAmd(order.total_amd)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Delivery Address Snapshot */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm space-y-0.5">
          <p className="font-bold text-slate-900">Delivery Address</p>
          <p className="text-slate-700">
            <strong>{order.recipient}</strong> · {order.phone}
          </p>
          <p className="text-slate-600">
            {order.street}
            {order.apartment ? `, ${order.apartment}` : ''}, {order.city}, {order.region}
          </p>
          {order.note && <p className="text-xs text-slate-500 italic">Note: {order.note}</p>}
        </div>
      </div>

      {/* Review Drawer */}
      {reviewingProduct && (
        <form
          onSubmit={submitReview}
          className="bg-amber-50/70 rounded-2xl border-2 border-amber-400 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Write a review for: {reviewingProduct.title}
            </h3>
            <button
              type="button"
              onClick={() => setReviewingProduct(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-0.5 cursor-pointer"
              >
                <Star
                  className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                />
              </button>
            ))}
            <span className="ml-2 text-xs font-bold text-slate-700">{rating} / 5 stars</span>
          </div>
          <textarea
            rows={3}
            required
            minLength={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How was the product quality and delivery?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {reviewErr && <p className="text-xs font-semibold text-rose-600">{reviewErr}</p>}
          <button
            type="submit"
            disabled={reviewSaving}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer"
          >
            {reviewSaving ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}

      {/* Per-seller sub-orders */}
      <div className="space-y-4">
        {order.seller_orders.map((so) => {
          const meta = STATUS_META[so.status] || STATUS_META.placed;
          return (
            <div key={so.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-sm text-slate-900">{so.seller_store_name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-slate-900">{formatAmd(so.subtotal_amd)}</span>
                  {so.can_cancel && (
                    <button
                      type="button"
                      disabled={busySellerId === so.id}
                      onClick={() => handleCancel(so.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {busySellerId === so.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Lifecycle Progress */}
              <div className="px-5 py-3.5 border-b border-slate-100 bg-white">
                <OrderProgressBar status={so.status} />
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-100">
                {so.items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                      >
                        {item.thumb_url && (
                          <img src={item.thumb_url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={`/products/${item.product_id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-amber-700 line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {item.quantity} × {formatAmd(item.unit_price_amd)} ={' '}
                          <strong className="text-slate-800">{formatAmd(item.line_total_amd)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.can_review && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingProduct(item);
                            setRating(5);
                            setBody('');
                            setReviewErr('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Write a review
                        </button>
                      )}
                      {item.already_reviewed && (
                        <span className="text-xs font-semibold text-emerald-700">✓ Reviewed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status History */}
              <div className="bg-slate-50/70 px-5 py-3.5 border-t border-slate-100 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Status History
                </div>
                <ol className="space-y-1 text-xs text-slate-600">
                  {so.status_history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <span>
                        {h.from_status ? `${h.from_status} → ` : ''}
                        <strong className="text-slate-900 capitalize">{h.to_status}</strong>
                        <span className="text-slate-400"> by {h.changed_by_name}</span>
                      </span>
                      <span className="text-slate-400 shrink-0">{formatDate(h.created_at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
