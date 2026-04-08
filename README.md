# AgriFlow

AgriFlow is an agricultural intelligence platform for the Google Solution Challenge 2026. The product is built around one simple promise: help farmers and FPO operators see where crops should move next by combining live mandi prices, multilingual messaging, and district-level decision support.

This repo now covers the guide through the core farmer and FPO operating loop:

- Next.js 16 App Router with TypeScript, Tailwind v4, and shadcn/ui
- Agmarknet-backed price fetch, gap computation, and crop APIs
- WhatsApp and SMS webhook flows with local fallback state
- Farmer registration, listings, match inbox, and alert views
- FPO inventory, route recommendations, buyer directory, and deadline board
- Cron-ready daily alerts and spoilage check endpoints
- Supabase migration scaffold for the first 10 domain tables

# AgriFlow: Google Solution Challenge 2026

AgriFlow is a multilingual agricultural intelligence platform that prevents food waste and stabilizes market prices by revealing actionable price gaps across Indian districts. It connects farmers to FPOs via AI-powered SMS and WhatsApp alerts while providing live supply-demand heatmaps to coordinate logistical movement.

**SDG 2** (Zero Hunger) & **SDG 12** (Responsible Consumption and Production)

## 📡 Live End-to-End Architecture

```mermaid
graph TD
    %% External Data & AI
    Agmarknet[Agmarknet Mandi Prices] -->|Cron (30m)| NextJS[Next.js Server]
    Gemini[Gemini 1.5/2.0] <-->|Reasoning & NLP| NextJS
    Maps[Google Maps Dist. Matrix API] <-->|Logistics| NextJS

    %% User Channels
    WhatsApp[WhatsApp / SMS via Twilio] <-->|Webhook / Intent| NextJS
    FarmerDash[Farmer Web Dashboard] <--> NextJS
    FPODash[FPO Web Dashboard] <--> NextJS

    %% Persistence
    NextJS -->|PostgreSQL Schema| Supabase[(Supabase DB)]
    NextJS -->|Upstash Redis| Cache[(Redis Cache & Session)]
    NextJS -->|Authentication| Clerk[(Clerk Auth)]

    style WhatsApp fill:#25D366,stroke:#fff,stroke-width:2px,color:#fff
    style Supabase fill:#3ECF8E,stroke:#fff,stroke-width:2px,color:#000
    style Gemini fill:#4285F4,stroke:#fff,stroke-width:2px,color:#fff
    style Maps fill:#FBBC05,stroke:#fff,stroke-width:2px,color:#000
    style NextJS fill:#000000,stroke:#fff,stroke-width:2px,color:#fff
```

## 🚀 Key Differentiators

| Feature | Description | Target |
|---------|-------------|---------|
| **Multilingual Agent** | Speak to the bot via WhatsApp audio or text in Telugu, Kannada, Hindi, or English | Farmers |
| **Agentic Matching** | AI actively matches FPOs with required inventory to active farmer listings. | Farmers & FPO |
| **Generative Predictors**| Gemini analyzes arrival volumes, price spreads, and historical vectors to recommend optimal sell windows. | Farmers |
| **Visual Supply Maps** | A live Google Maps dynamic overlay highlighting regional deficits and surpluses for immediate supply patching. | FPO / Buyers |
| **Spoilage Engine** | A real-time matrix calculating degradation to flag high-risk storage queues for emergency dispatch. | FPO / Logistics |

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui, Framer Motion
- **AI / Agentic Intelligence**: `@google/generative-ai` (Gemini 2.5 Flash API)
- **Map / Geospatial**: `@vis.gl/react-google-maps`, Google Maps REST Distance Matrix
- **Auth & Database**: Clerk, Supabase, Upstash Redis Serverless
- **Communications**: Twilio API (WhatsApp + SMS)

## 💻 Running Locally

1. **Install dependencies**:
```bash
npm install
```

2. **Environment Configuration**:
Copy `.env.example` to `.env.local` and provide standard keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (ensure Distance Matrix is enabled)
- `GEMINI_API_KEY`
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`

3. **Start the server**:
```bash
npm run dev
```

4. **Webhooks Setup** (For testing WhatsApp locally):
Use `ngrok` or `localtunnel` to tunnel port 3000 mapping `/api/whatsapp/webhook` to Twilio's WhatsApp sandbox inbound message URL.

### Demo APIs
```text
GET  /api/health                                    # Health and metrics
GET  /api/cron/fetch-prices?mode=mock&historyDays=7 # Mock Agmarknet updates
POST /api/matches/simulate-accept                   # Demo the farmer 'YES' WhatsApp loop
```
