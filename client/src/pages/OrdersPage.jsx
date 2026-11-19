import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { api, formatAmd, formatDate, STATUS_META } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/orders');
      return;
    }
    if (user) {
      api('/orders')
        .then((d) => setOrders(d.orders || []))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">My Orders</h1>
        <Link to="/search" className="text-sm font-semibold text-amber-700 hover:underline">
          Shop more →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-lg font-bold text-slate-900">No orders yet</p>
          <p className="text-sm text-slate-500">Your placed orders and delivery updates will appear here.</p>
          <Link
            to="/search"
            className="inline-flex px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
          >
            Explore products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((ord) => (
            <Link
              key={ord.id}
              to={`/orders/${ord.id}`}
              className="block bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-sm p-4 sm:p-5 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-base font-extrabold text-slate-900">Order #{ord.id}</span>
                  <span className="ml-2.5 text-xs text-slate-500">{formatDate(ord.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900">{formatAmd(ord.total_amd)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="pt-3 flex flex-wrap gap-2">
                {ord.seller_orders.map((so) => {
                  const meta = STATUS_META[so.status] || STATUS_META.placed;
                  return (
                    <div
                      key={so.id}
                      className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="font-semibold text-slate-800">{so.seller_store_name}</span>
                      <span className="text-slate-400">({so.item_count} item{so.item_count === 1 ? '' : 's'})</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
