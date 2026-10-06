# Product Roadmap - Tucker Invoice V2

## Phase 1: Testnet & Incubator MVP (Completed)
- **Status**: V1 and V2 are live on Pharos Atlantic Testnet (Chain ID 688689) and deployed to production ([tucker-invoice.vercel.app](https://tucker-invoice.vercel.app)).
- **Core Functionality**:
  - V1 Verified Deployment: `InvoiceManager` (`0x5a95783b6f19841E79c4Bb506981310661a4cc7d`) & TBT Token (`0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5`).
  - V2 Live Testnet Deployment: `InvoiceManagerV2` (`0xB4f7A4dA6eD75033E25231bd43D9A207797391f6`), `TBTFaucet` (`0x0A159a3B65802Ee7fDbaD92Bb76B142c9aCe5c2e`), and `MockUSDC` (`0x91a487BfAC67b3CF39F51425f762510dCb196026`).
  - Multi-token support (18-decimal TBT & 6-decimal USDC), full lifecycle event validation (creation, payment settlement, cancellation), expiration timestamps, reference hashing, and printable receipts.

## Phase 2: Pilot Validation & Native Stablecoins (Target)
- **Target Timeline**: Q3 2026.
- **Goals**:
  - Onboard 15 pilot Web3 service agencies for testnet workflow validation.
  - Integrate native stablecoins on Pharos (e.g. USDC/USDT) as official allowlisted payment tokens.
  - Deploy bounded subgraph / indexer integration for fast event historical querying.

## Phase 3: Mainnet Production Launch (Target)
- **Target Timeline**: Q4 2026.
- **Goals**:
  - Complete formal third-party smart contract security audit.
  - Deploy audited `InvoiceManagerV2` on Pharos Mainnet.
  - Launch Webhook notifications (Telegram/Email alerts for invoice status changes).

## Phase 4: Enterprise RWA & Recurring Subscriptions (Target)
- **Target Timeline**: Q1 2027.
- **Goals**:
  - Streaming payment options and recurring milestone invoicing.
  - Enterprise ERP / accounting integrations (QuickBooks / Xero export).
