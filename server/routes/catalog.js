import express from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { AppError, imageUrlsFromPath, nowIso } from '../lib/constants.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
  body: z.string().trim().min(3, 'Please write a short review (at least 3 characters)').max(2000),
});

function attachPrimaryImages(db, products) {
  if (!products.length) return [];
  const ids = products.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');
  const imgs = db
    .prepare(
      `SELECT product_id, file_path, position
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY position ASC`
    )
    .all(...ids);

  const byProduct = new Map();
  for (const img of imgs) {
    if (!byProduct.has(img.product_id)) {
      byProduct.set(img.product_id, img.file_path);
    }
  }
  return products.map((p) => {
    const mainPath = byProduct.get(p.id) || null;
    const { url, thumb_url } = imageUrlsFromPath(mainPath);
    return {
      ...p,
      is_published: Boolean(p.is_published),
      main_image_url: url,
      thumb_url,
    };
  });
}

router.get('/categories', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.slug,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_published = 1) AS product_count,
              (SELECT pi.file_path
               FROM products p
               JOIN product_images pi ON pi.product_id = p.id
               WHERE p.category_id = c.id AND p.is_published = 1
               ORDER BY p.rating_avg DESC, p.id ASC, pi.position ASC
               LIMIT 1) AS sample_image
       FROM categories c
       ORDER BY c.id ASC`
    )
    .all();
  const categories = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    product_count: c.product_count,
    sample_thumb_url: imageUrlsFromPath(c.sample_image).thumb_url,
  }));
  res.json({ categories });
});

router.get('/products', (req, res, next) => {
  try {
    const db = getDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const minPriceRaw = req.query.minPrice;
    const maxPriceRaw = req.query.maxPrice;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(String(req.query.limit || '16'), 10) || 16));
    const offset = (page - 1) * limit;

    const where = ['p.is_published = 1'];
    const params = [];

    if (q) {
      where.push('(p.title LIKE ? OR p.description LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like);
    }

    if (category) {
      if (/^\d+$/.test(category)) {
        where.push('p.category_id = ?');
        params.push(Number.parseInt(category, 10));
      } else {
        where.push('c.slug = ?');
        params.push(category);
      }
    }

    if (minPriceRaw !== undefined && String(minPriceRaw).trim() !== '') {
      const minP = Number.parseInt(String(minPriceRaw), 10);
      if (Number.isNaN(minP) || minP < 0) {
        return next(new AppError(400, 'INVALID_FILTER', 'minPrice must be a non-negative integer'));
      }
      where.push('p.price_amd >= ?');
      params.push(minP);
    }

    if (maxPriceRaw !== undefined && String(maxPriceRaw).trim() !== '') {
      const maxP = Number.parseInt(String(maxPriceRaw), 10);
      if (Number.isNaN(maxP) || maxP < 0) {
        return next(new AppError(400, 'INVALID_FILTER', 'maxPrice must be a non-negative integer'));
      }
      where.push('p.price_amd <= ?');
      params.push(maxP);
    }

    let orderBy = 'p.created_at DESC, p.id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'p.price_amd ASC, p.id DESC';
        break;
      case 'price_desc':
        orderBy = 'p.price_amd DESC, p.id DESC';
        break;
      case 'rating':
        orderBy = 'p.rating_avg DESC, p.rating_count DESC, p.id DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.created_at DESC, p.id DESC';
        break;
    }

    const whereSql = where.join(' AND ');
    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS total
         FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ${whereSql}`
      )
      .get(...params);

    const rows = db
      .prepare(
        `SELECT p.id, p.seller_id, p.category_id, p.title, p.description, p.price_amd,
                p.stock, p.is_published, p.rating_avg, p.rating_count, p.created_at, p.updated_at,
                c.name AS category_name, c.slug AS category_slug,
                u.store_name AS seller_store_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
         WHERE ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    const products = attachPrimaryImages(db, rows);
    const total = countRow.total;
    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/products/:id', (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
  }
  const db = getDb();
  const product = db
    .prepare(
      `SELECT p.id, p.seller_id, p.category_id, p.title, p.description, p.price_amd,
              p.stock, p.is_published, p.rating_avg, p.rating_count, p.created_at, p.updated_at,
              c.name AS category_name, c.slug AS category_slug,
              u.store_name AS seller_store_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
       WHERE p.id = ?`
    )
    .get(id);

  if (!product || (!product.is_published && req.user?.id !== product.seller_id)) {
    return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
  }

  const images = db
    .prepare('SELECT id, file_path, position FROM product_images WHERE product_id = ? ORDER BY position ASC')
    .all(id)
    .map((img) => ({
      id: img.id,
      position: img.position,
      ...imageUrlsFromPath(img.file_path),
    }));

  const reviews = db
    .prepare(
      `SELECT r.id, r.product_id, r.buyer_id, r.rating, r.body, r.created_at,
              u.name AS buyer_name
       FROM reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .all(id);

  let canReview = false;
  let alreadyReviewed = false;
  if (req.user) {
    const rev = db
      .prepare('SELECT id FROM reviews WHERE product_id = ? AND buyer_id = ?')
      .get(id, req.user.id);
    alreadyReviewed = Boolean(rev);
    if (!alreadyReviewed) {
      const delivered = db
        .prepare(
          `SELECT oi.id
           FROM order_items oi
           JOIN seller_orders so ON so.id = oi.seller_order_id
           JOIN orders o ON o.id = so.order_id
           WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered'
           LIMIT 1`
        )
        .get(id, req.user.id);
      canReview = Boolean(delivered);
    }
  }

  res.json({
    product: {
      ...product,
      is_published: Boolean(product.is_published),
      images,
      reviews,
      can_review: canReview,
      already_reviewed: alreadyReviewed,
    },
  });
});

router.get('/products/:id/reviews', (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
  }
  const db = getDb();
  const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!exists) {
    return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
  }
  const reviews = db
    .prepare(
      `SELECT r.id, r.product_id, r.buyer_id, r.rating, r.body, r.created_at,
              u.name AS buyer_name
       FROM reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .all(id);
  res.json({ reviews });
});

router.post('/products/:id/reviews', requireAuth, (req, res, next) => {
  try {
    const productId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(productId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
    }
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid review', parsed.error.flatten().fieldErrors)
      );
    }
    const { rating, body } = parsed.data;
    const db = getDb();

    const product = db.prepare('SELECT id, seller_id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
    }

    // Must have a DELIVERED order containing this product
    const delivered = db
      .prepare(
        `SELECT oi.id
         FROM order_items oi
         JOIN seller_orders so ON so.id = oi.seller_order_id
         JOIN orders o ON o.id = so.order_id
         WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered'
         LIMIT 1`
      )
      .get(productId, req.user.id);

    if (!delivered) {
      return next(
        new AppError(403, 'REVIEW_NOT_ALLOWED', 'You can only review products from your delivered orders')
      );
    }

    const existing = db
      .prepare('SELECT id FROM reviews WHERE product_id = ? AND buyer_id = ?')
      .get(productId, req.user.id);
    if (existing) {
      return next(new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this product'));
    }

    const createdAt = nowIso();
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO reviews (product_id, buyer_id, rating, body, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(productId, req.user.id, rating, body, createdAt);

      const stats = db
        .prepare('SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS cnt FROM reviews WHERE product_id = ?')
        .get(productId);

      db.prepare('UPDATE products SET rating_avg = ?, rating_count = ?, updated_at = ? WHERE id = ?').run(
        stats.avg_rating || 0,
        stats.cnt || 0,
        createdAt,
        productId
      );

      return {
        review: db
          .prepare(
            `SELECT r.id, r.product_id, r.buyer_id, r.rating, r.body, r.created_at, u.name AS buyer_name
             FROM reviews r JOIN users u ON u.id = r.buyer_id WHERE r.id = ?`
          )
          .get(info.lastInsertRowid),
        rating_avg: stats.avg_rating || 0,
        rating_count: stats.cnt || 0,
      };
    });

    const result = tx.immediate();
    res.status(201).json(result);
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return next(new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this product'));
    }
    next(err);
  }
});

export default router;
