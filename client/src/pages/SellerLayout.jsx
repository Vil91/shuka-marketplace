import { Link, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Plus, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SellerLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />;
  }
  if (!user) {
    return <Navigate to="/login?next=/seller" replace />;
  }
  if (!user.is_seller) {
    return <Navigate to="/seller/activate" replace />;
  }

  const tabCls = ({ isActive }) =>
    `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
      isActive
        ? 'bg-slate-900 text-white shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Seller Dashboard</div>
            <h1 className="text-lg font-extrabold text-slate-900">{user.store_name}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/seller" end className={tabCls}>
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </NavLink>
          <NavLink to="/seller/products" className={tabCls}>
            <Package className="w-4 h-4" />
            Products
          </NavLink>
          <NavLink to="/seller/orders" className={tabCls}>
            <ClipboardList className="w-4 h-4" />
            Orders
          </NavLink>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add product
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
