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
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* Active Listings Table */}
      <div className="flex-1 w-full flex flex-col gap-0 border border-outline-variant/30 rounded-[1.25rem] bg-surface-container-lowest overflow-hidden">
        <div className="p-6 border-b border-outline-variant/30 flex items-center gap-3 bg-surface-container-low/50">
          <span className="material-symbols-outlined text-primary text-[28px]" data-icon="store">store</span>
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">My crop listings</h3>
            <p className="text-sm text-on-surface-variant font-medium">These listings feed the FPO buyer directory and match loop.</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/20 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Crop</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Ask</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {listings.length > 0 ? listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-primary-container/30 flex items-center justify-center text-primary-container">
                           <span className="material-symbols-outlined text-[14px]">grass</span>
                        </span>
                        {listing.cropName}
                      </p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1 ml-8">
                        until {listing.availableUntil ?? "--"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold">{formatQuantity(listing.quantityKg)} kg</td>
                  <td className="px-6 py-4">
                    {listing.askingPricePerKg ? <span className="font-bold text-tertiary">₹{listing.askingPricePerKg}/kg</span> : "--"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap",
                      listing.status === "MATCHED" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : listing.status === "SOLD" ? "bg-tertiary-container text-on-tertiary-container border-tertiary/20"
                        : listing.status === "ACTIVE" ? "bg-primary-container text-on-primary-container border-primary/20"
                        : "bg-surface-container-highest text-on-surface border-outline-variant/20"
                    )}>
                      {listing.status}
                    </span>
                  </td>
                </tr>
              )) : (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant font-medium">No active listings.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Listing Form */}
      <div className="w-full xl:w-[400px] border border-outline-variant/30 rounded-[1.25rem] bg-surface-container-lowest p-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4 mb-6">
          <span className="material-symbols-outlined text-primary text-[28px]" data-icon="add_business">add_business</span>
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">Publish lot</h3>
            <p className="text-xs text-on-surface-variant font-medium">Allow buyers to contact you directly.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-crop">Crop</label>
            <select
              id="listing-crop"
              className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none text-on-surface font-medium"
              value={cropSlug}
              onChange={(event) => setCropSlug(event.target.value)}
            >
              {TARGET_CROPS.map((crop) => (
                <option key={crop.slug} value={crop.slug}>{crop.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-quantity">Quantity (kg)</label>
              <Input
                id="listing-quantity"
                type="number"
                value={quantityKg}
                onChange={(event) => setQuantityKg(event.target.value)}
                className="bg-surface-container-low border-none rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-primary text-on-surface font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-price">Ask Price (/kg)</label>
              <Input
                id="listing-price"
                type="number"
                value={askingPricePerKg}
                onChange={(event) => setAskingPricePerKg(event.target.value)}
                className="bg-surface-container-low border-none rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-primary text-on-surface font-medium"
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1">
               <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-grade">Grade</label>
               <Input
                id="listing-grade"
                value={qualityGrade}
                onChange={(event) => setQualityGrade(event.target.value)}
                className="bg-surface-container-low border-none rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-primary text-on-surface font-medium uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-date">Available until</label>
              <Input
                id="listing-date"
                type="date"
                value={availableUntil}
                onChange={(event) => setAvailableUntil(event.target.value)}
                className="bg-surface-container-low border-none rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-primary text-on-surface font-medium min-h-[40px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="listing-notes">Notes</label>
            <Textarea
              id="listing-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Pickup timing, bagging, freshness notes"
              className="bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary text-on-surface font-medium resize-none"
              rows={3}
            />
          </div>

          {error && <p className="text-sm font-bold text-error bg-error-container/30 px-3 py-2 rounded break-words">{error}</p>}

          <Button
            type="button"
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-lg py-6 mt-2 shadow-sm transition-opacity"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const response = await fetch("/api/listings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    farmerUserId, cropSlug, quantityKg: Number(quantityKg),
                    askingPricePerKg: Number(askingPricePerKg), qualityGrade,
                    district, state, availableUntil, notes,
                  }),
                });
                const payload = (await response.json()) as ListingResponse;

                if (!response.ok || !payload.ok) {
                  setError(("error" in payload ? payload.error : undefined) ?? "Could not create listing.");
                  return;
                }

                setListings((current) => [payload.listing, ...current]);
                setNotes("");
                setQuantityKg("1200");
              })
            }
          >
            {isPending ? "Publishing..." : "Publish Listing"}
            {!isPending && <span className="material-symbols-outlined ml-2 text-[18px]">publish</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
