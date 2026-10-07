import {keccak256} from "./keccak.js";

export const DEFAULT_PHAROS_CHAIN_ID = 688689;
export const DEFAULT_PHAROS_RPC_URL = "https://atlantic.dplabs-internal.com";
export const DEFAULT_INVOICE_MANAGER_V2 = "0xB4f7A4dA6eD75033E25231bd43D9A207797391f6";
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

export class TuckerInvoiceClient {
  constructor(config = {}) {
    this.chainId = config.chainId || DEFAULT_PHAROS_CHAIN_ID;
    this.rpcUrl = config.rpcUrl || DEFAULT_PHAROS_RPC_URL;
    this.contractAddress = config.contractAddress || DEFAULT_INVOICE_MANAGER_V2;
  }

  deriveStatus(statusNum, dueDateSec, currentSec = Math.floor(Date.now() / 1000)) {
    const num = Number(statusNum);
    if (num === 1) return "Paid";
    if (num === 2) return "Cancelled";
    if (num === 0 && dueDateSec && currentSec > Number(dueDateSec)) return "Overdue";
    return "Open";
  }

  hashReference(reference) {
    if (!reference || typeof reference !== "string") {
      return ZERO_BYTES32;
    }
    return keccak256(reference);
  }

  parseAmount(amountStr, decimals = 18) {
    const [intPart, decPart = ""] = String(amountStr).split(".");
    const paddedDec = decPart.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(intPart + paddedDec);
  }

  formatAmount(amount, decimals = 18) {
    const str = BigInt(amount).toString().padStart(decimals + 1, "0");
    const intPart = str.slice(0, -decimals) || "0";
    const decPart = str.slice(-decimals).replace(/0+$/, "");
    return decPart ? `${intPart}.${decPart}` : intPart;
  }

  prepareCreateInvoiceCall({payer, paymentToken, amount, dueDate, reference = ""}) {
    if (!payer) throw new Error("Payer address is required");
    if (!paymentToken) throw new Error("Payment token address is required");

    const dueDateSec = typeof dueDate === "number"
      ? Math.floor(dueDate)
      : Math.floor(new Date(dueDate).getTime() / 1000);

    const refHash = this.hashReference(reference);

    return {
      to: this.contractAddress,
      function: "createInvoice",
      args: [payer, paymentToken, BigInt(amount), dueDateSec, refHash],
    };
  }

  preparePayInvoiceCall(invoiceId) {
    return {
      to: this.contractAddress,
      function: "payInvoice",
      args: [BigInt(invoiceId)],
    };
  }

  prepareCancelInvoiceCall(invoiceId) {
    return {
      to: this.contractAddress,
      function: "cancelInvoice",
      args: [BigInt(invoiceId)],
    };
  }
}
