# API Keys Setup Guide

This guide will help you get all the necessary API keys for the EcoLink platform.

---

## 🔑 Required API Keys

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Polygonscan** | Contract verification on Polygon | ✅ Yes |
| **Arbiscan** | Contract verification on Arbitrum | ✅ Yes |
| **Alchemy** | RPC endpoints (faster than public) | ✅ Yes |

---

## 1️⃣ Polygonscan API Key

**Link:** https://polygonscan.com/register

### Steps:
1. Go to [Polygonscan Registration](https://polygonscan.com/register)
2. Create an account with:
   - Username
   - Email address
   - Password
3. Complete the captcha verification
4. Verify your email
5. After logging in, go to **Developers → API Keys**
6. Click **"+ Add"** to create a new API key
7. Copy the key to your `.env` file

```bash
POLYGONSCAN_API_KEY=your_key_here
```

---

## 2️⃣ Arbiscan API Key

**Link:** https://arbiscan.io/register

### Steps:
1. Go to [Arbiscan Registration](https://arbiscan.io/register)
2. Create an account (same process as Polygonscan - they use the same platform)
3. After logging in, go to **Other → API Keys**
4. Click **"Create a new API Key Token"**
5. Copy the key to your `.env` file

```bash
ARBISCAN_API_KEY=your_key_here
```

---

## 3️⃣ Alchemy RPC URLs (Recommended)

**Link:** https://www.alchemy.com/

Alchemy provides **faster, more reliable RPC endpoints** than public ones.

### Steps:
1. Go to [Alchemy](https://www.alchemy.com/)
2. Click **"Get your API key"** or **"Get Started"**
3. Sign up with:
   - Google account (fastest), OR
   - Email + password
4. Create a new app:
   - Name: `EcoLink`
   - Network: **Polygon Amoy** (for testnet)
5. In the dashboard, click your app → **"API Key"** button
6. Copy the **HTTPS endpoint** to your `.env` file

```bash
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

Repeat for other networks you need (Arbitrum Sepolia, Base Sepolia, etc.)

---

## 4️⃣ Private Key (MetaMask)

⚠️ **IMPORTANT**: Never share your private key!

### Steps:
1. Open **MetaMask** browser extension
2. Click the **three dots** → **Account Details**
3. Click **"Show Private Key"**
4. Enter your password
5. Copy the key (WITHOUT the `0x` prefix)

```bash
PRIVATE_KEY=abc123... (no 0x prefix)
```

---

## 5️⃣ Get Testnet Tokens

You'll need some test MATIC/ETH to deploy contracts.

### Polygon Amoy Faucet:
- https://faucet.polygon.technology/
- Select **Amoy** network
- Paste your wallet address
- Get free test MATIC

### Arbitrum Sepolia Faucet:
- https://www.alchemy.com/faucets/arbitrum-sepolia
- Connect wallet
- Get free test ETH

---

## ✅ Complete .env Example

Once you have all keys, your `.env` file should look like:

```bash
# Private key (no 0x prefix)
PRIVATE_KEY=1234567890abcdef...

# Block Explorer APIs
POLYGONSCAN_API_KEY=ABCD1234...
ARBISCAN_API_KEY=EFGH5678...

# RPC URLs (Alchemy recommended)
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/your-key
ARBITRUM_SEPOLIA_RPC=https://arb-sepolia.g.alchemy.com/v2/your-key

# Frontend config
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-key
```

---

## 🚀 After Setup

```bash
# 1. Compile contracts
npx hardhat compile

# 2. Deploy to testnet
npx hardhat run scripts/deploy.js --network polygon_amoy

# 3. Verify contracts (optional)
npx hardhat verify --network polygon_amoy <CONTRACT_ADDRESS>
```

---

## Quick Links

| Service | Register | Login |
|---------|----------|-------|
| Polygonscan | https://polygonscan.com/register | https://polygonscan.com/login |
| Arbiscan | https://arbiscan.io/register | https://arbiscan.io/login |
| Basescan | https://basescan.org/register | https://basescan.org/login |
| Alchemy | https://auth.alchemy.com/signup | https://auth.alchemy.com/login |
| Polygon Faucet | https://faucet.polygon.technology | - |
