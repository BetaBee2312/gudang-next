type InventoryCacheValue = { data: any[]; savedAt: number };
const inventoryCache = new Map<string, InventoryCacheValue>();
const INVENTORY_CACHE_MS = 15_000;
export function getInventoryCache<T>(key: string): T | null {
  const entry = inventoryCache.get(key);
  if (!entry || Date.now() - entry.savedAt > INVENTORY_CACHE_MS) return null;
  return entry.data as T;
}
export function setInventoryCache<T>(key: string, data: T) {
  inventoryCache.set(key, { data: data as any[], savedAt: Date.now() });
}
export function invalidateInventoryCache() {
  inventoryCache.clear();
}

export async function requestJSON<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: init.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || `Request gagal (${response.status})`);
  return data as T;
}
/**
 * Parse tanggal kalender tanpa menggeser hari akibat interpretasi UTC/local timezone.
 * Mendukung DATE (YYYY-MM-DD), DATETIME MySQL (YYYY-MM-DD HH:mm:ss),
 * dan ISO datetime (YYYY-MM-DDTHH:mm:ss...).
 */
function parseCalendarDate(value: unknown): Date | null {
  if (!value) return null;

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    // Tolak tanggal yang tidak valid seperti 2026-02-31.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function shortDate(value: unknown) {
  if (!value) return "-";
  const d = parseCalendarDate(value);
  if (!d) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

export function toDateInput(value: unknown) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const d = parseCalendarDate(value);
  if (!d) return raw.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
