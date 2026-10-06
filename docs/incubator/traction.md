# Factual Performance & Traction - Tucker Invoice V2

## Factual Deployment Records (Pharos Atlantic Testnet)

> [!NOTE]
> All facts listed below are strictly verified on-chain on the Pharos Atlantic Testnet (Chain ID 688689).

| Component | Network | Contract Address / Status | Explorer Link |
| :--- | :--- | :--- | :--- |
| **InvoiceManager V1** | Pharos Atlantic | `0x5a95783b6f19841E79c4Bb506981310661a4cc7d` (Verified) | [View on PharosScan](https://atlantic.pharosscan.xyz/address/0x5a95783b6f19841E79c4Bb506981310661a4cc7d) |
| **InvoiceManager V2** | Pharos Atlantic | `0xB4f7A4dA6eD75033E25231bd43D9A207797391f6` (Live Testnet, 5 Invoices) | [View on PharosScan](https://atlantic.pharosscan.xyz/address/0xB4f7A4dA6eD75033E25231bd43D9A207797391f6) |
| **Tucker Builder Token (TBT)** | Pharos Atlantic | `0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5` (Verified) | [View on PharosScan](https://atlantic.pharosscan.xyz/address/0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5) |
| **TBTFaucet** | Pharos Atlantic | `0x0A159a3B65802Ee7fDbaD92Bb76B142c9aCe5c2e` (Live Testnet, Funded 10,000 TBT) | [View on PharosScan](https://atlantic.pharosscan.xyz/address/0x0A159a3B65802Ee7fDbaD92Bb76B142c9aCe5c2e) |

---

## Code Quality & Test Metrics

- **Solidity Test Suite**: 47/47 Foundry tests passing in GitHub Actions CI.
- **Frontend Test Suite**: 6/6 unit tests passing via Node test runner.
- **Frontend Build**: Single-page application production build passes in ~2s via Vite.
- **RPC Query Safety**: Sequential ID batch queries with bounded range limits prevent rate limit dropouts.

---

## Target Pilot Criteria (Future Projections)

> [!IMPORTANT]
> To maintain factual integrity, Tucker Invoice does NOT claim existing commercial revenue, fake user counts, or audited mainnet volume. Pilot onboarding criteria for Q3 2026:
> - Freelance Web3 developers & designers seeking verifiable stablecoin payment settlement.
> - Web3 service agencies managing multi-client invoicing on Pharos.
