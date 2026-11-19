import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { api, formatAmd, formatDate, STATUS_META } from '../lib/api';
import SellerLayout from './SellerLayout';

const TABS = [
  { key: '', label: 'All' },
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function SellerOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, placed: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/seller/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`)
      .then((res) => {
        setOrders(res.orders || []);
        setCounts(res.counts || {});
      })
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <SellerLayout>
      <div className="space-y-4">
        {/* Status Tabs with counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const count = t.key ? counts[t.key] || 0 : counts.all || 0;
            const active = status === t.key;
            return (
              <button
                key={t.key || 'all'}
                type="button"
                onClick={() => setSearchParams(t.key ? { status: t.key } : {})}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer transition ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                    active ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 h-52 animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            No incoming orders in this status.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => {
              const meta = STATUS_META[ord.status] || STATUS_META.placed;
              return (
                <Link
                  key={ord.id}
                  to={`/seller/orders/${ord.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 sm:p-5 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-slate-900">
                          Order #{ord.order_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(ord.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>{ord.recipient}</strong> · {ord.phone} · {ord.city}, {ord.region} ·{' '}
                        {ord.item_count} item{ord.item_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatAmd(ord.subtotal_amd)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
