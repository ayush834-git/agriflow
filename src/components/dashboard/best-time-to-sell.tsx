"use client";

import { useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardPricePoint } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type BestTimeToSellProps = {
  cropName: string;
  cropSlug: string;
  prices: DashboardPricePoint[];
  localDistrict: string;
  source: "live" | "mock";
};

type ForecastSlice = {
  dateLabel: string;
  actualPrice: number | null;
  forecastLow: number | null;
  forecastMid: number | null;
  forecastHigh: number | null;
};

type GeminiForecastResult = {
  explanation: string;
  recommendation: "SELL" | "HOLD" | "TRACK";
  confidence: number;
  bestDay: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value: string) {
  const parts = value.split("-");
  return `${parts[2]}/${parts[1]}`;
}

function computeLocalForecast(prices: DashboardPricePoint[]): {
  slices: ForecastSlice[];
  bias: "upward" | "softening" | "stable";
  observedLow: number;
  observedHigh: number;
  projectedLow: number;
  projectedHigh: number;
} {
  const sorted = [...prices].sort((a, b) =>
    a.marketDate.localeCompare(b.marketDate),
  );
  const modalPrices = sorted.map((p) => p.modalPrice);
  const observedLow = Math.min(...modalPrices);
  const observedHigh = Math.max(...modalPrices);
  const first = modalPrices[0] ?? 0;
  const last = modalPrices[modalPrices.length - 1] ?? 0;
  const totalSwing = last - first;
  const dailySlope = totalSwing / Math.max(modalPrices.length - 1, 1);

  const bias: "upward" | "softening" | "stable" =
    totalSwing >= last * 0.04
      ? "upward"
      : totalSwing <= -last * 0.04
        ? "softening"
        : "stable";

  const slices: ForecastSlice[] = sorted.map((p) => ({
    dateLabel: formatShortDate(p.marketDate),
    actualPrice: p.modalPrice,
    forecastLow: null,
    forecastMid: null,
    forecastHigh: null,
  }));

  // Project 4 days forward
  const lastDate = new Date(
    `${sorted[sorted.length - 1]?.marketDate ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  for (let i = 1; i <= 4; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setUTCDate(futureDate.getUTCDate() + i);
    const projectedMid = last + dailySlope * i;
    const band = Math.max(Math.abs(totalSwing) * 0.3, last * 0.04);

    slices.push({
      dateLabel: formatShortDate(futureDate.toISOString().slice(0, 10)),
      actualPrice: null,
      forecastLow: Math.max(0, projectedMid - band),
      forecastMid: projectedMid,
      forecastHigh: projectedMid + band,
    });
  }

  const projectedMid = last + dailySlope * 3;
  const projectedBand = Math.max(Math.abs(totalSwing) * 0.4, last * 0.05);

  return {
    slices,
    bias,
    observedLow,
    observedHigh,
    projectedLow: Math.max(0, projectedMid - projectedBand),
    projectedHigh: projectedMid + projectedBand,
  };
}

const RECOMMENDATION_CONFIG = {
  SELL: {
    label: "Sell Now",
    icon: ArrowUp,
    className: "border-emerald-200 bg-emerald-100 text-emerald-900",
  },
  HOLD: {
    label: "Hold",
    icon: ArrowDown,
    className: "border-amber-200 bg-amber-100 text-amber-900",
  },
  TRACK: {
    label: "Track Daily",
    icon: ArrowRight,
    className: "border-blue-200 bg-blue-100 text-blue-900",
  },
} as const;

export function BestTimeToSell({
  cropName,
  cropSlug,
  prices,
  localDistrict,
  source,
}: BestTimeToSellProps) {
  const [isPending, startTransition] = useTransition();
  const [geminiResult, setGeminiResult] =
    useState<GeminiForecastResult | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const localPrices = prices.filter((p) => p.district === localDistrict);
  const displayPrices = localPrices.length >= 3 ? localPrices : prices;
  const { slices, bias, observedLow, observedHigh, projectedLow, projectedHigh } =
    computeLocalForecast(displayPrices);

  const fallbackRecommendation: "SELL" | "HOLD" | "TRACK" =
    bias === "upward" ? "HOLD" : bias === "softening" ? "SELL" : "TRACK";
  const activeRecommendation = geminiResult?.recommendation ?? fallbackRecommendation;
  const recConfig = RECOMMENDATION_CONFIG[activeRecommendation];
  const RecIcon = recConfig.icon;

  function requestGeminiExplanation() {
    startTransition(async () => {
      setGeminiError(null);
      try {
        const response = await fetch(
          `/api/prices/${cropSlug}?district=${encodeURIComponent(localDistrict)}&forecast=1`,
        );
        if (!response.ok) {
          setGeminiError("Could not reach the forecast endpoint.");
          return;
        }
        const data = await response.json();
        if (data.forecast) {
          setGeminiResult({
            explanation:
              data.forecast.explanation ??
              `Based on recent price trends, ${cropName} prices are ${bias}. The observed range is ${formatCurrency(observedLow)} to ${formatCurrency(observedHigh)}.`,
            recommendation: data.forecast.recommendation ?? fallbackRecommendation,
            confidence: data.forecast.confidence ?? 0.65,
            bestDay: data.forecast.bestDay ?? null,
          });
        } else {
          // Use local analysis as fallback
          setGeminiResult({
            explanation: `${cropName} price momentum has been ${bias} over the last 7 days. The observed range is ${formatCurrency(observedLow)} to ${formatCurrency(observedHigh)}. The working range for the next few days is projected between ${formatCurrency(projectedLow)} and ${formatCurrency(projectedHigh)}.`,
            recommendation: fallbackRecommendation,
            confidence: 0.6,
            bestDay: null,
          });
        }
      } catch {
        // Fallback to local analysis
        setGeminiResult({
          explanation: `${cropName} price momentum has been ${bias} over the last 7 days. The observed range is ${formatCurrency(observedLow)} to ${formatCurrency(observedHigh)}. The working range for the next few days is projected between ${formatCurrency(projectedLow)} and ${formatCurrency(projectedHigh)}.`,
          recommendation: fallbackRecommendation,
          confidence: 0.6,
          bestDay: null,
        });
      }
    });
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.45)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Best Time to Sell</h3>
            <p className="text-sm text-muted-foreground">
              {cropName} · 7-day trend + 4-day forecast{" "}
              {localPrices.length >= 3 ? `for ${localDistrict}` : "across all districts"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {source === "mock" ? "Demo data" : "Live feed"}
        </Badge>
      </div>

      {/* Recommendation pill */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={cn("gap-1.5 px-3 py-1.5 text-sm", recConfig.className)}>
          <RecIcon className="size-3.5" />
          {recConfig.label}
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-3.5" />
          Bias: {bias}
        </div>
        {geminiResult ? (
          <AiConfidenceBadge confidence={geminiResult.confidence} />
        ) : null}
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full rounded-[1.4rem] border border-border/60 bg-background/60 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={slices}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(33,79,56,0.4)" />
                <stop offset="100%" stopColor="rgba(33,79,56,0.02)" />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(212,154,34,0.35)" />
                <stop offset="100%" stopColor="rgba(212,154,34,0.02)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "rgba(33,79,56,0.6)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "rgba(33,79,56,0.6)" }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("en-IN", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(v)
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]?.payload as ForecastSlice;
                return (
                  <div className="rounded-xl border border-border bg-background p-3 shadow-md">
                    <p className="font-semibold text-foreground">{data.dateLabel}</p>
                    {data.actualPrice != null ? (
                      <p className="mt-1 text-sm text-[rgba(33,79,56,1)]">
                        Actual: {formatCurrency(data.actualPrice)}
                      </p>
                    ) : null}
                    {data.forecastMid != null ? (
                      <>
                        <p className="mt-1 text-sm text-amber-700">
                          Forecast: {formatCurrency(data.forecastMid)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Range: {formatCurrency(data.forecastLow!)} –{" "}
                          {formatCurrency(data.forecastHigh!)}
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="actualPrice"
              stroke="rgba(33,79,56,0.85)"
              strokeWidth={2.5}
              fill="url(#actualGrad)"
              dot={{ r: 4, fill: "rgba(33,79,56,0.9)" }}
              connectNulls={false}
              name="Actual"
            />
            <Area
              type="monotone"
              dataKey="forecastHigh"
              stroke="none"
              fill="url(#forecastGrad)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecastMid"
              stroke="rgba(212,154,34,0.8)"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              dot={{ r: 3, fill: "rgba(212,154,34,0.9)" }}
              connectNulls={false}
              name="Forecast"
            />
            <Area
              type="monotone"
              dataKey="forecastLow"
              stroke="rgba(212,154,34,0.3)"
              strokeWidth={1}
              fill="none"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Observed low
          </p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(observedLow)}</p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Observed high
          </p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(observedHigh)}</p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Projected low
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-700">
            {formatCurrency(projectedLow)}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Projected high
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-700">
            {formatCurrency(projectedHigh)}
          </p>
        </div>
      </div>

      {/* AI Explanation */}
      {geminiResult ? (
        <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            AI Analysis
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground/80">
            {geminiResult.explanation}
          </p>
          {geminiResult.bestDay ? (
            <p className="mt-1 text-sm font-medium text-primary">
              Best window: {geminiResult.bestDay}
            </p>
          ) : null}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={requestGeminiExplanation}
          className="w-fit"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isPending ? "Analyzing..." : "Get AI forecast explanation"}
        </Button>
      )}
      {geminiError ? (
        <p className="text-sm text-red-600">{geminiError}</p>
      ) : null}
    </section>
  );
}
