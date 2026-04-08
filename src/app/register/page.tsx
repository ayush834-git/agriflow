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
    title: "Farmer registration",
    description:
      "Create the profile that the WhatsApp and SMS bot will recognize for crop prices, alerts, and sell advice.",
    icon: Tractor,
  },
  {
    href: "/register/fpo",
    title: "FPO registration",
    description:
      "Set up the organization contact and districts served so the operations layer is ready for inventory and movement workflows.",
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
              Registration
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Connect people to the AgriFlow messaging layer.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              This phase keeps onboarding service-agnostic for now. We can save
              farmer and FPO profiles already, then wire Clerk and Twilio later
              without changing the product flow.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register/farmer">
                  Start farmer flow
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>

          <Card className="border border-border/70 bg-background/70">
            <CardHeader>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareText className="size-6" />
              </div>
              <CardTitle>Bot-ready onboarding</CardTitle>
              <CardDescription>
                Use the same phone number from WhatsApp or SMS so the assistant
                can identify the farmer immediately after registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Farmer flow stores district, language, and crops to monitor.</p>
              <p>FPO flow stores the organization contact and districts served.</p>
              <p>
                Both paths already support local persistence now and Supabase
                writes later.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {registrationTracks.map((track) => {
          const Icon = track.icon;

          return (
            <Card key={track.href} className="border border-border/70 bg-card/85">
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
                    Open flow
                    <ArrowRight className="size-4" />
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
