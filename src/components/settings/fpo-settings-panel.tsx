"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { useI18n } from "@/lib/i18n/context";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

type FpoSettingsPanelProps = {
  userId: string;
  email?: string | null;
  initialLanguage: SupportedLanguage;
  initialAddress?: string | null;
  initialState?: string | null;
  initialOrganizationName: string;
  initialDistrictsServed: string[];
  initialCropsHandled: string[];
  initialServiceRadiusKm?: number | null;
  initialServiceSummary?: string | null;
  onLanguageUpdated?: (language: SupportedLanguage) => void;
};

type SettingsResponse =
  | {
      ok: true;
      user: {
        preferredLanguage: SupportedLanguage;
      };
    }
  | {
      ok: false;
      error?: string;
    };

const LANGUAGE_OPTIONS: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "te", label: "Telugu" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "en", label: "English" },
];

export function FpoSettingsPanel({
  userId,
  email,
  initialLanguage,
  initialAddress,
  initialState,
  initialOrganizationName,
  initialDistrictsServed,
  initialCropsHandled,
  initialServiceRadiusKm,
  initialServiceSummary,
  onLanguageUpdated,
}: FpoSettingsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [preferredLanguage, setPreferredLanguage] =
    useState<SupportedLanguage>(initialLanguage);
  const [organizationName, setOrganizationName] = useState(
    initialOrganizationName,
  );
  const [stateName, setStateName] = useState(initialState ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [districtsServed, setDistrictsServed] = useState(
    initialDistrictsServed.join(", "),
  );
  const [serviceRadiusKm, setServiceRadiusKm] = useState(
    String(initialServiceRadiusKm ?? 150),
  );
  const [serviceSummary, setServiceSummary] = useState(
    initialServiceSummary ?? "",
  );
  const [cropSlugs, setCropSlugs] = useState<string[]>(initialCropsHandled);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setLang } = useI18n();

  function toggleCrop(cropSlug: string) {
    setCropSlugs((current) =>
      current.includes(cropSlug)
        ? current.filter((value) => value !== cropSlug)
        : [...current, cropSlug],
    );
  }

  function saveSettings() {
    const parsedDistricts = districtsServed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!organizationName.trim()) {
      setError("Organization name is required.");
      return;
    }

    if (parsedDistricts.length === 0) {
      setError("Add at least one district.");
      return;
    }

    if (cropSlugs.length === 0) {
      setError("Select at least one crop.");
      return;
    }

    setError(null);
    setStatus(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/users/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            role: "FPO",
            preferredLanguage,
            whatsappBotLanguage: preferredLanguage,
            address: address.trim() || null,
            state: stateName.trim() || null,
            organizationName: organizationName.trim(),
            districtsServed: parsedDistricts,
            cropsHandled: cropSlugs,
            serviceRadiusKm: Number(serviceRadiusKm),
            serviceSummary: serviceSummary.trim() || null,
          }),
        });
        const payload = (await response.json()) as SettingsResponse;

        if (!response.ok || !payload.ok) {
          setError(
            ("error" in payload ? payload.error : undefined) ??
              "Could not save FPO settings.",
          );
          return;
        }

        setLang(payload.user.preferredLanguage);
        onLanguageUpdated?.(payload.user.preferredLanguage);
        setStatus(
          "Settings saved. Website language and WhatsApp bot replies are now synced.",
        );
      } catch {
        setError("Could not save FPO settings right now. Please retry.");
      }
    });
  }

  return (
    <Card className="rounded-[2rem] border border-border/70 bg-card/88 p-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>Login account</span>
            <Input value={email ?? "Email not available"} readOnly />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>App + WhatsApp bot language</span>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={preferredLanguage}
              onChange={(event) =>
                setPreferredLanguage(event.target.value as SupportedLanguage)
              }
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>Organization name</span>
            <Input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>State</span>
            <Input
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
              placeholder="Andhra Pradesh"
            />
          </label>
        </div>

        <label className="space-y-2 text-sm font-medium">
          <span>Address</span>
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Warehouse address / landmark"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>Districts served (comma separated)</span>
            <Textarea
              value={districtsServed}
              onChange={(event) => setDistrictsServed(event.target.value)}
              placeholder="Guntur, Kurnool, Hyderabad"
            />
          </label>
          <div className="space-y-4">
            <label className="space-y-2 text-sm font-medium">
              <span>Service radius (km)</span>
              <Input
                type="number"
                value={serviceRadiusKm}
                onChange={(event) => setServiceRadiusKm(event.target.value)}
                placeholder="150"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Service summary</span>
              <Textarea
                value={serviceSummary}
                onChange={(event) => setServiceSummary(event.target.value)}
                placeholder="Aggregation, transport, mandi support"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Crops handled</p>
            <p className="text-xs text-muted-foreground">
              {cropSlugs.length} selected
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TARGET_CROPS.map((crop) => {
              const checked = cropSlugs.includes(crop.slug);

              return (
                <label
                  key={crop.slug}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    checked
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border/70 bg-background/60 text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={checked}
                    onChange={() => toggleCrop(crop.slug)}
                  />
                  <span>{crop.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {status}
          </p>
        ) : null}

        <Button type="button" disabled={isPending} onClick={saveSettings}>
          {isPending ? "Saving settings..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
