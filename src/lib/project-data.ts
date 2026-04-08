export const nonNegotiables = [
  {
    code: "P0",
    title: "Agmarknet price data pipeline",
    reason: "No data means no product. The rest of the platform depends on live mandi inputs.",
  },
  {
    code: "P1",
    title: "WhatsApp bot in Telugu",
    reason: "This is the guide's sharpest demo moment and the farmer-first interface.",
  },
  {
    code: "P2",
    title: "Price gap heatmap",
    reason: "The map is the fastest explanation of the core supply-demand signal.",
  },
  {
    code: "P3",
    title: "FPO movement recommendations",
    reason: "This is the differentiation layer beyond a raw market-data dashboard.",
  },
  {
    code: "P4",
    title: "Demo reset system",
    reason: "A resilient live demo path matters as much as the feature list.",
  },
  {
    code: "P5",
    title: "Three real user interviews",
    reason: "Real user evidence is one of the strongest judging levers outside the code.",
  },
  {
    code: "P6",
    title: "README plus architecture diagram",
    reason: "Judges will inspect the repository directly, so the repo must tell the story cleanly.",
  },
] as const;

export const bootstrapChecklist = [
  {
    label: "Next.js 16 app scaffold",
    detail:
      "Completed in the repo root with App Router, Tailwind v4, TypeScript, and shadcn/ui.",
    done: true,
  },
  {
    label: "Environment contract",
    detail:
      "Documented in .env.example and surfaced through runtime-safe helpers for bootstrap checks.",
    done: true,
  },
  {
    label: "Supabase schema draft",
    detail:
      "Initial migration created for users, market data, listings, inventory, movement, matches, notifications, and WhatsApp sessions.",
    done: true,
  },
  {
    label: "Supabase project provisioning",
    detail:
      "Still needs a real project, keys, database URL, and the migration applied against it.",
    done: false,
  },
  {
    label: "Clerk, Twilio, Upstash, Gemini, Maps, Resend",
    detail:
      "Keys are intentionally not hardcoded. These stay pending until service credentials are supplied.",
    done: false,
  },
] as const;

export const phaseTracks = [
  {
    phase: "Phase 1",
    title: "Data pipeline and price engine",
    description:
      "The first implementation sprint should move directly into live mandi ingestion and price gap computation.",
    tasks: [
      "Create /api/cron/fetch-prices to normalize Agmarknet data into mandi_prices.",
      "Create /api/cron/compute-gaps to calculate opportunity scores across districts.",
      "Expose crop-level price and gap endpoints for the dashboards and WhatsApp bot.",
    ],
  },
  {
    phase: "Phase 2",
    title: "WhatsApp bot core",
    description:
      "The messaging layer is the first farmer-facing experience and the most memorable part of the demo.",
    tasks: [
      "Implement the Twilio WhatsApp webhook and Redis-backed session flow.",
      "Classify PRICE_CHECK, BEST_MARKET, SELL_ADVICE, and SETUP_ALERT intents with Gemini.",
      "Return multilingual responses with Telugu as the primary demo path.",
    ],
  },
  {
    phase: "Phase 3",
    title: "SMS and onboarding scaffolding",
    description:
      "The next thin slice ties farmer onboarding to the messaging channels so the same phone number can move across web, WhatsApp, and SMS.",
    tasks: [
      "Add registration pages for farmers and FPOs before Clerk is wired.",
      "Persist farmer crops and organization profiles with local fallback plus Supabase-ready writes.",
      "Mirror the core bot flow on SMS so the demo still works if WhatsApp is blocked.",
    ],
  },
  {
    phase: "Phase 4",
    title: "Farmer dashboard and map",
    description:
      "Once the pipeline exists, the farmer PWA needs to turn the price gap signal into a fast visual and action surface.",
    tasks: [
      "Build a dashboard workspace with crop switching and local versus best-market pricing.",
      "Ship a district heatmap fallback now, then swap in Google Maps later.",
      "Prepare the PWA shell for installability and low-bandwidth resilience.",
    ],
  },
  {
    phase: "Phase 5 and 6",
    title: "FPO operations and movement engine",
    description:
      "The operator side now runs inventory urgency, route generation, and margin-focused movement planning.",
    tasks: [
      "Render the FPO heatmap workspace with route arrows and top opportunity cards.",
      "Track inventory deadlines and spoilage risk inside the FPO workspace.",
      "Generate route recommendations with transport and margin estimates for each active lot.",
    ],
  },
  {
    phase: "Phase 7",
    title: "Buyer-seller matching loop",
    description:
      "Matching turns listings and inventory into live conversations with farmers instead of passive dashboards.",
    tasks: [
      "Search the buyer directory by crop, district, and quantity from the FPO side.",
      "Create match records and notify farmers through the WhatsApp-style alert loop.",
      "Expose match status back on the farmer dashboard as a live action item.",
    ],
  },
  {
    phase: "Phase 8",
    title: "Alerts and reports engine",
    description:
      "Automated market alerts, spoilage checks, email previews, and push-ready notifications complete the operating loop.",
    tasks: [
      "Run daily crop-alert logic for registered farmers using their saved thresholds.",
      "Recalculate spoilage risk on inventory and trigger emergency route generation.",
      "Log email and push-ready notifications so external delivery can be wired later without redesigning the app.",
    ],
  },
  {
    phase: "Phase 9",
    title: "FPO discovery and forecast loop",
    description:
      "The next guide step brings FPO discovery, direct contact paths, and a richer WhatsApp operating flow for listings and forecast checks.",
    tasks: [
      "Expose FPO discovery to farmers with service-area context and profile views.",
      "Extend WhatsApp with CONNECT_FPO, FORECAST, and conversational listing registration.",
      "Keep the full experience demo-safe until Maps, Twilio, and live identity wiring land later.",
    ],
  },
  {
    phase: "Phase 10",
    title: "Explainability and polish pass",
    description:
      "This guide step adds confidence signals, freshness labels, loading states, and clearer reasoning so judges can understand why the app is making each recommendation.",
    tasks: [
      "Add visible confidence indicators and expandable Why panels on scored recommendations and risk outputs.",
      "Show freshness context on price-heavy surfaces and keep fallback warnings obvious when live data is unavailable.",
      "Improve mobile and low-bandwidth polish with loading shells, clearer states, and a farmer language preference control.",
    ],
  },
  {
    phase: "Phase 11",
    title: "Demo reset system and seeded rehearsal data",
    description:
      "This guide step hardens the live-demo path with deterministic reset endpoints, seeded scenarios, and triggerable market moments.",
    tasks: [
      "Add POST /api/demo/reset to restore the demo farmer, FPO, listings, inventory, market seed, and local session state.",
      "Add price-spike, match, and spoilage trigger endpoints so the full story can be rehearsed on demand.",
      "Seed the 7-day market snapshot plus the Kurnool to Hyderabad tomato and Guntur to Bengaluru onion routes for the judge-facing flow.",
    ],
  },
] as const;
