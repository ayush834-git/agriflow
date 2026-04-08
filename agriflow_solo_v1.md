# AgriFlow — SOLO BUILD SPEC v1.0
### "The Intelligence Layer That Moves India's Crops to Where They're Needed"
### Google Solution Challenge 2026 — Solo Build, 122 Hours
### STATUS: DEFINITIVE. VISION-FAITHFUL. SOLO-FEASIBLE.

> Audit note (2026-04-08): checked items below are only what is verifiable from
> this repo and local validation. Live service provisioning, external delivery,
> user interviews, and submission work stay unchecked unless there is direct
> evidence in the project.

---

> "A farmer in Kurnool sells tomatoes at ₹3/kg because he doesn't know Hyderabad
>  is paying ₹18/kg and running out.
>  A cold storage owner in Guntur watches 40 tonnes of onions rot
>  because he doesn't know Vijayawada is desperately short.
>  AgriFlow tells both of them — in real time — in their language — on their phone."

---

# PART A — VISION & CORE IDEA

---

## A1. THE CENTRAL PROBLEM (In Your Own Words)

India's agricultural supply chain bleeds at two open wounds simultaneously:

**Wound 1 — The Farmer's Wound:**
A farmer harvests his crop with zero visibility into what other districts are paying. He sells cheap at his local mandi because ten other farmers in his taluk harvested the same crop the same week and supply is crushing price. Meanwhile, 200 km away, a retailer is paying ₹3x more because that crop is scarce there. The farmer never knew. He can't know — there's no system that tells him. So he sells at whatever the middleman offers.

**Wound 2 — The Spoilage Wound:**
A cold storage owner, an FPO coordinator, or a small aggregator has inventory. They know their stock has a deadline. But they don't know where to move it. They don't have the cross-district price intelligence to make that call. So inventory sits, spoils, or gets dumped at a loss to a local middleman who does have that intelligence — and pockets the difference.

**AgriFlow's Answer:**
A real-time, AI-powered price gap visibility system — delivered through every channel a farmer or supplier actually uses (WhatsApp, SMS, voice call, web dashboard) — that tells:
- **Farmers** exactly where their crop is scarce and fetching high prices, so they can sell there (directly or via FPO) instead of dumping locally
- **FPOs and cold storage suppliers** which routes are most profitable right now, where inventory needs to move before it spoils, and which buyers are ready

The net effect: supply flows toward scarcity. Prices stabilize across regions. Farmers earn more. Consumers pay less. Waste drops. Middlemen lose their information monopoly.

---

## A2. WHY THIS IS TWO PROBLEM STATEMENTS IN ONE

AgriFlow is a natural intersection of PS3 (Smart Supply Chains) and PS5 (Smart Resource Allocation):

| PS3 — Smart Supply Chains | PS5 — Smart Resource Allocation |
|--------------------------|----------------------------------|
| Detect supply disruptions before they cascade | Match available resources (crop inventory) to urgent needs |
| Recommend optimized routes for goods | Connect the right supplier to the right district |
| Analyze transit and price data continuously | Gather scattered info, show most urgent needs |
| Preempt bottlenecks (oversupply + spoilage) | Match available FPOs/cold storage to the tasks that need them most |

AgriFlow addresses both by treating **crop inventory as a resource** and **price gaps as the signal for misallocation.** One system, two SDG problem statements, one coherent solution.

---

## A3. THE TWO USERS AND THEIR ACTUAL NEEDS

### User 1: The Farmer (Ramu, 42, Kurnool district)
- Has a dumbphone or basic Android
- Speaks Telugu, no English
- Calls IVIVR numbers, uses WhatsApp voice notes, receives SMS alerts
- **What he needs:** "Where should I sell my 300 kg of tomatoes today? Who's paying best? Should I wait or sell now?"
- **What he gets from AgriFlow:** A WhatsApp message (or SMS or voice response) telling him: "Hyderabad mandi is paying ₹16/kg for tomato today — ₹11 more than Kurnool. 3 FPOs near you can transport within 48 hours. Shall I connect you?"

### User 2: The FPO Coordinator / Supplier / Cold Storage Owner (Suresh, 35, Guntur)
- Has a smartphone and basic internet
- Uses a web dashboard
- Controls supply for hundreds of farmers or owns cold storage capacity
- **What he needs:** "Where should I move my 40 tonnes of onions? My cold storage deadline is in 6 days. Which district is short? What's the transport cost vs price gap profit?"
- **What he gets from AgriFlow:** A dashboard showing live price gaps across districts with color-coded opportunity scores, cold storage deadline alerts, and AI-generated movement recommendations with profit estimates

---

## A4. HOW AGRIFLOW SPREADS PRICES EVENLY (The Core Mechanism)

```
STEP 1: DATA INGESTION (Continuous)
  Agmarknet API → crop prices across 3000+ mandis → stored per district
  IMD Weather API → spoilage risk signals per district
  
STEP 2: GAP DETECTION (Every 30 min via Vercel Cron)
  For each crop × district pair:
    Calculate: price_gap = max_price_any_district - local_price
    Calculate: demand_signal = price_trend + arrival_shortfall + weather_risk
    Calculate: opportunity_score = price_gap × demand_strength × transport_feasibility
    
STEP 3: FARMER ALERT (Push → WhatsApp/SMS)
  IF farmer.crop IN high_opportunity_crops for farmer.district:
    → Generate Gemini alert in farmer.language
    → Send via WhatsApp bot / SMS
    → "Tomato is ₹14/kg more in Hyderabad right now. 
       Arrivals there are 60% below last week. 
       Best time to sell there: next 3 days."

STEP 4: FPO DASHBOARD (Pull → Web)
  FPO/Supplier logs into dashboard
  Sees: heat map of price gaps across AP/Telangana/Karnataka
  Sees: their own inventory with spoilage deadlines
  Gets: AI route recommendations — "Move 20T to Bengaluru. 
         Estimated profit after transport: ₹34,000. 
         3 verified buyers ready."

STEP 5: SUPPLY MOVES → PRICES EQUALIZE
  As FPOs route supply to high-price districts:
    Supply ↑ there → prices ease for consumers
    Supply ↓ locally → prices rise slightly for local farmers
  Over time: cross-district prices converge
  Farmers earn more. Consumers pay fair price. Waste drops.
```

---

## A5. SDG MAPPING (GDG Judging Requirement)

| SDG | Sub-target | How AgriFlow Hits It | Measurable Metric |
|-----|-----------|---------------------|-------------------|
| SDG 2 — Zero Hunger | 2.3 — double small farmer incomes | Price gap visibility → farmers earn 2-3x local mandi price | Avg. price differential captured per transaction |
| SDG 2 — Zero Hunger | 2.1 — food access for all | Distributing supply to shortage regions → prices moderate | Districts where prices drop after supply routing |
| SDG 12 — Responsible Production | 12.3 — halve food waste | Cold storage deadline alerts → inventory moved before spoilage | Tonnes diverted from spoilage per month |
| SDG 10 — Reduced Inequalities | 10.1 — bottom 40% income growth | Democratizing market intel that only middlemen had | Farmer income delta vs mandi baseline |
| SDG 8 — Decent Work | 8.3 — formalize value chains | FPO coordination layer → formal supply routing replaces informal middlemen | % transactions via formal FPO vs middleman |

**Primary: SDG 2 + SDG 12. Present these first in the video.**

---

# PART B — WHAT YOU BUILD (SOLO, 122 HOURS)

---

## B1. THE THREE PILLARS (Non-Negotiable Core)

```
PILLAR 1: PRICE GAP INTELLIGENCE ENGINE
  What: Real-time cross-district price comparison + opportunity scoring
  Why it matters: This IS the product. Everything else serves this.
  Tech: Agmarknet API → Supabase → Gemini analysis → served via API

PILLAR 2: FARMER CHANNELS (WhatsApp + SMS + Simple Dashboard)
  What: Farmers query prices, get alerts, see where to sell
  Why it matters: No UI = no farmer adoption = no judges impressed
  Tech: Twilio WhatsApp webhook → Next.js API → Gemini response

PILLAR 3: FPO/SUPPLIER INTELLIGENCE DASHBOARD
  What: Web dashboard showing price gap map, inventory, opportunity routes
  Why it matters: FPOs are the execution layer — they move the supply
  Tech: Next.js + Google Maps JS API + Supabase Realtime
```

---

## B2. FULL FEATURE LIST (Solo Buildable)

### FARMER FEATURES

**F1. WhatsApp Bot (Core)**
- Natural language queries: "tomato price today", "where to sell onions", "should I sell now or wait"
- Voice note support: Twilio receives → Gemini transcribes + responds
- Price check: returns local mandi price + best price anywhere in state + gap
- Sell/Hold/Move recommendation: Gemini-generated, in Telugu/Hindi
- Alert subscription: farmer registers crop + gets daily alert if price gap > threshold
- Language: Telugu, Hindi, English

**F2. SMS Bot (Fallback for Feature Phones)**
- Commands: `PRICE TOMATO`, `SELL ONION`, `BEST TOMATO`, `ALERT ONION 500`
- Returns: short price snapshot + best district + action in one SMS
- Alert delivery for farmers who opt in

**F3. Farmer Web Dashboard (Simple PWA)**
- Home: Today's local prices for registered crops
- Price Gap Screen: My crop's best price across all districts (bar chart)
- Best Time to Sell: 7-day forecast with Gemini explanation
- Find FPO: Map showing nearby FPOs who can transport my crop
- My Transactions: History + earnings vs local mandi baseline (Profit Tracker)

---

### FPO / SUPPLIER FEATURES

**S1. Supply-Demand Heatmap Dashboard**
- Google Maps with district-level overlays:
  - 🟢 Green: surplus districts (high supply, lower prices)
  - 🔴 Red: deficit districts (low supply, high prices, high opportunity)
  - Circle size = price gap magnitude
  - Click district: see crop-wise breakdown, arrival trends
- Filter by crop, time period, state

**S2. Inventory Management**
- Register inventory: crop, quantity, location, storage type, deadline date
- Auto spoilage risk: Gemini + IMD weather calculates risk score as deadline approaches
- Alert: 3 days before deadline → WhatsApp/email alert to FPO coordinator

**S3. Movement Opportunity Engine**
- For each FPO inventory item, AI generates:
  - Top 3 destination districts with current prices
  - Estimated transport cost (distance-based)
  - Estimated net profit after transport
  - Confidence level (based on data freshness + market stability)
  - Urgency (days before price window closes)
- "Connect Me" → show verified buyers in target district

**S4. Buyer-Seller Matching**
- Farmer posts listing: crop, qty, price ask, available date
- FPO/retailer browser: filter by crop, district, quantity, price
- AI Match Score: Gemini scores compatibility (price gap + distance + freshness)
- Contact via WhatsApp: one-tap intro message drafted by AI

**S5. Cold Storage Deadline Board**
- Dashboard widget: all registered inventory sorted by deadline (soonest first)
- Status: Green (plenty of time) → Yellow (3-5 days) → Red (≤2 days)
- For each red item: AI generates emergency movement plan

---

### AI ENGINE FEATURES

**AI1. Price Gap Analysis**
- Every 30 mins: fetch Agmarknet data, compute pairwise price gaps for top 20 crops × all AP/Telangana/Karnataka districts
- Store as opportunity matrix in Supabase
- Flag: any gap > ₹5/kg as HIGH OPPORTUNITY

**AI2. Explainable Recommendations**
- Every recommendation includes plain-language reason:
  "Hyderabad tomato prices are ₹14 higher because arrivals dropped 60% this week due to heavy rain in Chittoor. The price window will likely hold for 3-5 more days."
- Critical for GDG judging: shows AI is meaningful, not decorative

**AI3. Best Time to Sell**
- 7-day price forecast using recent trend data + seasonal patterns + IMD weather
- Displayed as simple line chart: "Expected price range: ₹8-12 over next 7 days. Best window: Day 3-4"
- Powered by Gemini with historical data context

**AI4. Spoilage Risk Scorer**
- Input: crop type + storage conditions + IMD forecast for district
- Output: risk score 0-100 + recommended action
- Triggers: alert if risk > 70

**AI5. Multilingual Response Engine**
- All WhatsApp/SMS responses generated by Gemini in user's registered language
- Supported: Telugu (te), Hindi (hi), English (en), Kannada (kn)

---

## B3. TECH STACK (Lean & Impressive)

### Why This Stack
Kafka and n8n from v3 were powerful but require 4 people to manage. This stack achieves the same observability and automation with Supabase Realtime + Vercel Cron — equally impressive to judges, 60% less infrastructure complexity to solo-build and maintain.

### Frontend
```
Next.js 14 (App Router)     — PWA, SSR, API routes — one repo does everything
TypeScript                  — Strict mode
Tailwind CSS                — Styling
shadcn/ui                   — Components (Radix-based, accessible out of box)
Recharts                    — Price charts, forecast lines, trend charts
Google Maps JS API          — Supply-demand heatmap ← KEY GOOGLE TECH
next-pwa + Workbox          — PWA manifest, offline support, installable
Framer Motion               — Smooth transitions, alert animations
React Query                 — Data fetching + caching
```

### Backend (All Next.js API Routes — No Separate Server)
```
Next.js API Routes          — All endpoints, serverless on Vercel
Vercel Cron Jobs            — Price fetching (every 30 min), spoilage checks (every 6h), daily reports (8am)
Supabase                    — Postgres DB + Realtime WebSockets + Row Level Security
  supabase-js               — Client library
  Supabase Edge Functions   — Heavy async jobs (ML calls, batch notifications)
Redis (Upstash free)        — WhatsApp session state, rate limiting, price cache
  @upstash/redis            — Serverless Redis client (zero cold start)
```

### AI
```
Gemini 2.0 Flash            — NLU, WhatsApp responses, recommendations, translation
                              explanations, spoilage scoring, negotiation drafts
Gemini 1.5 Pro (limited)    — Complex market analysis, FPO reports, best-time-to-sell
@google/generative-ai       — Official SDK
Google AI Studio key        — 60 req/min free → adequate for demo + light use
```

> **Suggestion:** Use Gemini Flash for all WhatsApp/SMS responses (fast, cheap) and Pro only for the FPO dashboard's deep analysis view. This stretches your Pro quota.

### Communication
```
Twilio WhatsApp Sandbox     — Primary farmer interface (free in sandbox)
Twilio SMS                  — Feature phone fallback
Resend                      — FPO email reports (100/day free)
Web Push API                — PWA push notifications for supplier alerts
```

### Data Sources (All Free)
```
Agmarknet / data.gov.in     — Crop prices across 3000+ mandis (official govt API)
IMD Weather API             — District weather forecasts, rainfall alerts
Google Maps JS API          — Heatmap, geocoding, distance matrix
```

### Auth
```
Clerk                       — OTP for farmers (phone), Google OAuth for FPOs
                              publicMetadata.role: FARMER | FPO | SUPPLIER
                              publicMetadata.language: te | hi | en | kn
                              publicMetadata.district: for price routing
```

### Deployment
```
Vercel (Hobby free)         — Next.js PWA + API routes + Cron
Supabase (free tier)        — 500MB DB, 50k MAU, Realtime
Upstash Redis (free)        — 10k commands/day free
Clerk (free)                — 50k MAU
Twilio (trial credit)       — ~300 WhatsApp messages for demo
Resend (free)               — 100 emails/day
Google Maps                 — $200/month free credit
Gemini API                  — Free tier (60 req/min)
TOTAL DEMO COST: ₹0
```

### Google Technologies Used (GDG Judging — Be Explicit)
```
1. Gemini 2.0 Flash API     — Core AI engine (NLU, advisory, multilingual)
2. Gemini 1.5 Pro API       — Complex market analysis (FPO dashboard)
3. Google Maps JS API       — Supply-demand heatmap (visual centerpiece)
4. Google Maps Geocoding    — Convert district names to coordinates
5. Google Maps Distance Matrix — Transport cost estimation
6. data.gov.in (Agmarknet) — Govt API for real mandi price data
```

> **Suggestion:** If time allows on Day 13+, add Firebase Cloud Messaging for mobile push notifications — this adds another Google tech checkbox and makes the farmer alert system more robust on Android.

---

## B4. DATABASE SCHEMA (Supabase Postgres)

```sql
-- Users (unified, role-based)
users (
  id uuid PK,
  phone varchar UNIQUE,
  name varchar,
  role enum('FARMER', 'FPO', 'SUPPLIER', 'RETAILER'),
  language enum('te', 'hi', 'en', 'kn') DEFAULT 'te',
  district varchar,
  state varchar,
  whatsapp_active boolean DEFAULT true,
  created_at timestamptz
)

-- Crops registered by farmers
farmer_crops (
  id uuid PK,
  farmer_id uuid FK → users,
  crop_name varchar,
  alert_threshold_pct int DEFAULT 20, -- alert if gap > 20%
  created_at timestamptz
)

-- Mandi price data (fetched from Agmarknet)
mandi_prices (
  id uuid PK,
  crop varchar,
  variety varchar,
  mandi varchar,
  district varchar,
  state varchar,
  price_min decimal,
  price_max decimal,
  price_modal decimal,
  arrivals_qty decimal,
  unit varchar,
  change_pct_24h decimal,
  fetched_at timestamptz,
  INDEX (crop, district, fetched_at DESC)
)

-- Computed price gaps (refreshed every 30 min by Cron)
price_gaps (
  id uuid PK,
  crop varchar,
  source_district varchar,
  source_state varchar,
  source_price decimal,
  target_district varchar,
  target_state varchar,
  target_price decimal,
  gap_per_kg decimal,
  gap_pct decimal,
  opportunity_score decimal, -- 0-100
  distance_km decimal,
  estimated_transport_cost_per_kg decimal,
  net_opportunity_per_kg decimal,
  confidence enum('HIGH','MEDIUM','LOW'),
  computed_at timestamptz,
  expires_at timestamptz,
  UNIQUE (crop, source_district, target_district)
)

-- Farmer inventory listings
listings (
  id uuid PK,
  farmer_id uuid FK → users,
  fpo_id uuid FK → users NULLABLE,
  crop varchar,
  variety varchar,
  quantity_kg decimal,
  asking_price_per_kg decimal,
  available_from date,
  available_until date,
  district varchar,
  state varchar,
  quality_grade enum('A','B','C'),
  notes text,
  status enum('ACTIVE','MATCHED','SOLD','EXPIRED'),
  created_at timestamptz
)

-- FPO / Supplier inventory (cold storage)
inventory (
  id uuid PK,
  owner_id uuid FK → users,
  crop varchar,
  quantity_kg decimal,
  storage_type enum('COLD_STORAGE','WAREHOUSE','FIELD'),
  district varchar,
  state varchar,
  stored_at date,
  deadline_date date, -- when spoilage risk becomes critical
  spoilage_risk_score int DEFAULT 0, -- 0-100, updated by cron
  status enum('AVAILABLE','PARTIALLY_SOLD','SOLD','SPOILED'),
  created_at timestamptz
)

-- Movement recommendations (AI generated)
movement_recommendations (
  id uuid PK,
  inventory_id uuid FK → inventory,
  target_district varchar,
  target_state varchar,
  target_price decimal,
  estimated_transport_cost decimal,
  estimated_net_profit decimal,
  confidence enum('HIGH','MEDIUM','LOW'),
  urgency enum('CRITICAL','HIGH','MEDIUM','LOW'),
  reasoning text, -- Gemini explanation
  expires_at timestamptz,
  created_at timestamptz
)

-- Matches between farmers/FPOs and buyers
matches (
  id uuid PK,
  listing_id uuid FK → listings,
  buyer_id uuid FK → users,
  ai_score decimal, -- 0-1
  ai_suggested_price decimal,
  match_reasons jsonb,
  status enum('PENDING','ACCEPTED','REJECTED','COMPLETED'),
  created_at timestamptz
)

-- Notifications log
notifications (
  id uuid PK,
  user_id uuid FK → users,
  channel enum('WHATSAPP','SMS','PUSH','EMAIL'),
  message_type varchar, -- 'PRICE_ALERT','SPOILAGE_ALERT','MATCH_FOUND', etc
  content text,
  delivered boolean DEFAULT false,
  created_at timestamptz
)

-- WhatsApp conversation state (mirrored from Redis for persistence)
whatsapp_sessions (
  phone varchar PK,
  state varchar, -- 'IDLE','AWAITING_CROP','AWAITING_QTY'
  context jsonb,
  language varchar,
  last_active_at timestamptz
)
```

---

# PART C — HOW EACH CHANNEL WORKS

---

## C1. WHATSAPP BOT (Primary Farmer Interface)

**Flow Architecture:**
```
Farmer sends WhatsApp message
↓
Twilio Webhook → POST /api/whatsapp/webhook
↓
Next.js API Route:
  1. Parse phone number → look up user in Supabase
  2. Fetch conversation state from Upstash Redis
  3. If voice note: Gemini transcribes audio
  4. Determine intent via Gemini (price check / sell advice / alert setup / general)
  5. Fetch relevant data from Supabase (prices, gaps, forecasts)
  6. Gemini generates response in user's language
  7. Update Redis session state
  8. Return response via Twilio WhatsApp reply
```

**Example Conversations:**

```
Ramu: "నేడు టమాటా ధర ఎంత?" (What is today's tomato price?)
AgriFlow: "కర్నూలు మండీలో టమాటా ₹4/కేజీ. అయితే హైదరాబాద్‌లో ₹15/కేజీ —
           అంటే ₹11 తేడా ఉంది. మీ దగ్గర ఎంత పంట ఉంది?"

Ramu: "300 కేజీలు"
AgriFlow: "300 కేజీలకు:
           • కర్నూలులో అమ్మితే: ₹1,200
           • హైదరాబాద్ ద్వారా అమ్మితే: ₹4,500 (రవాణా తర్వాత: ~₹3,800)
           మీ దగ్గరి FPO ద్వారా పంపించాలంటే 1 పంపు? [అవును/లేదు]"

---

Ramu: "PRICE TOMATO" (SMS fallback)
AgriFlow SMS: "Tomato: Kurnool ₹4. Best: Hyd ₹15. Gap ₹11/kg. 
               Reply SELL TOMATO for options."
```

**Supported Intent Types:**
- `PRICE_CHECK` — current price for crop in user's district + best alternative
- `SELL_ADVICE` — should I sell now or wait? + reasoning
- `BEST_MARKET` — where is my crop fetching highest price right now?
- `CONNECT_FPO` — find FPOs near me who can transport
- `SETUP_ALERT` — register for price gap alerts for my crop
- `FORECAST` — what will prices be next week?
- `REGISTER_LISTING` — post my crop for sale

---

## C2. SMS BOT (Feature Phone Fallback)

```
PRICE [CROP]      → Local price + best district + gap
BEST [CROP]       → Top 3 districts by current price
SELL [CROP] [QTY] → Revenue comparison: local vs best market
ALERT [CROP] [N]  → Set alert if price rises by N rupees
FPO               → List 3 nearby FPOs with phone numbers
STOP              → Unsubscribe from alerts
```

All responses fit in 1 SMS (160 chars).

---

## C3. FARMER DASHBOARD (Simple PWA)

Five screens, clean and fast:

**Screen 1: Home**
- Name + district + today's date
- My crops' prices today (card per crop: local price, best price elsewhere, gap badge)
- Alert inbox (latest 3 notifications)
- Quick actions: "Check Price", "Find Buyer", "List My Crop"

**Screen 2: Price Map**
- Google Maps centered on user's state
- Color-coded districts: my crop's price gradient (dark green = expensive, light = cheap)
- My district highlighted with "You are here"
- Arrow overlays: recommended movement routes (surplus → deficit)
- Tap district: popup with price, arrivals data, trend

**Screen 3: Best Time to Sell**
- Select crop
- 7-day forecast chart (Recharts LineChart)
- Gemini explanation: "Prices expected to rise because monsoon will delay next arrivals"
- Buy/Sell/Hold recommendation with confidence indicator

**Screen 4: Find a Buyer / List My Crop**
- Simple form: crop, quantity, price ask, available until
- Matched buyers shown as cards: buyer name, district, offered price, AI score
- One-tap: "Send WhatsApp intro" (Gemini drafts opening message)

**Screen 5: My Earnings**
- Total earned this season vs what local mandi would have paid
- Simple bar chart: actual vs baseline
- "You saved ₹X by selling through AgriFlow this season"

---

## C4. FPO / SUPPLIER DASHBOARD (The Power Interface)

**Screen 1: Price Gap Heatmap (Hero Screen)**
- Full-screen Google Maps with:
  - District polygons colored by opportunity score for selected crop
  - Green = low prices (surplus, source districts)
  - Red = high prices (deficit, target districts)
  - Animated route arrows: recommended supply flow paths
  - Live: refreshes every 5 minutes via Supabase Realtime
- Sidebar: top 5 opportunity routes for selected crop
  - Route: Kurnool → Hyderabad | Tomato | ₹11/kg gap | Opportunity Score: 87 | Window: 4 days
  - Route: Guntur → Bengaluru | Onion | ₹9/kg gap | Opportunity Score: 74 | Window: 6 days

**Screen 2: My Inventory**
- Table view: all registered inventory items
- Columns: Crop | Qty | Location | Stored Date | Deadline | Spoilage Risk | Status | Action
- Spoilage risk: color-coded pill (🟢 LOW / 🟡 MEDIUM / 🔴 HIGH / ⚫ CRITICAL)
- "Plan Movement" button on each row → opens movement recommendation

**Screen 3: Movement Recommendations (AI-Generated)**
- For each inventory item:
  - Card: "Move 20T Onion from Guntur → Bengaluru"
  - Current Bengaluru onion price: ₹28/kg
  - Your purchase/storage cost: ₹14/kg
  - Estimated transport: ₹3/kg
  - Net profit: ₹11/kg → ₹2,20,000 for 20T
  - Confidence: HIGH
  - Urgency: Move within 4 days (price window closes)
  - Gemini reasoning: "Bengaluru onion arrivals are 45% below seasonal average this week due to disrupted supply from Nashik. Prices expected to hold for 4-6 days."
  - Buttons: "Find Buyers in Bengaluru" | "Dismiss"

**Screen 4: Buyer/Seller Directory**
- Search: crop + district + quantity range
- Results: verified farmer listings + FPO bulk offers
- AI Match Score badge on each result
- Filter: by freshness grade, quantity, price range

**Screen 5: Alerts & Reports**
- Spoilage alerts (sorted by urgency)
- Price movement alerts (crops the FPO has registered)
- Daily market summary (emailed + shown here)
- Download: weekly report as PDF

---

# PART D — 16-DAY BUILD PLAN (Solo, 122 Hours)

---

## Resource Assumptions
- Vibecoding with: Codex (2 accounts), Gemini (3 AI Pro), Claude Sonnet (limited)
- Use Codex for boilerplate generation, component scaffolding, DB schema
- Use Gemini for architecture decisions, debugging complex logic
- Use Claude Sonnet for feature planning, spec interpretation, demo narrative
- You handle: integration, testing, judgment calls, demo polish

---

## Pre-Build Setup (Before Day 1, ~3 hours)

```
[ ] Create GitHub repo: agriflow-solo
[x] Init Next.js 14 project with TypeScript + Tailwind + shadcn/ui
[ ] Setup Supabase project: run schema SQL
[ ] Setup Clerk: configure farmer (OTP) + FPO (Google OAuth) flows
[ ] Setup Twilio: WhatsApp sandbox + SMS test number
[ ] Setup Upstash Redis: free tier
[ ] Setup Vercel: deploy stub app, connect GitHub
[ ] Verify Agmarknet API access (data.gov.in key)
[ ] Verify Google Maps API key + enable Maps JS + Geocoding + Distance Matrix
[ ] Setup Gemini API key (Google AI Studio)
[ ] Setup Resend (email)
[ ] Create .env.local with all keys
[ ] Codex prompt: "Generate all Supabase table migrations from this schema..."
```

---

## DAY 1 (8h) — Data Pipeline + Price Engine Foundation

**Goal: Real mandi price data flowing into Supabase.**

```
Morning (4h):
[x] Build Agmarknet data fetcher: /api/cron/fetch-prices
    → Fetch top 20 crops × AP + Telangana + Karnataka districts
    → Parse, normalize, upsert into mandi_prices table
[ ] Test: manual trigger → verify data in Supabase
[x] Build price gap computation: /api/cron/compute-gaps
    → For each crop: find max price district vs min price district
    → Compute opportunity score formula
    → Upsert into price_gaps table

Afternoon (4h):
[x] Setup Vercel Cron:
    0 */30 * * * → /api/cron/fetch-prices
    0 */30 * * * → /api/cron/compute-gaps
[x] Build /api/prices/[crop] endpoint → returns current prices per district
[x] Build /api/gaps/[crop] endpoint → returns top opportunity gaps
[ ] Test end-to-end: Cron fires → data stored → API returns data
[ ] Seed 1 week of historical price data for Prophet later

DELIVERABLE: Live Agmarknet price data pipeline. Working gap detection.
```

---

## DAY 2 (8h) — WhatsApp Bot Core

**Goal: Farmer can message in Telugu, get price info back.**

```
Morning (4h):
[x] Build Twilio WhatsApp webhook: POST /api/whatsapp/webhook
[ ] Upstash Redis: session state read/write (phone → {state, context, language})
[ ] Build intent classifier prompt for Gemini:
    System: "You are AgriFlow, an agricultural assistant for Indian farmers..."
    → Classify: PRICE_CHECK | BEST_MARKET | SELL_ADVICE | SETUP_ALERT | OTHER
[x] Handle PRICE_CHECK intent: fetch from price_gaps API → format response
[ ] Gemini translate response to user's language

Afternoon (4h):
[x] Handle BEST_MARKET intent: return top 3 districts for farmer's crop
[x] Handle SELL_ADVICE: compare local price vs best market → profit calculation
[ ] Handle SETUP_ALERT: store in farmer_crops table
[ ] Voice note support: Twilio MediaUrl → Gemini transcribe → same intent flow
[ ] Test all intents from WhatsApp Sandbox

DELIVERABLE: Working WhatsApp bot. Telugu price queries answered correctly.
```

---

## DAY 3 (8h) — SMS Bot + Auth + User Registration

```
Morning (4h):
[x] SMS webhook: POST /api/sms/webhook
[ ] SMS command parser: PRICE, BEST, SELL, ALERT, FPO, STOP
[ ] SMS response formatter: ≤160 chars with all key info
[ ] Test all SMS commands

Afternoon (4h):
[ ] Clerk setup: OTP flow for farmers, Google OAuth for FPO/Supplier
[x] User onboarding flow (web):
    → Farmer: phone → OTP → name + district + language + crops → done
    → FPO: Google login → org name + districts covered → done
[ ] Link Clerk user ID to Supabase users table
[x] WhatsApp: if unregistered user messages → guide to register

DELIVERABLE: SMS bot working. Auth working. Users can register.
```

---

## DAY 4 (8h) — Farmer Dashboard (Web PWA) — Screens 1 & 2

```
Morning (4h):
[ ] Farmer layout: sidebar nav + mobile bottom nav (responsive)
[x] Screen 1 Home:
    → Fetch user's crops prices (today)
    → My crop cards: local price + best price + gap badge
    → Alert inbox widget (last 3 notifications from Supabase)

Afternoon (4h):
[x] Screen 2: Price Map
    → Google Maps integration (react-google-maps or @vis.gl/react-google-maps)
    → Choropleth: shade districts by price for selected crop
    → Load district boundaries GeoJSON (AP/Telangana/Karnataka — add to public/)
    → Tap district → price popup with trend arrow
[ ] PWA manifest + service worker (next-pwa)

DELIVERABLE: Farmer can see their home dashboard and interactive price map.
```

---

## DAY 5 (8h) — Farmer Dashboard — Screens 3, 4, 5 + Listing

```
Morning (4h):
[ ] Screen 3: Best Time to Sell
    → 7-day price history data → simple trend line (Recharts)
    → Gemini forecast explanation (pass 7-day data as context)
    → Buy/Hold/Sell recommendation pill
[x] Screen 4: Find Buyer / Create Listing
    → Form: crop, qty, price ask, available dates, quality grade
    → Submit → insert to listings table
    → Show matched buyers (query price_gaps + buyers in target district)

Afternoon (4h):
[ ] Screen 5: My Earnings (Profit Tracker)
    → Query user's completed matches
    → Calculate: actual revenue vs local mandi baseline
    → Bar chart: monthly comparison
    → "You saved ₹X by using AgriFlow" hero stat
[ ] Mobile responsiveness pass on all 5 screens
[ ] Framer Motion: smooth screen transitions

DELIVERABLE: Complete farmer PWA. Listing creation. Profit tracker.
```

---

## DAY 6 (8h) — FPO Dashboard — Heatmap + Inventory

```
Morning (4h):
[ ] FPO layout: separate /dashboard/fpo route, role-gated
[x] Screen 1: Price Gap Heatmap (Hero)
    → Google Maps full-screen
    → District polygons colored by opportunity_score for selected crop
    → Supabase Realtime subscription → live updates when price_gaps refresh
    → Sidebar: top 5 opportunity route cards

Afternoon (4h):
[x] Screen 2: My Inventory
    → Table: all inventory items with spoilage risk pills
    → Add Inventory form: crop, qty, location, deadline date
    → Spoilage risk calculation: /api/inventory/score-spoilage
        → IMD weather forecast for district + days until deadline → Gemini score

DELIVERABLE: FPO heatmap live. Inventory management working.
```

---

## DAY 7 (8h) — Movement Recommendation Engine + Cold Storage Board

```
Morning (4h):
[x] Movement recommendation API: POST /api/recommendations/generate
    → Input: inventory_id
    → Fetch: inventory item + top 3 target districts from price_gaps
    → Gemini: generate reasoning for each route (price trend, arrivals data, weather)
    → Calculate: transport cost estimate (Google Maps Distance Matrix × flat rate/km)
    → Calculate: net profit per kg + total profit for full inventory
    → Store in movement_recommendations table

Afternoon (4h):
[x] Screen 3: Movement Recommendations (FPO Dashboard)
    → List all inventory with AI route recommendations
    → Card format as specified in B4
    → "Find Buyers in [District]" → links to buyer directory with filter
[x] Screen 5: Cold Storage Deadline Board
    → Sorted by deadline_date ASC
    → Color-coded urgency
    → One-click: generate emergency movement plan (calls recommendation API)

DELIVERABLE: AI movement recommendations live. Cold storage board working.
```

---

## DAY 8 (8h) — Buyer-Seller Matching + Directory

```
Morning (4h):
[x] Screen 4: Buyer/Seller Directory (FPO)
    → Search: crop + district + qty range
    → Display farmer listings + bulk FPO offers
    → AI Match Score: Gemini scores each listing against FPO's inventory item
        (price gap + distance + freshness + quantity fit)
[ ] Match creation: FPO clicks "Connect" → creates match record → notifies farmer via WhatsApp

Afternoon (4h):
[ ] WhatsApp: "A buyer is interested in your 300kg tomatoes at ₹12/kg. Reply YES to connect."
[ ] Match acceptance flow: farmer replies YES → both get each other's contact number
[x] Match status tracking in matches table
[x] Farmer dashboard: "You have a match!" alert on home screen

DELIVERABLE: Full matching loop working end-to-end.
```

---

## DAY 9 (8h) — Alerts & Notifications Engine

```
Morning (4h):
[x] Vercel Cron: 0 8 * * * → /api/cron/send-daily-alerts
    → For each farmer with registered crops:
        → Check if any of their crops have price gap > alert_threshold
        → If yes: Gemini generate personalized alert in their language
        → Send WhatsApp (or SMS fallback)
        → Log to notifications table

Afternoon (4h):
[x] Spoilage alert Cron: 0 6 * * * → /api/cron/check-spoilage
    → For each inventory item:
        → Recalculate spoilage risk score
        → If score > 70 OR deadline ≤ 3 days:
            → Send WhatsApp to FPO owner
            → Generate emergency movement recommendation
[ ] FPO email report: daily market summary via Resend
[ ] PWA push notifications setup (Web Push API)
[x] FPO Screen 5: Alerts & Reports tab

DELIVERABLE: Automated alert system running. FPO gets daily report.
```

---

## DAY 10 (8h) — WhatsApp Bot Extensions + FPO Registration Flow

```
Morning (4h):
[x] WhatsApp: CONNECT_FPO intent
    → Fetch FPOs operating in farmer's district
    → List top 3 with name + phone + crops they handle
    → "Reply 1 to contact [FPO name]"
[x] WhatsApp: REGISTER_LISTING intent (conversational)
    → Multi-turn: ask crop → qty → price → date → confirm → create listing
[x] WhatsApp: FORECAST intent
    → Return 7-day forecast summary for farmer's crop + Gemini explanation

Afternoon (4h):
[x] FPO web onboarding: register org, upload crops handled, add districts served
[x] FPO profile page: visible to farmers searching for transport
[ ] Farmer "Find FPO" map: show FPO markers on Google Maps with service area circles
[x] Farmer can call FPO directly from app (tel: link)

DELIVERABLE: Full farmer ↔ FPO connection pathway. Conversational listing creation.
```

---

## DAY 11 (8h) — Explainability + Polish Pass 1

**GDG explicitly rewards: solutions that explain their AI, not just use it.**

```
Morning (4h):
[x] Explainability panel: every AI recommendation has expandable "Why?" section
    → Why is this opportunity rated HIGH? → Gemini explains data signals
    → Why should I sell in 4 days? → Price trend reasoning
    → Why is my spoilage risk 78? → Weather + deadline + crop type reasoning
[x] Confidence indicators: traffic light (🟢🟡🔴) on every AI output
[x] Data freshness: "Prices last updated 12 minutes ago" on all price displays

Afternoon (4h):
[x] Language selector: farmer can change language in settings → all WhatsApp responses update
[ ] Mobile UX pass: test all farmer screens on 375px viewport
[x] Loading states: skeletons for all data cards
[x] Error states: graceful degradation when Agmarknet API fails (show cached data)
[ ] Accessibility: aria-labels, keyboard navigation, color contrast check

DELIVERABLE: Every AI output has a "Why?" explanation. Mobile looks great.
```

---

## DAY 12 (8h) — Demo System + Data Seeding

**A broken demo loses. A rehearsed demo wins.**

```
Morning (4h):
[x] Demo reset endpoint: POST /api/demo/reset
    → Clears demo user's listings, matches, notifications
    → Re-seeds fresh demo data for "Ramu" (farmer) + "Suresh" (FPO)
[x] Demo trigger endpoints:
    → POST /api/demo/trigger-price-spike → simulates Hyderabad tomato price jump
    → POST /api/demo/trigger-match → creates a pre-scored match for demo farmer
    → POST /api/demo/trigger-spoilage-alert → fires spoilage alert for demo FPO
[x] Seed complete demo dataset:
    → 7-day price history for tomato, onion, chilli across 15 districts
    → Demo farmer Ramu: 300kg tomatoes in Kurnool
    → Demo FPO Suresh: 40T onions in Guntur with 5-day deadline
    → Pre-computed gap: Kurnool→Hyderabad ₹11/kg, Guntur→Bengaluru ₹9/kg

Afternoon (4h):
[ ] Rehearse full demo flow (3 times):
    1. Ramu sends WhatsApp in Telugu → gets price + gap → sees map → FPO connects
    2. Suresh logs into FPO dashboard → sees heatmap → views movement recommendation → acts
    3. Match completes → both get WhatsApp confirmation
[ ] Fix all demo-path bugs found in rehearsal
[ ] Record backup demo video (in case live demo fails)

DELIVERABLE: Demo system is bulletproof. Full flow rehearsed.
```

---

## DAY 13 (8h) — README + Architecture Diagram + GitHub Cleanup

**GDG judges the GitHub repo. This is not optional.**

```
Morning (4h):
[ ] Architecture diagram (Mermaid or Excalidraw → export PNG)
    → Show: Farmer channels → Next.js API → Supabase → Gemini → Google Maps
    → Show: Cron jobs flow
    → Show: FPO Dashboard data flow
[ ] README.md:
    → Problem statement (2 paragraphs, real data)
    → Solution summary (what it does)
    → Architecture diagram embedded
    → Feature list (farmer + FPO)
    → Tech stack with logos
    → Setup instructions (full local dev)
    → Demo video link
    → Live URL
    → SDG mapping
    → Team / author

Afternoon (4h):
[ ] Clean git history: squash WIP commits, write proper commit messages
[x] Environment variables: document all required vars in .env.example
[ ] Code comments: add JSDoc on all critical functions
[ ] Remove all console.log, debug endpoints (except /api/demo/*)
[ ] Final test: fresh clone → npm install → works locally

DELIVERABLE: Professional GitHub repo. Judges can clone and run.
```

---

## DAY 14 (8h) — User Evidence + Impact Story

**GDG: "Define the problem with real data, statistics, or direct user quotes."**
**This is the single most-weighted non-technical criterion.**

```
[ ] Talk to 3 real people (WhatsApp voice call is enough):
    → 1 farmer or family member who farms (anyone in AP/Telangana network)
    → 1 kirana store owner or small trader
    → 1 FPO member or agri cooperative person
    Document: What they said, their actual words, their actual problem

[ ] Add to deck + README:
    → Quote from farmer: "We never know prices in other districts..."
    → Quote from kirana: "Sometimes supply just stops and prices double overnight..."
    → Screenshot the WhatsApp conversation

[ ] Build impact calculator (simple web widget or slide):
    → Input: qty sold, local price, AgriFlow-assisted price
    → Output: extra earnings + % improvement + tons of food saved from spoilage
    
[ ] Impact numbers (use real Indian agriculture statistics):
    → India loses ₹92,000 crore in agricultural waste annually (ScienceDirect)
    → Farmers receive only 25% of retail price (Harvard study)
    → AgriFlow's target: help farmers capture 40-60% of retail price
    
[ ] Draft the 3-minute demo video script (problem → solution → impact arc)

DELIVERABLE: Real user quotes. Real impact numbers. Video script ready.
```

---

## DAY 15 (7h) — Demo Video Recording

**GDG: "50% tech, 50% storytelling. Start with a compelling human hook in first 15 seconds."**

```
Script Structure (3 min):
  [0:00-0:15] HOOK: 
    "Ramu is a tomato farmer in Kurnool. This morning he sold 300kg at ₹4/kg.
     He didn't know that 200km away in Hyderabad, tomatoes were selling for ₹15.
     That's ₹3,300 Ramu lost today alone. AgriFlow fixes this."

  [0:15-0:45] PROBLEM (data-backed):
    → Stat cards: 100M farmers, 25% price share, ₹92,000 crore waste
    → Quick: show the price gap on the map (2 districts, massive differential)

  [0:45-1:45] SOLUTION DEMO:
    → Ramu sends WhatsApp in Telugu → response in Telugu with gap + recommendation
    → Ramu opens dashboard → sees Price Map → Hyderabad lit up red
    → FPO Suresh logs in → sees heatmap → Guntur→Bengaluru route highlighted
    → Movement recommendation card: ₹2,20,000 profit estimate
    → Suresh clicks "Find Buyers" → matches with Bengaluru retailer
    → Both get WhatsApp confirmation

  [1:45-2:15] TECH (30 seconds, show don't tell):
    → Quick flash: Gemini icon, Google Maps, Agmarknet data, Supabase Realtime
    → Architecture diagram (3-second shot)
    → "All powered by Gemini 2.0 Flash, Google Maps API, real government mandi data"

  [2:15-2:45] IMPACT:
    → "Since Ramu started using AgriFlow: ₹X more earned this season"
    → User quote on screen
    → SDG 2 + SDG 12 badge

  [2:45-3:00] CLOSE:
    → "AgriFlow: Every farmer deserves to know what their crop is worth, everywhere."
    → Live URL + GitHub link

Recording tips:
[ ] Record screen with OBS (free) at 1080p
[ ] Use phone for WhatsApp demo segment (feels more real)
[ ] Telugu WhatsApp demo is the strongest visual — make sure this is flawless
[ ] Add English subtitles for Telugu segments
[ ] Background music: subtle, non-distracting

DELIVERABLE: Final 3-minute demo video uploaded to YouTube (unlisted).
```

---

## DAY 16 (7h) — Final Polish + Submission

```
Morning (4h):
[ ] Final QA pass: all features working on production URL
[ ] Mobile test: open on actual Android phone, verify PWA install
[ ] WhatsApp test: fresh number → full flow works
[ ] Load test: verify Vercel doesn't hit cold start issues on demo triggers
[ ] Verify all Cron jobs ran successfully in last 24h (check Vercel logs)

Afternoon (3h):
[ ] Submission form:
    → GitHub URL (public)
    → Demo video URL (YouTube unlisted)
    → Live PWA URL (Vercel)
    → Problem statement: PS3 (Smart Supply Chains) + PS5 (Smart Resource Allocation)
    → SDG: 2, 8, 12
[ ] Final README review
[ ] Submit before deadline (April 24, 2026 based on info session timeline)
[ ] Post: share on LinkedIn / college group with demo video
```

---

# PART E — HOW TO STAND OUT (GDG Judging Criteria Applied)

---

## E1. Real World Problem ✓
- Real data: Agmarknet prices, IMD weather, real Indian agriculture statistics
- Targeted user: rural Indian farmer (feature phone, Telugu-speaking) + FPO coordinator
- Before/after: farmer without AgriFlow vs with AgriFlow (price captured comparison)
- Specific SDG sub-targets mapped: 2.3, 2.1, 12.3

## E2. Google Technologies ✓
- Gemini 2.0 Flash: core AI (NLU + multilingual + recommendations + explainability)
- Gemini 1.5 Pro: complex FPO market analysis
- Google Maps JS API: supply-demand heatmap (visual centerpiece)
- Google Maps Geocoding: district coordinate resolution
- Google Maps Distance Matrix: transport cost estimation
- data.gov.in / Agmarknet: government data source (under Google's India data initiative)
- **Justify each Google tech choice in your video and deck — GDG explicitly scores this**

## E3. Clean UI ✓
- shadcn/ui: polished, accessible components
- Tailwind: consistent design system
- Framer Motion: smooth transitions
- Mobile-first: farmers use phones, not desktops
- 5-second rule: price gap map communicates the entire value prop in 5 seconds

## E4. USP (One Line) ✓
> **"AgriFlow moves crops from where they're cheap to where they're scarce — by telling every farmer and FPO in real time, in their language, on their phone."**
- Competitors: e-NAM shows prices. AgriFlow shows **gaps + routes + profit estimates + deadlines**.
- Others are data displays. AgriFlow is a **decision engine**.

## E5. Real World Impact ✓
- User quotes from interviews (Day 14)
- Measurable: ₹ per kg improvement × quantity sold
- Connect to SDG: tons of food waste prevented, farmer income delta

## E6. Tech Where It Makes Sense ✓
- Gemini used for: NLU, multilingual, reasoning, explainability → genuinely hard problems
- Google Maps used for: spatial intelligence, distance calculation → genuinely geographic problem
- NOT over-engineered: dropped Kafka/n8n from v3 → Supabase Realtime + Vercel Cron achieves same outcome solo
- Justification ready for every tech choice

## E7. Working MVP ✓
- All demo-path features fully functional
- Demo reset system ensures clean demo
- Backup video recorded in case live demo has issues

## E8. Demo Video ✓
- Telugu WhatsApp moment in first 60 seconds = judges have never seen this
- Story arc: problem → solution → impact
- 50/50: tech + storytelling

## E9. Performance & Scalability ✓
- Vercel serverless: auto-scales with zero config
- Supabase: managed Postgres with connection pooling
- Upstash Redis: serverless Redis, no cold start
- Price data cached: avoid hammering Agmarknet on every request

## E10. Accessibility ✓
- Feature phone support (SMS bot): zero smartphone required for core value
- Voice notes on WhatsApp: zero literacy barrier for audio
- Multi-language: Telugu, Hindi, Kannada, English
- PWA: installable, works offline for cached prices
- shadcn/ui: WCAG-compliant by default

## E11. Originality ✓
- Specific innovation: **Cross-district price gap as a resource allocation signal**
- FPO Movement Recommendation Engine: no existing tool generates profit-estimated, deadline-aware, transport-cost-adjusted supply movement plans
- Cold Storage Deadline Board: connects spoilage risk to market opportunity in one view
- Multilingual voice-to-action pipeline: farmer speaks Telugu → WhatsApp responds with map link and profit comparison

---

# PART F — SUGGESTIONS (Added to Your Vision)

---

## F1. Keep the AI Honest — Explainability Wins Points

Every AI output must show:
1. What data it used (last updated X minutes ago)
2. Why it made that recommendation (plain language reasoning)
3. How confident it is (HIGH / MEDIUM / LOW with color coding)
4. What could change it (e.g., "If rain forecast changes, this estimate may drop")

This directly addresses GDG's scoring rubric on "AI meaningfully used" and guards against judges asking "but why does it say that?" in the Q&A.

## F2. The Profit Calculator is Your Best Demo Tool

Build a standalone widget on the landing page (no login required) where anyone can:
- Select crop → enter quantity → enter local price
- See: "If you had sold in [best district]: ₹X more profit"
- This converts skeptics instantly and works as a recruiting/onboarding tool

## F3. WhatsApp in Telugu is Your Strongest Demo Moment

From v3: "Judges have never seen this in a student project. That moment wins the competition."

Make absolutely sure this works flawlessly before anything else. Prioritize this above FPO dashboard polish. One smooth Telugu WhatsApp interaction > ten mediocre features.

## F4. The Heatmap Arrow is Your Best Visual

The animated supply flow arrows on the Google Maps heatmap (surplus district → deficit district) are visually the clearest possible expression of AgriFlow's mission. Every judge will understand it in 2 seconds. Polish this above all other UI elements.

## F5. Position as Open Innovation Under PS3

In your submission form and video, state:
- Primary: PS3 (Smart Supply Chains) — you're analyzing transit data to detect supply disruptions and recommend route adjustments
- Also addresses PS5 (Smart Resource Allocation) — you're matching available supply to urgent demand
- Track: Open Innovation under PS3 (custom problem definition within the theme)

This framing is more defensible than claiming both equally.

## F6. The FPO Partnership Angle for Future Scope

In your future scope slides (GDG requires this), mention:
- Partner with 5 active FPOs in AP/Telangana for real data
- NAFED / Agri cooperative integration for formal inventory tracking
- SHG (Self Help Group) network integration for collective farmer bargaining
- Credit scoring: transaction history → Kisan Credit Card eligibility proof
- This shows judges the project is startup-viable and government-partnerable

## F7. Cost Zero = Startup Pitch Angle

Explicitly state in your pitch: "Our demo costs ₹0. At 1,000 farmers and 200 FPOs, monthly infrastructure cost is ~₹13,000. Revenue at that scale: ₹99,800/month from FPO subscriptions alone."

This shows you're thinking beyond the competition — and GDG judges love that.

---

# PART G — COST BREAKDOWN

---

```
SERVICE                 FREE TIER                    USAGE
────────────────────────────────────────────────────────────────
Vercel (Hobby)          Free                         Next.js PWA + API + Cron
Supabase                500MB DB, 50k MAU, Realtime  All DB + Realtime
Upstash Redis           10k commands/day free        Sessions + cache + rate limit
Clerk                   50,000 MAU free              Auth (OTP + Google OAuth)
Twilio                  $15 trial credit             ~300 WhatsApp + 500 SMS
Resend                  100 emails/day free          FPO daily reports
Gemini API              60 req/min (AI Studio)       All AI features
Google Maps             $200/month credit            Maps + Geocoding + Distance
Agmarknet               Free (government API)        All mandi price data
IMD Weather             Free (government API)        All weather forecasts

DEMO TOTAL: ₹0

AT SCALE (1000 farmers, 200 FPOs):
  Supabase Pro:      $25/month
  Vercel Pro:        $20/month
  Upstash Pay-as-go: ~$5/month
  Twilio:            ~$50/month
  Gemini API:        ~$30/month
  Total:             ~$130/month (~₹10,800/month)

  Revenue:
    200 FPOs × ₹499/month = ₹99,800/month
    Gross margin: 89%
```

---

# PART H — PITCH DECK OUTLINE (15 Slides)

---

```
Slide 1:  COVER — AgriFlow. "Every farmer deserves to know what their crop is 
          worth everywhere — right now."

Slide 2:  THE FARMER'S PROBLEM — Ramu's story. ₹4 vs ₹15. Same crop. 200km apart.
          "He didn't know. He couldn't know. Until now."

Slide 3:  THE SUPPLIER'S PROBLEM — Suresh's 40 tonnes of onions with 5 days left.
          No intelligence on where to move them. They spoil.
          
Slide 4:  SCALE — 100M farmer households. 33% food wasted = ₹92,000 crore/year.
          Farmers earn 25% of what consumers pay. [Real data, cited sources]

Slide 5:  THE SOLUTION — AgriFlow: Price gap visibility + supply movement intelligence
          "For farmers: Know where to sell. For FPOs: Know where to move."

Slide 6:  HOW IT WORKS — The core mechanism (price gap → alert → action → equalization)
          Simple flow diagram. No jargon.

Slide 7:  FOR FARMERS — WhatsApp screenshot (Telugu), SMS example, Dashboard home
          "Works on every phone. Speaks every language."

Slide 8:  FOR FPOs/SUPPLIERS — Heatmap screenshot, Movement recommendation card,
          Cold storage deadline board

Slide 9:  THE AI LAYER — Gemini for NLU + multilingual + reasoning + explainability
          Google Maps for spatial intelligence
          "AI that explains why, not just what."

Slide 10: REAL DATA — Agmarknet live prices + IMD weather + user quote from interview
          [Screenshot of actual data flowing]

Slide 11: SDG IMPACT — SDG 2 (zero hunger) + SDG 12 (responsible production)
          Specific sub-targets: 2.3, 2.1, 12.3
          Before/after: Ramu's earnings with and without AgriFlow

Slide 12: TECH STACK — Next.js + Gemini + Google Maps + Supabase + Twilio
          Architecture diagram. All Google tech justified.

Slide 13: TWO PS IN ONE — PS3 (Smart Supply Chains) + PS5 (Smart Resource Allocation)
          Visual: Venn diagram showing intersection

Slide 14: BUSINESS MODEL — Farmer: free forever. FPO: ₹499/month. Cold storage: ₹999.
          Path to profitability at 200 FPO subscribers.

Slide 15: FUTURE SCOPE — NAFED integration, SHG network, credit scoring, 
          all-India expansion. [With Google Cloud for scale]
```

---

# PART I — THE NON-NEGOTIABLES

---

In order of priority:

1. **Agmarknet price pipeline** — no data = no product
2. **WhatsApp bot in Telugu** — the demo's strongest moment
3. **Price gap map** (Google Maps) — the visual that explains everything in 5 seconds
4. **FPO movement recommendations** — what makes this different from e-NAM
5. **Demo reset system** — survival mechanism
6. **3 real user interviews** — the difference between top 100 and top 10
7. **README with architecture diagram** — judges read this

Everything else is secondary. If you run short on time, cut negotiation engine, cut profit tracker complexity, cut SMS — but never cut the above 7.

---

*AgriFlow Solo Spec v1.0*
*Built by one person with 122 hours and a clear vision.*
*Built for 100 million farmers who deserve to know.*
