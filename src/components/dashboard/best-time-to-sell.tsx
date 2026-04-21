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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-outline-variant/30 bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-tertiary-container/30 text-tertiary">
            <CalendarClock className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Best Time to Sell</h3>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              {cropName} · 7-day trend + 4-day forecast{" "}
              {localPrices.length >= 3 ? `for ${localDistrict}` : "across all districts"}
            </p>
          </div>
        </div>
        <span className="bg-surface-container text-on-surface-variant border border-outline-variant/30 px-3 py-1.5 rounded-lg text-sm font-bold w-fit mt-4 sm:mt-0 uppercase tracking-widest text-[10px]">
          {source === "mock" ? "Demo data" : "Live feed"}
        </span>
      </div>

      {/* Recommendation pill */}
      <div className="flex flex-wrap items-center gap-4 border border-outline-variant/30 bg-surface-container-lowest p-5 rounded-[1.25rem]">
        <span className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border", recConfig.className)}>
          <RecIcon className="size-4" />
          {recConfig.label}
        </span>
        <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant bg-surface-container/50 px-3 py-2 rounded-lg border border-outline-variant/20">
          <TrendingUp className="size-4 text-primary" />
          Bias: <strong className="text-on-surface">{bias}</strong>
        </div>
        {geminiResult ? (
          <AiConfidenceBadge confidence={geminiResult.confidence} />
        ) : null}
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={slices}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.3} />
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)", fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)", fontWeight: 500 }}
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
                  <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4 shadow-xl">
                    <p className="font-bold text-on-surface mb-2">{data.dateLabel}</p>
                    <div className="space-y-1 text-sm font-medium">
                        {data.actualPrice != null ? (
                          <p className="flex justify-between gap-4">
                            <span className="text-on-surface-variant">Actual:</span>
                            <span className="font-bold text-primary">{formatCurrency(data.actualPrice)}</span>
                          </p>
                        ) : null}
                        {data.forecastMid != null ? (
                          <>
                            <p className="flex justify-between gap-4">
                              <span className="text-on-surface-variant">Forecast:</span>
                              <span className="font-bold text-tertiary">{formatCurrency(data.forecastMid)}</span>
                            </p>
                            <p className="flex justify-between gap-4 text-xs mt-1 pt-1 border-t border-outline-variant/20">
                              <span className="text-on-surface-variant">Range:</span>
                              <span className="text-on-surface">{formatCurrency(data.forecastLow!)} – {formatCurrency(data.forecastHigh!)}</span>
                            </p>
                          </>
                        ) : null}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="actualPrice"
              stroke="var(--color-primary)"
              strokeWidth={3}
              fill="url(#actualGrad)"
              dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 2, stroke: "white" }}
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
              stroke="var(--color-tertiary)"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              dot={{ r: 3, fill: "var(--color-tertiary)" }}
              connectNulls={false}
              name="Forecast"
            />
            <Area
              type="monotone"
              dataKey="forecastLow"
              stroke="var(--color-tertiary)"
              strokeOpacity={0.3}
              strokeWidth={1}
              fill="none"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Observed low</p>
          <p className="mt-2 text-xl font-black text-on-surface">{formatCurrency(observedLow)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Observed high</p>
          <p className="mt-2 text-xl font-black text-on-surface">{formatCurrency(observedHigh)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-tertiary/20 bg-tertiary-container/20 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-tertiary/80">Projected low</p>
          <p className="mt-2 text-xl font-black text-tertiary">{formatCurrency(projectedLow)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-tertiary/20 bg-tertiary-container/30 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-tertiary/80">Projected high</p>
          <p className="mt-2 text-xl font-black text-tertiary">{formatCurrency(projectedHigh)}</p>
        </div>
      </div>

      {/* AI Explanation */}
      {geminiResult ? (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary-container/20 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-primary tracking-wider uppercase">
            <Sparkles className="size-4" />
            AI Analysis
          </div>
          <p className="mt-3 text-sm leading-6 text-on-surface font-medium">
            {geminiResult.explanation}
          </p>
          {geminiResult.bestDay ? (
            <p className="mt-3 text-sm font-bold text-primary bg-primary/10 w-fit px-3 py-1 rounded">
              Best window: {geminiResult.bestDay}
            </p>
          ) : null}
        </div>
      ) : (
        <Button
          type="button"
          disabled={isPending}
          onClick={requestGeminiExplanation}
          className="w-full sm:w-fit bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 font-bold py-6 rounded-xl shadow-sm"
        >
          {isPending ? (
            <Loader2 className="size-5 animate-spin mr-2" />
          ) : (
            <Sparkles className="size-5 text-primary mr-2" />
          )}
          {isPending ? "Analyzing market history..." : "Get AI forecast explanation"}
        </Button>
      )}
      {geminiError ? (
        <p className="text-sm font-bold text-error bg-error-container/30 px-3 py-2 rounded break-words w-fit">{geminiError}</p>
      ) : null}
    </div>
  );
}
