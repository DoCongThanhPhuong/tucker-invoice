export type InvoiceStatus = "Open" | "Paid" | "Cancelled" | "Overdue";

export interface InvoiceV2 {
  id: string;
  merchant: string;
  payer: string;
  paymentToken: string;
  amount: bigint;
  dueDate: number;
  referenceHash: string;
  status: InvoiceStatus;
  statusNum: number;
}

export interface CreateInvoiceParams {
  payer: string;
  paymentToken: string;
  amount: bigint | string | number;
  dueDate: number | Date;
  reference?: string;
}

export interface SdkConfig {
  contractAddress?: string;
  rpcUrl?: string;
  chainId?: number;
}

export declare class TuckerInvoiceClient {
  constructor(config?: SdkConfig);
  deriveStatus(statusNum: number, dueDateSec: number, currentSec?: number): InvoiceStatus;
  hashReference(reference: string): string;
  formatAmount(amount: bigint | string, decimals?: number): string;
  parseAmount(amountStr: string, decimals?: number): bigint;
}
