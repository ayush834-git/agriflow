import Link from "next/link";
import { ArrowRight, Building2, MessageSquareText, Tractor } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const registrationTracks = [
  {
    href: "/register/farmer",
    title: "I am a Farmer",
    description:
      "Get live crop prices, find where to sell for the most profit, and connect with buyers directly on WhatsApp.",
    icon: Tractor,
  },
  {
    href: "/register/fpo",
    title: "I am a Trader / FPO",
    description:
      "Find crop supply, track your inventory, and get the smartest transport routes to maximize your margins.",
    icon: Building2,
  },
];

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 px-6 py-8 shadow-[0_35px_90px_-60px_rgba(20,72,44,0.45)]">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              Welcome
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Join AgriFlow
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              Create your account to start getting live market intelligence. We just need
              a few details to make sure you get the right prices for the crops you care about.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register/farmer">
                  I'm a Farmer
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>

          <Card className="border border-border/70 bg-background/70">
            <CardHeader>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <MessageSquareText className="size-6" />
              </div>
              <CardTitle>Connected to WhatsApp</CardTitle>
              <CardDescription>
                Use your WhatsApp number to register so our assistant can recognize you instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>We'll only send you alerts when your crops reach your target price.</p>
              <p>Everything is available in your local language.</p>
              <p>
                No hidden fees. Free for farmers forever.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {registrationTracks.map((track) => {
          const Icon = track.icon;

          return (
            <Card key={track.href} className="border border-border/70 bg-card/85 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{track.title}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={track.href}>
                    Continue
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
