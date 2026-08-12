export function invoiceIdFromPath(pathname) {
  const match = /^\/invoice\/(\d+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}

export function v2InvoiceIdFromPath(pathname) {
  const match = /^\/v2\/invoice\/(\d+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}

export function invoicePath(invoiceId) {
  return `/invoice/${invoiceId}`;
}

export function v2InvoicePath(invoiceId) {
  return `/v2/invoice/${invoiceId}`;
}

export function uniqueInvoiceIds(events) {
  return [...new Set(events.map((event) => event.args.invoiceId.toString()))];
}

export function deriveV2InvoiceStatus(statusNum, dueDateSec, currentSec = Math.floor(Date.now() / 1000)) {
  const num = Number(statusNum);
  if (num === 1) return "Paid";
  if (num === 2) return "Cancelled";
  if (num === 0 && dueDateSec && currentSec > Number(dueDateSec)) return "Overdue";
  return "Open";
}

export function textToReferenceHash(text) {
  if (!text || typeof text !== "string") return "0x0000000000000000000000000000000000000000000000000000000000000000";
  return keccak256(toUtf8Bytes(text));
}
import {keccak256, toUtf8Bytes} from "ethers";
