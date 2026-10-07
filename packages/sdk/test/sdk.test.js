import test from "node:test";
import assert from "node:assert/strict";
import {TuckerInvoiceClient, ZERO_BYTES32} from "../src/index.js";

test("TuckerInvoiceClient initializes with default config", () => {
  const client = new TuckerInvoiceClient();
  assert.equal(client.chainId, 688689);
  assert.equal(client.contractAddress, "0xB4f7A4dA6eD75033E25231bd43D9A207797391f6");
});

test("TuckerInvoiceClient hashes references with standard Keccak-256", () => {
  const client = new TuckerInvoiceClient();
  const hash = client.hashReference("INV-2026-001");
  assert.equal(hash, "0xae5c05cbcf519c82718c76f0df46d5f0842ae124ac650b97f3e6bb0924900bb8");
  assert.equal(client.hashReference(""), ZERO_BYTES32);
});

test("TuckerInvoiceClient derives statuses correctly", () => {
  const client = new TuckerInvoiceClient();
  const now = 1000;
  assert.equal(client.deriveStatus(0, 2000, now), "Open");
  assert.equal(client.deriveStatus(0, 500, now), "Overdue");
  assert.equal(client.deriveStatus(1, 2000, now), "Paid");
  assert.equal(client.deriveStatus(2, 2000, now), "Cancelled");
});

test("TuckerInvoiceClient parses and formats amounts accurately", () => {
  const client = new TuckerInvoiceClient();
  // 18 decimals
  const amount18 = client.parseAmount("10.5", 18);
  assert.equal(amount18, 10500000000000000000n);
  assert.equal(client.formatAmount(amount18, 18), "10.5");

  // 6 decimals
  const amount6 = client.parseAmount("100.25", 6);
  assert.equal(amount6, 100250000n);
  assert.equal(client.formatAmount(amount6, 6), "100.25");
});

test("TuckerInvoiceClient prepares contract call objects", () => {
  const client = new TuckerInvoiceClient();
  const createTx = client.prepareCreateInvoiceCall({
    payer: "0x123",
    paymentToken: "0x456",
    amount: 1000n,
    dueDate: 1780000000,
    reference: "INV-001",
  });

  assert.equal(createTx.function, "createInvoice");
  assert.equal(createTx.args[0], "0x123");
  assert.equal(createTx.args[1], "0x456");
  assert.equal(createTx.args[2], 1000n);
  assert.equal(createTx.args[3], 1780000000);
  assert.ok(createTx.args[4].startsWith("0x"));

  const payTx = client.preparePayInvoiceCall(5n);
  assert.equal(payTx.function, "payInvoice");
  assert.equal(payTx.args[0], 5n);

  const cancelTx = client.prepareCancelInvoiceCall(5n);
  assert.equal(cancelTx.function, "cancelInvoice");
  assert.equal(cancelTx.args[0], 5n);
});
