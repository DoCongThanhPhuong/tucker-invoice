export const DEFAULT_RPC_URL = "https://atlantic.dplabs-internal.com";
export const INVOICE_MANAGER_V2_ADDRESS = "0xB4f7A4dA6eD75033E25231bd43D9A207797391f6";
export const V2_DEPLOYMENT_BLOCK = 28053178;

export const INVOICE_MANAGER_V2_EVENTS_ABI = [
  "event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, address paymentToken, uint256 amount, uint64 dueDate, bytes32 referenceHash)",
  "event InvoicePaid(uint256 indexed invoiceId, address indexed payer, address paymentToken, uint256 amount, uint64 paidAt)",
  "event InvoiceCancelled(uint256 indexed invoiceId, address indexed merchant, uint64 cancelledAt)",
];

export class EventIndexer {
  constructor(options = {}) {
    this.rpcUrl = options.rpcUrl || DEFAULT_RPC_URL;
    this.contractAddress = options.contractAddress || INVOICE_MANAGER_V2_ADDRESS;
    this.fromBlock = options.fromBlock || V2_DEPLOYMENT_BLOCK;
    this.provider = options.provider || null;
    this.invoices = new Map();
    this.lastProcessedBlock = this.fromBlock;
  }

  handleEvent(eventName, event) {
    const args = event.args;
    const invoiceId = args.invoiceId.toString();

    if (eventName === "InvoiceCreated") {
      this.invoices.set(invoiceId, {
        id: invoiceId,
        merchant: args.merchant.toLowerCase(),
        payer: args.payer.toLowerCase(),
        paymentToken: args.paymentToken.toLowerCase(),
        amount: args.amount.toString(),
        dueDate: Number(args.dueDate),
        referenceHash: args.referenceHash,
        status: "Open",
        createdAtBlock: event.blockNumber,
        paidAt: null,
        cancelledAt: null,
      });
    } else if (eventName === "InvoicePaid") {
      const existing = this.invoices.get(invoiceId) || {id: invoiceId};
      this.invoices.set(invoiceId, {
        ...existing,
        status: "Paid",
        paidAt: Number(args.paidAt),
      });
    } else if (eventName === "InvoiceCancelled") {
      const existing = this.invoices.get(invoiceId) || {id: invoiceId};
      this.invoices.set(invoiceId, {
        ...existing,
        status: "Cancelled",
        cancelledAt: Number(args.cancelledAt),
      });
    }
  }

  getInvoicesByAccount(account) {
    if (!account) return [];
    const lower = account.toLowerCase();
    const result = [];
    for (const inv of this.invoices.values()) {
      if (inv.merchant === lower || inv.payer === lower) {
        result.push(inv);
      }
    }
    return result.sort((a, b) => Number(b.id) - Number(a.id));
  }

  getAllInvoices() {
    return Array.from(this.invoices.values()).sort((a, b) => Number(b.id) - Number(a.id));
  }

  async syncToLatest(toBlock = "latest") {
    const {Contract, JsonRpcProvider} = await import("ethers");
    const provider = this.provider || new JsonRpcProvider(this.rpcUrl);
    const contract = new Contract(this.contractAddress, INVOICE_MANAGER_V2_EVENTS_ABI, provider);

    const filterCreated = contract.filters.InvoiceCreated();
    const filterPaid = contract.filters.InvoicePaid();
    const filterCancelled = contract.filters.InvoiceCancelled();

    const [createdLogs, paidLogs, cancelledLogs] = await Promise.all([
      contract.queryFilter(filterCreated, this.lastProcessedBlock, toBlock).catch(() => []),
      contract.queryFilter(filterPaid, this.lastProcessedBlock, toBlock).catch(() => []),
      contract.queryFilter(filterCancelled, this.lastProcessedBlock, toBlock).catch(() => []),
    ]);

    for (const log of createdLogs) {
      this.handleEvent("InvoiceCreated", log);
    }
    for (const log of paidLogs) {
      this.handleEvent("InvoicePaid", log);
    }
    for (const log of cancelledLogs) {
      this.handleEvent("InvoiceCancelled", log);
    }

    return this.invoices.size;
  }
}
