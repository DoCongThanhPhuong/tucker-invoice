const CACHE_PREFIX = "tucker_invoice_cache_";
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes fresh

export function getCachedInvoices(account) {
  if (!account || typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${account.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed.items.map((inv) => ({
      ...inv,
      id: BigInt(inv.id),
      amount: BigInt(inv.amount),
    }));
  } catch {
    return null;
  }
}

export function saveCachedInvoices(account, invoices) {
  if (!account || !Array.isArray(invoices) || typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const serializable = invoices.map((inv) => ({
      ...inv,
      id: inv.id.toString(),
      amount: inv.amount.toString(),
    }));
    window.localStorage.setItem(
      `${CACHE_PREFIX}${account.toLowerCase()}`,
      JSON.stringify({
        timestamp: Date.now(),
        items: serializable,
      })
    );
  } catch {
    // quota exceeded or storage disabled
  }
}
