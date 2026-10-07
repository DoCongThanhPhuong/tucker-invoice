export function formatDiscordPayload(eventName, data) {
  const titles = {
    InvoiceCreated: "📄 New Invoice Created",
    InvoicePaid: "✅ Invoice Paid Successfully",
    InvoiceCancelled: "❌ Invoice Cancelled",
  };

  const colors = {
    InvoiceCreated: 0x3498db, // Blue
    InvoicePaid: 0x2ecc71,    // Green
    InvoiceCancelled: 0xe74c3c, // Red
  };

  const fields = [
    {name: "Invoice ID", value: `#${data.id}`, inline: true},
    {name: "Token", value: data.tokenSymbol || "Token", inline: true},
    {name: "Amount", value: data.amountFormatted || String(data.amount), inline: true},
    {name: "Merchant", value: `\`${data.merchant}\``, inline: false},
    {name: "Payer", value: `\`${data.payer}\``, inline: false},
  ];

  if (data.referenceHash) {
    fields.push({name: "Reference Hash", value: `\`${data.referenceHash.slice(0, 10)}…\``, inline: true});
  }

  return {
    embeds: [
      {
        title: titles[eventName] || `Protocol Event: ${eventName}`,
        color: colors[eventName] || 0x95a5a6,
        fields,
        footer: {text: "Tucker Invoice Settlement Engine • Pharos Atlantic Testnet"},
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function formatTelegramPayload(eventName, data) {
  const emojis = {
    InvoiceCreated: "📄",
    InvoicePaid: "✅",
    InvoiceCancelled: "❌",
  };

  const text = [
    `<b>${emojis[eventName] || "🔔"} Tucker Invoice Alert: ${eventName}</b>`,
    ``,
    `<b>ID:</b> #${data.id}`,
    `<b>Amount:</b> ${data.amountFormatted || data.amount} ${data.tokenSymbol || ""}`,
    `<b>Merchant:</b> <code>${data.merchant}</code>`,
    `<b>Payer:</b> <code>${data.payer}</code>`,
    data.explorerUrl ? `<a href="${data.explorerUrl}">View on PharosScan ↗</a>` : "",
  ].filter(Boolean).join("\n");

  return {
    parse_mode: "HTML",
    text,
  };
}

export async function sendDiscordAlert(webhookUrl, eventName, data, fetchFn = globalThis.fetch) {
  if (!webhookUrl) throw new Error("Discord webhook URL is required");
  const payload = formatDiscordPayload(eventName, data);
  const response = await fetchFn(webhookUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  return response.ok;
}

export async function sendTelegramAlert(botToken, chatId, eventName, data, fetchFn = globalThis.fetch) {
  if (!botToken || !chatId) throw new Error("Telegram bot token and chat ID are required");
  const payload = {
    chat_id: chatId,
    ...formatTelegramPayload(eventName, data),
  };
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  return response.ok;
}
