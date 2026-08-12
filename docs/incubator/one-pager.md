# Executive One-Pager: Tucker Invoice V2

## Product Vision
Tucker Invoice is a Web3 payment rail designed for freelancers, Web3 agencies, and service providers. Its V1 MVP is deployed on the **Pharos Atlantic Testnet**; V2 is prepared for a future approved testnet deployment.

---

## Market Positioning: RWA & Payments Incubator Track

### Problem
Traditional cross-border invoicing suffers from high wire fees (3–7%), 2–5 day settlement delays, lack of verifiable real-time payment status, and privacy vulnerabilities when client invoice data is stored on centralized servers.

### Solution
Tucker Invoice V2 introduces on-chain verifiable settlement with zero PII exposure:
- **Shared Payment State**: Merchant and payer rely on immutable smart contract state for payment status (`Open`, `Paid`, `Cancelled`, `Overdue`).
- **Verifiable Settlement**: Payments are finalized atomically via ERC-20 `safeTransferFrom`, eliminating chargebacks and wire delays.
- **Privacy-Preserving Architecture**: Personal data, client details, and order descriptions remain off-chain; only deterministic 32-byte reference hashes are stored on-chain.

---

## Technical & Deployment Facts

> [!NOTE]
> **Current Testnet Facts (Pharos Atlantic - Chain ID 688689)**
> - **InvoiceManager V1 (Verified)**: `0x5a95783b6f19841E79c4Bb506981310661a4cc7d`
> - **InvoiceManagerV2 (Live Testnet)**: `0xB4f7A4dA6eD75033E25231bd43D9A207797391f6`
> - **Tucker Builder Token (TBT ERC-20)**: `0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5`

> [!IMPORTANT]
> **Future Targets & Testnet Architecture**
> - Stablecoin integration (e.g. native USDC/USDT on Pharos) represents a V2 testnet-ready architecture pending deployment of official stablecoins on Pharos.
> - Current testnet pilot operations utilize the verified TBT test token.

---

## Why Blockchain?
Blockchain is not used as a gimmick, but for two fundamental guarantees:
1. **Verifiable Settlement**: Trustless, atomic token transfer directly between payer and merchant without intermediary custodians.
2. **Shared Payment State**: Single source of truth accessible to both parties without centralized database lock-in.
