import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

// Use isolated temp DATA_DIR so break-it tests never pollute the main dev database
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shuka-breakit-'));
process.env.DATA_DIR = tmpDir;
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const { createApp } = await import('../server/index.js');
const { getDb, closeDb } = await import('../server/db.js');

const app = await createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, () => resolve(s));
});
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}/api`;

// Cookie-aware fetch client per simulated user
class SessionClient {
  constructor() {
    this.cookie = '';
  }

  async req(endpoint, { method = 'GET', body, headers = {} } = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const h = { ...headers };
    if (this.cookie) h.Cookie = this.cookie;
    if (body && !isFormData && !h['Content-Type']) {
      h['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${BASE}${endpoint}`, {
      method,
      headers: h,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const m = setCookie.match(/shuka_session=[^;]+/);
      if (m) this.cookie = m[0];
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  }
}

const results = [];
async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.error(`  FAIL  ${name}\n        -> ${err.message}`);
  }
}

async function makePngBuffer(r = 220, g = 120, b = 40) {
  return sharp({
    create: { width: 120, height: 120, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
}

const defaultAddress = {
  recipient: 'Test Buyer',
  phone: '+374 91 555000',
  region: 'Yerevan',
  city: 'Yerevan',
  street: '10 Northern Ave',
  apartment: 'Apt 5',
  note: 'Ring bell',
};

console.log(`\nRunning Shuka Break-It & Teacher Demo Suite on port ${port}...\n`);

// Helper to create seller + product quickly
async function createSellerAndProduct(tag, stock = 10, price = 15000) {
  const seller = new SessionClient();
  const reg = await seller.req('/auth/register', {
    method: 'POST',
    body: {
      email: `seller-${tag}@test.am`,
      password: 'password123',
      name: `Seller ${tag}`,
      phone: '+374 91 100200',
    },
  });
  assert.equal(reg.status, 201);
  const act = await seller.req('/seller/activate', {
    method: 'POST',
    body: { store_name: `Store ${tag}`, phone: '+374 91 100200' },
  });
  assert.equal(act.status, 200);
  const prod = await seller.req('/seller/products', {
    method: 'POST',
    body: {
      title: `Product ${tag}`,
      category_id: 1,
      description: 'High quality test product for Shuka verification suite.',
      price_amd: price,
      stock,
    },
  });
  assert.equal(prod.status, 201);
  return { seller, product: prod.json.product };
}

async function createBuyer(tag) {
  const buyer = new SessionClient();
  const reg = await buyer.req('/auth/register', {
    method: 'POST',
    body: {
      email: `buyer-${tag}@test.am`,
      password: 'password123',
      name: `Buyer ${tag}`,
      phone: '+374 94 300400',
    },
  });
  assert.equal(reg.status, 201);
  return buyer;
}

// 1. Last units: 30 concurrent checkouts on stock 3 -> 3 succeed, 27 x 409, stock 0, zero SQLITE_BUSY
await runTest('1. Last units (30 concurrent checkouts on stock 3)', async () => {
  const { product } = await createSellerAndProduct('race', 3, 12000);
  const buyers = await Promise.all(
    Array.from({ length: 30 }, (_, i) => createBuyer(`race-${i}`))
  );

  // All 30 add 1 unit to their cart first
  for (const b of buyers) {
    const add = await b.req(`/cart/items/${product.id}`, {
      method: 'PUT',
      body: { quantity: 1 },
    });
    assert.equal(add.status, 200);
  }

  // Fire all 30 checkouts at the exact same time
  const responses = await Promise.all(
    buyers.map((b, i) =>
      b.req('/orders', {
        method: 'POST',
        body: { ...defaultAddress, request_key: `race-key-${i}-${crypto.randomUUID()}` },
      })
    )
  );

  const succeeded = responses.filter((r) => r.status === 201);
  const conflicts = responses.filter((r) => r.status === 409);
  const serverErrors = responses.filter((r) => r.status >= 500);

  assert.equal(serverErrors.length, 0, `Got ${serverErrors.length} 5xx errors`);
  assert.equal(succeeded.length, 3, `Expected 3 orders, got ${succeeded.length}`);
  assert.equal(conflicts.length, 27, `Expected 27 conflicts (409), got ${conflicts.length}`);

  const check = await buyers[0].req(`/products/${product.id}`);
  assert.equal(check.json.product.stock, 0, 'Final stock must be 0');
});

// 2. Double click: same request_key sent twice -> exactly one order
await runTest('2. Double click (idempotent request_key)', async () => {
  const { product } = await createSellerAndProduct('dbl', 5, 20000);
  const buyer = await createBuyer('dbl');
  await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 1 } });

  const key = `idemp-${crypto.randomUUID()}`;
  const r1 = await buyer.req('/orders', { method: 'POST', body: { ...defaultAddress, request_key: key } });
  const r2 = await buyer.req('/orders', { method: 'POST', body: { ...defaultAddress, request_key: key } });

  assert.equal(r1.status, 201);
  assert.equal(r2.status, 200);
  assert.equal(r1.json.order.id, r2.json.order.id, 'Must return the exact same order');

  const ordersRes = await buyer.req('/orders');
  assert.equal(ordersRes.json.orders.length, 1, 'Only 1 order should exist for this buyer');
});

// 3. Price changed: buyer adds item, seller raises price, buyer checks out -> 409 with new price
await runTest('3. Price changed between cart and checkout', async () => {
  const { seller, product } = await createSellerAndProduct('price', 5, 10000);
  const buyer = await createBuyer('price');

  const add = await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 1 } });
  assert.equal(add.status, 200);

  const patch = await seller.req(`/seller/products/${product.id}`, {
    method: 'PATCH',
    body: { price_amd: 18500 },
  });
  assert.equal(patch.status, 200);

  const checkout = await buyer.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  assert.equal(checkout.status, 409);
  assert.equal(checkout.json.error.code, 'PRICE_CHANGED');
  assert.equal(checkout.json.error.details.changed_items[0].new_price_amd, 18500);
});

// 4. Old order after edit: seller edits title & price -> old order keeps old title & price
await runTest('4. Old order unchanged after product title & price edit', async () => {
  const { seller, product } = await createSellerAndProduct('snap', 5, 25000);
  const buyer = await createBuyer('snap');
  await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 1 } });

  const ord = await buyer.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  assert.equal(ord.status, 201);
  const orderId = ord.json.order.id;

  await seller.req(`/seller/products/${product.id}`, {
    method: 'PATCH',
    body: { title: 'Edited New Title', price_amd: 99000 },
  });

  const detail = await buyer.req(`/orders/${orderId}`);
  const item = detail.json.order.seller_orders[0].items[0];
  assert.equal(item.title, 'Product snap');
  assert.equal(item.unit_price_amd, 25000);
});

// 5. Someone else's order: Seller A opens Seller B's order; Buyer A opens Buyer B's order -> 403/404
await runTest("5. Someone else's order blocked (buyer & seller isolation)", async () => {
  const { seller: sellerA, product: prodA } = await createSellerAndProduct('isoA', 5, 10000);
  const { seller: sellerB } = await createSellerAndProduct('isoB', 5, 10000);
  const buyerA = await createBuyer('isoA');
  const buyerB = await createBuyer('isoB');

  await buyerA.req(`/cart/items/${prodA.id}`, { method: 'PUT', body: { quantity: 1 } });
  const ord = await buyerA.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  const orderId = ord.json.order.id;
  const sellerOrderId = ord.json.order.seller_orders[0].id;

  const sRead = await sellerB.req(`/seller/orders/${sellerOrderId}`);
  assert.ok([403, 404].includes(sRead.status), `Seller B got ${sRead.status}`);
  assert.equal(sRead.json.order, undefined);

  const bRead = await buyerB.req(`/orders/${orderId}`);
  assert.ok([403, 404].includes(bRead.status), `Buyer B got ${bRead.status}`);
  assert.equal(bRead.json.order, undefined);

  // Confirm sellerA CAN read it
  const ownRead = await sellerA.req(`/seller/orders/${sellerOrderId}`);
  assert.equal(ownRead.status, 200);
});

// 6. Move not allowed: placed -> delivered (409); buyer cancels shipped order (409)
await runTest('6. Disallowed status moves return 409 and change nothing', async () => {
  const { seller, product } = await createSellerAndProduct('state', 5, 15000);
  const buyer = await createBuyer('state');
  await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 1 } });
  const ord = await buyer.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  const orderId = ord.json.order.id;
  const soId = ord.json.order.seller_orders[0].id;

  // Illegal jump placed -> delivered
  const badJump = await seller.req(`/seller/orders/${soId}/status`, {
    method: 'POST',
    body: { to: 'delivered' },
  });
  assert.equal(badJump.status, 409);

  // Valid moves: placed -> confirmed -> shipped
  assert.equal((await seller.req(`/seller/orders/${soId}/status`, { method: 'POST', body: { to: 'confirmed' } })).status, 200);
  assert.equal((await seller.req(`/seller/orders/${soId}/status`, { method: 'POST', body: { to: 'shipped' } })).status, 200);

  // Buyer tries to cancel shipped order -> 409
  const badCancel = await buyer.req(`/orders/${orderId}/sellers/${soId}/cancel`, { method: 'POST' });
  assert.equal(badCancel.status, 409);

  // Verify status is still shipped
  const check = await seller.req(`/seller/orders/${soId}`);
  assert.equal(check.json.order.status, 'shipped');
});

// 7. Cancel returns stock: buyer cancels placed order -> stock restored
await runTest('7. Buyer cancel returns stock atomically', async () => {
  const { product } = await createSellerAndProduct('cancel', 6, 11000);
  const buyer = await createBuyer('cancel');
  await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 4 } });
  const ord = await buyer.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  assert.equal(ord.status, 201);

  const afterPlace = await buyer.req(`/products/${product.id}`);
  assert.equal(afterPlace.json.product.stock, 2);

  const soId = ord.json.order.seller_orders[0].id;
  const cancel = await buyer.req(`/orders/${ord.json.order.id}/sellers/${soId}/cancel`, { method: 'POST' });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.json.order.seller_orders[0].status, 'cancelled');

  const afterCancel = await buyer.req(`/products/${product.id}`);
  assert.equal(afterCancel.json.product.stock, 6, 'Stock should be restored to 6');
});

// 8. Foreign keys: insert order_items with non-existent product_id -> rejected by SQLite
await runTest('8. SQLite PRAGMA foreign_keys rejects bogus product_id', async () => {
  const db = getDb();
  const anySo = db.prepare('SELECT id FROM seller_orders LIMIT 1').get();
  assert.ok(anySo, 'Need at least one seller_order');
  let threw = false;
  try {
    db.prepare(
      'INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, ?, ?, ?, ?)'
    ).run(anySo.id, 99999999, 'Ghost item', 5000, 1);
  } catch (err) {
    threw = err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY';
  }
  assert.ok(threw, 'Expected SQLITE_CONSTRAINT_FOREIGNKEY error');
});

// 9. Bad upload: 30 MB file AND renamed .exe both rejected with clear message
await runTest('9. Bad uploads (30 MB file & renamed .exe) rejected cleanly', async () => {
  const { seller, product } = await createSellerAndProduct('upload', 3, 9000);

  // 9a: 30 MB file
  const bigBuf = Buffer.alloc(30 * 1024 * 1024, 0x41);
  const fdBig = new FormData();
  fdBig.append('images', new Blob([bigBuf], { type: 'image/jpeg' }), 'huge.jpg');
  const rBig = await seller.req(`/seller/products/${product.id}/images`, { method: 'POST', body: fdBig });
  assert.equal(rBig.status, 400);
  assert.equal(rBig.json.error.code, 'FILE_TOO_LARGE');

  // 9b: Renamed Windows PE .exe ("MZ...") disguised as photo.jpg
  const exeBuf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This program cannot be run in DOS mode.', 'binary');
  const fdExe = new FormData();
  fdExe.append('images', new Blob([exeBuf], { type: 'image/jpeg' }), 'renamed-exe.jpg');
  const rExe = await seller.req(`/seller/products/${product.id}/images`, { method: 'POST', body: fdExe });
  assert.equal(rExe.status, 400);
  assert.ok(['INVALID_IMAGE', 'INVALID_IMAGE_TYPE'].includes(rExe.json.error.code));
});

// 10. Full Teacher Demo Flow (end-to-end with 3 real photos, multi-seller cart, delivery, review)
await runTest('10. Full Teacher Demo E2E flow (3 photos, multi-seller, delivery, review)', async () => {
  const { seller, product } = await createSellerAndProduct('demo', 4, 33000);

  // Upload 3 valid PNG photos
  const fd = new FormData();
  fd.append('images', new Blob([await makePngBuffer(240, 120, 40)], { type: 'image/png' }), 'p1.png');
  fd.append('images', new Blob([await makePngBuffer(40, 160, 220)], { type: 'image/png' }), 'p2.png');
  fd.append('images', new Blob([await makePngBuffer(60, 200, 110)], { type: 'image/png' }), 'p3.png');
  const up = await seller.req(`/seller/products/${product.id}/images`, { method: 'POST', body: fd });
  assert.equal(up.status, 201);
  assert.equal(up.json.product.images.length, 3);

  // Buyer finds via keyword search & category
  const buyer = await createBuyer('demo');
  const searchRes = await buyer.req('/products?q=Product%20demo&category=electronics');
  assert.ok(searchRes.json.products.some((p) => p.id === product.id));

  // Add seller's product + another seeded seller's product (product id 1)
  assert.equal((await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 2 } })).status, 200);
  assert.equal((await buyer.req('/cart/items/1', { method: 'PUT', body: { quantity: 1 } })).status, 200);

  // Exceeding stock must fail with 409
  const tooMany = await buyer.req(`/cart/items/${product.id}`, { method: 'PUT', body: { quantity: 99 } });
  assert.equal(tooMany.status, 409);

  // Place COD order -> splits across 2 sellers
  const orderRes = await buyer.req('/orders', {
    method: 'POST',
    body: { ...defaultAddress, request_key: crypto.randomUUID() },
  });
  assert.equal(orderRes.status, 201);
  assert.equal(orderRes.json.order.seller_orders.length, 2);

  const mySo = orderRes.json.order.seller_orders.find((s) => s.items.some((i) => i.product_id === product.id));
  assert.ok(mySo);

  // Seller moves placed -> confirmed -> shipped -> delivered
  for (const nextStatus of ['confirmed', 'shipped', 'delivered']) {
    const mv = await seller.req(`/seller/orders/${mySo.id}/status`, {
      method: 'POST',
      body: { to: nextStatus },
    });
    assert.equal(mv.status, 200);
  }

  // Buyer checks status history (4 entries) and submits a 5-star review
  const bOrd = await buyer.req(`/orders/${orderRes.json.order.id}`);
  const bSo = bOrd.json.order.seller_orders.find((s) => s.id === mySo.id);
  assert.equal(bSo.status_history.length, 4);

  const rev = await buyer.req(`/products/${product.id}/reviews`, {
    method: 'POST',
    body: { rating: 5, body: 'Delivered fast in Yerevan, works great!' },
  });
  assert.equal(rev.status, 201);
  assert.equal(rev.json.rating_avg, 5);
  assert.equal(rev.json.rating_count, 1);

  // Seller overview shows updated revenue (2 * 33000 = 66000 AMD) and stock is now 2
  const ov = await seller.req('/seller/overview');
  assert.equal(ov.json.overview.revenue_30d_amd, 66000);
  const pFinal = await buyer.req(`/products/${product.id}`);
  assert.equal(pFinal.json.product.stock, 2);
});

const passed = results.filter((r) => r.pass).length;
console.log(`\nSummary: ${passed}/${results.length} tests passed.\n`);

server.close();
closeDb();
await fs.rm(tmpDir, { recursive: true, force: true });

if (passed !== results.length) {
  process.exit(1);
}
