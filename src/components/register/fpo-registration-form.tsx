"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { Textarea } from "@/components/ui/textarea";
import { supportedLanguageOptions } from "@/lib/users/registration";
import { useI18n } from "@/lib/i18n/context";

type FpoResult = {
  user: {
    fullName: string;
    email?: string | null;
    organizationName?: string | null;
  };
};

export function FpoRegistrationForm() {
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [organizationName, setOrganizationName] = useState("");
  const [districtsServed, setDistrictsServed] = useState("");
  const [selectedCropSlugs, setSelectedCropSlugs] = useState<string[]>([]);
  const [stateName, setStateName] = useState(dict.register.statePlaceholder);
  const [serviceRadiusKm, setServiceRadiusKm] = useState("150");
  const [serviceSummary, setServiceSummary] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(
    searchParams.get("language") ?? "en",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FpoResult | null>(null);
  const translatedLanguageOptions = supportedLanguageOptions.map((option) => ({
    ...option,
    label: dict.common.languageNames[option.value],
  }));

  function toggleCrop(cropSlug: string) {
    setSelectedCropSlugs((current) =>
      current.includes(cropSlug)
        ? current.filter((value) => value !== cropSlug)
        : [...current, cropSlug],
    );
  }

  async function submitRegistration() {
    setError(null);

    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "FPO",
          fullName,
          email,
          phone,
          organizationName,
          districtsServed: districtsServed
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          cropsHandled: selectedCropSlugs,
          preferredLanguage,
          state: stateName,
          serviceRadiusKm: Number(serviceRadiusKm),
          serviceSummary,
          clerkUserId: user?.id ?? null,
        }),
      });

      const payload = (await response.json()) as
        | (FpoResult & { ok: true })
        | { ok: false; error?: string };

      if (!response.ok || !("ok" in payload) || !payload.ok) {
        setError(
          ("error" in payload ? payload.error : undefined) ??
            dict.register.registrationFailed,
        );
        return;
      }

      setResult({
        user: payload.user,
      });
    } catch {
      setError(dict.register.couldNotSubmitRegistration);
    }
  }

  if (result) {
    return (
      <Card className="border border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>{dict.register.fpoProfileSaved}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            {dict.register.fpoReady
              .replace(
                "{organization}",
                result.user.organizationName ?? dict.register.organizationFallback,
              )
              .replace(
                "{email}",
                result.user.email ?? dict.register.emailFallback,
              )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/fpo">{dict.register.openFpoDashboard}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">{dict.register.registerAnotherTeam}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card/90">
      <CardHeader>
        <CardTitle>{dict.register.fpoOnboarding}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contact-name">
              {dict.register.contactName}
            </label>
            <Input
              id="contact-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={dict.register.contactNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="organization-name">
              {dict.register.organizationName}
            </label>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder={dict.register.organizationPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              {dict.register.email}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={dict.register.emailPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">
              {dict.register.phone}
            </label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={dict.register.phonePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="state">
              {dict.register.state}
            </label>
            <Input
              id="state"
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
              placeholder={dict.register.statePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="language">
              {dict.register.preferredLanguage}
            </label>
            <select
              id="language"
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
            >
              {translatedLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="districts-served">
            {dict.register.districtsYouOperateIn}
          </label>
          <Textarea
            id="districts-served"
            value={districtsServed}
            onChange={(event) => setDistrictsServed(event.target.value)}
            placeholder={dict.register.districtsPlaceholder}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{dict.register.cropsHandled}</p>
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="service-radius">
              {dict.register.capacity}
            </label>
            <Input
              id="service-radius"
              type="number"
              value={serviceRadiusKm}
              onChange={(event) => setServiceRadiusKm(event.target.value)}
              placeholder={dict.register.capacityPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="service-summary">
              {dict.register.servicesOffered}
            </label>
            <Textarea
              id="service-summary"
              value={serviceSummary}
              onChange={(event) => setServiceSummary(event.target.value)}
              placeholder={dict.register.servicesPlaceholder}
            />
          </div>
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
            {isPending ? dict.register.saving : dict.register.saveFpoProfile}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/fpo">{dict.register.viewFpoDashboard}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
