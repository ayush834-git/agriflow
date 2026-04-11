import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Globe2,
  MapPin,
  MessageCircle,
  MoveRight,
  Phone,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  Wheat,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const stats = [
  { value: "₹92,000 Cr", label: "Lost to food waste annually in India" },
  { value: "25%", label: "Share of retail price farmers actually receive" },
  { value: "3,000+", label: "Mandis tracked in real-time via Agmarknet" },
  { value: "₹0", label: "Cost to farmers — always free" },
];

const farmerFeatures = [
  {
    icon: MessageCircle,
    title: "WhatsApp & SMS Bot",
    description:
      "Ask prices in Telugu, Hindi, Kannada, or English. Get instant gap analysis and sell recommendations — even on a basic phone.",
  },
  {
    icon: MapPin,
    title: "Price Gap Map",
    description:
      "See exactly which district is paying the highest price for your crop right now, with color-coded district-level maps.",
  },
  {
    icon: TrendingUp,
    title: "Best Time to Sell",
    description:
      "7-day price forecasts powered by Gemini AI, with plain-language explanations of why prices will rise or fall.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified the moment your crop's price gap crosses your threshold — delivered to WhatsApp or SMS automatically.",
  },
];

const fpoFeatures = [
  {
    icon: Globe2,
    title: "Supply-Demand Heatmap",
    description:
      "Full-screen Google Maps with district polygons colored by opportunity score. Green = surplus, Red = deficit. Live data.",
  },
  {
    icon: Truck,
    title: "Movement Recommendations",
    description:
      "AI-generated route plans with destination, transport cost, net profit estimate, confidence level, and urgency deadline.",
  },
  {
    icon: BarChart3,
    title: "Cold Storage Deadline Board",
    description:
      "Track every inventory item by spoilage deadline. Color-coded urgency. One-click emergency movement plans.",
  },
  {
    icon: Shield,
    title: "Buyer-Seller Matching",
    description:
      "AI-scored matches between farmer listings and buyer needs. One-tap WhatsApp introductions drafted by Gemini.",
  },
];

const techStack = [
  { name: "Gemini 2.0 Flash", detail: "NLU, multilingual, recommendations" },
  { name: "Google Maps JS API", detail: "Supply-demand heatmap" },
  { name: "Google Maps Distance Matrix", detail: "Transport cost estimation" },
  { name: "Agmarknet / data.gov.in", detail: "Real mandi price data" },
  { name: "Next.js + Supabase", detail: "Full-stack, real-time" },
  { name: "Twilio", detail: "WhatsApp & SMS channels" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_40px_120px_-60px_rgba(20,72,44,0.45)] backdrop-blur">
        <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.3fr_0.7fr] lg:px-12 lg:py-14">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Google Solution Challenge 2026</Badge>
              <Badge variant="outline">SDG 2 — Zero Hunger</Badge>
              <Badge variant="outline">SDG 12 — Responsible Production</Badge>
            </div>

            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">
                AgriFlow
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                Every farmer deserves to know what their crop is worth
                — everywhere.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                A farmer in Kurnool sells tomatoes at ₹4/kg because he
                doesn&apos;t know Hyderabad is paying ₹15/kg. AgriFlow tells
                him — in real time, in Telugu, on his phone. Then connects
                him to the FPO that can move his crop there.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-44">
                <Link href="/dashboard">
                  <Wheat className="mr-2 size-4" />
                  Farmer Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-44">
                <Link href="/dashboard/fpo">
                  <Truck className="mr-2 size-4" />
                  FPO Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">
                  Register
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero right — Ramu's Story */}
          <div className="flex flex-col gap-4">
            <Card className="border border-primary/20 bg-[linear-gradient(135deg,rgba(47,107,70,0.92),rgba(35,80,55,0.96))] text-primary-foreground">
              <CardHeader className="pb-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/60">
                  Ramu&apos;s Story — Kurnool District
                </p>
                <CardTitle className="text-2xl text-primary-foreground">
                  ₹3,300 lost today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-primary-foreground/85">
                <p>
                  Ramu sold 300 kg of tomatoes at ₹4/kg at his local mandi.
                  200 km away, Hyderabad was paying ₹15/kg.
                </p>
                <p className="font-medium text-primary-foreground">
                  He didn&apos;t know. He couldn&apos;t know. Until AgriFlow.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-accent/10">
              <CardContent className="flex items-start gap-3 pt-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Phone className="size-5" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">WhatsApp Demo (Telugu)</p>
                  <p className="text-muted-foreground">
                    &quot;నేడు టమాటా ధర ఎంత?&quot; → Instant price + gap +
                    sell recommendation in Telugu
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-accent/10">
              <CardContent className="flex items-start gap-3 pt-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <MoveRight className="size-5" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">FPO Movement Plan</p>
                  <p className="text-muted-foreground">
                    Guntur → Bengaluru: ₹9/kg gap. 40T onions.
                    Estimated profit: ₹2,20,000. Move in 4 days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border border-border/70 bg-card/85 text-center"
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-2xl font-bold text-primary sm:text-3xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Price gap detected → Alert sent → Supply moves → Prices equalize
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            AgriFlow continuously monitors 3,000+ mandis. When a price gap
            appears, it alerts the right farmers and FPOs in their language,
            on their channel, with profit estimates and transport costs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "Data Ingestion",
              desc: "Real Agmarknet prices from 3,000+ mandis across AP, Telangana, and Karnataka — every 30 minutes.",
            },
            {
              step: "2",
              title: "Gap Detection",
              desc: "For each crop × district: price gap, demand signal, opportunity score, and transport feasibility computed.",
            },
            {
              step: "3",
              title: "Smart Alerts",
              desc: "Farmers get WhatsApp/SMS alerts in their language. FPOs see heatmaps with profit-estimated routes.",
            },
            {
              step: "4",
              title: "Supply Moves",
              desc: "FPOs route supply to high-price districts. Prices converge. Farmers earn more. Waste drops.",
            },
          ].map((item) => (
            <Card key={item.step} className="border border-border/70 bg-card/85">
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-lg font-bold text-primary">
                  {item.step}
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Farmer Features */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
            For Farmers
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Works on every phone. Speaks every language.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {farmerFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border border-border/70 bg-card/85"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FPO Features */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
            For FPOs & Suppliers
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Move supply where it&apos;s needed. Before it spoils.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fpoFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border border-border/70 bg-card/85"
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Impact Calculator Teaser */}
      <section className="overflow-hidden rounded-[2rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(47,107,70,0.06),rgba(35,80,55,0.12))] px-6 py-10 text-center sm:px-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <Sparkles className="mx-auto size-8 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How much more could you earn?
          </h2>
          <p className="text-muted-foreground">
            Select your crop, enter your quantity, and see the difference
            AgriFlow could make versus selling at your local mandi.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Try the Farmer Dashboard
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
            Built With
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Powered by Google technologies
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-medium">{tech.name}</p>
                <p className="text-sm text-muted-foreground">{tech.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 px-6 py-10 shadow-[0_35px_100px_-60px_rgba(20,72,44,0.45)] sm:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              Open source • ₹0 for farmers • Built for 100 million
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              AgriFlow: The intelligence layer that moves India&apos;s crops to
              where they&apos;re needed.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Addressing SDG 2 (Zero Hunger) and SDG 12 (Responsible Production)
              by democratizing market intelligence that only middlemen had.
              Every farmer deserves to know.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Create account</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/dashboard/fpo">
                Open FPO Dashboard
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <Separator className="my-6" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-sm font-medium">PS3 — Smart Supply Chains</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Detect supply disruptions and recommend optimized routes.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-sm font-medium">PS5 — Smart Resource Allocation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Match available crop inventory to the districts that need it most.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-sm font-medium">Google Solution Challenge 2026</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Solo build. 122 hours. 6 Google technologies. ₹0 demo cost.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
