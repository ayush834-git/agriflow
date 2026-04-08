"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { supportedLanguageOptions } from "@/lib/users/registration";

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

export function FarmerRegistrationForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("Andhra Pradesh");
  const [preferredLanguage, setPreferredLanguage] = useState(
    searchParams.get("language") ?? "te",
  );
  const [selectedCropSlugs, setSelectedCropSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

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

    const response = await fetch("/api/onboarding/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "FARMER",
        fullName,
        phone,
        district,
        state: stateName,
        preferredLanguage,
        crops: selectedCropSlugs.map((cropSlug) => ({
          cropSlug,
          district,
        })),
      }),
    });

    const payload = (await response.json()) as
      | (RegistrationResult & { ok: true })
      | { ok: false; error?: string };

    if (!response.ok || !("ok" in payload) || !payload.ok) {
      setError(("error" in payload ? payload.error : undefined) ?? "Registration failed.");
      return;
    }

    setResult({
      user: payload.user,
      crops: payload.crops,
    });
  }

  if (result) {
    return (
      <Card className="border border-border/70 bg-card/90">
        <CardHeader>
          <CardTitle>Farmer profile saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            {result.user.fullName} is ready. Use{" "}
            <span className="font-medium text-foreground">
              {result.user.phone ?? phone}
            </span>{" "}
            on WhatsApp or SMS to continue.
          </p>
          <p>
            Saved crops:{" "}
            <span className="font-medium text-foreground">
              {result.crops.map((crop) => crop.cropName).join(", ")}
            </span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Register another user</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card/90">
      <CardHeader>
        <CardTitle>Farmer onboarding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {source ? (
          <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            You came from {source}. Use the same phone number here so the bot can
            recognize you immediately.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="full-name">
              Full name
            </label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ravi Kumar"
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
            <label className="text-sm font-medium" htmlFor="district">
              District
            </label>
            <Input
              id="district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Kurnool"
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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Crops to track</p>
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
            {isPending ? "Saving..." : "Save farmer profile"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
