import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { AppError } from '../lib/constants.js';

const COOKIE_NAME = 'shuka_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function getSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be set in production (>= 16 chars)');
  }
  // Ephemeral deterministic dev fallback only outside production
  return 'shuka-local-dev-secret-do-not-use-in-prod';
}

function signPayload(payloadB64) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
}

export function createSessionToken(userId) {
  const payload = {
    uid: userId,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.uid || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload.uid;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, userId) {
  const token = createSessionToken(userId);
  const isSecure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const uid = verifySessionToken(token);
  if (!uid) {
    req.user = null;
    return next();
  }
  const db = getDb();
  const user = db
    .prepare('SELECT id, email, name, phone, store_name, created_at FROM users WHERE id = ?')
    .get(uid);
  req.user = user || null;
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue'));
  }
  next();
}

export function requireSeller(req, _res, next) {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Please sign in to continue'));
  }
  if (!req.user.store_name) {
    return next(new AppError(403, 'SELLER_REQUIRED', 'Activate your seller account first'));
  }
  next();
}
