import { Link } from 'react-router-dom';
import { Star, Store, ArrowUpRight } from 'lucide-react';
import { formatAmd } from '../lib/api';

export function RatingStars({ rating, count, size = 'sm' }) {
  const rounded = Math.round(Number(rating || 0));
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`${cls} ${
              n <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-600 font-semibold">
        {Number(rating || 0) > 0 ? Number(rating).toFixed(1) : 'New'}
        {typeof count === 'number' && count > 0 ? (
          <span className="text-slate-400 font-normal"> ({count})</span>
        ) : null}
      </span>
    </div>
  );
}

export default function ProductCard({ product }) {
  const stockBadge =
    product.stock === 0
      ? { text: 'Out of stock', cls: 'bg-rose-600 text-white shadow-sm' }
      : product.stock <= 3
        ? { text: `Only ${product.stock} left`, cls: 'bg-amber-500 text-slate-950 shadow-sm' }
        : null;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_-8px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:border-amber-300/90 transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {product.thumb_url || product.main_image_url ? (
          <img
            src={product.thumb_url || product.main_image_url}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            No image
          </div>
        )}

        {/* Subtle bottom gradient for crisp contrast */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition" />

        {stockBadge && (
          <span
            className={`absolute top-2.5 left-2.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full tracking-tight ${stockBadge.cls}`}
          >
            {stockBadge.text}
          </span>
        )}

        <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm">
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/90">
            {product.category_name}
          </p>
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-amber-700 transition leading-snug">
            {product.title}
          </h3>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <RatingStars rating={product.rating_avg} count={product.rating_count} />
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[17px] font-extrabold text-slate-950 tracking-tight">
              {formatAmd(product.price_amd)}
            </div>
          </div>
          {product.seller_store_name && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
              <Store className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate font-medium text-slate-600">{product.seller_store_name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
