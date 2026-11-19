export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res, status, code, message, details = undefined) {
  const payload = { error: { code, message } };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(status).json(payload);
}

export const ARMENIA_REGIONS = [
  'Yerevan',
  'Aragatsotn',
  'Ararat',
  'Armavir',
  'Gegharkunik',
  'Kotayk',
  'Lori',
  'Shirak',
  'Syunik',
  'Tavush',
  'Vayots Dzor',
];

export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

// Enforced server-side seller status transitions
export const SELLER_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Buyer can only cancel before the seller ships
export const BUYER_CANCELLABLE_STATUSES = new Set(['placed', 'confirmed']);

export function nowIso() {
  return new Date().toISOString();
}

export function imageUrlsFromPath(filePath) {
  if (!filePath) return { url: null, thumb_url: null };
  // file_path stored as /uploads/large/<name>.webp
  const thumb = filePath.replace('/uploads/large/', '/uploads/thumb/');
  return { url: filePath, thumb_url: thumb };
}
