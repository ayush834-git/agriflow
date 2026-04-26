"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { supportedLanguageOptions } from "@/lib/users/registration";
import { useI18n } from "@/lib/i18n/context";

type RegistrationResult = {
  user: {
    fullName: string;
    phone?: string | null;
  };
  crops: Array<{
    cropSlug: string;
    cropName: string;
  }>;
};

type FieldErrorKey =
  | "fullName"
  | "phone"
  | "district"
  | "state"
  | "preferredLanguage"
  | "crops";

type RegistrationErrorPayload = {
  ok?: false;
  error?: string;
  details?: {
    fieldErrors?: Partial<Record<FieldErrorKey, string[]>>;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractErrorPayload(payload: unknown): RegistrationErrorPayload {
  if (!isObject(payload)) {
    return {};
  }

  const details = isObject(payload.details)
    ? {
        fieldErrors: isObject(payload.details.fieldErrors)
          ? (payload.details.fieldErrors as Partial<Record<FieldErrorKey, string[]>>)
          : undefined,
      }
    : undefined;

  return {
    ok: payload.ok === false ? false : undefined,
    error: typeof payload.error === "string" ? payload.error : undefined,
    details,
  };
}

function firstFieldError(messages?: string[]) {
  return Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
}

export function FarmerRegistrationForm() {
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState(dict.register.statePlaceholder);
  const [preferredLanguage, setPreferredLanguage] = useState(
    searchParams.get("language") ?? "te",
  );
  const [selectedCropSlugs, setSelectedCropSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldErrorKey, string>>
  >({});
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const translatedLanguageOptions = supportedLanguageOptions.map((option) => ({
    ...option,
    label: dict.common.languageNames[option.value],
  }));

  const source = searchParams.get("source");

  function toggleCrop(cropSlug: string) {
    setSelectedCropSlugs((current) =>
      current.includes(cropSlug)
        ? current.filter((value) => value !== cropSlug)
        : [...current, cropSlug],
    );
  }

  async function submitRegistration() {
    setError(null);
    setFieldErrors({});
    const normalizedDistrict = district.trim();
    const normalizedState = stateName.trim();

    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "FARMER",
          fullName,
          phone,
          district: normalizedDistrict,
          state: normalizedState,
          preferredLanguage,
          crops: selectedCropSlugs.map((cropSlug) => ({
            cropSlug,
            district:
              normalizedDistrict.length >= 2 ? normalizedDistrict : undefined,
          })),
        }),
      });

      const rawPayload = await response.text();
      const parsedPayload = rawPayload ? JSON.parse(rawPayload) : null;

      if (!response.ok) {
        const payload = extractErrorPayload(parsedPayload);
        const nextFieldErrors: Partial<Record<FieldErrorKey, string>> = {
          fullName:
            firstFieldError(payload.details?.fieldErrors?.fullName) ?? undefined,
          phone:
            firstFieldError(payload.details?.fieldErrors?.phone) ?? undefined,
          district:
            firstFieldError(payload.details?.fieldErrors?.district) ?? undefined,
          state:
            firstFieldError(payload.details?.fieldErrors?.state) ?? undefined,
          preferredLanguage:
            firstFieldError(payload.details?.fieldErrors?.preferredLanguage) ??
            undefined,
          crops:
            firstFieldError(payload.details?.fieldErrors?.crops) ?? undefined,
        };

        setFieldErrors(nextFieldErrors);
        setError(
          payload.error ??
            (response.status === 404
              ? dict.register.endpointUnavailable
              : dict.register.registrationFailed),
        );
        return;
      }

      const payload = parsedPayload as RegistrationResult & { ok: true };

      if (!payload || payload.ok !== true) {
        setError(dict.register.registrationFailed);
        return;
      }

      setResult({
        user: payload.user,
        crops: payload.crops,
      });
    } catch {
      setError(dict.register.couldNotSubmitRegistration);
    }
  }

  if (result) {
    return (
      <Card className="border border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>{dict.register.farmerProfileSaved}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            {dict.register.farmerReady
              .replace("{name}", result.user.fullName)
              .replace("{phone}", result.user.phone ?? phone)}
          </p>
          <p>
            {dict.register.savedCrops}:{" "}
            <span className="font-medium text-foreground">
              {result.crops.map((crop) => crop.cropName).join(", ")}
            </span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">{dict.register.openDashboard}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">{dict.register.registerAnotherUser}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card/90">
      <CardHeader>
        <CardTitle>{dict.register.farmerOnboarding}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {source ? (
          <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            {dict.register.sourceBanner.replace("{source}", source)}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="full-name">
              {dict.register.fullName}
            </label>
            <Input
              id="full-name"
              className={fieldErrors.fullName ? "border-destructive/60" : undefined}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={dict.register.namePlaceholder}
            />
            {fieldErrors.fullName ? (
              <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">
              {dict.register.phoneNumber}
            </label>
            <Input
              id="phone"
              className={fieldErrors.phone ? "border-destructive/60" : undefined}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={dict.register.phonePlaceholder}
            />
            {fieldErrors.phone ? (
              <p className="text-xs text-destructive">{fieldErrors.phone}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="district">
              {dict.register.district}
            </label>
            <Input
              id="district"
              className={fieldErrors.district ? "border-destructive/60" : undefined}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder={dict.register.districtPlaceholder}
            />
            {fieldErrors.district ? (
              <p className="text-xs text-destructive">{fieldErrors.district}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="state">
              {dict.register.state}
            </label>
            <Input
              id="state"
              className={fieldErrors.state ? "border-destructive/60" : undefined}
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
              placeholder={dict.register.statePlaceholder}
            />
            {fieldErrors.state ? (
              <p className="text-xs text-destructive">{fieldErrors.state}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="language">
            {dict.register.preferredLanguage}
          </label>
          <select
            id="language"
            className={`flex h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
              fieldErrors.preferredLanguage
                ? "border-destructive/60"
                : "border-input"
            }`}
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value)}
          >
            {translatedLanguageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.preferredLanguage ? (
            <p className="text-xs text-destructive">
              {fieldErrors.preferredLanguage}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{dict.register.cropsToTrack}</p>
            <p className="text-xs text-muted-foreground">
              {dict.register.selectedCount.replace(
                "{count}",
                String(selectedCropSlugs.length),
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TARGET_CROPS.map((crop) => {
              const checked = selectedCropSlugs.includes(crop.slug);

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
                  <span>
                    {dict.crops[crop.slug as keyof typeof dict.crops] ?? crop.name}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.crops ? (
            <p className="text-xs text-destructive">{fieldErrors.crops}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => void submitRegistration())}
          >
            {isPending ? dict.register.saving : dict.register.saveFarmerProfile}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">{dict.register.viewDashboard}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
