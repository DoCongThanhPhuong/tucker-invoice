# Measurable Incubator Milestones - Tucker Invoice V2

## Milestone 1: Security & Test Readiness (Completed)
- **Result**: 57/57 Foundry tests pass across unit, deployment-script, lifecycle, fuzzing, and state-transition tests; 6/6 frontend unit tests and production build pass in CI.
- **Coverage**: V2 tests cover allowlisting, multi-token payments (18 & 6 decimals), expiry, cancellation, false-return tokens, and script lifecycles.

## Milestone 2: Merchant/Payer Workflow & UX (Completed & Live)
- **Target**: Dual-version coexistence (V1 Legacy & V2 Incubator MVP) with multi-token support and end-to-end receipt rendering.
- **Result**:
  - Dual-version workspace switcher implemented and live at [tucker-invoice.vercel.app](https://tucker-invoice.vercel.app).
  - Multi-token selector with TBT (18 decimals) and MockUSDC (6 decimals) support.
  - One-click TBT Faucet claiming button integrated.
  - Deep-linking (`/v2/invoice/:id`) & printable payment receipt with disclaimer.
  - Deployed on Pharos Atlantic Testnet (`0xB4f7A4dA6eD75033E25231bd43D9A207797391f6`).

## Milestone 3: Pilot Onboarding & Testnet Validation (In Progress)
- **Current Progress**:
  - 12 active on-chain invoices processed on Pharos Atlantic Testnet across multiple tokens.
  - Verified on-chain lifecycle: creation (`InvoiceCreated`), payment settlement (`InvoicePaid`), and merchant cancellation (`InvoiceCancelled`).
- **Target Metrics**:
  - 20+ active pilot invoices processed on Pharos Atlantic Testnet.
  - 5 Web3 agency pilot participants providing UX feedback.
  - 100% successful settlement execution without state mismatch.

## Milestone 4: Production Audit & Mainnet Deployment (Target)
- **Target Metrics**:
  - Independent smart contract audit completed with zero Critical or High vulnerabilities.
  - Mainnet deployment on Pharos with native stablecoin support.
  - SDK library published (`@tucker-invoice/sdk`).
