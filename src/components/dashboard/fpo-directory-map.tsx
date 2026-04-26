"use client";

import Link from "next/link";
import { MapPin, Phone, Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";
import type { AppUser } from "@/lib/users/types";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type FpoDirectoryMapProps = {
  fpos: AppUser[];
  farmerDistrict?: string | null;
};

export function FpoDirectoryMap({
  fpos,
  farmerDistrict,
}: FpoDirectoryMapProps) {
  const { dict } = useI18n();

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(245,249,242,0.98),rgba(232,241,234,0.95))] shadow-[0_30px_90px_-64px_rgba(29,77,50,0.5)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,142,92,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(187,63,45,0.15),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0))]" />

        <div className="absolute left-5 top-5 z-10 max-w-sm rounded-[1.4rem] border border-border/70 bg-card/88 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            {dict.directory.phaseMapTitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {dict.directory.phaseMapDescription}
          </p>
        </div>

        <svg
          viewBox="0 0 700 560"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {fpos.flatMap((fpo) => {
            const primaryDistrict = fpo.districtsServed[0] ?? fpo.district;
            const position = primaryDistrict
              ? DISTRICT_POSITIONS[primaryDistrict]
              : null;

            if (!position) {
              return [];
            }

            const radius = Math.max(42, (fpo.serviceRadiusKm ?? 140) / 2.8);

            return [
              <circle
                key={`${fpo.id}:halo`}
                cx={position.x}
                cy={position.y}
                r={radius}
                fill="rgba(52, 123, 77, 0.12)"
                stroke="rgba(52, 123, 77, 0.26)"
                strokeDasharray="10 8"
              />,
              <circle
                key={`${fpo.id}:dot`}
                cx={position.x}
                cy={position.y}
                r="10"
                fill="rgba(35, 90, 58, 0.95)"
              />,
            ];
          })}
        </svg>

        {Object.entries(DISTRICT_POSITIONS).map(([district, position]) => (
          <div
            key={district}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-[999px] border px-3 py-2 text-[11px] shadow-[0_18px_42px_-24px_rgba(35,76,52,0.45)]",
              farmerDistrict === district
                ? "border-amber-300/70 bg-amber-100/90 text-amber-950"
                : "border-white/60 bg-white/72 text-[rgb(57,69,52)]",
            )}
            style={{
              left: `${(position.x / 700) * 100}%`,
              top: `${(position.y / 560) * 100}%`,
            }}
          >
            {district}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {fpos.map((fpo) => (
          <div
            key={fpo.id}
            className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">
                  {fpo.organizationName ?? fpo.fullName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fpo.fullName}
                </p>
              </div>
              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-900">
                {dict.directory.kmBadge.replace(
                  "{value}",
                  String(fpo.serviceRadiusKm ?? 120),
                )}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {fpo.districtsServed.map((district) => (
                <Badge key={`${fpo.id}:${district}`} variant="outline">
                  {district}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {fpo.cropsHandled.map((cropSlug) => (
                <Badge
                  key={`${fpo.id}:${cropSlug}:crop`}
                  className="border border-primary/20 bg-primary/10 text-primary"
                >
                  {dict.crops[cropSlug as keyof typeof dict.crops] ?? cropSlug}
                </Badge>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {fpo.serviceSummary ?? dict.directory.defaultServiceSummary}
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/fpos/${fpo.id}`}>
                  <Warehouse className="size-4" />
                  {dict.directory.viewProfile}
                </Link>
              </Button>
              {fpo.phone ? (
                <Button asChild variant="outline">
                  <Link href={`tel:${fpo.phone}`}>
                    <Phone className="size-4" />
                    {dict.directory.callFpo}
                  </Link>
                </Button>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {dict.directory.hub}:{" "}
              {fpo.district ??
                fpo.districtsServed[0] ??
                dict.directory.districtPending}
            </div>
          </div>
        ))}

        {fpos.length === 0 ? (
          <div className="rounded-[1.7rem] border border-dashed border-border/70 bg-card/88 p-5 text-sm text-muted-foreground">
            {dict.directory.noFpoProfiles}
          </div>
        ) : null}
      </div>
    </section>
  );
}
