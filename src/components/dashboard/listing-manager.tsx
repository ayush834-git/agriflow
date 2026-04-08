"use client";

import { useState, useTransition } from "react";
import { PackagePlus, Store } from "lucide-react";

import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import type { ListingItem } from "@/lib/listings/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ListingManagerProps = {
  initialListings: ListingItem[];
  farmerUserId: string;
  district: string;
  state: string;
};

type ListingResponse =
  | { ok: true; listing: ListingItem }
  | { ok: false; error?: string };

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function badgeClass(status: ListingItem["status"]) {
  switch (status) {
    case "MATCHED":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";
    case "SOLD":
      return "border-sky-200 bg-sky-100 text-sky-900";
    case "CANCELLED":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "ACTIVE":
    default:
      return "border-amber-200 bg-amber-100 text-amber-900";
  }
}

export function ListingManager({
  initialListings,
  farmerUserId,
  district,
  state,
}: ListingManagerProps) {
  const [listings, setListings] = useState(initialListings);
  const [cropSlug, setCropSlug] = useState("tomato");
  const [quantityKg, setQuantityKg] = useState("1200");
  const [askingPricePerKg, setAskingPricePerKg] = useState("12");
  const [qualityGrade, setQualityGrade] = useState("A");
  const [availableUntil, setAvailableUntil] = useState("2026-04-10");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.5)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">My crop listings</p>
            <p className="text-sm text-muted-foreground">
              These listings feed the FPO buyer directory and match loop.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Ask</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{listing.cropName}</p>
                      <p className="text-xs text-muted-foreground">
                        until {listing.availableUntil ?? "--"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatQuantity(listing.quantityKg)} kg</TableCell>
                  <TableCell>
                    {listing.askingPricePerKg ? `₹${listing.askingPricePerKg}/kg` : "--"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border", badgeClass(listing.status))}>
                      {listing.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.45)]">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PackagePlus className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Create listing</p>
            <p className="text-sm text-muted-foreground">
              Publish a lot so FPOs can discover it and contact you.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="listing-crop">
              Crop
            </label>
            <select
              id="listing-crop"
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={cropSlug}
              onChange={(event) => setCropSlug(event.target.value)}
            >
              {TARGET_CROPS.map((crop) => (
                <option key={crop.slug} value={crop.slug}>
                  {crop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="listing-quantity">
                Quantity (kg)
              </label>
              <Input
                id="listing-quantity"
                type="number"
                value={quantityKg}
                onChange={(event) => setQuantityKg(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="listing-price">
                Asking price
              </label>
              <Input
                id="listing-price"
                type="number"
                value={askingPricePerKg}
                onChange={(event) => setAskingPricePerKg(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="listing-grade">
                Grade
              </label>
              <Input
                id="listing-grade"
                value={qualityGrade}
                onChange={(event) => setQualityGrade(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="listing-date">
                Available until
              </label>
              <Input
                id="listing-date"
                type="date"
                value={availableUntil}
                onChange={(event) => setAvailableUntil(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="listing-notes">
              Notes
            </label>
            <Textarea
              id="listing-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Pickup timing, bagging, freshness notes"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const response = await fetch("/api/listings", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    farmerUserId,
                    cropSlug,
                    quantityKg: Number(quantityKg),
                    askingPricePerKg: Number(askingPricePerKg),
                    qualityGrade,
                    district,
                    state,
                    availableUntil,
                    notes,
                  }),
                });
                const payload = (await response.json()) as ListingResponse;

                if (!response.ok || !payload.ok) {
                  setError(
                    ("error" in payload ? payload.error : undefined) ??
                      "Could not create listing.",
                  );
                  return;
                }

                setListings((current) => [payload.listing, ...current]);
                setNotes("");
                setQuantityKg("1200");
              })
            }
          >
            {isPending ? "Saving listing..." : "Publish listing"}
          </Button>
        </div>
      </div>
    </section>
  );
}
