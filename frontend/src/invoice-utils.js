import {keccak256, toUtf8Bytes, formatUnits} from "ethers";

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

export function exportInvoicesToCSV(invoices = []) {
  const headers = [
    "Invoice ID",
    "Version",
    "Status",
    "Token",
    "Amount",
    "Merchant",
    "Payer",
    "Due Date (UTC)",
    "Reference Hash",
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = invoices.map((inv) => {
    let formattedAmount = "";
    try {
      formattedAmount = formatUnits(inv.amount, inv.tokenDecimals || 18);
    } catch {
      formattedAmount = String(inv.amount);
    }

    const dueDateStr = inv.dueDate
      ? new Date(Number(inv.dueDate) * 1000).toISOString()
      : "N/A";

    return [
      escapeCSV(inv.id.toString()),
      escapeCSV(inv.version ? inv.version.toUpperCase() : "V1"),
      escapeCSV(inv.derivedStatus || "Open"),
      escapeCSV(inv.tokenSymbol || "TBT"),
      escapeCSV(formattedAmount),
      escapeCSV(inv.merchant),
      escapeCSV(inv.payer),
      escapeCSV(dueDateStr),
      escapeCSV(inv.referenceHash || "N/A"),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadInvoicesCSV(invoices = [], filename = "tucker-invoices.csv") {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const csvContent = exportInvoicesToCSV(invoices);
  const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
