# Measurable Incubator Milestones - Tucker Invoice V2

## Milestone 1: Security & Test Readiness (Completed locally)
- **Result**: 50/50 Foundry tests pass across unit, deployment-script, edge-case, fuzzing, and state-transition tests; frontend utility tests and production build also pass locally.
- **Coverage**: V2 tests cover allowlisting, payments, expiry, cancellation, false-return tokens, token contracts without code, and 6-decimal token units.
- **Boundary**: This is not an audit or formal verification claim. CI must reproduce these results after the changes are committed.

## Milestone 2: Merchant/Payer Workflow & UX (Implemented, pending V2 deployment)
- **Target**: Dual-version coexistence (V1 Legacy & V2 Incubator MVP) with end-to-end receipt rendering.
- **Result**:
  - Dual-version workspace switcher implemented.
  - Deep-linking (`/v2/invoice/:id`) & QR code generation.
  - Printable payment receipt with non-tax invoice regulatory disclaimer.
  - Production build is validated locally; V2 actions remain unavailable until an approved V2 deployment address is configured.

## Milestone 3: Pilot Onboarding & Testnet Validation (Target)
- **Target Metrics**:
  - 20+ active pilot invoices processed on Pharos Atlantic Testnet.
  - 5 Web3 agency pilot participants providing UX feedback.
  - 100% successful settlement execution without state mismatch.

## Milestone 4: Production Audit & Mainnet Deployment (Target)
- **Target Metrics**:
  - Independent smart contract audit completed with zero Critical or High vulnerabilities.
  - Mainnet deployment on Pharos with native stablecoin support.
  - SDK library published (`@tucker-invoice/sdk`).
