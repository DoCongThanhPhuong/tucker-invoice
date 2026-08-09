import test from "node:test";
import assert from "node:assert/strict";
import {invoiceIdFromPath, invoicePath, uniqueInvoiceIds} from "../src/invoice-utils.js";

test("parses a shared invoice path", () => {
  assert.equal(invoiceIdFromPath("/invoice/42"), "42");
  assert.equal(invoiceIdFromPath("/invoice/42/"), "42");
});

test("rejects paths that are not invoice links", () => {
  assert.equal(invoiceIdFromPath("/"), null);
  assert.equal(invoiceIdFromPath("/invoice/not-a-number"), null);
  assert.equal(invoiceIdFromPath("/invoice/-1"), null);
});

test("builds an invoice path", () => {
  assert.equal(invoicePath("7"), "/invoice/7");
});

test("deduplicates invoice IDs from merchant and payer event queries", () => {
  const events = [
    {args: {invoiceId: 1n}},
    {args: {invoiceId: 2n}},
    {args: {invoiceId: 1n}},
  ];
  assert.deepEqual(uniqueInvoiceIds(events), ["1", "2"]);
});
