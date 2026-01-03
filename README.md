# EcoLink - Circular Supply Chain Platform

## 🌐 Network: Polygon Amoy Testnet

> **Deployed on Polygon Amoy (Chain ID: 80002)**
> 
> Gas: **FREE** from faucets | Transactions: **Fully functional**

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# Open http://localhost:3000
```

---

## 💰 Get Free Test MATIC

Before using the platform, get free test tokens:

| Faucet | Link |
|--------|------|
| **Polygon** | https://faucet.polygon.technology |
| **Alchemy** | https://www.alchemy.com/faucets/polygon-amoy |
| **QuickNode** | https://faucet.quicknode.com/polygon/amoy |

---

## 📜 Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| SupplyChainBatch | `TBD` | ERC-1155 batch tokens |
| GoodwillToken | `TBD` | $GOOD reward tokens |
| ESGSoulbound | `TBD` | Sustainability certificates |
| DonationVerifier | `TBD` | Double-handshake |
| ExpiryKeeper | `TBD` | Chainlink automation |

> *Addresses updated after deployment*

---

## 🔗 Network Config (for MetaMask)

| Setting | Value |
|---------|-------|
| Network | Polygon Amoy |
| Chain ID | **80002** |
| RPC URL | https://rpc-amoy.polygon.technology |
| Currency | MATIC |
| Explorer | https://amoy.polygonscan.com |

---

## 📱 Platform Pages

| Page | URL | User |
|------|-----|------|
| Home | `/` | Everyone |
| Manufacturer | `/manufacturer` | Mint batches |
| Retailer | `/retailer` | Claim & donate |
| NGO | `/ngo` | Verify donations |
| Dashboard | `/dashboard` | Analytics |

---

## 🔧 For Developers

### Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network polygon_amoy
```

### Verify on Explorer
```bash
npx hardhat verify --network polygon_amoy <ADDRESS>
```

### Key Files
- `lib/blockchain.ts` - EVM integration
- `contracts/` - Solidity smart contracts
- `scripts/deploy.js` - Deployment script

---

## 🎯 Hackathon Info

- **Network**: Polygon Amoy (Testnet)
- **Tokens**: Free from faucets
- **Migration**: Same code works on Polygon Mainnet

---

Built for Hackathon 2026 🌱
