import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Store, ShoppingBag, RefreshCw } from 'lucide-react';
import { api, formatAmd } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CartPage() {
  const { user, loading: authLoading, setCartCount } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function loadCart() {
    setLoading(true);
    try {
      const data = await api('/cart');
      setCart(data);
      setCartCount(data.item_count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/cart');
      return;
    }
    if (user) loadCart();
  }, [user, authLoading]);

  async function updateQty(productId, nextQty) {
    setBusyId(productId);
    setError('');
    try {
      const data = await api(`/cart/items/${productId}`, {
        method: 'PUT',
        body: { quantity: nextQty },
      });
      setCart(data);
      setCartCount(data.item_count);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(productId) {
    setBusyId(productId);
    setError('');
    try {
      const data = await api(`/cart/items/${productId}`, { method: 'DELETE' });
      setCart(data);
      setCartCount(data.item_count);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function syncPrices() {
    setError('');
    const data = await api('/cart/sync-prices', {
      method: 'POST',
      body: { removeUnavailable: true },
    });
    setCart(data);
    setCartCount(data.item_count);
  }

  if (authLoading || loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />;
  }

  const groups = cart?.groups || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Shopping Cart</h1>
        <Link to="/search" className="text-sm font-semibold text-amber-700 hover:underline">
          Continue shopping →
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {cart?.has_warnings && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Some items in your cart changed since you added them</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Review updated prices or availability before placing your order.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={syncPrices}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Accept updated prices
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-lg font-bold text-slate-900">Your cart is empty</p>
          <p className="text-sm text-slate-500">Find products from local Armenian sellers to add to your cart.</p>
          <Link
            to="/search"
            className="inline-flex px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Seller Groups */}
          <div className="lg:col-span-8 space-y-4">
            {groups.map((grp) => (
              <div key={grp.seller_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Store className="w-4 h-4 text-amber-600" />
                    {grp.seller_store_name}
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    Seller subtotal: <strong className="text-slate-900">{formatAmd(grp.subtotal_amd)}</strong>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {grp.items.map((item) => (
                    <div key={item.product_id} className="p-4 flex gap-4">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                      >
                        {item.thumb_url && (
                          <img src={item.thumb_url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </Link>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/products/${item.product_id}`}
                            className="font-semibold text-sm text-slate-900 hover:text-amber-700 line-clamp-2"
                          >
                            {item.title}
                          </Link>
                          <div className="text-sm font-extrabold text-slate-900 shrink-0">
                            {formatAmd(item.line_total_amd)}
                          </div>
                        </div>

                        <div className="text-xs text-slate-500">
                          {formatAmd(item.current_price_amd)} each
                        </div>

                        {item.price_changed && (
                          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-block">
                            Price changed: {formatAmd(item.price_when_added)} → {formatAmd(item.current_price_amd)}
                          </p>
                        )}
                        {item.out_of_stock && (
                          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md inline-block">
                            Sold out — please remove this item
                          </p>
                        )}
                        {item.exceeds_stock && (
                          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-block">
                            Only {item.stock} left in stock
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                            <button
                              type="button"
                              disabled={busyId === item.product_id || item.quantity <= 1}
                              onClick={() => updateQty(item.product_id, item.quantity - 1)}
                              className="px-2.5 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                            >
                              −
                            </button>
                            <span className="px-3 py-1 text-xs font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              disabled={busyId === item.product_id || item.quantity >= item.stock}
                              onClick={() => updateQty(item.product_id, item.quantity + 1)}
                              className="px-2.5 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={busyId === item.product_id}
                            onClick={() => removeItem(item.product_id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Box */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-24">
            <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
            <div className="space-y-2 text-sm">
              {groups.map((g) => (
                <div key={g.seller_id} className="flex justify-between text-slate-600">
                  <span className="truncate pr-2">{g.seller_store_name}</span>
                  <span className="font-semibold text-slate-900 shrink-0">{formatAmd(g.subtotal_amd)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-extrabold text-slate-900">
                <span>Grand Total</span>
                <span>{formatAmd(cart.grand_total_amd)}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              Payment: <strong>Cash on Delivery (AMD)</strong>. Each seller ships and collects payment for their items separately.
            </p>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition cursor-pointer"
            >
              Proceed to checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
