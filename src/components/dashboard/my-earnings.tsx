"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  IndianRupee,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import type { MarketMatch } from "@/lib/matches/types";
import type { DashboardPricePoint, DashboardRoute } from "@/lib/dashboard";

type MyEarningsProps = {
  matches: MarketMatch[];
  cropName: string;
  prices: DashboardPricePoint[];
  routes: DashboardRoute[];
  localDistrict: string;
};

type EarningsEntry = {
  label: string;
  actual: number;
  baseline: number;
  saved: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MyEarnings({
  matches,
  cropName,
  prices,
  routes,
  localDistrict,
}: MyEarningsProps) {
  const { dict } = useI18n();
  const localPrice =
    prices.find((p) => p.district === localDistrict)?.modalPrice ?? 0;
  const bestRoute =
    routes.find((r) => r.sourceDistrict === localDistrict) ?? routes[0];
  const bestPrice = bestRoute?.targetModalPrice ?? localPrice;

  const completedMatches = matches.filter(
    (m) => m.status === "COMPLETED" || m.status === "ACCEPTED",
  );

  const priceGapPerKg =
    bestRoute && localPrice ? (bestRoute.targetModalPrice - localPrice) / 100 : 0;

  // Build earnings entries ONLY from real completed/accepted matches
  const entries: EarningsEntry[] = useMemo(() => {
    if (completedMatches.length === 0) {
      return []; // No fake data — show empty state below
    }

    return completedMatches.map((match, index) => {
      const matchPrice = match.offeredPricePerKg ?? bestPrice;
      const qty = match.quantityKg ?? 100;
      return {
        label: `${dict.earnings.match} ${index + 1}`,
        actual: matchPrice * qty,
        baseline: localPrice * qty,
        saved: (matchPrice - localPrice) * qty,
      };
    });
  }, [completedMatches, bestPrice, localPrice]);

  const totalActual = entries.reduce((sum, e) => sum + e.actual, 0);
  const totalBaseline = entries.reduce((sum, e) => sum + e.baseline, 0);
  const totalSaved = entries.reduce((sum, e) => sum + e.saved, 0);
  const percentImprovement =
    totalBaseline > 0
      ? ((totalSaved / totalBaseline) * 100).toFixed(1)
      : "0.0";
  const hasRealData = completedMatches.length > 0;

  // ── EMPTY STATE — no completed trades yet ──────────────────────────
  if (!hasRealData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-outline-variant/30 bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-container/30 text-primary">
              <Trophy className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">{dict.earnings.myEarnings}</h3>
              <p className="text-sm text-on-surface-variant font-medium mt-1">
                {cropName} {dict.earnings.profitTracker} · {dict.earnings.noCompletedTradesYet}
              </p>
            </div>
          </div>
          <span className="bg-surface-container text-on-surface-variant border border-outline-variant/30 px-3 py-1.5 rounded-lg text-sm font-semibold w-fit mt-4 sm:mt-0">
            {dict.earnings.awaitingFirstTrade}
          </span>
        </div>

        {/* Opportunity banner using REAL price gap */}
        {priceGapPerKg > 0 ? (
          <div className="rounded-[1.25rem] border border-primary/20 bg-primary-container/20 p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              {dict.earnings.currentPriceOpportunity}
            </p>
            <p className="mt-3 flex items-center gap-2 text-4xl font-black tracking-tight text-primary font-headline">
              <IndianRupee className="size-8" />
              {formatCurrency(priceGapPerKg).replace("₹", "")}
              <span className="text-lg font-semibold text-on-surface-variant">{dict.earnings.kgExtra}</span>
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              {dict.earnings.sellingPaysVsLocally
                .replace("{cropName}", cropName)
                .replace("{targetDistrict}", bestRoute?.targetDistrict || "")
                .replace("{targetPrice}", formatCurrency(bestRoute?.targetModalPrice ?? 0))
                .replace("{localPrice}", formatCurrency(localPrice ?? 0))}
              {" "}{dict.earnings.completeTradeToTrack}
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-on-surface-variant">
              <TrendingUp className="size-4 text-primary" />
              <span>{dict.earnings.listCropViaWhatsapp}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-8 text-center shadow-sm">
            <ArrowUpRight className="size-10 mx-auto mb-4 text-on-surface-variant opacity-40" />
            <p className="font-semibold text-on-surface">{dict.earnings.noPriceDataAvailable}</p>
            <p className="text-sm text-on-surface-variant mt-1">
              {dict.earnings.priceDataBeingCollected.replace("{cropName}", cropName)}
            </p>
          </div>
        )}

        <p className="text-center text-xs font-medium text-on-surface-variant px-4">
          {dict.earnings.earningsChartWillAppear}
        </p>
      </div>
    );
  }

  // ── REAL EARNINGS VIEW ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-outline-variant/30 bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-container/30 text-primary">
            <Trophy className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">{dict.earnings.myEarnings}</h3>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              {cropName} {dict.earnings.profitTracker} · {completedMatches.length} {dict.earnings.completedTrades}
            </p>
          </div>
        </div>
        <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-sm font-bold w-fit mt-4 sm:mt-0">
          {dict.earnings.verifiedTrades}
        </span>
      </div>

      {/* Hero stat */}
      <div className="rounded-[1.25rem] border border-primary/20 bg-primary-container/20 p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          {dict.earnings.youSavedWithAgriflow}
        </p>
        <p className="mt-3 flex items-center gap-2 text-5xl font-black tracking-tight text-primary font-headline">
          <IndianRupee className="size-10" />
          {formatCurrency(totalSaved).replace("₹", "")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-on-surface font-medium bg-surface-container/50 px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <ArrowUpRight className="size-4 text-tertiary" />
            <span><strong className="text-tertiary">{percentImprovement}% </strong> {dict.earnings.improvementOverLocal}</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-medium">
            <TrendingUp className="size-4 text-primary" />
            <span>{dict.earnings.fromCompletedTransactions}</span>
          </div>
        </div>
      </div>

      {/* Comparison stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">{dict.earnings.agriflowRevenue}</p>
          <p className="mt-2 text-2xl font-black text-on-surface font-headline">{formatCurrency(totalActual)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">{dict.earnings.localMandi}</p>
          <p className="mt-2 text-2xl font-black text-on-surface-variant font-headline">{formatCurrency(totalBaseline)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-tertiary/20 bg-tertiary-container/30 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <Trophy className="size-24" />
          </div>
          <p className="text-xs uppercase font-bold tracking-wider text-on-tertiary-container">{dict.earnings.extraEarned}</p>
          <p className="mt-2 text-2xl font-black text-tertiary font-headline relative z-10">+{formatCurrency(totalSaved)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-[280px] w-full rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entries} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.3} />
            <XAxis
              dataKey="label"
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
                new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(v)
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]?.payload as EarningsEntry;
                return (
                  <div className="rounded-xl border border-outline-variant/30 bg-surface-container-high p-4 shadow-xl">
                    <p className="font-bold text-on-surface mb-2">{data.label}</p>
                    <div className="space-y-1 text-sm font-medium">
                      <p className="flex justify-between gap-4">
                        <span className="text-on-surface-variant">
                          {dict.earnings.agriflowRevenue}:
                        </span>
                        <span className="font-bold text-primary">{formatCurrency(data.actual)}</span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-on-surface-variant">{dict.earnings.localMandiLabel}</span>
                        <span className="font-bold text-on-surface">{formatCurrency(data.baseline)}</span>
                      </p>
                      <div className="h-px bg-outline-variant/20 my-2" />
                      <p className="flex justify-between gap-4 text-tertiary">
                        <span>{dict.earnings.savedLabel}</span>
                        <span className="font-bold text-tertiary">+{formatCurrency(data.saved)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="baseline" radius={[4, 4, 0, 0]} barSize={24} name={dict.earnings.localMandi}>
              {entries.map((_, index) => (
                <Cell key={`baseline-${index}`} fill="var(--color-surface-container-highest)" />
              ))}
            </Bar>
            <Bar
              dataKey="actual"
              radius={[4, 4, 0, 0]}
              barSize={24}
              name={dict.earnings.agriflowRevenue}
            >
              {entries.map((_, index) => (
                <Cell key={`actual-${index}`} fill="var(--color-primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-xs font-medium text-on-surface-variant px-4">
        {dict.earnings.completedThisSeason.replace(
          "{count}",
          String(completedMatches.length),
        )}
      </p>
    </div>
  );
}
