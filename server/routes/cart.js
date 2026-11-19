import express from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { AppError, imageUrlsFromPath } from '../lib/constants.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const putCartSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(999),
});

export function buildCartPayload(db, userId) {
  const rows = db
    .prepare(
      `SELECT ci.product_id, ci.quantity, ci.price_when_added,
              p.title, p.price_amd AS current_price_amd, p.stock, p.is_published,
              p.seller_id, u.store_name AS seller_store_name,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1) AS main_image
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN users u ON u.id = p.seller_id
       WHERE ci.user_id = ?
       ORDER BY p.seller_id ASC, ci.product_id ASC`
    )
    .all(userId);

  const groupsMap = new Map();
  let grandTotalAmd = 0;
  let itemCount = 0;
  let hasWarnings = false;

  for (const row of rows) {
    const priceChanged = row.current_price_amd !== row.price_when_added;
    const outOfStock = row.stock <= 0 || !row.is_published;
    const exceedsStock = !outOfStock && row.quantity > row.stock;
    if (priceChanged || outOfStock || exceedsStock) {
      hasWarnings = true;
    }

    const lineTotal = row.current_price_amd * row.quantity;
    grandTotalAmd += lineTotal;
    itemCount += row.quantity;

    const { url, thumb_url } = imageUrlsFromPath(row.main_image);
    const item = {
      product_id: row.product_id,
      title: row.title,
      quantity: row.quantity,
      price_when_added: row.price_when_added,
      current_price_amd: row.current_price_amd,
      line_total_amd: lineTotal,
      stock: row.stock,
      is_published: Boolean(row.is_published),
      price_changed: priceChanged,
      out_of_stock: outOfStock,
      exceeds_stock: exceedsStock,
      image_url: url,
      thumb_url,
    };

    if (!groupsMap.has(row.seller_id)) {
      groupsMap.set(row.seller_id, {
        seller_id: row.seller_id,
        seller_store_name: row.seller_store_name,
        subtotal_amd: 0,
        items: [],
      });
    }
    const group = groupsMap.get(row.seller_id);
    group.items.push(item);
    group.subtotal_amd += lineTotal;
  }

  return {
    groups: Array.from(groupsMap.values()),
    grand_total_amd: grandTotalAmd,
    item_count: itemCount,
    has_warnings: hasWarnings,
  };
}

router.get('/cart', requireAuth, (req, res) => {
  const db = getDb();
  res.json(buildCartPayload(db, req.user.id));
});

router.put('/cart/items/:productId', requireAuth, (req, res, next) => {
  try {
    const productId = Number.parseInt(req.params.productId, 10);
    if (Number.isNaN(productId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
    }
    const parsed = putCartSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid quantity'));
    }
    const { quantity } = parsed.data;
    const db = getDb();

    const product = db
      .prepare('SELECT id, seller_id, title, price_amd, stock, is_published FROM products WHERE id = ?')
      .get(productId);

    if (!product || !product.is_published) {
      return next(new AppError(404, 'PRODUCT_NOT_FOUND', 'Product is unavailable'));
    }
    if (product.seller_id === req.user.id) {
      return next(new AppError(403, 'OWN_PRODUCT', 'You cannot add your own product to the cart'));
    }
    if (product.stock <= 0) {
      return next(new AppError(409, 'OUT_OF_STOCK', `"${product.title}" is out of stock`));
    }
    if (quantity > product.stock) {
      return next(
        new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Only ${product.stock} left in stock for "${product.title}"`,
          { available_stock: product.stock }
        )
      );
    }

    const existing = db
      .prepare('SELECT price_when_added FROM cart_items WHERE user_id = ? AND product_id = ?')
      .get(req.user.id, productId);

    if (existing) {
      // Keep original price_when_added unless client explicitly asks to accept current price
      const priceToStore = req.body.acceptCurrentPrice ? product.price_amd : existing.price_when_added;
      db.prepare('UPDATE cart_items SET quantity = ?, price_when_added = ? WHERE user_id = ? AND product_id = ?').run(
        quantity,
        priceToStore,
        req.user.id,
        productId
      );
    } else {
      db.prepare(
        `INSERT INTO cart_items (user_id, product_id, quantity, price_when_added)
         VALUES (?, ?, ?, ?)`
      ).run(req.user.id, productId, quantity, product.price_amd);
    }

    res.json(buildCartPayload(db, req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/cart/sync-prices', requireAuth, (req, res) => {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE cart_items
       SET price_when_added = (SELECT price_amd FROM products WHERE products.id = cart_items.product_id)
       WHERE user_id = ?`
    ).run(req.user.id);
    // Remove unpublished or zero-stock items if requested
    if (req.body?.removeUnavailable) {
      db.prepare(
        `DELETE FROM cart_items
         WHERE user_id = ?
           AND product_id IN (SELECT id FROM products WHERE is_published = 0 OR stock <= 0)`
      ).run(req.user.id);
    }
  });
  tx.immediate();
  res.json(buildCartPayload(db, req.user.id));
});

router.delete('/cart/items/:productId', requireAuth, (req, res, next) => {
  const productId = Number.parseInt(req.params.productId, 10);
  if (Number.isNaN(productId)) {
    return next(new AppError(400, 'INVALID_ID', 'Invalid product ID'));
  }
  const db = getDb();
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  res.json(buildCartPayload(db, req.user.id));
});

export default router;
