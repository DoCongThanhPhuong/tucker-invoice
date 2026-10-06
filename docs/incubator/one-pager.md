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
> - **InvoiceManager V2 (Live Testnet)**: `0xB4f7A4dA6eD75033E25231bd43D9A207797391f6`
> - **Tucker Builder Token (TBT ERC-20)**: `0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5`
> - **TBT Faucet (Live Testnet)**: `0x0A159a3B65802Ee7fDbaD92Bb76B142c9aCe5c2e`
> - **MockUSDC (6-Decimal ERC-20)**: `0x91a487BfAC67b3CF39F51425f762510dCb196026`
> - **Production dApp**: [https://tucker-invoice.vercel.app](https://tucker-invoice.vercel.app)

> [!IMPORTANT]
> **Multi-Token & Stablecoin Readiness**
> - Multi-token architecture is live on testnet supporting both 18-decimal (TBT) and 6-decimal (USDC) settlements, ready for native stablecoins upon Pharos Mainnet launch.

---

## Why Blockchain?
Blockchain is not used as a gimmick, but for two fundamental guarantees:
1. **Verifiable Settlement**: Trustless, atomic token transfer directly between payer and merchant without intermediary custodians.
2. **Shared Payment State**: Single source of truth accessible to both parties without centralized database lock-in.
