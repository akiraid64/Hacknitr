# 🌐 EcoLink - Complete System Flow Architecture

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [The Three Pillars: Manufacturer, Retailer, NGO](#the-three-pillars)
3. [Complete User Flows](#complete-user-flows)
4. [Database vs Blockchain: Why We Need Both](#database-vs-blockchain)
5. [Technical Architecture](#technical-architecture)
6. [AI & Prediction Engine](#ai--prediction-engine)
7. [Goodwill Token Economics](#goodwill-token-economics)
8. [Security & Verification](#security--verification)
9. [API Integration Points](#api-integration-points)

---

## Executive Summary

**EcoLink** is a circular supply chain platform that connects:
- **Manufacturers** → who create and track products
- **Retailers** → who manage inventory and predict demand
- **NGOs/Orphanages** → who receive near-expiry donations

The system prevents food waste, enables transparent tracking, rewards sustainable behavior with **Goodwill Tokens**, and uses **AI-powered demand forecasting** to optimize the entire supply chain.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EcoLink Circular Economy Flow                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐            │
│   │ MANUFACTURER│   →    │  RETAILER   │   →    │    NGO      │            │
│   │             │        │             │        │             │            │
│   │ Creates QR  │        │ Scans QR    │        │ Verifies    │            │
│   │ Tracks goods│        │ Manages inv │        │ donation    │            │
│   │ Ships batch │        │ AI forecast │        │ Issues token│            │
│   └─────────────┘        └─────────────┘        └─────────────┘            │
│         ↑                       ↑                      │                    │
│         │                       │                      │                    │
│         └───────────────────────┴──────────────────────┘                   │
│                     Goodwill Tokens + Transparency                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Pillars

### 🏭 1. Manufacturer Dashboard

**Who**: Factory/Production units, FMCG companies, Food producers

**What they do**:
| Action | Description |
|--------|-------------|
| **Create Product QR** | Enter GSTIN, Lot Number, Batch ID, Expiry Date, Item Count, Weight |
| **Generate GS1 Digital Link** | System creates standardized QR code URL |
| **Print QR on Carton** | Physical QR is affixed to shipping carton |
| **Track Shipments** | Monitor which retailers received which batches |
| **View Donation Analytics** | See how much product got donated vs wasted |

**Data Captured**:
```
┌────────────────────────────────────────┐
│ Manufacturer QR Code Contains:         │
├────────────────────────────────────────┤
│ • GSTIN (Tax ID)                       │
│ • GTIN (Global Trade Item Number)      │
│ • Batch/Lot Number                     │
│ • Manufacturing Date                   │
│ • Expiry Date (YYMMDD format)         │
│ • Quantity in Carton                   │
│ • Weight (KG)                          │
│ • Product Name                         │
│ • Manufacturer Wallet Address          │
└────────────────────────────────────────┘
```

**Manufacturer sees**:
- Total batches created
- Batches currently with retailers
- Items about to expire across all retailers
- Items donated to NGOs
- Carbon footprint avoided (from prevented waste)

---

### 🛒 2. Retailer Dashboard (Inventory Management System)

**Who**: Grocery stores, Supermarkets, Distributors, Kirana shops

**What they do**:

#### **A. Receiving Inventory**
```
Step 1: Carton arrives at store
        ↓
Step 2: Retailer scans QR code on carton
        ↓
Step 3: System shows batch details:
        • GTIN, Batch ID, Expiry Date
        • Expected Quantity
        ↓
Step 4: Retailer enters ACTUAL quantity received
        ↓
Step 5: Items are added to inventory database
        ↓
Step 6: Each item is now tracked under that batch
```

#### **B. Daily Operations (Selling)**
```
Customer buys item
        ↓
Retailer scans item barcode at checkout
        ↓
System automatically:
        • Deducts 1 from inventory
        • Records sale timestamp
        • Updates demand metrics
        • Triggers reorder if below threshold
```

#### **C. AI-Powered Demand Forecasting**

The system uses **LSTM Neural Networks** to predict future demand:

| Data Input | Source | Purpose |
|------------|--------|---------|
| Historical sales | Internal DB | Trend analysis |
| Weather forecast | Weather API | Seasonal demand |
| Festival calendar | Calendar API | Holiday spikes |
| Local events | External API | Event-based demand |
| Day of week | System | Weekly patterns |
| Competitor pricing | Optional | Price elasticity |

**Prediction Output**:
```
┌──────────────────────────────────────────────────────────────┐
│ DEMAND FORECAST: Next 7 Days                                 │
├──────────────────────────────────────────────────────────────┤
│ Product: Britannia Bread 400g                                │
│ Current Stock: 45 units                                      │
│ Predicted Sales: 120 units                                   │
│ Recommended Order: 85 units                                  │
│                                                              │
│ Factors:                                                     │
│ • Weekend approaching (+20% demand)                          │
│ • Rainy weather forecast (-5% footfall)                      │
│ • No festivals this week (baseline)                          │
│                                                              │
│ [✅ Approve Order]  [✏️ Modify]  [❌ Cancel]                  │
└──────────────────────────────────────────────────────────────┘
```

#### **D. Subscription Mode**

Retailers can enable **auto-ordering**:
- System monitors stock levels continuously
- When stock falls below safety threshold, order is auto-generated
- Considers next month's weather + festivals
- Manufacturer receives order notification in advance
- Retailer can override anytime

#### **E. Expiry Management**

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ EXPIRY ALERTS                                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 🔴 CRITICAL (<2 days)                                          │
│ ├── Amul Butter 100g (40 units) - Expires TOMORROW            │
│ └── [📍 Find Nearby NGOs]  [🎁 Donate Now]                    │
│                                                                │
│ 🟡 WARNING (3-7 days)                                          │
│ ├── Parle-G Biscuits (25 units) - Expires in 5 days           │
│ └── [💸 Add to Discount Rack]                                 │
│                                                                │
│ 🟢 HEALTHY (>7 days)                                          │
│ └── 342 items in good condition                               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 🏛️ 3. NGO/Orphanage Dashboard

**Who**: Registered NGOs, Orphanages, Old Age Homes, Community Kitchens

#### **A. NGO Verification Process**

This is the most critical security feature. NGOs must be **verified** before they can receive donations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NGO VERIFICATION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: NGO registers with:                                                 │
│          • Name, Registration Number, Address                                │
│          • FCRA/12A/80G Certificate Number                                   │
│          • Contact Person & Phone                                            │
│                                                                              │
│  Step 2: GEMINI GROUNDING VERIFICATION                                       │
│          ┌────────────────────────────────────────────────────────┐         │
│          │ AI searches the web to verify:                         │         │
│          │ • Does this NGO exist on govt databases?              │         │
│          │ • Is the registration number valid?                    │         │
│          │ • Is it listed on NGO Darpan (govt portal)?            │         │
│          │ • Any news articles about this organization?           │         │
│          │ • Trustpilot/Google reviews if any                     │         │
│          └────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Step 3: LOCATION VERIFICATION                                               │
│          ┌────────────────────────────────────────────────────────┐         │
│          │ NGO must enable GPS location                           │         │
│          │ • Device GPS coordinates captured                      │         │
│          │ • Must match registered address (within 500m)          │         │
│          │ • Prevents fake NGOs claiming different locations      │         │
│          └────────────────────────────────────────────────────────┘         │
│                                                                              │
│  Step 4: MANUAL REVIEW (if needed)                                           │
│          • Platform admin reviews edge cases                                 │
│          • Video call verification for large NGOs                            │
│                                                                              │
│  ✅ VERIFIED NGO BADGE                                                       │
│          • Green checkmark on profile                                        │
│          • Visible to all retailers in area                                  │
│          • Can now receive donations                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### **B. Receiving Donations**

```
Retailer clicks "Donate" on expiring items
        ↓
App shows nearby verified NGOs (sorted by distance)
        ↓
Retailer selects NGO and schedules pickup/drop-off
        ↓
Retailer physically delivers items to NGO
        ↓
NGO opens their app → Shows unique QR code
        ↓
Retailer scans NGO's QR code
        ↓
NGO confirms items received (quantity, condition)
        ↓
BLOCKCHAIN RECORDS:
        • Donation verified with dual signatures
        • Goodwill Tokens minted to retailer
        • Manufacturer notified of donation
        ↓
Retailer receives Goodwill Tokens ✅
```

#### **C. NGO Dashboard Features**

| Feature | Description |
|---------|-------------|
| Pending Donations | See incoming donations from nearby retailers |
| Verification QR | Unique QR for confirming receipt |
| Item Inventory | Track received items |
| Impact Report | Total food saved, people fed |
| Token History | Bonus tokens for being active |

---

## Database vs Blockchain: Why We Need Both

> **💡 Mentor's Question**: "Why blockchain when we can use a database?"

### The Answer: TRUST and TRANSPARENCY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE vs BLOCKCHAIN COMPARISON                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐        ┌─────────────────────────┐            │
│  │ SQLITE/POSTGRESQL       │        │ POLYGON BLOCKCHAIN      │            │
│  │ (Fast, Mutable)         │        │ (Slow, Immutable)       │            │
│  ├─────────────────────────┤        ├─────────────────────────┤            │
│  │ ✅ User profiles        │        │ ✅ Batch ownership      │            │
│  │ ✅ Session management   │        │ ✅ Donation records     │            │
│  │ ✅ Real-time inventory  │        │ ✅ Goodwill Tokens      │            │
│  │ ✅ AI predictions       │        │ ✅ Audit trail          │            │
│  │ ✅ Weather/calendar     │        │ ✅ Inter-party trust    │            │
│  │ ✅ Scan history         │        │ ✅ Token rewards        │            │
│  └─────────────────────────┘        └─────────────────────────┘            │
│                                                                              │
│  USE CASE: "Who modified       USE CASE: "Prove this donation              │
│  inventory last?"              happened and can't be faked"                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Blockchain is NECESSARY Here:

#### 1. **Multi-Party Trust Problem**
```
Problem: Manufacturer says "I sent 100 units"
         Retailer says "I only got 80 units"
         Who is lying?

Blockchain: Both parties sign the transaction.
            Immutable record shows exactly what was sent.
            No one can change history.
```

#### 2. **Donation Fraud Prevention**
```
Problem: Retailer claims "I donated 500kg to X NGO"
         But actually threw it away (to get tax benefits)

Blockchain: Donation requires BOTH signatures:
            1. Retailer initiates
            2. NGO confirms receipt
            Only then tokens are minted.
            Can't fake a donation.
```

#### 3. **Token Value & Tradability**
```
Problem: "Goodwill Points" in a database can be:
         • Inflated by admin
         • Duplicated
         • Not truly owned by user

Blockchain: Tokens are:
            • Cryptographically owned by wallet
            • Cannot be duplicated (like Bitcoin)
            • Can be traded on exchanges
            • Have real monetary value
```

#### 4. **Auditability for Regulators**
```
Problem: Food Safety Inspectors need to verify:
         "Were expired items actually donated or dumped?"

Blockchain: Public, verifiable record
            Inspector can independently verify
            No "lost records" or "server crashed"
```

### The Hybrid Architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID DATA ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         ┌───────────────┐                                   │
│                         │   FRONTEND    │                                   │
│                         └───────┬───────┘                                   │
│                                 │                                           │
│              ┌──────────────────┴──────────────────┐                       │
│              │                                     │                        │
│              ▼                                     ▼                        │
│    ┌─────────────────┐                  ┌─────────────────┐                │
│    │   SQLite/API    │                  │   Blockchain    │                │
│    │   (Backend)     │                  │   (Polygon)     │                │
│    └────────┬────────┘                  └────────┬────────┘                │
│              │                                   │                          │
│    STORES:                               STORES:                            │
│    • User authentication                 • Batch ownership (NFT)           │
│    • Session tokens                      • Donation verification           │
│    • Real-time inventory                 • Goodwill Token balances         │
│    • AI model state                      • ESG Soulbound certificates      │
│    • Weather cache                       • Audit trail (immutable)         │
│    • Demand predictions                  • Cross-party agreements          │
│    • Scan logs                                                             │
│                                                                             │
│    SPEED: <10ms                          SPEED: 2-10 seconds               │
│    MUTABILITY: Yes                       MUTABILITY: No                    │
│    TRUST: Single server                  TRUST: Decentralized              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Write to Blockchain vs Database:

| Event | Database | Blockchain | Why |
|-------|----------|------------|-----|
| User login | ✅ | ❌ | Sessions need speed, no trust issue |
| Add item to inventory | ✅ | ❌ | Internal operation, needs speed |
| Create new batch | ✅ | ✅ | Need permanent record of creation |
| Retailer claims batch | ✅ | ✅ | Ownership transfer = trust needed |
| Daily sales scan | ✅ | ❌ | Too frequent, no trust issue |
| Mark for donation | ✅ | ✅ | Legal record of intent |
| NGO verifies donation | ✅ | ✅ | **Critical** - token minting |
| AI prediction result | ✅ | ❌ | Changes constantly, internal use |
| Issue Goodwill Token | ❌ | ✅ | Must be on-chain for value |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPLETE SYSTEM ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND LAYER                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐       │    │
│  │  │Manufacturer│  │ Retailer  │  │    NGO    │  │ Dashboard │       │    │
│  │  │   Portal  │  │  Portal   │  │  Portal   │  │ (Admin)   │       │    │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘       │    │
│  │                         Next.js + React                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        API LAYER (FastAPI)                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │   Auth   │  │ Inventory│  │ GS1/QR   │  │   AI     │           │    │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │           │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│              ┌──────────────────────┴─────────────────────┐                │
│              │                                            │                 │
│              ▼                                            ▼                 │
│  ┌─────────────────────┐                      ┌─────────────────────┐     │
│  │   SQLite Database   │                      │  Polygon Blockchain  │     │
│  │                     │                      │                     │      │
│  │ • users             │                      │ • SupplyChainBatch  │      │
│  │ • products          │                      │ • GoodwillToken     │      │
│  │ • inventory         │                      │ • DonationVerifier  │      │
│  │ • scans             │                      │ • ESGSoulbound      │      │
│  │ • predictions       │                      │                     │      │
│  │ • sessions          │                      │                     │      │
│  └─────────────────────┘                      └─────────────────────┘     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      EXTERNAL INTEGRATIONS                          │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │ Weather API│  │Calendar API│  │ Gemini AI  │  │ NGO Darpan  │   │    │
│  │  │(OpenWeather)│  │ (Calendarific)│  │ (Grounding)│  │(Verification)│   │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI & Prediction Engine

### LSTM Demand Forecasting Model

```python
# Simplified Model Architecture
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEMAND PREDICTION PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT FEATURES:                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Historical sales (last 90 days, per product)                      │    │
│  │ • Day of week (0-6, one-hot encoded)                                │    │
│  │ • Month (1-12, cyclical encoding)                                   │    │
│  │ • Weather: Temperature, Rain probability, Humidity                   │    │
│  │ • Festivals: Binary flag (is_festival, festival_type)               │    │
│  │ • Events: Local events, school holidays                              │    │
│  │ • Price: Current price, discount percentage                          │    │
│  │ • Stock level: Current inventory                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         LSTM NEURAL NETWORK                         │    │
│  │                                                                     │    │
│  │   Input Layer (n features) → LSTM(128) → Dropout(0.2)              │    │
│  │                            → LSTM(64)  → Dropout(0.2)              │    │
│  │                            → Dense(32) → ReLU                       │    │
│  │                            → Dense(7)  → Output (7-day forecast)    │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│                                     ▼                                       │
│  OUTPUT:                                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ • Predicted sales for next 7 days (per product)                    │    │
│  │ • Confidence interval (low, medium, high)                          │    │
│  │ • Recommended order quantity                                        │    │
│  │ • Optimal reorder date                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Real-Time Database Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONTINUOUS DATABASE SYNC                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Every inventory change triggers:                                            │
│                                                                              │
│  1. UPDATE local SQLite                                                      │
│  2. NOTIFY WebSocket clients (real-time UI update)                          │
│  3. CHECK if reorder threshold reached                                       │
│  4. UPDATE AI model input (if significant change)                           │
│  5. LOG to audit trail                                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Retailer scans barcode                                              │   │
│  │         ↓                                                            │   │
│  │  POST /api/inventory/deduct                                          │   │
│  │         ↓                                                            │   │
│  │  Database: UPDATE products SET quantity = quantity - 1               │   │
│  │         ↓                                                            │   │
│  │  WebSocket: broadcast({ type: 'INVENTORY_UPDATE', product_id, qty }) │   │
│  │         ↓                                                            │   │
│  │  AI Service: append to prediction_queue                              │   │
│  │         ↓                                                            │   │
│  │  If quantity < threshold: trigger_reorder_suggestion()               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Goodwill Token Economics

### Token Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOODWILL TOKEN ($GOOD) FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌─────────────────────┐                            │
│                          │  Donation Happens   │                            │
│                          └──────────┬──────────┘                            │
│                                     │                                       │
│                                     ▼                                       │
│                     ┌───────────────────────────────┐                       │
│                     │   NGO Verifies Receipt        │                       │
│                     │   (Scans Retailer's QR)       │                       │
│                     └───────────────┬───────────────┘                       │
│                                     │                                       │
│                                     ▼                                       │
│                     ┌───────────────────────────────┐                       │
│                     │   Smart Contract Validates    │                       │
│                     │   • Both parties signed       │                       │
│                     │   • Batch is marked for donation │                     │
│                     │   • NGO is verified           │                       │
│                     └───────────────┬───────────────┘                       │
│                                     │                                       │
│              ┌──────────────────────┼──────────────────────┐               │
│              │                      │                      │                │
│              ▼                      ▼                      ▼                │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐       │
│   │ RETAILER RECEIVES │   │ NGO RECEIVES     │   │ MANUFACTURER     │       │
│   │ $GOOD Tokens      │   │ Referral Bonus   │   │ Gets Notification│       │
│   │                   │   │                  │   │                  │       │
│   │ Amount based on:  │   │ 5% of donation   │   │ "40 units of X   │       │
│   │ • Weight donated  │   │ value in $GOOD   │   │  donated by      │       │
│   │ • Items saved     │   │                  │   │  Retailer Y"     │       │
│   │ • Expiry proximity│   │                  │   │                  │       │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Non-Volatile Tokens Matter

| Property | Database Points | Blockchain Tokens |
|----------|----------------|-------------------|
| **Ownership** | Stored in our server | In user's crypto wallet |
| **Duplication** | Admin could create fake | Cryptographically impossible |
| **Trading** | Can't transfer | Can sell on exchanges |
| **Verification** | Trust our server | Anyone can verify |
| **Persistence** | We delete = gone | Exists forever on chain |
| **Value** | Arbitrary points | Real market value |

### Token Utility

```
$GOOD Tokens can be used for:
├── Tax Benefits (documentation for CSR compliance)
├── Trade on Decentralized Exchanges
├── Redeem for discounts from participating manufacturers
├── Build ESG Score (Soulbound NFT certificate)
└── Priority access to new product batches
```

---

## Security & Verification

### Complete Verification Matrix

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| **NGO Exists** | Gemini Grounding | Found on govt websites |
| **Registration Valid** | NGO Darpan API | Certificate number matches |
| **Location Match** | GPS + Address API | Within 500m of registered |
| **Active Status** | Grounding Search | No "blacklisted" mentions |
| **Identity** | Manual Review | Video call for large NGOs |

### Anti-Fraud Measures

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRAUD PREVENTION SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. FAKE NGO PREVENTION                                                      │
│     • Gemini grounding checks govt databases                                 │
│     • GPS must match registered address                                      │
│     • Phone OTP verification                                                 │
│     • Manual admin review for suspicious cases                               │
│                                                                              │
│  2. DOUBLE-DONATION PREVENTION                                               │
│     • Each batch has unique ID                                               │
│     • Once donated, batch is burned (unusable)                               │
│     • Blockchain prevents re-donation                                        │
│                                                                              │
│  3. FAKE QUANTITY PREVENTION                                                 │
│     • Retailer enters quantity                                               │
│     • NGO must confirm same quantity                                         │
│     • Mismatch triggers investigation                                        │
│     • Weight verification at NGO side                                        │
│                                                                              │
│  4. COLLUSION PREVENTION                                                     │
│     • Random spot checks by platform                                         │
│     • AI pattern detection for unusual behavior                              │
│     • Reputation scores for all parties                                      │
│     • Community reporting mechanism                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Integration Points

### External APIs Used

| API | Purpose | Endpoint |
|-----|---------|----------|
| **OpenWeather** | Weather forecast | `api.openweathermap.org/data/2.5/forecast` |
| **Calendarific** | Festival calendar | `calendarific.com/api/v2/holidays` |
| **Gemini** | NGO verification grounding | `generativelanguage.googleapis.com` |
| **NGO Darpan** | Official NGO registry | `ngodarpan.gov.in` (scraping/API) |
| **Google Maps** | Location verification | `maps.googleapis.com` |
| **Polygon RPC** | Blockchain calls | `polygon-rpc.com` |

---

## Complete User Journey Flows

### Flow 1: Manufacturer Creates Batch

```
Manufacturer logs in
        ↓
Enters product details:
• GSTIN, GTIN, Batch ID
• Expiry Date, Quantity, Weight
        ↓
Clicks "Generate QR Code"
        ↓
System creates GS1 Digital Link URL
        ↓
System mints Batch NFT on blockchain
        ↓
QR code displayed for printing
        ↓
Manufacturer prints QR, sticks on carton
        ↓
Ships to retailer
        ↓
Dashboard shows "In Transit" status
```

### Flow 2: Retailer Receives & Sells

```
Carton arrives at store
        ↓
Retailer opens app → "Receive Shipment"
        ↓
Scans QR on carton
        ↓
App shows: "Batch ABC123 - Britannia Bread"
           "Expected: 50 units | Expiry: 2026-01-15"
        ↓
Retailer counts and enters actual quantity: 48
        ↓
System records receiving (2 missing = transit damage)
        ↓
Items added to inventory
        ↓
[Later at checkout]
        ↓
Customer buys bread
        ↓
Retailer scans barcode
        ↓
System deducts 1 from inventory
        ↓
Sale recorded for AI training
```

### Flow 3: Expiry Alert & Donation

```
System detects: "40 units expire in 2 days"
        ↓
Push notification to retailer
        ↓
Retailer opens app → "Expiry Alerts"
        ↓
Clicks "Find Nearby NGOs"
        ↓
Map shows verified NGOs within 5km
        ↓
Selects "Hope Foundation (★★★★★)"
        ↓
Clicks "Initiate Donation"
        ↓
Drives to NGO with items
        ↓
NGO worker opens app → Shows QR code
        ↓
Retailer scans NGO's verification QR
        ↓
Both confirm: "40 units Britannia Bread"
        ↓
Blockchain: 
  • Donation recorded permanently
  • Goodwill Tokens minted to retailer
  • Manufacturer notified
        ↓
Retailer wallet: +400 $GOOD tokens
NGO bonus: +20 $GOOD tokens
Food saved from landfill! ✅
```

### Flow 4: AI Recommends Reorder

```
Every night at 2 AM:
        ↓
AI service runs prediction for each product
        ↓
Fetches: Historical sales, Weather forecast, Upcoming festivals
        ↓
LSTM model predicts: "Next 7 days: 120 units needed"
        ↓
Current stock: 45 units
        ↓
Safety stock: 20 units
        ↓
Recommended order: 120 - 45 + 20 = 95 units
        ↓
Morning 8 AM:
        ↓
Retailer sees notification: "Reorder Suggestion"
        ↓
Reviews AI reasoning:
  "Holi festival in 5 days (+30% demand expected)
   Weekend approaching (+15% footfall)
   Clear weather forecast"
        ↓
[✅ Approve] - Order sent to manufacturer
[✏️ Modify] - Change quantity
[❌ Skip] - Ignore suggestion
        ↓
If approved: Manufacturer receives auto-order
```

---

## Ecosystem Benefits

### For Manufacturers
- **Visibility**: Track products through entire lifecycle
- **Waste Analytics**: Know exactly how much got donated vs dumped
- **Demand Insights**: Aggregated demand data from retailers
- **ESG Compliance**: Verifiable sustainability metrics

### For Retailers
- **Smart Inventory**: AI-powered reordering
- **Zero Manual Entry**: Scan-based operations
- **Revenue from Waste**: Goodwill Tokens for donations
- **Liability Protection**: Proof of safe donation

### For NGOs
- **Free Food**: Regular supply from nearby retailers
- **Verification**: Trusted status brings more donations
- **Bonus Tokens**: Incentive for active participation
- **Impact Metrics**: Quantified social impact

### For Society
- **Reduced Food Waste**: Near-expiry food reaches those in need
- **Lower Carbon Footprint**: Less landfill, less methane
- **Transparent Supply Chain**: Anyone can verify donation claims
- **Circular Economy**: Waste becomes value

---

## Summary

EcoLink creates a **self-sustaining circular economy** where:

1. **Manufacturers** gain end-to-end visibility and ESG metrics
2. **Retailers** reduce waste with AI predictions and earn tokens for donations
3. **NGOs** receive verified, traceable food donations
4. **Blockchain** provides trust between all parties
5. **AI** optimizes the entire supply chain

The combination of **database (speed)** and **blockchain (trust)** creates a system that is both **practical** and **provably transparent**.

---

*Document Version: 1.0*  
*Last Updated: January 3, 2026*
