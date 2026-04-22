"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { useI18n } from "@/lib/i18n/context";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

type FarmerSettingsPanelProps = {
  userId: string;
  phone?: string | null;
  initialLanguage: SupportedLanguage;
  initialAddress?: string | null;
  initialDistrict?: string | null;
  initialState?: string | null;
  initialCropSlugs: string[];
  onLanguageUpdated?: (language: SupportedLanguage) => void;
};

type SettingsResponse =
  | {
      ok: true;
      user: {
        preferredLanguage: SupportedLanguage;
      };
      cropPreferences?: Array<{ cropSlug: string }>;
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

export function FarmerSettingsPanel({
  userId,
  phone,
  initialLanguage,
  initialAddress,
  initialDistrict,
  initialState,
  initialCropSlugs,
  onLanguageUpdated,
}: FarmerSettingsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [preferredLanguage, setPreferredLanguage] =
    useState<SupportedLanguage>(initialLanguage);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [district, setDistrict] = useState(initialDistrict ?? "");
  const [stateName, setStateName] = useState(initialState ?? "");
  const [cropSlugs, setCropSlugs] = useState<string[]>(initialCropSlugs);
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
    if (cropSlugs.length === 0) {
      setError("Select at least one crop preference.");
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
            role: "FARMER",
            preferredLanguage,
            whatsappBotLanguage: preferredLanguage,
            address: address.trim() || null,
            district: district.trim() || null,
            state: stateName.trim() || null,
            farmerCropSlugs: cropSlugs,
          }),
        });
        const payload = (await response.json()) as SettingsResponse;

        if (!response.ok || !payload.ok) {
          setError(
            ("error" in payload ? payload.error : undefined) ??
              "Could not save farmer settings.",
          );
          return;
        }

        setLang(payload.user.preferredLanguage);
        onLanguageUpdated?.(payload.user.preferredLanguage);
        setStatus(
          "Settings saved. Website language and WhatsApp bot replies are now synced.",
        );
      } catch {
        setError("Could not save farmer settings right now. Please retry.");
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
            <Input value={phone ?? "Phone not available"} readOnly />
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
            <span>District</span>
            <Input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Kurnool"
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
            placeholder="Village, mandal, landmark"
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Crop preferences</p>
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

        <div className="pt-6 border-t border-border/50 mt-4">
          <h4 className="text-sm font-bold text-on-surface mb-2">Change your role</h4>
          <p className="text-sm text-on-surface-variant mb-4">Are you an aggregator or trader looking to buy and transport crops?</p>
          <Button variant="outline" asChild>
            <a href="/register/fpo">Switch to FPO / Trader mode</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
