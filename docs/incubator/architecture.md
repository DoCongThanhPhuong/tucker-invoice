# System Architecture Specifications - Tucker Invoice V2

## Overview
Tucker Invoice V2 is an immutable smart-contract and React + Ethers v6 architecture prepared for a future Pharos Atlantic Testnet deployment. V1 is the currently deployed testnet product.

---

## Core Smart Contract Layer

```
                           +------------------------+
                           |  InvoiceManagerV2.sol  |
                           +------------------------+
                                       |
           +---------------------------+---------------------------+
           |                           |                           |
+--------------------+   +--------------------+   +--------------------+
| createInvoice()    |   | payInvoice()       |   | cancelInvoice()    |
| - Validates token  |   | - Checks CEI       |   | - Merchant only    |
| - Stores refHash   |   | - Status -> Paid   |   | - Status->Cancelled|
| - Sets dueDate     |   | - safeTransferFrom |   +--------------------+
+--------------------+   +--------------------+
```

### Data Specifications (`InvoiceManagerV2.sol`)
```solidity
enum InvoiceStatus { Open, Paid, Cancelled }

struct Invoice {
    address merchant;
    address payer;
    address paymentToken;
    uint256 amount;
    uint64 dueDate;
    bytes32 referenceHash;
    InvoiceStatus status;
}
```

### Key Security & Design Mechanics
1. **Checks-Effects-Interactions (CEI)**: State transitions to `Paid` *prior* to calling `IERC20.safeTransferFrom`.
2. **Multi-Token Allowlisting**: Controlled via OpenZeppelin `Ownable` modifier on `setPaymentTokenSupport(address token, bool isSupported)`.
3. **Decimals Agnostic**: Operates strictly in raw token units; frontend dynamically queries `decimals()` and `symbol()` via `ERC20_ABI`.
4. **Privacy-Preserving Hashing**: Client computes `keccak256(toUtf8Bytes(refString))`; the protocol stores only the resulting reference hash. Merchants must not enter PII into the reference because hashes of predictable values can be guessed.

---

## Event Scanning & Frontend Architecture

### Event Scanning Limits & Bounded Chunking
Due to Pharos RPC log response constraints, log filter queries (`InvoiceCreated`, `InvoicePaid`, `InvoiceCancelled`) are chunked into strict 1,000-block ranges:
```javascript
async function queryFilterInRanges(contract, filter, fromBlock, toBlock) {
  const events = [];
  for (let start = fromBlock; start <= toBlock; start += 1000) {
    const end = Math.min(start + 999, toBlock);
    events.push(...await contract.queryFilter(filter, start, end));
  }
  return events;
}
```

### Storage & Caching Principles
- **On-Chain Truth**: Smart contract `invoices(id)` state calls remain the single source of truth.
- **No Database Dependency**: Operates in pure Web3 mode without mandatory backend indexing.
- **LocalStorage Boundary**: Client state is ephemeral; local storage is strictly optional, wallet-scoped, and re-verified against contract calls.
