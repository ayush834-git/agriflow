import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findTargetCrop } from "@/lib/agmarknet/catalog";
import { listUsersByRole } from "@/lib/users/store";

export const dynamic = "force-dynamic";

type FpoProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FpoProfilePage({ params }: FpoProfilePageProps) {
  const { id } = await params;
  const fpos = await listUsersByRole("FPO");
  const fpo = fpos.find((entry) => entry.id === id);

  if (!fpo) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 px-6 py-8 shadow-[0_35px_100px_-60px_rgba(20,72,44,0.45)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline">Phase 9 FPO profile</Badge>
            <h1 className="text-4xl font-semibold tracking-tight">
              {fpo.organizationName ?? fpo.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">{fpo.fullName}</p>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {fpo.serviceSummary ??
                "This FPO profile is ready for farmers to discover from the dashboard and WhatsApp directory flow."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">
                <Warehouse className="size-4" />
                Back to farmer dashboard
              </Link>
            </Button>
            {fpo.phone ? (
              <Button asChild variant="outline">
                <Link href={`tel:${fpo.phone}`}>
                  <Phone className="size-4" />
                  Call now
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-sm font-medium">Districts served</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fpo.districtsServed.map((district) => (
              <Badge key={`${fpo.id}:${district}`} variant="outline">
                {district}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-sm font-medium">Crops handled</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fpo.cropsHandled.map((cropSlug) => (
              <Badge
                key={`${fpo.id}:${cropSlug}`}
                className="border border-primary/20 bg-primary/10 text-primary"
              >
                {findTargetCrop(cropSlug)?.name ?? cropSlug}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-sm font-medium">Service radius</p>
          <p className="mt-3 text-3xl font-semibold">
            {fpo.serviceRadiusKm ?? 120} km
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Radius-based service visualization is currently shown in the dashboard fallback map.
          </p>
        </div>

        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-sm font-medium">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>Email: {fpo.email ?? "Pending"}</p>
            <p>Phone: {fpo.phone ?? "Pending"}</p>
            <p>Hub district: {fpo.district ?? fpo.districtsServed[0] ?? "Pending"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
