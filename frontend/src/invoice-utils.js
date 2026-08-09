export function invoiceIdFromPath(pathname) {
  const match = /^\/invoice\/(\d+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}

export function invoicePath(invoiceId) {
  return `/invoice/${invoiceId}`;
}

export function uniqueInvoiceIds(events) {
  return [...new Set(events.map((event) => event.args.invoiceId.toString()))];
}
