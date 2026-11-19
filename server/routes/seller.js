import express from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  AppError,
  ORDER_STATUSES,
  SELLER_TRANSITIONS,
  imageUrlsFromPath,
  nowIso,
} from '../lib/constants.js';
import { requireAuth, requireSeller } from '../middleware/auth.js';
import { uploadMiddleware, handleUploadErrors, processAndSaveImage, deleteImageFiles } from '../lib/images.js';

const router = express.Router();

const activateSellerSchema = z.object({
  store_name: z.string().trim().min(2, 'Store name must be at least 2 characters').max(80),
  phone: z.string().trim().min(6, 'Phone number is required').max(30),
});

const createProductSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140),
  category_id: z.coerce.number().int().positive('Choose a category'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000),
  price_amd: z.coerce.number().int('Price must be a whole number in AMD').positive('Price must be greater than 0').max(100000000),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(100000),
  is_published: z.boolean().optional().default(true),
});

const patchProductSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(140).optional(),
  category_id: z.coerce.number().int().positive('Choose a category').optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000).optional(),
  price_amd: z.coerce.number().int('Price must be a whole number in AMD').positive('Price must be greater than 0').max(100000000).optional(),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(100000).optional(),
  is_published: z.boolean().optional(),
});

const statusMoveSchema = z.object({
  to: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']),
});

function loadSellerProduct(db, productId, sellerId) {
  const p = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              COALESCE((
                SELECT SUM(oi.quantity)
                FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id
                WHERE oi.product_id = p.id AND so.status != 'cancelled'
              ), 0) AS units_sold
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.seller_id = ?`
    )
    .get(productId, sellerId);
  if (!p) return null;

  const images = db
    .prepare('SELECT id, file_path, position FROM product_images WHERE product_id = ? ORDER BY position ASC')
    .all(productId)
    .map((img) => ({ id: img.id, position: img.position, ...imageUrlsFromPath(img.file_path) }));

  return {
    ...p,
    is_published: Boolean(p.is_published),
    images,
    main_image_url: images[0]?.url || null,
    thumb_url: images[0]?.thumb_url || null,
  };
}

function loadSellerOrderDetail(db, sellerOrderId, sellerId) {
  const so = db
    .prepare(
      `SELECT so.id, so.order_id, so.seller_id, so.status, so.subtotal_amd, so.updated_at,
              o.recipient, o.phone, o.region, o.city, o.street, o.apartment, o.note, o.created_at,
              u.name AS buyer_name, u.email AS buyer_email
       FROM seller_orders so
       JOIN orders o ON o.id = so.order_id
       JOIN users u ON u.id = o.buyer_id
       WHERE so.id = ? AND so.seller_id = ?`
    )
    .get(sellerOrderId, sellerId);
  if (!so) return null;

  const items = db
    .prepare(
      `SELECT oi.id, oi.product_id, oi.title, oi.unit_price_amd, oi.quantity,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.position ASC LIMIT 1) AS main_image
       FROM order_items oi
       WHERE oi.seller_order_id = ?
       ORDER BY oi.id ASC`
    )
    .all(sellerOrderId)
    .map((it) => ({
      ...it,
      line_total_amd: it.unit_price_amd * it.quantity,
      ...imageUrlsFromPath(it.main_image),
    }));

  const status_history = db
    .prepare(
      `SELECT sh.id, sh.from_status, sh.to_status, sh.changed_by, sh.created_at,
              u.name AS changed_by_name
       FROM status_history sh
       JOIN users u ON u.id = sh.changed_by
       WHERE sh.seller_order_id = ?
       ORDER BY sh.created_at ASC, sh.id ASC`
    )
    .all(sellerOrderId);

  return {
    ...so,
    allowed_moves: SELLER_TRANSITIONS[so.status] || [],
    items,
    status_history,
  };
}

// POST /api/seller/activate
router.post('/seller/activate', requireAuth, (req, res, next) => {
  try {
    const parsed = activateSellerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid store info', parsed.error.flatten().fieldErrors)
      );
    }
    const { store_name, phone } = parsed.data;
    const db = getDb();

    const clash = db
      .prepare('SELECT id FROM users WHERE store_name = ? AND id != ?')
      .get(store_name, req.user.id);
    if (clash) {
      return next(new AppError(409, 'STORE_NAME_TAKEN', 'This store name is already taken'));
    }

    db.prepare('UPDATE users SET store_name = ?, phone = ? WHERE id = ?').run(store_name, phone, req.user.id);
    const updated = db
      .prepare('SELECT id, email, name, phone, store_name, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    res.json({ user: { ...updated, is_seller: true } });
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return next(new AppError(409, 'STORE_NAME_TAKEN', 'This store name is already taken'));
    }
    next(err);
  }
});

// GET /api/seller/overview (plain SQL queries as required)
router.get('/seller/overview', requireSeller, (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const statusRows = db
    .prepare(
      `SELECT status, COUNT(*) AS count
       FROM seller_orders
       WHERE seller_id = ?
       GROUP BY status`
    )
    .all(sellerId);

  const counts = { placed: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const r of statusRows) {
    counts[r.status] = r.count;
  }

  const rev30 = db
    .prepare(
      `SELECT COALESCE(SUM(subtotal_amd), 0) AS revenue_amd
       FROM seller_orders
       WHERE seller_id = ? AND status = 'delivered' AND updated_at >= ?`
    )
    .get(sellerId, thirtyDaysAgo);

  const revTotal = db
    .prepare(
      `SELECT COALESCE(SUM(subtotal_amd), 0) AS revenue_amd
       FROM seller_orders
       WHERE seller_id = ? AND status = 'delivered'`
    )
    .get(sellerId);

  const productStats = db
    .prepare(
      `SELECT COUNT(*) AS total_products,
              SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) AS published_products,
              SUM(CASE WHEN stock = 0 AND is_published = 1 THEN 1 ELSE 0 END) AS out_of_stock_products
       FROM products
       WHERE seller_id = ?`
    )
    .get(sellerId);

  res.json({
    overview: {
      store_name: req.user.store_name,
      orders_to_confirm: counts.placed,
      orders_to_ship: counts.confirmed,
      counts_by_status: counts,
      revenue_30d_amd: rev30.revenue_amd,
      revenue_total_amd: revTotal.revenue_amd,
      total_products: productStats.total_products || 0,
      published_products: productStats.published_products || 0,
      out_of_stock_products: productStats.out_of_stock_products || 0,
    },
  });
});

// GET /api/seller/products
router.get('/seller/products', requireSeller, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1) AS main_image,
              COALESCE((
                SELECT SUM(oi.quantity)
                FROM order_items oi
                JOIN seller_orders so ON so.id = oi.seller_order_id
                WHERE oi.product_id = p.id AND so.status != 'cancelled'
              ), 0) AS units_sold
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.seller_id = ?
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all(req.user.id);

  const products = rows.map((p) => {
    const { url, thumb_url } = imageUrlsFromPath(p.main_image);
    return {
      ...p,
      is_published: Boolean(p.is_published),
      main_image_url: url,
      thumb_url,
    };
  });
  res.json({ products });
});

// GET /api/seller/products/:id
router.get('/seller/products/:id', requireSeller, (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
  const db = getDb();
  const product = loadSellerProduct(db, id, req.user.id);
  if (!product) return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
  res.json({ product });
});

// POST /api/seller/products
router.post('/seller/products', requireSeller, (req, res, next) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid product data', parsed.error.flatten().fieldErrors)
      );
    }
    const { title, category_id, description, price_amd, stock, is_published } = parsed.data;
    const db = getDb();

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!cat) {
      return next(new AppError(400, 'INVALID_CATEGORY', 'Selected category does not exist', { category_id: ['Invalid category'] }));
    }

    const ts = nowIso();
    const info = db
      .prepare(
        `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, category_id, title, description, price_amd, stock, is_published ? 1 : 0, ts, ts);

    const product = loadSellerProduct(db, Number(info.lastInsertRowid), req.user.id);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/seller/products/:id
router.patch('/seller/products/:id', requireSeller, (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));

    const parsed = patchProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid product update', parsed.error.flatten().fieldErrors)
      );
    }
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND seller_id = ?').get(id, req.user.id);
    if (!existing) {
      return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
    }

    const data = parsed.data;
    if (data.category_id !== undefined) {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id);
      if (!cat) {
        return next(new AppError(400, 'INVALID_CATEGORY', 'Selected category does not exist'));
      }
    }

    const ts = nowIso();
    db.prepare(
      `UPDATE products
       SET title = ?, category_id = ?, description = ?, price_amd = ?, stock = ?, is_published = ?, updated_at = ?
       WHERE id = ? AND seller_id = ?`
    ).run(
      data.title ?? existing.title,
      data.category_id ?? existing.category_id,
      data.description ?? existing.description,
      data.price_amd ?? existing.price_amd,
      data.stock ?? existing.stock,
      data.is_published !== undefined ? (data.is_published ? 1 : 0) : existing.is_published,
      ts,
      id,
      req.user.id
    );

    const product = loadSellerProduct(db, id, req.user.id);
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// POST /api/seller/products/:id/images
router.post(
  '/seller/products/:id/images',
  requireSeller,
  uploadMiddleware.array('images', 5),
  handleUploadErrors,
  async (req, res, next) => {
    const savedPaths = [];
    try {
      const productId = Number.parseInt(req.params.id, 10);
      if (Number.isNaN(productId)) {
        return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
      }
      const db = getDb();
      const product = db
        .prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?')
        .get(productId, req.user.id);
      if (!product) {
        return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));
      }

      const files = req.files || [];
      if (files.length === 0) {
        return next(new AppError(400, 'NO_FILES', 'Please choose at least one image to upload'));
      }

      const existing = db
        .prepare('SELECT id, position FROM product_images WHERE product_id = ? ORDER BY position ASC')
        .all(productId);
      if (existing.length + files.length > 5) {
        return next(
          new AppError(
            400,
            'MAX_IMAGES_EXCEEDED',
            `A product can have at most 5 images (currently ${existing.length})`
          )
        );
      }

      // Process and resize outside SQLite transaction (keeps transactions short!)
      for (const file of files) {
        const storedPath = await processAndSaveImage(file.buffer);
        savedPaths.push(storedPath);
      }

      const maxPos = existing.length ? Math.max(...existing.map((e) => e.position)) : -1;
      const insertStmt = db.prepare(
        'INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, ?)'
      );
      const tx = db.transaction(() => {
        savedPaths.forEach((p, idx) => {
          insertStmt.run(productId, p, maxPos + 1 + idx);
        });
      });
      tx.immediate();

      const updated = loadSellerProduct(db, productId, req.user.id);
      res.status(201).json({ product: updated });
    } catch (err) {
      // Cleanup any written files on error
      await Promise.all(savedPaths.map((p) => deleteImageFiles(p)));
      next(err);
    }
  }
);

// PATCH /api/seller/products/:id/images/:imageId/main — promote image to position 0
router.patch('/seller/products/:id/images/:imageId/main', requireSeller, (req, res, next) => {
  try {
    const productId = Number.parseInt(req.params.id, 10);
    const imageId = Number.parseInt(req.params.imageId, 10);
    if (Number.isNaN(productId) || Number.isNaN(imageId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid ID'));
    }
    const db = getDb();
    const product = db
      .prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?')
      .get(productId, req.user.id);
    if (!product) return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found'));

    const images = db
      .prepare('SELECT id, position FROM product_images WHERE product_id = ? ORDER BY position ASC')
      .all(productId);
    const target = images.find((img) => img.id === imageId);
    if (!target) return next(new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found'));

    const ordered = [target, ...images.filter((img) => img.id !== imageId)];
    const tx = db.transaction(() => {
      // Temporarily offset positions to avoid UNIQUE (product_id, position) collision
      db.prepare('UPDATE product_images SET position = position + 100 WHERE product_id = ?').run(productId);
      const upd = db.prepare('UPDATE product_images SET position = ? WHERE id = ?');
      ordered.forEach((img, idx) => upd.run(idx, img.id));
    });
    tx.immediate();

    res.json({ product: loadSellerProduct(db, productId, req.user.id) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/seller/products/:id/images/:imageId  (and DELETE /api/seller/products/:id/images?imageId=...)
async function handleDeleteImage(req, res, next) {
  try {
    const productId = Number.parseInt(req.params.id, 10);
    const imageId = Number.parseInt(req.params.imageId || req.query.imageId || req.body?.imageId, 10);
    if (Number.isNaN(productId) || Number.isNaN(imageId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid product or image ID'));
    }
    const db = getDb();
    const img = db
      .prepare(
        `SELECT pi.id, pi.file_path
         FROM product_images pi
         JOIN products p ON p.id = pi.product_id
         WHERE pi.id = ? AND pi.product_id = ? AND p.seller_id = ?`
      )
      .get(imageId, productId, req.user.id);
    if (!img) {
      return next(new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found'));
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
      const rest = db
        .prepare('SELECT id FROM product_images WHERE product_id = ? ORDER BY position ASC')
        .all(productId);
      db.prepare('UPDATE product_images SET position = position + 100 WHERE product_id = ?').run(productId);
      const upd = db.prepare('UPDATE product_images SET position = ? WHERE id = ?');
      rest.forEach((r, idx) => upd.run(idx, r.id));
    });
    tx.immediate();

    await deleteImageFiles(img.file_path);
    res.json({ product: loadSellerProduct(db, productId, req.user.id) });
  } catch (err) {
    next(err);
  }
}

router.delete('/seller/products/:id/images/:imageId', requireSeller, handleDeleteImage);
router.delete('/seller/products/:id/images', requireSeller, handleDeleteImage);

// GET /api/seller/orders?status=
router.get('/seller/orders', requireSeller, (req, res, next) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  if (status && !ORDER_STATUSES.includes(status)) {
    return next(new AppError(400, 'INVALID_STATUS', 'Invalid status filter'));
  }

  const db = getDb();
  const sellerId = req.user.id;

  const countRows = db
    .prepare('SELECT status, COUNT(*) AS count FROM seller_orders WHERE seller_id = ? GROUP BY status')
    .all(sellerId);
  const counts = { all: 0, placed: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const r of countRows) {
    counts[r.status] = r.count;
    counts.all += r.count;
  }

  const where = ['so.seller_id = ?'];
  const params = [sellerId];
  if (status) {
    where.push('so.status = ?');
    params.push(status);
  }

  const orders = db
    .prepare(
      `SELECT so.id, so.order_id, so.status, so.subtotal_amd, so.updated_at,
              o.recipient, o.phone, o.region, o.city, o.created_at,
              (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.seller_order_id = so.id) AS item_count
       FROM seller_orders so
       JOIN orders o ON o.id = so.order_id
       WHERE ${where.join(' AND ')}
       ORDER BY o.created_at DESC, so.id DESC`
    )
    .all(...params)
    .map((o) => ({
      ...o,
      allowed_moves: SELLER_TRANSITIONS[o.status] || [],
    }));

  res.json({ orders, counts });
});

// GET /api/seller/orders/:id
router.get('/seller/orders/:id', requireSeller, (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return next(new AppError(400, 'INVALID_ID', 'Invalid seller order ID'));
  const db = getDb();
  const order = loadSellerOrderDetail(db, id, req.user.id);
  if (!order) {
    return next(new AppError(404, 'ORDER_NOT_FOUND', 'Order not found'));
  }
  res.json({ order });
});

// POST /api/seller/orders/:id/status
router.post('/seller/orders/:id/status', requireSeller, (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return next(new AppError(400, 'INVALID_ID', 'Invalid seller order ID'));

    const parsed = statusMoveSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'INVALID_STATUS', 'Target status must be confirmed, shipped, delivered, or cancelled'));
    }
    const targetStatus = parsed.data.to;
    const db = getDb();
    const timestamp = nowIso();

    db.exec('BEGIN IMMEDIATE');
    try {
      const so = db
        .prepare('SELECT id, status FROM seller_orders WHERE id = ? AND seller_id = ?')
        .get(id, req.user.id);
      if (!so) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      const allowed = SELLER_TRANSITIONS[so.status] || [];
      if (!allowed.includes(targetStatus)) {
        throw new AppError(
          409,
          'INVALID_TRANSITION',
          `Cannot move order from "${so.status}" to "${targetStatus}"`
        );
      }

      db.prepare('UPDATE seller_orders SET status = ?, updated_at = ? WHERE id = ?').run(
        targetStatus,
        timestamp,
        id
      );

      // If seller cancels (from placed or confirmed), restore stock in the same transaction
      if (targetStatus === 'cancelled') {
        const items = db
          .prepare('SELECT product_id, quantity FROM order_items WHERE seller_order_id = ?')
          .all(id);
        const restoreStmt = db.prepare(
          'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?'
        );
        for (const it of items) {
          restoreStmt.run(it.quantity, timestamp, it.product_id);
        }
      }

      db.prepare(
        `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(id, so.status, targetStatus, req.user.id, timestamp);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const updated = loadSellerOrderDetail(db, id, req.user.id);
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
