"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, PackagePlus, ThermometerSun } from "lucide-react";

import { TARGET_CROPS, TARGET_REGIONS, getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
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
import type {
  InventoryItem,
  RiskLevel,
  SpoilageScoreResult,
} from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

type InventoryManagerProps = {
  initialInventory: InventoryItem[];
  ownerUserId: string;
  onInventoryCreated?: (inventory: InventoryItem) => void;
};

type InventoryResponse =
  | { ok: true; inventory: InventoryItem }
  | { ok: false; error?: string };

type SpoilageResponse =
  | { ok: true; result: SpoilageScoreResult }
  | { ok: false; error?: string };

const DISTRICT_OPTIONS = TARGET_REGIONS.flatMap((region) =>
  region.districts.map((district) => ({
    district,
    state: region.state,
  })),
);

const STORAGE_OPTIONS = [
  "cold storage",
  "ventilated warehouse",
  "ambient shed",
  "reefer transit",
];

function createDefaultDeadlineDate() {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 5);

  return nextDate.toISOString().slice(0, 10);
}

function formatQuantity(quantityKg: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(quantityKg);
}

function riskBadgeClasses(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 border-red-200";
    case "HIGH":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-900 border-yellow-200";
    case "LOW":
    default:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
}

export function InventoryManager({
  initialInventory,
  ownerUserId,
  onInventoryCreated,
}: InventoryManagerProps) {
  const [inventory, setInventory] = useState(initialInventory);
  const [preview, setPreview] = useState<SpoilageScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [cropSlug, setCropSlug] = useState("onion");
  const [district, setDistrict] = useState("Guntur");
  const [quantityKg, setQuantityKg] = useState("10000");
  const [storageLocationName, setStorageLocationName] = useState("");
  const [storageType, setStorageType] = useState("cold storage");
  const [deadlineDate, setDeadlineDate] = useState(createDefaultDeadlineDate);
  const [temperatureCelsius, setTemperatureCelsius] = useState("10");
  const [humidityPercent, setHumidityPercent] = useState("72");

  const selectedDistrictOption =
    DISTRICT_OPTIONS.find((option) => option.district === district) ?? DISTRICT_OPTIONS[0];
  const inventoryMetrics = {
    totalQty: inventory.reduce((sum, item) => sum + item.quantityKg, 0),
    urgentLots: inventory.filter(
      (item) => item.spoilageLevel === "HIGH" || item.spoilageLevel === "CRITICAL",
    ).length,
  };

  async function previewRisk() {
    setError(null);

    const response = await fetch("/api/inventory/score-spoilage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cropSlug,
        district,
        state: selectedDistrictOption.state,
        deadlineDate,
        storageType,
        temperatureCelsius: Number(temperatureCelsius),
        humidityPercent: Number(humidityPercent),
      }),
    });
    const payload = (await response.json()) as SpoilageResponse;

    if (!response.ok || !("ok" in payload) || !payload.ok) {
      setError(("error" in payload ? payload.error : undefined) ?? "Preview failed.");
      return;
    }

    setPreview(payload.result);
  }

  async function saveInventory() {
    setError(null);

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ownerUserId,
        cropSlug,
        quantityKg: Number(quantityKg),
        storageLocationName,
        district,
        state: selectedDistrictOption.state,
        storageType,
        deadlineDate,
        temperatureCelsius: Number(temperatureCelsius),
        humidityPercent: Number(humidityPercent),
      }),
    });
    const payload = (await response.json()) as InventoryResponse;

    if (!response.ok || !("ok" in payload) || !payload.ok) {
      setError(("error" in payload ? payload.error : undefined) ?? "Save failed.");
      return;
    }

    setInventory((current) =>
      [...current, payload.inventory].sort((left, right) =>
        left.deadlineDate.localeCompare(right.deadlineDate),
      ),
    );
    onInventoryCreated?.(payload.inventory);
    setPreview((payload.inventory.metadata?.spoilage as SpoilageScoreResult) ?? null);
    setStorageLocationName("");
    setQuantityKg("10000");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <div className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.5)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
              Inventory board
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              My inventory and spoilage watch
            </h2>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 px-4 py-3">
              {inventory.length} lots
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 px-4 py-3">
              {formatQuantity(inventoryMetrics.totalQty)} kg
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 px-4 py-3">
              {inventoryMetrics.urgentLots} urgent
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.cropName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.storageType ?? "storage"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatQuantity(item.quantityKg)} kg</TableCell>
                  <TableCell>
                    <div>
                      <p>{item.district}</p>
                      <p className="text-xs text-muted-foreground">{item.state}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.deadlineDate}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        className={cn(
                          "border",
                          riskBadgeClasses(item.spoilageLevel),
                        )}
                      >
                        {item.spoilageLevel}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        score {item.spoilageScore.toFixed(0)}
                      </p>
                    </div>
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
            <p className="text-sm font-medium">Add inventory</p>
            <p className="text-sm text-muted-foreground">
              Estimate spoilage risk before saving the lot.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="inventory-crop">
              Crop
            </label>
            <select
              id="inventory-crop"
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
              <label className="text-sm font-medium" htmlFor="inventory-quantity">
                Quantity (kg)
              </label>
              <Input
                id="inventory-quantity"
                type="number"
                value={quantityKg}
                onChange={(event) => setQuantityKg(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="inventory-deadline">
                Deadline
              </label>
              <Input
                id="inventory-deadline"
                type="date"
                value={deadlineDate}
                onChange={(event) => setDeadlineDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="inventory-district">
                District
              </label>
              <select
                id="inventory-district"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              >
                {DISTRICT_OPTIONS.map((option) => (
                  <option key={option.district} value={option.district}>
                    {option.district}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="inventory-storage">
                Storage type
              </label>
              <select
                id="inventory-storage"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={storageType}
                onChange={(event) => setStorageType(event.target.value)}
              >
                {STORAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="inventory-location">
              Storage location
            </label>
            <Input
              id="inventory-location"
              value={storageLocationName}
              onChange={(event) => setStorageLocationName(event.target.value)}
              placeholder="Warehouse name or yard"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="inventory-temperature">
                Temperature (°C)
              </label>
              <Input
                id="inventory-temperature"
                type="number"
                value={temperatureCelsius}
                onChange={(event) => setTemperatureCelsius(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="inventory-humidity">
                Humidity (%)
              </label>
              <Input
                id="inventory-humidity"
                type="number"
                value={humidityPercent}
                onChange={(event) => setHumidityPercent(event.target.value)}
              />
            </div>
          </div>

          {preview ? (
            <div className="rounded-[1.35rem] border border-border/70 bg-background/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Spoilage preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preview.summary}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn("border", riskBadgeClasses(preview.level))}>
                    {preview.level}
                  </Badge>
                  <AiConfidenceBadge confidence={preview.confidence} />
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <p>Score {preview.score.toFixed(0)}</p>
                <p>
                  Weather pressure {preview.weatherPressure}, deadline pressure{" "}
                  {preview.deadlinePressure}
                </p>
              </div>
              <ExplainabilityPanel
                className="mt-4"
                title="Why this risk"
                summary="The spoilage score is driven by crop sensitivity, the time left before deadline, and the storage environment."
                reasons={preview.reasoning}
              />
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
              Preview spoilage risk before saving the lot.
            </div>
          )}

          {error ? (
            <div className="rounded-[1.35rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={previewPending}
              onClick={() => startPreviewTransition(() => void previewRisk())}
            >
              <ThermometerSun className="size-4" />
              {previewPending ? "Checking..." : "Preview risk"}
            </Button>
            <Button
              type="button"
              disabled={savePending}
              onClick={() => startSaveTransition(() => void saveInventory())}
            >
              <AlertTriangle className="size-4" />
              {savePending ? "Saving..." : "Save inventory"}
            </Button>
          </div>

          <div className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Selected crop: {getTargetCropOrThrow(cropSlug).name}
            </p>
            <p className="mt-2">
              {district}, {selectedDistrictOption.state}
            </p>
            <p className="mt-1">
              Storage mode: {storageType}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
