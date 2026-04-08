"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { Textarea } from "@/components/ui/textarea";
import { supportedLanguageOptions } from "@/lib/users/registration";

type FpoResult = {
  user: {
    fullName: string;
    email?: string | null;
    organizationName?: string | null;
  };
};

export function FpoRegistrationForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [organizationName, setOrganizationName] = useState("");
  const [districtsServed, setDistrictsServed] = useState("");
  const [selectedCropSlugs, setSelectedCropSlugs] = useState<string[]>([]);
  const [stateName, setStateName] = useState("Andhra Pradesh");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("150");
  const [serviceSummary, setServiceSummary] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(
    searchParams.get("language") ?? "en",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FpoResult | null>(null);

  function toggleCrop(cropSlug: string) {
    setSelectedCropSlugs((current) =>
      current.includes(cropSlug)
        ? current.filter((value) => value !== cropSlug)
        : [...current, cropSlug],
    );
  }

  async function submitRegistration() {
    setError(null);

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
      }),
    });

    const payload = (await response.json()) as
      | (FpoResult & { ok: true })
      | { ok: false; error?: string };

    if (!response.ok || !("ok" in payload) || !payload.ok) {
      setError(("error" in payload ? payload.error : undefined) ?? "Registration failed.");
      return;
    }

    setResult({
      user: payload.user,
    });
  }

  if (result) {
    return (
      <Card className="border border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>FPO profile saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            {result.user.organizationName ?? "Organization"} is now registered with{" "}
            <span className="font-medium text-foreground">{result.user.email}</span>{" "}
            as the primary contact.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/fpo">Open FPO dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Register another team</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card/90">
      <CardHeader>
        <CardTitle>FPO onboarding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contact-name">
              Contact person
            </label>
            <Input
              id="contact-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Sowmya Reddy"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="organization-name">
              Organization
            </label>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Rayalaseema Farmers Collective"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="team@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">
              Phone
            </label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 9876543210"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="state">
              State
            </label>
            <Input
              id="state"
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
              placeholder="Andhra Pradesh"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="language">
              Preferred language
            </label>
            <select
              id="language"
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
            >
              {supportedLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="districts-served">
            Districts served
          </label>
          <Textarea
            id="districts-served"
            value={districtsServed}
            onChange={(event) => setDistrictsServed(event.target.value)}
            placeholder="Kurnool, Guntur, Hyderabad"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Crops handled</p>
            <p className="text-xs text-muted-foreground">
              {selectedCropSlugs.length} selected
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
                  <span>{crop.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="service-radius">
              Service radius (km)
            </label>
            <Input
              id="service-radius"
              type="number"
              value={serviceRadiusKm}
              onChange={(event) => setServiceRadiusKm(event.target.value)}
              placeholder="150"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="service-summary">
              Service summary
            </label>
            <Textarea
              id="service-summary"
              value={serviceSummary}
              onChange={(event) => setServiceSummary(event.target.value)}
              placeholder="Aggregation, cold storage, transport, mandi negotiation"
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
            {isPending ? "Saving..." : "Save FPO profile"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/fpo">View FPO dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
