export const PHAROS_CHAIN_ID = 688689;
export const PHAROS_CHAIN_HEX = "0xa8231";
export const PHAROS_RPC_URL =
  import.meta.env.VITE_PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com";
export const EXPLORER_URL = "https://atlantic.pharosscan.xyz";

export const TBT_ADDRESS =
  import.meta.env.VITE_TBT_ADDRESS || "0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5";
export const INVOICE_MANAGER_ADDRESS =
  import.meta.env.VITE_INVOICE_MANAGER_ADDRESS || "0x5a95783b6f19841E79c4Bb506981310661a4cc7d";

export const INVOICE_MANAGER_ABI = [
  "function createInvoice(address payer, uint256 amount) returns (uint256 invoiceId)",
  "function payInvoice(uint256 invoiceId)",
  "function invoices(uint256 invoiceId) view returns (address merchant, address payer, uint256 amount, uint8 status)",
  "function nextInvoiceId() view returns (uint256)",
  "function paymentToken() view returns (address)",
  "event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, uint256 amount)",
  "event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount)",
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];
