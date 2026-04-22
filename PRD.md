# AgriFlow - Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** AgriFlow  
**Tagline:** Multilingual Agricultural Intelligence Platform  
**Target Event:** Google Solution Challenge 2026  
**Primary SDGs:** SDG 2 (Zero Hunger), SDG 12 (Responsible Consumption and Production)

AgriFlow is a web and mobile-accessible platform that bridges the information gap between farmers and Farmer Producer Organizations (FPOs). By aggregating real-time mandi prices, mapping supply/demand district gaps, and leveraging an AI-powered conversational bot via WhatsApp and Twilio Voice, AgriFlow empowers farmers to sell at the right time and helps FPOs minimize post-harvest spoilage.

---

## 2. Target Users

1. **Farmers**
   - **Needs:** Know when and where to sell, receive fair prices, understand complex market dynamics in their local language, easily list available crops without navigating complex UIs.
   - **Tech Literacy:** Low to Medium (Heavy reliance on WhatsApp and voice notes).
   - **Primary Interfaces:** WhatsApp Bot (Text/Audio), Phone Call Bot, Farmer Web Dashboard.

2. **FPO Operators / Bulk Buyers**
   - **Needs:** Monitor district-wide crop availability, manage inventory, coordinate logistics, mitigate spoilage of perishable goods.
   - **Tech Literacy:** Medium to High.
   - **Primary Interfaces:** FPO Web Dashboard (Heatmaps, Data Tables).

---

## 3. Core Features & Capabilities

### 3.1 Multilingual Agentic Communication
- **WhatsApp Integration:** Farmers can send text messages or voice notes to a dedicated WhatsApp number.
- **Voice Call Integration:** Farmers can call a Twilio number to interact with a conversational AI.
- **Language Support:** Telugu, Kannada, Hindi, English.
- **Capabilities:** Check live prices, report crop listings, request selling advice.

### 3.2 AI-Powered Matching & Recommendations (Gemini)
- **Agentic Matching:** The system dynamically identifies overlaps between what a farmer has listed and what an FPO needs, generating automated alerts.
- **Selling Window Prediction:** Gemini analyzes historical prices and current supply vectors to advise farmers on the best days to sell.
- **Explainability:** Confidence scores and rationales are provided alongside all AI recommendations to ensure transparency.

### 3.3 Dynamic Heatmaps & Spatial Intelligence
- **Google Maps Overlays:** Live maps displaying regional supply surpluses and demand deficits.
- **Movement Recommendations:** Logistics tracking and route optimization for transporting crops from high-supply to high-demand areas.

### 3.4 Spoilage Engine & Inventory Management
- **Cold Storage Tracking:** FPOs track crop shelf-life in real-time.
- **Emergency Dispatch:** Automated alerts flag inventory nearing expiration, prioritizing its dispatch over fresh stock.

### 3.5 Real-Time Dashboards
- **Farmer Dashboard:** Earnings tracker, best time to sell widgets, listing manager, alerts view.
- **FPO Dashboard:** Heatmaps, inventory grids, cold storage board, buyer directory.

---

## 4. Technical Architecture & Stack

### Frontend & App Framework
- **Next.js 16 (App Router):** Server-side rendering, API routes, optimized page transitions.
- **React 19 & TypeScript:** Strict typing and cutting-edge React features.
- **Tailwind CSS v4 & shadcn/ui:** Modern, accessible, responsive component design.
- **Framer Motion:** Smooth UI animations for a premium feel.

### Backend Services & Databases
- **Supabase (PostgreSQL):** Core relational database storing users, listings, inventory, matches, and alerts.
- **Upstash Redis:** In-memory caching for session management, rate-limiting, and high-speed API responses.
- **Clerk:** Authentication and user session management.

### AI & External APIs
- **Google Gemini 2.5 / 1.5 Flash:** Core engine for audio transcription, intent classification, multi-language translation, and predictive modeling.
- **Twilio:** Communication gateway handling WhatsApp messaging, SMS, and inbound/outbound voice calls.
- **Google Maps & Distance Matrix APIs:** Geospatial visualizations and logistics calculations.
- **Agmarknet (Government Data):** Cron jobs periodically fetch live Indian agricultural market prices.

---

## 5. Detailed Project Structure

```text
agriflow/
├── README.md                      # Extensive project overview and setup
├── PRD.md                         # Product Requirements Document
├── src/                           # Application Source Code
│   ├── app/                       # Next.js 16 App Router
│   │   ├── api/                   # API Routes (Serverless Functions)
│   │   │   ├── cron/              # Automated scheduled tasks
│   │   │   ├── gaps/              # Supply/Demand gap computations
│   │   │   ├── inventory/         # FPO inventory management APIs
│   │   │   ├── listings/          # Farmer crop listing APIs
│   │   │   ├── matches/           # AI matching logic
│   │   │   ├── prices/            # Real-time Agmarknet price endpoints
│   │   │   ├── recommendations/   # Selling and movement algorithms
│   │   │   ├── voice/             # Twilio Voice call webhooks
│   │   │   └── whatsapp/          # Twilio WhatsApp webhooks
│   │   ├── dashboard/             # Main application dashboard routes
│   │   └── sign-in/               # Clerk Auth
│   ├── components/                # React UI Components
│   │   ├── dashboard/             # Features: Heatmap, Earnings, Listings, etc.
│   │   ├── layout/                # Shells, sidebars, navigation
│   │   ├── providers/             # i18n, Theme, Auth
│   │   └── ui/                    # Reusable shadcn components
│   └── lib/                       # Shared Utilities & Services
│       ├── gemini-audio.ts        # Voice-to-text processing
│       ├── i18n/                  # Multi-language dictionaries
│       ├── supabase/              # DB Schemas & clients
│       └── twilio.ts              # Twilio client wrappers
└── supabase/                      # Database Migrations
```

---

## 6. Future Scope
- Drone image analysis for crop disease detection via Gemini Vision.
- Direct blockchain-based smart contracts between Farmers and FPOs to lock in prices.
- Expansion to cover more Indian regional languages and integration with local weather APIs for hyper-local climate advisories.
