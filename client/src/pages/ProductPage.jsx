import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingCart,
  Store,
  CheckCircle2,
  AlertCircle,
  Star,
  Truck,
  ShieldCheck,
  Banknote,
  Minus,
  Plus,
} from 'lucide-react';
import { api, formatAmd, formatDate } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RatingStars } from '../components/ProductCard';

export default function ProductPage() {
  const { id } = useParams();
  const { user, setCartCount } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  async function loadProduct() {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/products/${id}`);
      setProduct(data.product);
      setActiveImageIdx(0);
      setQty(1);
    } catch (err) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function handleAddToCart() {
    if (!user) {
      navigate(`/login?next=/products/${id}`);
      return;
    }
    setAdding(true);
    setFeedback(null);
    try {
      const cart = await api(`/cart/items/${product.id}`, {
        method: 'PUT',
        body: { quantity: qty },
      });
      setCartCount(cart.item_count);
      setFeedback({ type: 'success', text: `Added ${qty} item${qty > 1 ? 's' : ''} to your cart.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setAdding(false);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await api(`/products/${product.id}/reviews`, {
        method: 'POST',
        body: { rating: reviewRating, body: reviewBody },
      });
      setReviewBody('');
      await loadProduct();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return <div className="bg-white rounded-3xl border border-slate-200 h-[480px] animate-pulse" />;
  }

  if (error || !product) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
        <p className="text-lg font-bold text-slate-900">{error || 'Product not found'}</p>
        <Link to="/search" className="text-sm font-bold text-amber-700 hover:underline">
          Return to catalog
        </Link>
      </div>
    );
  }

  const isOwnProduct = user && user.id === product.seller_id;
  const activeImg = product.images?.[activeImageIdx];
  const stockInfo =
    product.stock === 0
      ? { label: 'Out of stock', cls: 'text-rose-700 bg-rose-50 border-rose-200' }
      : product.stock <= 3
        ? { label: `Only ${product.stock} left`, cls: 'text-amber-800 bg-amber-50 border-amber-300' }
        : { label: 'In stock', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-slate-900 font-medium">Home</Link>
        <span>/</span>
        <Link
          to={`/search?category=${encodeURIComponent(product.category_slug)}`}
          className="hover:text-slate-900 font-medium"
        >
          {product.category_name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Amazon-grade 3-Column Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Photo Gallery */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
            {activeImg ? (
              <img
                src={activeImg.url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No product photo
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pt-1">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                    idx === activeImageIdx
                      ? 'border-amber-500 ring-2 ring-amber-200 scale-[1.02]'
                      : 'border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img.thumb_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Core Product Info */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/search?category=${encodeURIComponent(product.category_slug)}`}
              className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70"
            >
              {product.category_name}
            </Link>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${stockInfo.cls}`}>
              {stockInfo.label}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-950 leading-snug">
            {product.title}
          </h1>

          <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-slate-100">
            <a href="#reviews" className="hover:opacity-80 transition">
              <RatingStars rating={product.rating_avg} count={product.rating_count} size="md" />
            </a>
            <span className="text-slate-300">|</span>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Sold by</span>
              <strong className="text-slate-900">{product.seller_store_name}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              About this product
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Direct delivery across Yerevan &amp; all 10 Marzer</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pay Cash on Delivery (AMD) when your order arrives</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Free cancellation anytime before the seller ships</span>
            </div>
          </div>
        </div>

        {/* Column 3: Sticky Buy Box */}
        <aside className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm lg:sticky lg:top-24 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</div>
            <div className="text-3xl font-display font-black text-slate-950 tracking-tight mt-0.5">
              {formatAmd(product.price_amd)}
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${stockInfo.cls}`}>
            <span>{stockInfo.label}</span>
            {product.stock > 0 && <span className="font-normal">({product.stock} available)</span>}
          </div>

          {isOwnProduct ? (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">This is your own product listing.</p>
              <Link
                to={`/seller/products/${product.id}/edit`}
                className="block w-full text-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
              >
                Edit Product
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Quantity</span>
                <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 overflow-hidden">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={product.stock === 0 || qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-2 hover:bg-slate-200/70 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-extrabold text-slate-900">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={product.stock === 0 || qty >= product.stock}
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    className="p-2 hover:bg-slate-200/70 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={product.stock === 0 || adding}
                onClick={handleAddToCart}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 text-slate-950 font-extrabold text-sm shadow-sm transition cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                {product.stock === 0
                  ? 'Out of stock'
                  : adding
                    ? 'Adding...'
                    : 'Add to Cart'}
              </button>

              {feedback?.type === 'success' && (
                <Link
                  to="/cart"
                  className="block w-full text-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
                >
                  Go to Cart &amp; Checkout →
                </Link>
              )}

              {feedback && (
                <div
                  className={`flex items-start gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Ships from</span>
                  <span className="font-semibold text-slate-800">{product.seller_store_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="font-semibold text-slate-800">Cash on Delivery</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Reviews Section */}
      <section id="reviews" className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-display font-extrabold text-slate-900">
              Customer Reviews ({product.rating_count})
            </h2>
            <p className="text-xs text-slate-500">Only verified buyers with delivered orders can leave a review</p>
          </div>
          <RatingStars rating={product.rating_avg} count={product.rating_count} size="md" />
        </div>

        {product.can_review && (
          <form onSubmit={handleSubmitReview} className="bg-amber-50/50 rounded-2xl border border-amber-200 p-5 space-y-3">
            <p className="text-sm font-bold text-slate-900">Write a review for your delivered purchase</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewRating(n)}
                  className="p-1 cursor-pointer"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-slate-700">{reviewRating} / 5</span>
            </div>
            <textarea
              rows={3}
              required
              minLength={3}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Share your experience with this product..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {reviewError && <p className="text-xs text-rose-600 font-semibold">{reviewError}</p>}
            <button
              type="submit"
              disabled={reviewSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold cursor-pointer"
            >
              {reviewSubmitting ? 'Publishing...' : 'Submit Review'}
            </button>
          </form>
        )}

        {product.reviews?.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-6 text-center text-sm text-slate-500">
            No reviews yet. Be the first buyer to review after delivery.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {product.reviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 text-xs font-extrabold flex items-center justify-center">
                      {rev.buyer_name?.[0]?.toUpperCase() || 'B'}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{rev.buyer_name}</span>
                    <RatingStars rating={rev.rating} />
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(rev.created_at)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed pl-9">{rev.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
