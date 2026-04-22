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
import { useI18n } from "@/lib/i18n/context";

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
  const { dict } = useI18n();
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
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

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

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setCropSlug(item.cropSlug);
    setDistrict(item.district);
    setQuantityKg(String(item.quantityKg));
    setStorageLocationName(item.storageLocationName ?? "");
    setStorageType(item.storageType ?? "ambient shed");
    setDeadlineDate(item.deadlineDate);
    setTemperatureCelsius(String(item.temperatureCelsius ?? "10"));
    setHumidityPercent(String(item.humidityPercent ?? "72"));
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setQuantityKg("10000");
    setStorageLocationName("");
  }

  async function deleteInventoryItem(id: string) {
    if (!window.confirm(dict.fpo.inventoryBoard.confirmDelete)) return;
    setDeletePendingId(id);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInventory((cur) => cur.filter((i) => i.id !== id));
      } else {
        setError("Delete failed.");
      }
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletePendingId(null);
    }
  }

  async function saveInventory() {
    setError(null);

    const isEdit = !!editingId;
    const url = isEdit ? `/api/inventory/${editingId}` : "/api/inventory";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
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

    setInventory((current) => {
      const list = isEdit ? current.filter((i) => i.id !== editingId) : current;
      return [...list, payload.inventory].sort((left, right) =>
        left.deadlineDate.localeCompare(right.deadlineDate),
      );
    });
    onInventoryCreated?.(payload.inventory);
    setPreview((payload.inventory.metadata?.spoilage as SpoilageScoreResult) ?? null);
    if (!isEdit) {
      setStorageLocationName("");
      setQuantityKg("10000");
    } else {
      setEditingId(null);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50">
        <div>
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" data-icon="inventory_2">inventory_2</span>
            {dict.fpo.inventoryBoard.title}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {inventory.length} {dict.fpo.inventoryBoard.lots} • {formatQuantity(inventoryMetrics.totalQty)} kg total • {inventoryMetrics.urgentLots} urgent
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-container-lowest border-b border-outline-variant/20 text-on-surface-variant font-medium">
            <tr>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.crop}</th>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.quantity}</th>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.location}</th>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.deadline}</th>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.risk}</th>
              <th className="px-6 py-4">{dict.fpo.inventoryBoard.headers.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-on-surface">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary-container/20 flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[18px]" data-icon="grass">grass</span>
                    </div>
                    <div>
                      {dict.crops?.[item.cropSlug as keyof typeof dict.crops] ?? item.cropName}
                      <span className="block text-[11px] font-normal text-on-surface-variant mt-0.5">
                        {item.storageType === "cold storage" ? dict.fpo.inventoryBoard.coldStorageType
                          : item.storageType === "ventilated warehouse" ? dict.fpo.inventoryBoard.ventilated
                          : item.storageType === "ambient shed" ? dict.fpo.inventoryBoard.ambient
                          : (item.storageType ?? "storage")}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-on-surface">{formatQuantity(item.quantityKg)} kg</span>
                </td>
                <td className="px-6 py-4 text-on-surface-variant font-medium">
                  {item.district}, {item.state}
                </td>
                <td className="px-6 py-4 font-medium">
                  {item.deadlineDate}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-bold border",
                    item.spoilageLevel === "CRITICAL" ? "bg-error-container text-on-error-container border-error/20"
                      : item.spoilageLevel === "HIGH" ? "bg-orange-100 text-orange-800 border-orange-200"
                      : "bg-tertiary-container text-on-tertiary-container border-tertiary/20"
                  )}>
                    {item.spoilageLevel === "CRITICAL" ? "🔴 " + dict.fpo.inventoryBoard.urgent
                          : item.spoilageLevel === "HIGH" ? "🟠 " + dict.fpo.inventoryBoard.urgent
                          : item.spoilageLevel} ({item.spoilageScore.toFixed(0)})
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-primary hover:underline text-sm font-semibold"
                    >
                      {dict.fpo.inventoryBoard.editItem}
                    </button>
                    <button
                      type="button"
                      disabled={deletePendingId === item.id}
                      onClick={() => deleteInventoryItem(item.id)}
                      className="text-error hover:underline text-sm font-semibold disabled:opacity-50"
                    >
                      {deletePendingId === item.id ? dict.fpo.inventoryBoard.updating : dict.fpo.inventoryBoard.deleteItem}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Inventory Form inside Accordion or below */}
      <div className="p-6 border-t border-outline-variant/20 bg-surface-container-lowest">
        <h3 className="font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary" data-icon="add_circle">
            {editingId ? "edit" : "add_circle"}
          </span>
          {editingId ? dict.fpo.inventoryBoard.editTitle : dict.fpo.inventoryBoard.addTitle}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">{dict.fpo.inventoryBoard.headers.crop}</label>
            <select
              className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={cropSlug}
              onChange={(event) => setCropSlug(event.target.value)}
            >
              {TARGET_CROPS.map((crop) => (
                <option key={crop.slug} value={crop.slug}>
                  {dict.crops?.[crop.slug as keyof typeof dict.crops] ?? crop.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">{dict.fpo.inventoryBoard.quantityKg}</label>
            <Input
              type="number"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              className="bg-surface-container-low border-none rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase">{dict.fpo.inventoryBoard.district}</label>
            <select
              className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              {DISTRICT_OPTIONS.map((option) => (
                <option key={option.district} value={option.district}>{option.district}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-on-surface-variant uppercase">{dict.fpo.inventoryBoard.storageType}</label>
             <select
              className="w-full bg-surface-container-low border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={storageType}
              onChange={(event) => setStorageType(event.target.value)}
            >
              {STORAGE_OPTIONS.map((option) => {
                let translatedOption = option;
                if (option === "cold storage") translatedOption = dict.fpo.inventoryBoard.coldStorageType;
                if (option === "ventilated warehouse") translatedOption = dict.fpo.inventoryBoard.ventilated;
                if (option === "ambient shed") translatedOption = dict.fpo.inventoryBoard.ambient;
                return <option key={option} value={option}>{translatedOption}</option>
              })}
            </select>
          </div>
        </div>

        {error && <div className="text-error bg-error-container p-3 mb-4 rounded-lg text-sm">{error}</div>}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-outline-variant text-primary"
            disabled={previewPending}
            onClick={() => startPreviewTransition(() => void previewRisk())}
          >
            {previewPending ? dict.fpo.coldStorage.planning : dict.fpo.inventoryBoard.headers.risk}
          </Button>
          <Button
            type="button"
            className="bg-primary text-on-primary hover:opacity-90"
            disabled={savePending}
            onClick={() => startSaveTransition(() => void saveInventory())}
          >
            {savePending ? dict.fpo.inventoryBoard.updating : (editingId ? dict.fpo.inventoryBoard.updateItem : dict.fpo.inventoryBoard.addTitle)}
          </Button>

          {editingId && (
            <Button
              type="button"
              variant="ghost"
              onClick={cancelEdit}
            >
              {dict.fpo.inventoryBoard.cancel}
            </Button>
          )}

          {preview && (
            <span className="text-sm font-medium ml-4 text-on-surface">
              Preview Score: {preview.score.toFixed(0)} ({preview.level})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
