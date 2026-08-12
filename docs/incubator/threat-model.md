# Threat Model & Security Analysis - Tucker Invoice V2

## Overview
Tucker Invoice V2 is a smart contract and frontend application prepared for a future Pharos Atlantic Testnet deployment. V1 is currently deployed; V2 has not been broadcast or verified.

This threat model identifies potential attack vectors, trust assumptions, system boundary vulnerabilities, and implemented security mitigations.

---

## System Boundaries & Assets

### Key Assets
1. **Payer ERC-20 Tokens**: Funds held by payers that are transferred to merchants upon invoice settlement.
2. **Invoice State Integrity**: On-chain invoice status (`Open`, `Paid`, `Cancelled`), payment token, merchant address, payer address, amount, due date, and reference hash.
3. **Payment Token Allowlist**: Authorization state for allowed ERC-20 payment tokens managed by the contract owner.

---

## Threat Vectors & Mitigations

### 1. Reentrancy & Double Payment Attacks
- **Threat**: Malicious payment token or ERC-777 hook re-enters `payInvoice()` during token transfer execution to claim invoice payment twice.
- **Risk Level**: High
- **Mitigation**:
  - **Checks-Effects-Interactions (CEI) Pattern**: `invoice.status` is updated from `Open` to `Paid` **before** making the external `safeTransferFrom` token call.
  - If the token call fails or reverts, the entire transaction reverts, restoring the invoice status to `Open`.

### 2. Malicious or Non-Standard ERC-20 Tokens
- **Threat**: Attackers attempt to create invoices using non-standard tokens (e.g., returning `false` without reverting, or unexpected decimals).
- **Risk Level**: High
- **Mitigation**:
  - **Token Allowlist**: Only tokens explicitly authorized by the contract owner (`supportedPaymentTokens[token] == true`) can be used.
  - **OpenZeppelin SafeERC20**: Uses `safeTransferFrom`, handling missing return values or boolean `false`.
  - **Raw Units Architecture**: Frontend queries `decimals()` on-chain to handle 6, 8, 18 decimal tokens.

### 3. Unauthorized Invoice Operations
- **Threat**: Unintended party pays or cancels an invoice.
- **Risk Level**: Medium
- **Mitigation**:
  - **Payer Binding**: `payInvoice()` strictly enforces `msg.sender == invoice.payer`.
  - **Merchant Binding**: `cancelInvoice()` strictly enforces `msg.sender == invoice.merchant`.

### 4. Overdue Payment & Timestamp Manipulation
- **Threat**: Payer attempts to pay an expired invoice.
- **Risk Level**: Low-Medium
- **Mitigation**:
- **On-Chain Expiration**: `payInvoice()` rejects transactions where `block.timestamp > invoice.dueDate` with custom error `InvoiceExpired`.
- **Residual risk**: Block timestamps have limited validator-controlled variation. Due dates are suitable for business-day expiry, not sub-minute deadlines.

### 5. Privacy & PII Leakage
- **Threat**: Off-chain invoice details (client names, line items) leaked on-chain.
- **Risk Level**: High
- **Mitigation**:
- **Hash-Only On-Chain Storage**: On-chain storage accepts only `bytes32 referenceHash`. Plaintext details remain off-chain.
- **Residual risk**: Hashes do not make predictable or low-entropy PII private; users must not hash email addresses, names, or public order numbers without a secret salt stored off-chain.

### 6. Admin Access Control
- **Threat**: Unauthorized allowlisting of tokens.
- **Risk Level**: Medium
- **Mitigation**:
  - **OpenZeppelin Ownable**: `setPaymentTokenSupport()` restricted to `onlyOwner`.
