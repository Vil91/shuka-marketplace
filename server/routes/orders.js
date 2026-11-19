import express from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  AppError,
  ARMENIA_REGIONS,
  BUYER_CANCELLABLE_STATUSES,
  imageUrlsFromPath,
  nowIso,
} from '../lib/constants.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const checkoutSchema = z.object({
  recipient: z.string().trim().min(2, 'Recipient name is required').max(120),
  phone: z.string().trim().min(6, 'Phone number is required').max(30),
  region: z.enum(ARMENIA_REGIONS, { errorMap: () => ({ message: 'Select Yerevan or one of the 10 marzer' }) }),
  city: z.string().trim().min(2, 'City or village is required').max(100),
  street: z.string().trim().min(2, 'Street and building are required').max(160),
  apartment: z.string().trim().max(50).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
  request_key: z.string().trim().min(8, 'Request key is required').max(128),
});

function loadBuyerOrderDetail(db, orderId, buyerId) {
  const order = db
    .prepare(
      `SELECT id, buyer_id, recipient, phone, region, city, street, apartment, note,
              total_amd, request_key, created_at
       FROM orders
       WHERE id = ? AND buyer_id = ?`
    )
    .get(orderId, buyerId);
  if (!order) return null;

  const sellerOrders = db
    .prepare(
      `SELECT so.id, so.order_id, so.seller_id, so.status, so.subtotal_amd, so.updated_at,
              u.store_name AS seller_store_name, u.phone AS seller_phone
       FROM seller_orders so
       JOIN users u ON u.id = so.seller_id
       WHERE so.order_id = ?
       ORDER BY so.id ASC`
    )
    .all(orderId);

  const itemsStmt = db.prepare(
    `SELECT oi.id, oi.seller_order_id, oi.product_id, oi.title, oi.unit_price_amd, oi.quantity,
            (SELECT file_path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.position ASC LIMIT 1) AS main_image,
            (SELECT id FROM reviews r WHERE r.product_id = oi.product_id AND r.buyer_id = ?) AS review_id
     FROM order_items oi
     WHERE oi.seller_order_id = ?
     ORDER BY oi.id ASC`
  );

  const historyStmt = db.prepare(
    `SELECT sh.id, sh.from_status, sh.to_status, sh.changed_by, sh.created_at,
            u.name AS changed_by_name
     FROM status_history sh
     JOIN users u ON u.id = sh.changed_by
     WHERE sh.seller_order_id = ?
     ORDER BY sh.created_at ASC, sh.id ASC`
  );

  const enrichedSellers = sellerOrders.map((so) => {
    const items = itemsStmt.all(buyerId, so.id).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      title: it.title,
      unit_price_amd: it.unit_price_amd,
      quantity: it.quantity,
      line_total_amd: it.unit_price_amd * it.quantity,
      ...imageUrlsFromPath(it.main_image),
      already_reviewed: Boolean(it.review_id),
      can_review: so.status === 'delivered' && !it.review_id,
    }));
    const history = historyStmt.all(so.id);
    return {
      ...so,
      can_cancel: BUYER_CANCELLABLE_STATUSES.has(so.status),
      items,
      status_history: history,
    };
  });

  return {
    ...order,
    seller_orders: enrichedSellers,
  };
}

/**
 * POST /api/orders
 * Plain SQL BEGIN IMMEDIATE transaction:
 * - Idempotency via UNIQUE request_key
 * - Server-side price-change detection against price_when_added
 * - Atomic stock decrement: UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
 * - Splits into one seller_orders row per seller + copies title/unit_price into order_items
 * - Records initial status_history row per seller order
 */
router.post('/orders', requireAuth, (req, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message || 'Please check the delivery form',
          parsed.error.flatten().fieldErrors
        )
      );
    }

    const { recipient, phone, region, city, street, apartment, note, request_key } = parsed.data;
    const db = getDb();
    const buyerId = req.user.id;
    const timestamp = nowIso();

    let createdOrderId = null;
    let wasDuplicate = false;

    // Plain SQL BEGIN IMMEDIATE transaction (prevents overselling & SQLITE_BUSY write upgrades)
    db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Idempotency check (double-click protection)
      const existingOrder = db
        .prepare('SELECT id, buyer_id FROM orders WHERE request_key = ?')
        .get(request_key);
      if (existingOrder) {
        if (existingOrder.buyer_id !== buyerId) {
          throw new AppError(409, 'DUPLICATE_REQUEST_KEY', 'This checkout request key was already used');
        }
        createdOrderId = existingOrder.id;
        wasDuplicate = true;
        db.exec('COMMIT');
      } else {
        // 2. Load buyer cart joined with live product rows
        const cartRows = db
          .prepare(
            `SELECT ci.product_id, ci.quantity, ci.price_when_added,
                    p.seller_id, p.title, p.price_amd, p.stock, p.is_published
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             WHERE ci.user_id = ?
             ORDER BY p.seller_id ASC, ci.product_id ASC`
          )
          .all(buyerId);

        if (cartRows.length === 0) {
          throw new AppError(400, 'EMPTY_CART', 'Your cart is empty');
        }

        // 3. Validate ownership, published state, and price changes BEFORE touching stock
        const changedPrices = [];
        for (const row of cartRows) {
          if (row.seller_id === buyerId) {
            throw new AppError(403, 'OWN_PRODUCT', `You cannot buy your own product "${row.title}"`);
          }
          if (!row.is_published) {
            throw new AppError(409, 'PRODUCT_UNAVAILABLE', `"${row.title}" is no longer available`);
          }
          if (row.price_amd !== row.price_when_added) {
            changedPrices.push({
              product_id: row.product_id,
              title: row.title,
              old_price_amd: row.price_when_added,
              new_price_amd: row.price_amd,
            });
          }
        }

        if (changedPrices.length > 0) {
          const summary = changedPrices
            .map((c) => `${c.title}: ${c.old_price_amd} → ${c.new_price_amd} AMD`)
            .join('; ');
          throw new AppError(
            409,
            'PRICE_CHANGED',
            `Price changed since added to cart (${summary}). Please review your cart before placing the order.`,
            { changed_items: changedPrices }
          );
        }

        // 4. Atomic stock decrement in plain SQL for every cart item
        const decrementStmt = db.prepare(
          'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?'
        );
        for (const row of cartRows) {
          const result = decrementStmt.run(row.quantity, timestamp, row.product_id, row.quantity);
          if (result.changes !== 1) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Not enough stock left for "${row.title}" (requested ${row.quantity}, available ${row.stock})`,
              { product_id: row.product_id, title: row.title, available_stock: row.stock }
            );
          }
        }

        // 5. Group by seller and compute integer AMD totals
        const bySeller = new Map();
        let grandTotal = 0;
        for (const row of cartRows) {
          const lineTotal = row.price_amd * row.quantity;
          grandTotal += lineTotal;
          if (!bySeller.has(row.seller_id)) {
            bySeller.set(row.seller_id, { subtotal: 0, items: [] });
          }
          const grp = bySeller.get(row.seller_id);
          grp.subtotal += lineTotal;
          grp.items.push(row);
        }

        // 6. Create parent order (address snapshot)
        const orderInfo = db
          .prepare(
            `INSERT INTO orders
               (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            buyerId,
            recipient,
            phone,
            region,
            city,
            street,
            apartment || '',
            note || '',
            grandTotal,
            request_key,
            timestamp
          );
        createdOrderId = Number(orderInfo.lastInsertRowid);

        // 7. Create one seller_order per seller + snapshot order_items + initial status_history
        const insertSellerOrder = db.prepare(
          `INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at)
           VALUES (?, ?, 'placed', ?, ?)`
        );
        const insertOrderItem = db.prepare(
          `INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity)
           VALUES (?, ?, ?, ?, ?)`
        );
        const insertHistory = db.prepare(
          `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
           VALUES (?, NULL, 'placed', ?, ?)`
        );

        for (const [sellerId, group] of bySeller.entries()) {
          const soInfo = insertSellerOrder.run(createdOrderId, sellerId, group.subtotal, timestamp);
          const sellerOrderId = Number(soInfo.lastInsertRowid);
          for (const item of group.items) {
            insertOrderItem.run(
              sellerOrderId,
              item.product_id,
              item.title,
              item.price_amd,
              item.quantity
            );
          }
          insertHistory.run(sellerOrderId, buyerId, timestamp);
        }

        // 8. Clear buyer's cart
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(buyerId);
        db.exec('COMMIT');
      }
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const order = loadBuyerOrderDetail(db, createdOrderId, buyerId);
    res.status(wasDuplicate ? 200 : 201).json({ order, idempotent: wasDuplicate });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', requireAuth, (req, res) => {
  const db = getDb();
  const orders = db
    .prepare(
      `SELECT id, recipient, phone, region, city, street, apartment, total_amd, created_at
       FROM orders
       WHERE buyer_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(req.user.id);

  const sellersStmt = db.prepare(
    `SELECT so.id, so.seller_id, so.status, so.subtotal_amd, so.updated_at,
            u.store_name AS seller_store_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.seller_order_id = so.id) AS item_count
     FROM seller_orders so
     JOIN users u ON u.id = so.seller_id
     WHERE so.order_id = ?
     ORDER BY so.id ASC`
  );

  const enriched = orders.map((o) => ({
    ...o,
    seller_orders: sellersStmt.all(o.id),
  }));

  res.json({ orders: enriched });
});

router.get('/orders/:id', requireAuth, (req, res, next) => {
  const orderId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(orderId)) {
    return next(new AppError(400, 'INVALID_ID', 'Invalid order ID'));
  }
  const db = getDb();
  const order = loadBuyerOrderDetail(db, orderId, req.user.id);
  if (!order) {
    return next(new AppError(404, 'ORDER_NOT_FOUND', 'Order not found'));
  }
  res.json({ order });
});

router.post('/orders/:id/sellers/:sellerOrderId/cancel', requireAuth, (req, res, next) => {
  try {
    const orderId = Number.parseInt(req.params.id, 10);
    const sellerOrderId = Number.parseInt(req.params.sellerOrderId, 10);
    if (Number.isNaN(orderId) || Number.isNaN(sellerOrderId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid order ID'));
    }

    const db = getDb();
    const timestamp = nowIso();

    db.exec('BEGIN IMMEDIATE');
    try {
      const so = db
        .prepare(
          `SELECT so.id, so.order_id, so.status, o.buyer_id
           FROM seller_orders so
           JOIN orders o ON o.id = so.order_id
           WHERE so.id = ? AND so.order_id = ? AND o.buyer_id = ?`
        )
        .get(sellerOrderId, orderId, req.user.id);

      if (!so) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      if (!BUYER_CANCELLABLE_STATUSES.has(so.status)) {
        throw new AppError(
          409,
          'CANCEL_NOT_ALLOWED',
          `Cannot cancel an order part with status "${so.status}"`
        );
      }

      db.prepare("UPDATE seller_orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(
        timestamp,
        sellerOrderId
      );

      // Restore stock in the same transaction
      const items = db
        .prepare('SELECT product_id, quantity FROM order_items WHERE seller_order_id = ?')
        .all(sellerOrderId);
      const restoreStmt = db.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?'
      );
      for (const it of items) {
        restoreStmt.run(it.quantity, timestamp, it.product_id);
      }

      db.prepare(
        `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
         VALUES (?, ?, 'cancelled', ?, ?)`
      ).run(sellerOrderId, so.status, req.user.id, timestamp);

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const order = loadBuyerOrderDetail(db, orderId, req.user.id);
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
