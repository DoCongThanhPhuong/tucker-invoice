import test from "node:test";
import assert from "node:assert/strict";
import {EventIndexer} from "./index.js";

test("EventIndexer processes lifecycle events properly", () => {
  const indexer = new EventIndexer();

  indexer.handleEvent("InvoiceCreated", {
    args: {
      invoiceId: 1n,
      merchant: "0xMerchant123456789012345678901234567890",
      payer: "0xPayer123456789012345678901234567890",
      paymentToken: "0xToken123456789012345678901234567890",
      amount: 100000000n,
      dueDate: 1780000000n,
      referenceHash: "0xabc",
    },
    blockNumber: 100,
  });

  const merchantInvoices = indexer.getInvoicesByAccount("0xMerchant123456789012345678901234567890");
  assert.equal(merchantInvoices.length, 1);
  assert.equal(merchantInvoices[0].id, "1");
  assert.equal(merchantInvoices[0].status, "Open");

  // Handle InvoicePaid
  indexer.handleEvent("InvoicePaid", {
    args: {
      invoiceId: 1n,
      payer: "0xPayer123456789012345678901234567890",
      paymentToken: "0xToken123456789012345678901234567890",
      amount: 100000000n,
      paidAt: 1780000050n,
    },
    blockNumber: 105,
  });

  const updatedInvoices = indexer.getInvoicesByAccount("0xMerchant123456789012345678901234567890");
  assert.equal(updatedInvoices[0].status, "Paid");
  assert.equal(updatedInvoices[0].paidAt, 1780000050);
});
