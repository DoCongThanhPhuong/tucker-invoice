import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDiscordPayload,
  formatTelegramPayload,
  sendDiscordAlert,
  sendTelegramAlert,
} from "./notifier.js";

const sampleData = {
  id: "42",
  tokenSymbol: "USDC",
  amountFormatted: "100.0",
  amount: "100000000",
  merchant: "0x1111111111111111111111111111111111111111",
  payer: "0x2222222222222222222222222222222222222222",
  referenceHash: "0xabcdef1234567890",
  explorerUrl: "https://atlantic.pharosscan.xyz/tx/0x123",
};

test("formatDiscordPayload creates valid embed structure", () => {
  const payload = formatDiscordPayload("InvoiceCreated", sampleData);
  assert.ok(payload.embeds);
  assert.equal(payload.embeds[0].title, "📄 New Invoice Created");
  assert.equal(payload.embeds[0].color, 0x3498db);
  assert.ok(payload.embeds[0].fields.some((f) => f.name === "Invoice ID" && f.value === "#42"));
});

test("formatTelegramPayload generates correct HTML message", () => {
  const payload = formatTelegramPayload("InvoicePaid", sampleData);
  assert.equal(payload.parse_mode, "HTML");
  assert.ok(payload.text.includes("Tucker Invoice Alert: InvoicePaid"));
  assert.ok(payload.text.includes("<b>ID:</b> #42"));
  assert.ok(payload.text.includes("View on PharosScan"));
});

test("sendDiscordAlert calls fetch with correct parameters", async () => {
  let calledUrl = "";
  let calledBody = null;
  const mockFetch = async (url, options) => {
    calledUrl = url;
    calledBody = JSON.parse(options.body);
    return {ok: true};
  };

  const success = await sendDiscordAlert("https://discord.com/api/webhooks/123/xyz", "InvoicePaid", sampleData, mockFetch);
  assert.equal(success, true);
  assert.equal(calledUrl, "https://discord.com/api/webhooks/123/xyz");
  assert.equal(calledBody.embeds[0].title, "✅ Invoice Paid Successfully");
});

test("sendTelegramAlert calls Telegram API properly", async () => {
  let calledUrl = "";
  let calledBody = null;
  const mockFetch = async (url, options) => {
    calledUrl = url;
    calledBody = JSON.parse(options.body);
    return {ok: true};
  };

  const success = await sendTelegramAlert("bot123456", "chat789", "InvoiceCancelled", sampleData, mockFetch);
  assert.equal(success, true);
  assert.equal(calledUrl, "https://api.telegram.org/botbot123456/sendMessage");
  assert.equal(calledBody.chat_id, "chat789");
  assert.ok(calledBody.text.includes("InvoiceCancelled"));
});
