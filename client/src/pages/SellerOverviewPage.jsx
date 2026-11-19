import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Truck, Banknote, Package } from 'lucide-react';
import { api, formatAmd, STATUS_META } from '../lib/api';
import SellerLayout from './SellerLayout';

export default function SellerOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/seller/overview')
      .then((d) => setOverview(d.overview))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SellerLayout>
      {loading || !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/seller/orders?status=placed"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-400 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">To Confirm</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview.orders_to_confirm}</div>
              <p className="text-xs text-slate-500">New incoming orders</p>
            </Link>

            <Link
              to="/seller/orders?status=confirmed"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-400 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">To Ship</span>
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview.orders_to_ship}</div>
              <p className="text-xs text-slate-500">Confirmed, ready for dispatch</p>
            </Link>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">30-Day Revenue</span>
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{formatAmd(overview.revenue_30d_amd)}</div>
              <p className="text-xs text-slate-500">Delivered orders (last 30 days)</p>
            </div>

            <Link
              to="/seller/products"
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-400 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products</span>
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{overview.published_products}</div>
              <p className="text-xs text-slate-500">
                {overview.total_products} total · {overview.out_of_stock_products} out of stock
              </p>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900">Orders by Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(overview.counts_by_status).map(([st, cnt]) => {
                const meta = STATUS_META[st] || STATUS_META.placed;
                return (
                  <Link
                    key={st}
                    to={`/seller/orders?status=${st}`}
                    className="rounded-xl border border-slate-200 p-3.5 hover:border-amber-400 transition text-center space-y-1"
                  >
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-bold ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <div className="text-2xl font-extrabold text-slate-900">{cnt}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
