# Tucker Invoice frontend

React frontend for the verified Tucker Invoice contracts on Pharos Atlantic Testnet.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

The default configuration uses chain ID `688689`, the verified TBT contract, and the verified InvoiceManager deployment. Vite environment values are public browser configuration and must never contain private keys, seed phrases, or keystore passwords.

## Production build

```bash
npm run build
```

The application supports MetaMask account/network changes, exact-amount TBT approval, invoice creation, invoice lookup, and invoice payment.
