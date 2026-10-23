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
export function shortDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
export function toDateInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
