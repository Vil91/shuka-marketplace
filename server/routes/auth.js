import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db.js';
import { AppError, nowIso } from '../lib/constants.js';
import { setSessionCookie, clearSessionCookie, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(180),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().min(6, 'Enter a valid phone number').max(30),
});

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().min(6, 'Enter a valid phone number').max(30),
});

function formatUser(db, user) {
  if (!user) return null;
  const lastOrder = db
    .prepare(
      `SELECT recipient, phone, region, city, street, apartment, note
       FROM orders WHERE buyer_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get(user.id);
  const cartRow = db
    .prepare('SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE user_id = ?')
    .get(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    store_name: user.store_name,
    is_seller: Boolean(user.store_name),
    created_at: user.created_at,
    cart_count: cartRow.count,
    last_address: lastOrder || null,
  };
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input', parsed.error.flatten().fieldErrors)
      );
    }
    const { email, password, name, phone } = parsed.data;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return next(new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = nowIso();
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, phone, store_name, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`
      )
      .run(email.toLowerCase(), passwordHash, name, phone, createdAt);

    const user = db
      .prepare('SELECT id, email, name, phone, store_name, created_at FROM users WHERE id = ?')
      .get(info.lastInsertRowid);

    setSessionCookie(res, user.id);
    res.status(201).json({ user: formatUser(db, user) });
  } catch (err) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return next(new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists'));
    }
    next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid credentials'));
    }
    const { email, password } = parsed.data;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }
    setSessionCookie(res, user.id);
    res.json({ user: formatUser(db, user) });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/auth/session', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const db = getDb();
  res.json({ user: formatUser(db, req.user) });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  res.json({ user: formatUser(db, req.user) });
});

router.patch('/me', requireAuth, (req, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid input', parsed.error.flatten().fieldErrors)
      );
    }
    const { name, phone } = parsed.data;
    const db = getDb();
    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, req.user.id);
    const updated = db
      .prepare('SELECT id, email, name, phone, store_name, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    res.json({ user: formatUser(db, updated) });
  } catch (err) {
    next(err);
  }
});

export default router;
