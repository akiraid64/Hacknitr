# ✅ GOODWILL Token Economics

## Formula
```
Market Price (₹) × 0.00001 = GOODWILL Tokens
```

## Examples
- Donate ₹1,000 bread → Earn **0.01 GOODWILL**
- Donate ₹5,000 bulk food → Earn **0.05 GOODWILL**
- Donate ₹10,000 products → Earn **0.1 GOODWILL**

## Purpose
Tokens are **symbolic/prestige-based**, not profit-driven. They represent social impact and community contribution!

---

## Test Accounts

### Dummy NGO (For Testing)
- **Email:** `test@ngo.org`
- **Password:** `test123`
- **Status:** UNVERIFIED (Test Mode)
- **Badge:** 🧪 TEST MODE
- **Note:** No real Gemini API calls, simulated tokens

### Retailer Accounts
- **Big Bazaar:** `bigbazaar@retail.com` / `password123`
- **DMart:** `dmart@retail.com` / `password123`

### Manufacturer Accounts
- **Britannia:** `factory@britannia.com` / `password123`
- **Amul:** `factory@amul.com` / `password123`

---

## How It Works

### Retailer Creates Donation
1. Retailer marks items near expiry for donation
2. System generates donation QR code
3. Retailer notifies NGO

### NGO Scans & Confirms
1. NGO scans QR code → Product details load
2. NGO enters quantity received
3. System processes:
   - 🔍 Scans QR
   - ✅ Identifies product
   - 💰 Checks market price (Gemini in Phase 4)
   - 🧮 Calculates GOODWILL tokens
4. **Retailer earns GOODWILL tokens!**

### Market Price Lookup (Phase 4)
Currently using estimates:
- Bread: ₹40
- Butter 500g: ₹250
- Biscuits: ₹30
- Rice/kg: ₹80

Will be replaced with Gemini grounding search.

---

## Token Balance
Stored in `goodwill_tokens` table:
- `user_id` → Retailer
- `balance` → Current GOODWILL
- `total_earned` → Lifetime earnings
- `last_updated` → Timestamp
