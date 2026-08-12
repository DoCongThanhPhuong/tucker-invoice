export const PHAROS_CHAIN_ID = 688689;
export const PHAROS_CHAIN_HEX = "0xa8231";
export const PHAROS_RPC_URL =
  import.meta.env.VITE_PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com";
export const EXPLORER_URL = "https://atlantic.pharosscan.xyz";

export const TBT_ADDRESS =
  import.meta.env.VITE_TBT_ADDRESS || "0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5";
export const INVOICE_MANAGER_ADDRESS =
  import.meta.env.VITE_INVOICE_MANAGER_ADDRESS || "0x5a95783b6f19841E79c4Bb506981310661a4cc7d";
export const INVOICE_MANAGER_DEPLOYMENT_BLOCK = 27782740;

export const INVOICE_MANAGER_V2_ADDRESS =
  import.meta.env.VITE_INVOICE_MANAGER_V2_ADDRESS || "0xB4f7A4dA6eD75033E25231bd43D9A207797391f6";
export const INVOICE_MANAGER_V2_DEPLOYMENT_BLOCK = 28053178;

export const INVOICE_MANAGER_ABI = [
  "function createInvoice(address payer, uint256 amount) returns (uint256 invoiceId)",
  "function payInvoice(uint256 invoiceId)",
  "function invoices(uint256 invoiceId) view returns (address merchant, address payer, uint256 amount, uint8 status)",
  "function nextInvoiceId() view returns (uint256)",
  "function paymentToken() view returns (address)",
  "event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, uint256 amount)",
  "event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount)",
];

export const INVOICE_MANAGER_V2_ABI = [
  "function createInvoice(address payer, address paymentToken, uint256 amount, uint64 dueDate, bytes32 referenceHash) returns (uint256 invoiceId)",
  "function payInvoice(uint256 invoiceId)",
  "function cancelInvoice(uint256 invoiceId)",
  "function invoices(uint256 invoiceId) view returns (address merchant, address payer, address paymentToken, uint256 amount, uint64 dueDate, bytes32 referenceHash, uint8 status)",
  "function nextInvoiceId() view returns (uint256)",
  "function supportedPaymentTokens(address token) view returns (bool)",
  "event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, address paymentToken, uint256 amount, uint64 dueDate, bytes32 referenceHash)",
  "event InvoicePaid(uint256 indexed invoiceId, address indexed payer, address paymentToken, uint256 amount, uint64 paidAt)",
  "event InvoiceCancelled(uint256 indexed invoiceId, address indexed merchant, uint64 cancelledAt)",
  "event PaymentTokenSupportUpdated(address indexed token, bool indexed isSupported)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export const DEFAULT_V2_TOKENS = [
  {
    symbol: "TBT",
    name: "Tucker Builder Token",
    address: TBT_ADDRESS,
    decimals: 18,
  },
];
