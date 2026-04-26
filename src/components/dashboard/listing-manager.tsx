"use client";

import { useState, useTransition } from "react";

import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import type { ListingItem } from "@/lib/listings/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

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

function getCropLabel(
  cropSlug: string,
  dict: ReturnType<typeof useI18n>["dict"],
  fallback: string,
) {
  return dict.crops[cropSlug as keyof typeof dict.crops] ?? fallback;
}

export function ListingManager({
  initialListings,
  farmerUserId,
  district,
  state,
}: ListingManagerProps) {
  const { dict } = useI18n();
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
    <div className="flex flex-col items-start gap-6 xl:flex-row">
      <div className="flex w-full flex-1 flex-col gap-0 overflow-hidden rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 bg-surface-container-low/50 p-6">
          <span
            className="material-symbols-outlined text-[28px] text-primary"
            data-icon="store"
          >
            store
          </span>
          <div>
            <h3 className="text-lg font-bold text-on-surface font-headline">
              {dict.listings.myCropListings}
            </h3>
            <p className="text-sm font-medium text-on-surface-variant">
              {dict.listings.theseListingsFeed}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-outline-variant/20 bg-surface-container-lowest text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">{dict.listings.crop}</th>
                <th className="px-6 py-4">{dict.listings.qty}</th>
                <th className="px-6 py-4">{dict.listings.ask}</th>
                <th className="px-6 py-4">{dict.listings.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {listings.length > 0 ? (
                listings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="transition-colors hover:bg-surface-container-lowest/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="flex items-center gap-2 font-bold">
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-container/30 text-primary-container">
                            <span className="material-symbols-outlined text-[14px]">
                              grass
                            </span>
                          </span>
                          {getCropLabel(listing.cropSlug, dict, listing.cropName)}
                        </p>
                        <p className="ml-8 mt-1 text-xs font-medium text-on-surface-variant">
                          {listing.availableUntil ?? "--"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {formatQuantity(listing.quantityKg)} kg
                    </td>
                    <td className="px-6 py-4">
                      {listing.askingPricePerKg ? (
                        <span className="font-bold text-tertiary">
                          {"₹"}
                          {listing.askingPricePerKg}
                          /kg
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold",
                          listing.status === "MATCHED"
                            ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                            : listing.status === "SOLD"
                              ? "border-tertiary/20 bg-tertiary-container text-on-tertiary-container"
                              : listing.status === "ACTIVE"
                                ? "border-primary/20 bg-primary-container text-on-primary-container"
                                : "border-outline-variant/20 bg-surface-container-highest text-on-surface",
                        )}
                      >
                        {listing.status === "MATCHED"
                          ? dict.listings.matched
                          : listing.status === "SOLD"
                            ? dict.listings.sold
                            : listing.status === "ACTIVE"
                              ? dict.listings.active
                              : dict.listings.cancelled}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center font-medium text-on-surface-variant"
                  >
                    {dict.listings.noActiveListings}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full shrink-0 rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm xl:w-[400px]">
        <div className="mb-6 flex items-center gap-3 border-b border-outline-variant/20 pb-4">
          <span
            className="material-symbols-outlined text-[28px] text-primary"
            data-icon="add_business"
          >
            add_business
          </span>
          <div>
            <h3 className="text-lg font-bold text-on-surface font-headline">
              {dict.listings.publishLot}
            </h3>
            <p className="text-xs font-medium text-on-surface-variant">
              {dict.listings.allowBuyersToContact}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              htmlFor="listing-crop"
            >
              {dict.listings.crop}
            </label>
            <select
              id="listing-crop"
              className="w-full rounded-lg border-none bg-surface-container-low px-3 py-2.5 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary"
              value={cropSlug}
              onChange={(event) => setCropSlug(event.target.value)}
            >
              {TARGET_CROPS.map((crop) => (
                <option key={crop.slug} value={crop.slug}>
                  {getCropLabel(crop.slug, dict, crop.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                htmlFor="listing-quantity"
              >
                {dict.listings.quantityKg}
              </label>
              <Input
                id="listing-quantity"
                type="number"
                value={quantityKg}
                onChange={(event) => setQuantityKg(event.target.value)}
                className="rounded-lg border-none bg-surface-container-low px-3 font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                htmlFor="listing-price"
              >
                {dict.listings.askPriceKg}
              </label>
              <Input
                id="listing-price"
                type="number"
                value={askingPricePerKg}
                onChange={(event) => setAskingPricePerKg(event.target.value)}
                className="rounded-lg border-none bg-surface-container-low px-3 font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                htmlFor="listing-grade"
              >
                {dict.listings.grade}
              </label>
              <Input
                id="listing-grade"
                value={qualityGrade}
                onChange={(event) => setQualityGrade(event.target.value)}
                className="rounded-lg border-none bg-surface-container-low px-3 font-medium uppercase text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                htmlFor="listing-date"
              >
                {dict.listings.availableUntil}
              </label>
              <Input
                id="listing-date"
                type="date"
                value={availableUntil}
                onChange={(event) => setAvailableUntil(event.target.value)}
                className="min-h-[40px] rounded-lg border-none bg-surface-container-low px-3 font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              htmlFor="listing-notes"
            >
              {dict.listings.notes}
            </label>
            <Textarea
              id="listing-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={dict.listings.notesPlaceholder}
              className="resize-none rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface focus-visible:ring-2 focus-visible:ring-primary"
              rows={3}
            />
          </div>

          {error ? (
            <p className="break-words rounded bg-error-container/30 px-3 py-2 text-sm font-bold text-error">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            className="mt-2 w-full rounded-lg bg-primary py-6 font-bold text-on-primary shadow-sm transition-opacity hover:bg-primary/90"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const response = await fetch("/api/listings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
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
                      dict.listings.couldNotCreateListing,
                  );
                  return;
                }

                setListings((current) => [payload.listing, ...current]);
                setNotes("");
                setQuantityKg("1200");
              })
            }
          >
            {isPending ? dict.listings.publishing : dict.listings.publishListing}
            {!isPending ? (
              <span className="material-symbols-outlined ml-2 text-[18px]">
                publish
              </span>
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
