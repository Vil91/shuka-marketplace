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

export const STATUS_META = {
  placed: { label: 'Placed', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped: { label: 'Shipped', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  delivered: { label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export function formatAmd(amount) {
  const n = Number(amount || 0);
  return `${n.toLocaleString('en-US')} AMD`;
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, options = {}) {
  const { body, headers = {}, method = 'GET', ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = { ...headers };
  if (body && !isFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: finalHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...rest,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errObj = data?.error || {};
    throw new ApiError(
      res.status,
      errObj.code || 'REQUEST_FAILED',
      errObj.message || `Request failed (${res.status})`,
      errObj.details || null
    );
  }
  return data;
}
