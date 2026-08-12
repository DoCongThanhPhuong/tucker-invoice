# Product Roadmap - Tucker Invoice V2

## Phase 1: Testnet & Incubator MVP (Current Fact)
- **Status**: V1 is live on Pharos Atlantic Testnet (Chain ID 688689); V2 is implemented locally and not yet deployed.
- **Core Functionality**:
  - V1 Verified Deployment: `InvoiceManager` (`0x5a95783b6f19841E79c4Bb506981310661a4cc7d`) & TBT Token (`0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5`).
  - V2 Incubator Contract Architecture: Implemented with unit and fuzz tests (`InvoiceManagerV2.sol`), supporting multi-token allowlisting, expiration timestamps, non-sensitive reference hashing, merchant cancellation, and printable settlement receipts.

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
