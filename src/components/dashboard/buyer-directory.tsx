"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, LoaderCircle, Users } from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "@/lib/inventory/types";
import type { ListingItem } from "@/lib/listings/types";
import { getFreshnessLabel, scoreListingAgainstInventory } from "@/lib/matches/scoring";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";

type BuyerDirectoryProps = {
  inventory: InventoryItem[];
  listings: ListingItem[];
  ownerUserId: string;
  initialFilters?: {
    inventoryId?: string;
    cropSlug?: string;
    district?: string;
  };
  onMatchCreated: (match: MarketMatch, notification: AppNotification) => void;
};

type MatchResponse =
  | { ok: true; match: MarketMatch; notification: AppNotification }
  | { ok: false; error?: string };

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function BuyerDirectory({
  inventory,
  listings,
  ownerUserId,
  initialFilters,
  onMatchCreated,
}: BuyerDirectoryProps) {
  const [selectedInventoryId, setSelectedInventoryId] = useState(
    initialFilters?.inventoryId ?? inventory[0]?.id ?? "",
  );
  const [districtFilter, setDistrictFilter] = useState(initialFilters?.district ?? "");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedInventory =
    inventory.find((item) => item.id === selectedInventoryId) ?? inventory[0] ?? null;

  const candidates = selectedInventory
    ? listings
        .filter((listing) => listing.cropSlug === selectedInventory.cropSlug)
        .filter((listing) => (districtFilter ? listing.district === districtFilter : true))
        .filter((listing) => (minQty ? listing.quantityKg >= Number(minQty) : true))
        .filter((listing) => (maxQty ? listing.quantityKg <= Number(maxQty) : true))
        .map((listing) => ({
          listing,
          score: scoreListingAgainstInventory(listing, selectedInventory),
        }))
        .sort((left, right) => right.score.matchScore - left.score.matchScore)
    : [];

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            Phase 10 matching explainability
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Match active inventory with farmer listings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Search by crop, district, and quantity range, then create a contact loop
            that notifies the farmer over WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          <Users className="size-4 text-primary" />
          {listings.length} farmer listings in the directory
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="directory-inventory">
            Inventory basis
          </label>
          <select
            id="directory-inventory"
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={selectedInventoryId}
            onChange={(event) => setSelectedInventoryId(event.target.value)}
          >
            {inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.cropName} · {item.district}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="directory-district">
            District
          </label>
          <Input
            id="directory-district"
            value={districtFilter}
            onChange={(event) => setDistrictFilter(event.target.value)}
            placeholder="Any district"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="directory-min">
            Min qty
          </label>
          <Input
            id="directory-min"
            type="number"
            value={minQty}
            onChange={(event) => setMinQty(event.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="directory-max">
            Max qty
          </label>
          <Input
            id="directory-max"
            type="number"
            value={maxQty}
            onChange={(event) => setMaxQty(event.target.value)}
            placeholder="10000"
          />
        </div>
      </div>

      {statusMessage ? <p className="mt-4 text-sm text-emerald-700">{statusMessage}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {candidates.map(({ listing, score }) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              key={listing.id}
              className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {listing.cropName} · {listing.district}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatQuantity(listing.quantityKg)} kg · {listing.qualityGrade ?? "Grade A"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-900">
                    Match {score.matchScore}
                  </Badge>
                  <AiConfidenceBadge confidence={score.matchScore / 100} />
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Ask {listing.askingPricePerKg ? `₹${listing.askingPricePerKg}/kg` : "--"}</p>
                <p>Distance {score.distanceKm.toFixed(0)} km</p>
                <p>Freshness {getFreshnessLabel(listing)}</p>
                <p>Quantity fit {Math.round(score.scoreBreakdown.quantityFit * 100)}%</p>
              </div>

              {listing.notes ? (
                <p className="mt-3 text-sm text-muted-foreground">{listing.notes}</p>
              ) : null}

              <ExplainabilityPanel
                className="mt-4"
                title="Why this match"
                summary="The directory score balances quantity fit, freshness window, price alignment, and transport distance."
                reasons={[
                  `Quantity fit ${Math.round(score.scoreBreakdown.quantityFit * 100)}%.`,
                  `Freshness fit ${Math.round(score.scoreBreakdown.freshnessFit * 100)}% with ${getFreshnessLabel(listing)}.`,
                  `Price alignment ${Math.round(score.scoreBreakdown.priceAlignment * 100)}% against the crop benchmark.`,
                  `Distance fit ${Math.round(score.scoreBreakdown.distanceFit * 100)}% at ${score.distanceKm.toFixed(0)} km.`,
                ]}
              />

              <Button
                type="button"
                className="mt-4 w-full"
                disabled={isPending && activeListingId === listing.id}
                onClick={() =>
                  startTransition(async () => {
                    if (!selectedInventory) {
                      return;
                    }

                    setActiveListingId(listing.id);
                    setError(null);
                    setStatusMessage(null);
                    const response = await fetch("/api/matches", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        listingId: listing.id,
                        inventoryId: selectedInventory.id,
                        counterpartyUserId: ownerUserId,
                      }),
                    });
                    const payload = (await response.json()) as MatchResponse;

                    if (!response.ok || !payload.ok) {
                      setError(
                        ("error" in payload ? payload.error : undefined) ??
                          "Could not create match.",
                      );
                      return;
                    }

                    onMatchCreated(payload.match, payload.notification);
                    setStatusMessage(
                      `Farmer notified for ${listing.cropName} in ${listing.district}. Waiting for YES reply.`,
                    );
                  })
                }
              >
                {isPending && activeListingId === listing.id ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Connecting
                  </>
                ) : (
                  <>
                    <Link2 className="size-4" />
                    Connect
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {candidates.length === 0 ? (
          <motion.div
            layout
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[1.35rem] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground"
          >
            No listings match the current crop and quantity filters.
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
