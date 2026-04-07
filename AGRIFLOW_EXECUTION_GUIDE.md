# AgriFlow — AI Agent Execution Guide

> **"The Intelligence Layer That Moves India's Crops to Where They're Needed"**
> Google Solution Challenge 2026 — Solo Build, 122 Hours

---

## 📌 Quick Reference

| Item | Detail |
|---|---|
| **Project** | AgriFlow — Real-time agricultural price gap intelligence platform |
| **Competition** | Google Solution Challenge 2026 |
| **Problem Statements** | PS3 (Smart Supply Chains) + PS5 (Smart Resource Allocation) |
| **SDGs** | SDG 2 (Zero Hunger), SDG 8 (Decent Work), SDG 12 (Responsible Production) |
| **Target Users** | Indian Farmers (feature phone / basic Android) + FPO Coordinators / Suppliers |
| **Deadline** | April 24, 2026 |
| **Total Build Time** | 122 Hours across 16 Days |

---

## 🔴 NON-NEGOTIABLE PRIORITIES (In Strict Order)

> [!CAUTION]
> These 7 items are listed in the spec as **absolute priorities**. If time runs short, cut everything else — but NEVER cut these.

| Priority | Item | Why |
|---|---|---|
| **P0** | Agmarknet price data pipeline | No data = no product |
| **P1** | WhatsApp bot in Telugu | The demo's strongest moment — judges have never seen this |
| **P2** | Price gap heatmap (Google Maps) | The visual that explains everything in 5 seconds |
| **P3** | FPO movement recommendations | What makes AgriFlow different from e-NAM |
| **P4** | Demo reset system | Survival mechanism for live demo |
| **P5** | 3 real user interviews | The difference between top 100 and top 10 |
| **P6** | README with architecture diagram | Judges read the GitHub repo |

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router) — PWA, SSR, API routes
- **TypeScript** — Strict mode
- **Tailwind CSS** — Styling
- **shadcn/ui** — Components (Radix-based, accessible)
- **Recharts** — Price charts, forecast lines, trend charts
- **Google Maps JS API** — Supply-demand heatmap ← KEY GOOGLE TECH
- **next-pwa + Workbox** — PWA manifest, offline support
- **Framer Motion** — Smooth transitions, alert animations
- **React Query** — Data fetching + caching

### Backend (All via Next.js API Routes — No Separate Server)
- **Next.js API Routes** — All endpoints, serverless on Vercel
- **Vercel Cron Jobs** — Price fetching (30 min), spoilage checks (6h), daily reports (8am)
- **Supabase** — Postgres DB + Realtime WebSockets + Row Level Security
- **Supabase Edge Functions** — Heavy async jobs (ML calls, batch notifications)
- **Redis (Upstash free)** — WhatsApp session state, rate limiting, price cache

### AI
- **Gemini 2.0 Flash** — NLU, WhatsApp responses, recommendations, translation, explanations, spoilage scoring
- **Gemini 1.5 Pro** (limited) — Complex market analysis, FPO reports, best-time-to-sell
- **@google/generative-ai** — Official SDK

### Communication
- **Twilio WhatsApp Sandbox** — Primary farmer interface
- **Twilio SMS** — Feature phone fallback
- **Resend** — FPO email reports (100/day free)
- **Web Push API** — PWA push notifications

### Data Sources (All Free)
- **Agmarknet / data.gov.in** — Crop prices across 3000+ mandis
- **IMD Weather API** — District weather forecasts, rainfall alerts
- **Google Maps JS API** — Heatmap, geocoding, distance matrix

### Auth
- **Clerk** — OTP for farmers (phone), Google OAuth for FPOs

### Deployment
- **Vercel (Hobby free)** — Next.js PWA + API routes + Cron
- **Supabase (free tier)** — 500MB DB, 50k MAU, Realtime
- **Upstash Redis (free)** — 10k commands/day
- **Clerk (free)** — 50k MAU
- **Twilio (trial credit)** — ~300 WhatsApp messages
- **Resend (free)** — 100 emails/day
- **Google Maps** — $200/month free credit
- **Gemini API** — Free tier (60 req/min)

> **TOTAL DEMO COST: ₹ 0**

---

## 🗄️ Database Schema (Supabase Postgres)

> [!NOTE]
> Full schema is defined in the spec PDF. Below is a summary of all tables. Agents should create migrations for these.

| Table | Purpose |
|---|---|
| `users` | Unified role-based user table (FARMER / FPO / SUPPLIER / RETAILER) |
| `farmer_crops` | Crops registered by farmers with alert thresholds |
| `mandi_prices` | Fetched Agmarknet price data (indexed by crop, district, fetched_at) |
| `price_gaps` | Computed price gaps refreshed every 30 min by Cron |
| `listings` | Farmer inventory listings for sale |
| `inventory` | FPO/Supplier cold storage inventory with spoilage tracking |
| `movement_recommendations` | AI-generated movement recommendations |
| `matches` | Buyer-seller matches with AI scores |
| `notifications` | Notification log across all channels |
| `whatsapp_sessions` | WhatsApp conversation state (mirrored from Redis) |

---

## 📋 PHASE-WISE EXECUTION PLAN

---

### PHASE 0: PRE-BUILD SETUP (~3 hours)

> [!IMPORTANT]
> Complete ALL of these before starting any feature development. Every subsequent phase depends on this infrastructure.

- [ ] Create GitHub repo: `agriflow-solo`
- [ ] Init Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [ ] Setup Supabase project: run full schema SQL (all 10 tables from spec)
- [ ] Setup Clerk: configure farmer (OTP) + FPO (Google OAuth) flows
- [ ] Setup Twilio: WhatsApp sandbox + SMS test number
- [ ] Setup Upstash Redis: free tier
- [ ] Setup Vercel: deploy stub app, connect GitHub
- [ ] Verify Agmarknet API access (data.gov.in key)
- [ ] Verify Google Maps API key + enable Maps JS + Geocoding + Distance Matrix
- [ ] Setup Gemini API key (Google AI Studio)
- [ ] Setup Resend (email)
- [ ] Create `.env.local` with all keys
- [ ] Create `.env.example` documenting all required variables
- [ ] Generate all Supabase table migrations from schema

**Acceptance Criteria:** All services accessible, stub app deployed on Vercel, database tables created.

---

### PHASE 1: DATA PIPELINE + PRICE ENGINE (Day 1 — 8h) 🔴 P0

> [!CAUTION]
> This is the **#1 non-negotiable priority**. No data = no product. Nothing else should be started until this works end-to-end.

#### Tasks:

**Morning (4h) — Agmarknet Data Fetcher:**
- [ ] Build Agmarknet data fetcher: `/api/cron/fetch-prices`
  - Fetch top 20 crops × AP + Telangana + Karnataka districts
  - Parse, normalize, upsert into `mandi_prices` table
- [ ] Test: manual trigger → verify data rows in Supabase
- [ ] Build price gap computation: `/api/cron/compute-gaps`
  - For each crop: find max price district vs min price district
  - Compute `opportunity_score = price_gap × demand_strength × transport_feasibility`
  - Upsert into `price_gaps` table

**Afternoon (4h) — Cron + API Endpoints:**
- [ ] Setup Vercel Cron:
  - `0 */30 * * *` → `/api/cron/fetch-prices`
  - `0 */30 * * *` → `/api/cron/compute-gaps`
- [ ] Build `/api/prices/[crop]` endpoint → returns current prices per district
- [ ] Build `/api/gaps/[crop]` endpoint → returns top opportunity gaps
- [ ] Test end-to-end: Cron fires → data stored → API returns data
- [ ] Seed 1 week of historical price data for forecasting later

**Acceptance Criteria:** Live Agmarknet price data pipeline running. Price gaps computed and served via API. Cron verified on Vercel.

---

### PHASE 2: WHATSAPP BOT CORE (Day 2 — 8h) 🔴 P1

> [!CAUTION]
> This is the **strongest demo moment**. Telugu WhatsApp interaction is what judges have never seen in a student project. Must be **flawless**.

#### Tasks:

**Morning (4h) — Webhook + Intent Classification:**
- [ ] Build Twilio WhatsApp webhook: `POST /api/whatsapp/webhook`
- [ ] Upstash Redis: session state read/write (`phone → {state, context, language}`)
- [ ] Build intent classifier prompt for Gemini:
  - System: "You are AgriFlow, an agricultural assistant for Indian farmers..."
  - Classify: `PRICE_CHECK | BEST_MARKET | SELL_ADVICE | SETUP_ALERT | OTHER`
- [ ] Handle `PRICE_CHECK` intent: fetch from price_gaps API → format response
- [ ] Gemini translate response to user's language (Telugu/Hindi/Kannada/English)

**Afternoon (4h) — All Intents + Voice Notes:**
- [ ] Handle `BEST_MARKET` intent: return top 3 districts for farmer's crop
- [ ] Handle `SELL_ADVICE`: compare local price vs best market → profit calculation
- [ ] Handle `SETUP_ALERT`: store in `farmer_crops` table with threshold
- [ ] Voice note support: Twilio MediaUrl → Gemini transcribe → same intent flow
- [ ] Test all intents from WhatsApp Sandbox in Telugu

**Acceptance Criteria:** Working WhatsApp bot. Telugu price queries answered correctly. Voice notes transcribed and responded to.

---

### PHASE 3: SMS BOT + AUTH + USER REGISTRATION (Day 3 — 8h)

#### Tasks:

**Morning (4h) — SMS Bot:**
- [ ] SMS webhook: `POST /api/sms/webhook`
- [ ] SMS command parser: `PRICE`, `BEST`, `SELL`, `ALERT`, `FPO`, `STOP`
- [ ] SMS response formatter: ≤160 chars with all key info
- [ ] Test all SMS commands

**Afternoon (4h) — Auth + Onboarding:**
- [ ] Clerk setup: OTP flow for farmers, Google OAuth for FPO/Supplier
- [ ] User onboarding flow (web):
  - Farmer: phone → OTP → name + district + language + crops → done
  - FPO: Google login → org name + districts covered → done
- [ ] Link Clerk user ID to Supabase `users` table
- [ ] WhatsApp: if unregistered user messages → guide to register

**Acceptance Criteria:** SMS bot working. Auth working. Users can register via web and are linked to Supabase.

---

### PHASE 4: FARMER DASHBOARD — PWA (Days 4-5 — 16h) 🔴 P2 (Price Map)

> [!IMPORTANT]
> Screen 2 (Price Map with Google Maps) is **P2 priority**. Build it to be visually stunning — this is the "explains everything in 5 seconds" visual.

#### Day 4 — Screens 1 & 2 (8h):

**Morning (4h) — Layout + Home:**
- [ ] Farmer layout: sidebar nav + mobile bottom nav (responsive)
- [ ] Screen 1 — Home:
  - Fetch user's crops prices (today)
  - My crop cards: local price + best price + gap badge
  - Alert inbox widget (last 3 notifications from Supabase)
  - Quick actions: "Check Price", "Find Buyer", "List My Crop"

**Afternoon (4h) — Price Map:**
- [ ] Screen 2 — Price Map:
  - Google Maps integration (`@vis.gl/react-google-maps` or `react-google-maps`)
  - Choropleth: shade districts by price for selected crop
  - Load district boundaries GeoJSON (AP/Telangana/Karnataka → `public/`)
  - Tap district → price popup with trend arrow
- [ ] PWA manifest + service worker (`next-pwa`)

#### Day 5 — Screens 3, 4, 5 (8h):

**Morning (4h):**
- [ ] Screen 3 — Best Time to Sell:
  - 7-day price history data → simple trend line (Recharts)
  - Gemini forecast explanation (pass 7-day data as context)
  - Buy/Hold/Sell recommendation pill
- [ ] Screen 4 — Find Buyer / Create Listing:
  - Form: crop, qty, price ask, available dates, quality grade
  - Submit → insert to `listings` table
  - Show matched buyers (query `price_gaps` + buyers in target district)

**Afternoon (4h):**
- [ ] Screen 5 — My Earnings (Profit Tracker):
  - Query user's completed matches
  - Calculate: actual revenue vs local mandi baseline
  - Bar chart: monthly comparison
  - "You saved ₹X by using AgriFlow" hero stat
- [ ] Mobile responsiveness pass on all 5 screens
- [ ] Framer Motion: smooth screen transitions

**Acceptance Criteria:** Complete farmer PWA with 5 screens. Price map is visually stunning with Google Maps choropleth. PWA installable.

---

### PHASE 5: FPO DASHBOARD — HEATMAP + INVENTORY (Day 6 — 8h) 🔴 P2 + P3

> [!IMPORTANT]
> The heatmap with animated supply-flow arrows is the **best visual** in the entire app. The movement recommendations are what differentiate AgriFlow from e-NAM. Both are non-negotiable priorities.

#### Tasks:

**Morning (4h) — Heatmap Hero Screen:**
- [ ] FPO layout: separate `/dashboard/fpo` route, role-gated
- [ ] Screen 1 — Price Gap Heatmap (Hero):
  - Google Maps full-screen
  - District polygons colored by `opportunity_score` for selected crop
  - Green = surplus (low price), Red = deficit (high price)
  - Animated route arrows: recommended supply flow paths
  - Supabase Realtime subscription → live updates when `price_gaps` refresh
  - Sidebar: top 5 opportunity route cards

**Afternoon (4h) — Inventory Management:**
- [ ] Screen 2 — My Inventory:
  - Table: all inventory items with spoilage risk pills (🟢 LOW / 🟡 MEDIUM / 🔴 HIGH / ⚫ CRITICAL)
  - Add Inventory form: crop, qty, location, deadline date
  - Spoilage risk calculation: `/api/inventory/score-spoilage`
    - IMD weather forecast for district + days until deadline → Gemini score

**Acceptance Criteria:** FPO heatmap live with animated arrows. Inventory management working with spoilage risk scoring.

---

### PHASE 6: MOVEMENT ENGINE + COLD STORAGE (Day 7 — 8h) 🔴 P3

#### Tasks:

**Morning (4h) — Movement Recommendation API:**
- [ ] Movement recommendation API: `POST /api/recommendations/generate`
  - Input: `inventory_id`
  - Fetch: inventory item + top 3 target districts from `price_gaps`
  - Gemini: generate reasoning for each route (price trend, arrivals data, weather)
  - Calculate: transport cost estimate (Google Maps Distance Matrix × flat rate/km)
  - Calculate: net profit per kg + total profit for full inventory
  - Store in `movement_recommendations` table

**Afternoon (4h) — UI Screens:**
- [ ] Screen 3 — Movement Recommendations (FPO Dashboard):
  - List all inventory with AI route recommendations
  - Card format: destination, current price, storage cost, transport, net profit, confidence, urgency
  - Gemini reasoning block (expandable)
  - "Find Buyers in [District]" → links to buyer directory with filter
- [ ] Screen 5 — Cold Storage Deadline Board:
  - Sorted by `deadline_date` ASC
  - Color-coded urgency
  - One-click: generate emergency movement plan (calls recommendation API)

**Acceptance Criteria:** AI movement recommendations live. Cold storage board working. Profit estimates calculated.

---

### PHASE 7: BUYER-SELLER MATCHING (Day 8 — 8h)

#### Tasks:

**Morning (4h):**
- [ ] Screen 4 — Buyer/Seller Directory (FPO):
  - Search: crop + district + qty range
  - Display farmer listings + bulk FPO offers
  - AI Match Score: Gemini scores each listing (price gap + distance + freshness + quantity fit)
- [ ] Match creation: FPO clicks "Connect" → creates match record → notifies farmer via WhatsApp

**Afternoon (4h):**
- [ ] WhatsApp notification: "A buyer is interested in your 300kg tomatoes at ₹12/kg. Reply YES to connect."
- [ ] Match acceptance flow: farmer replies YES → both get each other's contact number
- [ ] Match status tracking in `matches` table
- [ ] Farmer dashboard: "You have a match!" alert on home screen

**Acceptance Criteria:** Full matching loop working end-to-end. WhatsApp notifications for matches.

---

### PHASE 8: ALERTS & NOTIFICATIONS ENGINE (Day 9 — 8h)

#### Tasks:

**Morning (4h) — Daily Alerts:**
- [ ] Vercel Cron: `0 8 * * *` → `/api/cron/send-daily-alerts`
  - For each farmer with registered crops:
    - Check if any crops have price gap > `alert_threshold`
    - If yes: Gemini generate personalized alert in their language
    - Send WhatsApp (or SMS fallback)
    - Log to `notifications` table

**Afternoon (4h) — Spoilage + Reports:**
- [ ] Spoilage alert Cron: `0 6 * * *` → `/api/cron/check-spoilage`
  - For each inventory item: recalculate spoilage risk score
  - If score > 70 OR deadline ≤ 3 days: send WhatsApp to FPO owner + generate emergency recommendation
- [ ] FPO email report: daily market summary via Resend
- [ ] PWA push notifications setup (Web Push API)
- [ ] FPO Screen 5: Alerts & Reports tab

**Acceptance Criteria:** Automated alert system running. FPO gets daily email report. Push notifications working.

---

### PHASE 9: WHATSAPP EXTENSIONS + FPO REGISTRATION (Day 10 — 8h)

#### Tasks:

**Morning (4h) — WhatsApp Extended Intents:**
- [ ] `CONNECT_FPO` intent: fetch FPOs in farmer's district, list top 3
- [ ] `REGISTER_LISTING` intent (conversational, multi-turn): crop → qty → price → date → confirm → create listing
- [ ] `FORECAST` intent: 7-day forecast summary + Gemini explanation

**Afternoon (4h) — FPO Web Features:**
- [ ] FPO web onboarding: register org, crops handled, districts served
- [ ] FPO profile page: visible to farmers searching for transport
- [ ] Farmer "Find FPO" map: Google Maps with FPO markers and service area circles
- [ ] Farmer can call FPO directly from app (`tel:` link)

**Acceptance Criteria:** Full farmer ↔ FPO connection pathway. Conversational listing creation via WhatsApp.

---

### PHASE 10: EXPLAINABILITY + POLISH PASS 1 (Day 11 — 8h)

> [!IMPORTANT]
> GDG explicitly rewards solutions that **explain their AI**, not just use it. This phase is critical for scoring.

#### Tasks:

**Morning (4h) — Explainability:**
- [ ] Explainability panel: every AI recommendation has expandable "Why?" section
  - Why is this opportunity rated HIGH? → Gemini explains data signals
  - Why should I sell in 4 days? → Price trend reasoning
  - Why is my spoilage risk 78? → Weather + deadline + crop type reasoning
- [ ] Confidence indicators: traffic light (🟢🟡🔴) on every AI output
- [ ] Data freshness: "Prices last updated 12 minutes ago" on all price displays

**Afternoon (4h) — UX Polish:**
- [ ] Language selector: farmer can change language in settings → all WhatsApp responses update
- [ ] Mobile UX pass: test all farmer screens on 375px viewport
- [ ] Loading states: skeleton loaders for all data cards
- [ ] Error states: graceful degradation when Agmarknet API fails (show cached data)
- [ ] Accessibility: aria-labels, keyboard navigation, color contrast check

**Acceptance Criteria:** Every AI output has a "Why?" explanation. Mobile experience polished. Confidence indicators everywhere.

---

### PHASE 11: DEMO SYSTEM + DATA SEEDING (Day 12 — 8h) 🔴 P4

> [!CAUTION]
> A broken demo loses. A rehearsed demo wins. The demo reset system is a **non-negotiable priority**.

#### Tasks:

**Morning (4h) — Demo Infrastructure:**
- [ ] Demo reset endpoint: `POST /api/demo/reset`
  - Clears demo user's listings, matches, notifications
  - Re-seeds fresh demo data for "Ramu" (farmer) + "Suresh" (FPO)
- [ ] Demo trigger endpoints:
  - `POST /api/demo/trigger-price-spike` → simulates Hyderabad tomato price jump
  - `POST /api/demo/trigger-match` → creates a pre-scored match for demo farmer
  - `POST /api/demo/trigger-spoilage-alert` → fires spoilage alert for demo FPO
- [ ] Seed complete demo dataset:
  - 7-day price history for tomato, onion, chilli across 15 districts
  - Demo farmer Ramu: 300kg tomatoes in Kurnool
  - Demo FPO Suresh: 40T onions in Guntur with 5-day deadline
  - Pre-computed gap: Kurnool→Hyderabad ₹11/kg, Guntur→Bengaluru ₹9/kg

**Afternoon (4h) — Demo Rehearsal:**
- [ ] Rehearse full demo flow (3 times):
  1. Ramu sends WhatsApp in Telugu → gets price + gap → sees map → FPO connects
  2. Suresh logs into FPO dashboard → sees heatmap → views movement recommendation → acts
  3. Match completes → both get WhatsApp confirmation
- [ ] Fix all demo-path bugs found in rehearsal
- [ ] Record backup demo video (in case live demo fails)

**Acceptance Criteria:** Demo system is bulletproof. Full flow rehearsed 3x. Backup video recorded.

---

### PHASE 12: README + ARCHITECTURE + GITHUB CLEANUP (Day 13 — 8h) 🔴 P6

> [!IMPORTANT]
> GDG judges the GitHub repo directly. A professional README with architecture diagram is a **non-negotiable priority**.

#### Tasks:

**Morning (4h) — Documentation:**
- [ ] Architecture diagram (Mermaid or Excalidraw → export PNG):
  - Show: Farmer channels → Next.js API → Supabase → Gemini → Google Maps
  - Show: Cron jobs flow
  - Show: FPO Dashboard data flow
- [ ] `README.md`:
  - Problem statement (2 paragraphs, real data)
  - Solution summary
  - Architecture diagram embedded
  - Feature list (farmer + FPO)
  - Tech stack with logos
  - Setup instructions (full local dev)
  - Demo video link
  - Live URL
  - SDG mapping
  - Author

**Afternoon (4h) — Code Cleanup:**
- [ ] Clean git history: squash WIP commits, proper commit messages
- [ ] `.env.example`: document all required variables
- [ ] Code comments: JSDoc on all critical functions
- [ ] Remove all `console.log`, debug endpoints (except `/api/demo/*`)
- [ ] Final test: fresh clone → `npm install` → works locally

**Acceptance Criteria:** Professional GitHub repo. README with architecture diagram. Judges can clone and run.

---

### PHASE 13: USER EVIDENCE + IMPACT STORY (Day 14 — 8h) 🔴 P5

> [!CAUTION]
> "Define the problem with real data, statistics, or direct user quotes." — This is the **single most-weighted non-technical criterion** for GDG judging.

#### Tasks:

**Morning (4h) — User Interviews:**
- [ ] Talk to 3 real people (WhatsApp voice call is enough):
  - 1 farmer or family member who farms (anyone in AP/Telangana network)
  - 1 kirana store owner or small trader
  - 1 FPO member or agri cooperative person
- [ ] Document: exact words, actual problems, real quotes
- [ ] Add quotes to README and pitch deck

**Afternoon (4h) — Impact Materials:**
- [ ] Build impact calculator (standalone widget on landing page, no login):
  - Input: crop → quantity → local price
  - Output: "If you had sold in [best district]: ₹X more profit"
- [ ] Impact numbers (real Indian agriculture statistics):
  - India loses ₹92,000 crore in agricultural waste annually
  - Farmers receive only 25% of retail price
  - AgriFlow's target: help farmers capture 40-60% of retail price
- [ ] Draft the 3-minute demo video script (problem → solution → impact arc)

**Acceptance Criteria:** Real user quotes collected. Impact calculator live. Video script ready.

---

### PHASE 14: DEMO VIDEO RECORDING (Day 15 — 7h)

#### Tasks:

**Morning (4h) — Video Recording:**
- [ ] Record with OBS at 1080p
- [ ] Script structure (3 minutes):
  - **[0:00-0:15] HOOK:** Ramu's story — ₹4 vs ₹15, same crop, 200km apart
  - **[0:15-0:45] PROBLEM:** Stats — 100M farmers, 25% price share, ₹92,000 crore waste
  - **[0:45-1:45] SOLUTION DEMO:**
    - Ramu WhatsApp in Telugu → response → dashboard → Price Map
    - Suresh FPO dashboard → heatmap → movement recommendation → match
  - **[1:45-2:15] TECH (30 sec):** Gemini, Google Maps, Agmarknet, architecture diagram
  - **[2:15-2:45] IMPACT:** Earnings improvement, user quote, SDG badges
  - **[2:45-3:00] CLOSE:** "Every farmer deserves to know what their crop is worth, everywhere."

**Afternoon (3h) — Edit + Polish:**
- [ ] Use phone for WhatsApp demo segment (feels more real)
- [ ] Telugu WhatsApp demo must be flawless
- [ ] Add English subtitles for Telugu segments
- [ ] Background music: subtle, non-distracting
- [ ] Upload to YouTube (unlisted)

**Acceptance Criteria:** Final 3-minute demo video uploaded to YouTube.

---

### PHASE 15: FINAL POLISH + SUBMISSION (Day 16 — 7h)

#### Tasks:

**Morning (4h) — Final QA:**
- [ ] Final QA pass: all features working on production URL
- [ ] Mobile test: open on actual Android phone, verify PWA install
- [ ] WhatsApp test: fresh number → full flow works
- [ ] Load test: verify Vercel doesn't hit cold start issues on demo triggers
- [ ] Verify all Cron jobs ran successfully in last 24h (check Vercel logs)

**Afternoon (3h) — Submission:**
- [ ] Submission form:
  - GitHub URL (public)
  - Demo video URL (YouTube unlisted)
  - Live PWA URL (Vercel)
  - Problem statement: PS3 (Smart Supply Chains) + PS5 (Smart Resource Allocation)
  - SDG: 2, 8, 12
- [ ] Final README review
- [ ] Submit before deadline (April 24, 2026)
- [ ] Post: share on LinkedIn / college group with demo video

**Acceptance Criteria:** Submitted. Everything works. Live URL accessible.

---

## 🏗️ Google Technologies Checklist (GDG Scoring)

> [!IMPORTANT]
> Justify **each** Google tech choice in the video and deck. GDG explicitly scores this.

| # | Google Technology | Usage in AgriFlow |
|---|---|---|
| 1 | Gemini 2.0 Flash API | Core AI engine — NLU, advisory, multilingual responses |
| 2 | Gemini 1.5 Pro API | Complex market analysis for FPO dashboard |
| 3 | Google Maps JS API | Supply-demand heatmap (visual centerpiece) |
| 4 | Google Maps Geocoding | Convert district names to coordinates |
| 5 | Google Maps Distance Matrix | Transport cost estimation |
| 6 | data.gov.in (Agmarknet) | Government API for real mandi price data |

> **Bonus (if time allows, Day 13+):** Add Firebase Cloud Messaging for mobile push notifications — adds another Google tech checkbox.

---

## 📊 Cost Model

### Demo (₹0)
| Service | Free Tier |
|---|---|
| Vercel Hobby | Free |
| Supabase | 500MB DB, 50k MAU |
| Upstash Redis | 10k commands/day |
| Clerk | 50k MAU |
| Twilio | $15 trial (~300 WhatsApp) |
| Resend | 100 emails/day |
| Gemini API | 60 req/min |
| Google Maps | $200/month credit |

### At Scale (1000 farmers, 200 FPOs): ~₹10,800/month
### Revenue at Scale: 200 FPOs × ₹499/month = ₹99,800/month (89% gross margin)

---

## 🎯 GDG Judging Criteria Alignment

| Criterion | How AgriFlow Addresses It |
|---|---|
| **Real World Problem** | Real Agmarknet data, targeted rural Indian users, before/after comparison, specific SDG sub-targets |
| **Google Technologies** | 6 Google technologies, each justified |
| **Clean UI** | shadcn/ui + Tailwind + Framer Motion, mobile-first, 5-second comprehension |
| **USP** | Price gaps as resource allocation signal — not just data display, a decision engine |
| **Real World Impact** | User interviews, measurable ₹/kg improvement, SDG metrics |
| **Tech Meaningfulness** | AI used for NLU, multilingual, reasoning, explainability — genuinely hard problems |
| **Working MVP** | Demo reset system, rehearsed flow, backup video |
| **Demo Video** | Telugu WhatsApp hook, story arc, 50/50 tech+story |
| **Performance** | Vercel serverless auto-scale, Supabase managed Postgres, cached price data |
| **Accessibility** | SMS bot (zero smartphone), voice notes (zero literacy), multi-language, WCAG-compliant |
| **Originality** | Cross-district price gap signal, FPO movement engine, cold storage deadline board |

---

## 📝 Key AI Agent Instructions

> [!WARNING]
> **For AI agents executing this plan:**
> 1. **Follow priority order strictly.** Phase 1 before Phase 2 before Phase 3, etc.
> 2. **Never skip a non-negotiable (P0–P6).** If time is short, cut SMS bot, profit tracker complexity, negotiation engine — but NEVER cut the 7 non-negotiables.
> 3. **Test each phase before moving to the next.** Every phase has explicit acceptance criteria.
> 4. **Use Gemini Flash for WhatsApp/SMS** (fast, cheap) and **Pro only for FPO deep analysis** to stretch quota.
> 5. **Mobile-first always.** Farmers use phones, not desktops. Test on 375px viewport.
> 6. **Telugu WhatsApp is the #1 demo moment.** Make it flawless above everything else.
> 7. **The heatmap with animated arrows is the #1 visual.** Polish it above all other UI.
> 8. **Every AI output must show: what data it used, why it recommended, confidence level, what could change it.**
> 9. **Commit frequently** with descriptive messages. Will be squashed later.
> 10. **Keep all environment variables in `.env.local`** and document in `.env.example`.

---

*AgriFlow Solo Spec v1.0 — Built by one person with 122 hours and a clear vision. Built for 100 million farmers who deserve to know.*
