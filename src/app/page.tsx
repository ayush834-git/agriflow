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
  { value: "3,000+", label: "Mandis tracked in real-time" },
  { value: "₹0", label: "Cost to farmers — always free" },
];

const farmerFeatures = [
  {
    icon: MessageCircle,
    title: "Talk on WhatsApp",
    description:
      "Ask prices in Telugu, Hindi, Kannada, or English using voice notes. Get instant gap analysis and sell recommendations on any phone.",
  },
  {
    icon: MapPin,
    title: "Find Better Markets",
    description:
      "See exactly which district is paying the highest price for your crop right now. Sell where the demand is.",
  },
  {
    icon: TrendingUp,
    title: "Best Time to Sell",
    description:
      "7-day price forecasts with simple explanations of why prices will rise or fall, helping you avoid selling too early.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified automatically on WhatsApp or SMS the moment your crop's price jumps in a nearby market.",
  },
];

const fpoFeatures = [
  {
    icon: Globe2,
    title: "Supply-Demand Map",
    description:
      "See live market conditions across your state. Move stock from green (surplus) areas to red (high demand) areas to maximize profit.",
  },
  {
    icon: Truck,
    title: "Where to Move Crops",
    description:
      "Get automated transport routes with destination, transport cost, extra profit estimate, and deadline.",
  },
  {
    icon: BarChart3,
    title: "Stock Expiry Tracker",
    description:
      "Track every lot in your warehouse. Get urgent alerts to move crops before they spoil and lose their value.",
  },
  {
    icon: Shield,
    title: "Find Buyers Instantly",
    description:
      "Match your available stock with active buyers nearby. Connect directly on WhatsApp to close the deal.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Hero Section */}
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_40px_120px_-60px_rgba(20,72,44,0.45)] backdrop-blur">
        <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.3fr_0.7fr] lg:px-12 lg:py-14">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">AgriFlow</Badge>
              <Badge variant="outline">Live in AP, TS, & KA</Badge>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
                Know what your crop is worth — and where to sell it.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Stop guessing. AgriFlow tracks prices across 3,000+ local markets.
                Ask us on WhatsApp to find where buyers are paying the most, or manage your trading stock before it spoils.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-44 bg-green-600 hover:bg-green-700 text-white">
                <a href="https://wa.me/14155238886?text=Hi" target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-5" />
                  Ask on WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-44">
                <Link href="/dashboard">
                  <Wheat className="mr-2 size-4" />
                  Farmer Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/fpo">
                  <Truck className="mr-2 size-4" />
                  Trader Dashboard
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
                  He didn&apos;t know because no one told him. AgriFlow changes that.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-accent/10">
              <CardContent className="flex items-start gap-3 pt-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Phone className="size-5" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Speak in your language</p>
                  <p className="text-muted-foreground">
                    &quot;నేడు టమాటా ధర ఎంత?&quot; → We instantly reply in Telugu with the best place to sell.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-accent/40 bg-accent/10">
              <CardContent className="flex items-start gap-3 pt-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <MoveRight className="size-5" />
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Move stock fast</p>
                  <p className="text-muted-foreground">
                    Guntur → Bengaluru: ₹9/kg profit extra. Move 40T onions before they spoil.
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
            We find the best price, you take the crop there
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            AgriFlow monitors the markets so you don't have to. When a buyer is paying more,
            we let you know immediately.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              step: "1",
              title: "We Track Prices",
              desc: "We collect real-time prices from over 3,000 local markets continuously.",
            },
            {
              step: "2",
              title: "Find Opportunities",
              desc: "We calculate exactly how much extra profit you can make by transporting your crop to a better market.",
            },
            {
              step: "3",
              title: "Alert Farmers & Traders",
              desc: "Farmers get simple WhatsApp alerts. Traders see clear route maps to move big quantities.",
            },
            {
              step: "4",
              title: "Crops Stop Spoiling",
              desc: "Crops are sold where demand is highest. Farmers earn more. Nothing goes to waste.",
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
            Works on any phone. Speaks your language.
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
            For Traders & FPOs
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
            View live prices from markets nearby and see how much extra you could earn
            by moving your crops to the right buyers.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Try the Dashboard Now
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 px-6 py-10 shadow-[0_35px_100px_-60px_rgba(20,72,44,0.45)] sm:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              Made for Indian Farmers
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Stop letting middlemen decide your profit.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              AgriFlow brings complete market transparency directly to your phone.
              We tell you what everyone else is paying, so you never sell for less than you deserve.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <a href="https://wa.me/14155238886?text=Hi" target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 size-5" />
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
