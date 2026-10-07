import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveV2InvoiceStatus,
  invoiceIdFromPath,
  invoicePath,
  textToReferenceHash,
  v2InvoiceIdFromPath,
  v2InvoicePath,
  exportInvoicesToCSV,
  getCachedInvoices,
  saveCachedInvoices,
} from "../src/invoice-utils.js";

test("parses a shared invoice path", () => {
  assert.equal(invoiceIdFromPath("/invoice/42"), "42");
  assert.equal(invoiceIdFromPath("/invoice/42/"), "42");
});

test("parses a V2 shared invoice path", () => {
  assert.equal(v2InvoiceIdFromPath("/v2/invoice/99"), "99");
  assert.equal(v2InvoiceIdFromPath("/v2/invoice/99/"), "99");
  assert.equal(v2InvoiceIdFromPath("/invoice/99"), null);
});

test("rejects paths that are not invoice links", () => {
  assert.equal(invoiceIdFromPath("/"), null);
  assert.equal(invoiceIdFromPath("/invoice/not-a-number"), null);
  assert.equal(invoiceIdFromPath("/invoice/-1"), null);
});

test("builds an invoice path", () => {
  assert.equal(invoicePath("7"), "/invoice/7");
  assert.equal(v2InvoicePath("7"), "/v2/invoice/7");
});

test("derives V2 invoice status", () => {
  const now = 1000;
  assert.equal(deriveV2InvoiceStatus(0, 2000, now), "Open");
  assert.equal(deriveV2InvoiceStatus(0, 500, now), "Overdue");
  assert.equal(deriveV2InvoiceStatus(1, 2000, now), "Paid");
  assert.equal(deriveV2InvoiceStatus(2, 2000, now), "Cancelled");
});

test("generates deterministic bytes32 reference hash", () => {
  const hash1 = textToReferenceHash("INV-2026-001");
  const hash2 = textToReferenceHash("INV-2026-001");
  assert.equal(hash1, hash2);
  assert.equal(hash1, "0xae5c05cbcf519c82718c76f0df46d5f0842ae124ac650b97f3e6bb0924900bb8");
  assert.equal(hash1.length, 66); // 0x + 64 hex chars
});

test("exports invoices to CSV properly", () => {
  const mockInvoices = [
    {
      id: 1n,
      version: "v2",
      derivedStatus: "Paid",
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      amount: 50000000n, // 50 USDC
      merchant: "0x1111111111111111111111111111111111111111",
      payer: "0x2222222222222222222222222222222222222222",
      dueDate: 1780000000,
      referenceHash: "0x1234",
    },
  ];
  const csv = exportInvoicesToCSV(mockInvoices);
  assert.ok(csv.includes("Invoice ID,Version,Status,Token,Amount,Merchant,Payer,Due Date (UTC),Reference Hash"));
  assert.ok(csv.includes('"1","V2","Paid","USDC","50.0","0x1111111111111111111111111111111111111111","0x2222222222222222222222222222222222222222"'));
});

test("handles getCachedInvoices and saveCachedInvoices gracefully", () => {
  assert.equal(getCachedInvoices("0x123"), null);
  assert.doesNotThrow(() => saveCachedInvoices("0x123", []));

  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
    },
  };

  const invs = [{id: 10n, amount: 100n, version: "v2"}];
  saveCachedInvoices("0xABC", invs);
  const loaded = getCachedInvoices("0xABC");
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 10n);
  assert.equal(loaded[0].amount, 100n);

  delete globalThis.window;
});

