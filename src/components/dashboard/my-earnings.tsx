"use client";

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
  ArrowDownRight,
  ArrowUpRight,
  IndianRupee,
  TrendingUp,
  Trophy,
  AlertCircle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import type { MarketMatch } from "@/lib/matches/types";
import type { DashboardPricePoint, DashboardRoute } from "@/lib/dashboard";
import {
  calculateAgriFlowRevenue,
  calculateBenchmarkRevenue,
  compareEarnings,
  normalizeMandiPriceToPerKg,
} from "@/lib/financial/units";

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
  hasBenchmark: boolean;
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

  // Mandi prices in `prices` are stored in ₹/quintal (Agmarknet canonical).
  // 1 quintal = 100 kg. Normalize to canonical ₹/kg for accurate comparison with match offers.
  const localPricePoint = prices.find((p) => p.district.toLowerCase() === localDistrict.toLowerCase());
  const localPriceQuintal = localPricePoint?.modalPrice ?? 0;
  const localPricePerKg = normalizeMandiPriceToPerKg(localPriceQuintal);

  const bestRoute =
    routes.find((r) => r.sourceDistrict.toLowerCase() === localDistrict.toLowerCase()) ?? routes[0];
  const bestPriceQuintal = bestRoute?.targetModalPrice ?? localPriceQuintal;
  const bestPricePerKg = normalizeMandiPriceToPerKg(bestPriceQuintal);

  const completedMatches = matches.filter(
    (m) => m.status === "COMPLETED" || m.status === "ACCEPTED",
  );

  const priceGapPerKg =
    bestPricePerKg > 0 && localPricePerKg > 0 ? bestPricePerKg - localPricePerKg : 0;

  // Build earnings entries ONLY from real completed/accepted matches
  const entries: EarningsEntry[] = completedMatches.map((match, index) => {
    // match.offeredPricePerKg is stored in canonical ₹/kg.
    const matchPricePerKg = match.offeredPricePerKg ?? bestPricePerKg;
    const qtyKg = match.quantityKg ?? 0;

    const actual = calculateAgriFlowRevenue(qtyKg, matchPricePerKg);
    const hasBenchmark = localPricePerKg > 0;
    const baseline = hasBenchmark ? calculateBenchmarkRevenue(qtyKg, localPriceQuintal) : 0;
    const saved = hasBenchmark ? Number((actual - baseline).toFixed(2)) : 0;

    return {
      label: `${dict.earnings.match} ${index + 1}`,
      actual,
      baseline,
      saved,
      hasBenchmark,
    };
  });

  const totalActual = entries.reduce((sum, e) => sum + e.actual, 0);
  const totalBaseline = entries.reduce((sum, e) => sum + e.baseline, 0);
  const comparison = compareEarnings(totalActual, totalBaseline);
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
              {priceGapPerKg.toFixed(2)}
              <span className="text-lg font-semibold text-on-surface-variant">{dict.earnings.kgExtra}</span>
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              {dict.earnings.sellingPaysVsLocally
                .replace("{cropName}", cropName)
                .replace("{targetDistrict}", bestRoute?.targetDistrict || "")
                .replace("{targetPrice}", `₹${bestPricePerKg.toFixed(2)}/kg`)
                .replace("{localPrice}", `₹${localPricePerKg.toFixed(2)}/kg`)}
              {" "}{dict.earnings.completeTradeToTrack}
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-on-surface-variant">
              <TrendingUp className="size-4 text-primary" />
              <span>{dict.earnings.listCropViaWhatsapp}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-8 text-center shadow-sm">
            <AlertCircle className="size-10 mx-auto mb-4 text-on-surface-variant opacity-40" />
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

      {/* Hero stat — Truthful representation based on comparison outcome */}
      {comparison.labelType === "GAIN" && (
        <div className="rounded-[1.25rem] border border-primary/20 bg-primary-container/20 p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            {dict.earnings.youSavedWithAgriflow}
          </p>
          <p className="mt-3 flex items-center gap-2 text-5xl font-black tracking-tight text-primary font-headline">
            <IndianRupee className="size-10" />
            +{formatCurrency(comparison.difference).replace("₹", "")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-on-surface font-medium bg-surface-container/50 px-3 py-1.5 rounded-lg border border-outline-variant/20">
              <ArrowUpRight className="size-4 text-tertiary" />
              <span>
                <strong className="text-tertiary">+{comparison.percentage}% </strong>
                {dict.earnings.improvementOverLocal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant font-medium">
              <TrendingUp className="size-4 text-primary" />
              <span>{dict.earnings.fromCompletedTransactions}</span>
            </div>
          </div>
        </div>
      )}

      {comparison.labelType === "LOSS" && (
        <div className="rounded-[1.25rem] border border-amber-500/30 bg-amber-500/10 p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            {dict.earnings.belowLocalMandi}
          </p>
          <p className="mt-3 flex items-center gap-2 text-5xl font-black tracking-tight text-amber-700 dark:text-amber-400 font-headline">
            <IndianRupee className="size-10" />
            -{formatCurrency(Math.abs(comparison.difference)).replace("₹", "")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-on-surface font-medium bg-surface-container/50 px-3 py-1.5 rounded-lg border border-outline-variant/20">
              <ArrowDownRight className="size-4 text-amber-600" />
              <span>
                <strong className="text-amber-600">{comparison.percentage}% </strong>
                {dict.earnings.differenceOverLocal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant font-medium">
              <TrendingUp className="size-4 text-primary" />
              <span>{dict.earnings.fromCompletedTransactions}</span>
            </div>
          </div>
        </div>
      )}

      {comparison.labelType === "NO_BENCHMARK" && (
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            {dict.earnings.agriflowRevenue}
          </p>
          <p className="mt-3 flex items-center gap-2 text-5xl font-black tracking-tight text-primary font-headline">
            <IndianRupee className="size-10" />
            {formatCurrency(totalActual).replace("₹", "")}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm text-on-surface-variant font-medium">
            <AlertCircle className="size-4 text-outline" />
            <span>{dict.earnings.benchmarkUnavailable}</span>
          </div>
        </div>
      )}

      {/* Comparison stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
            {dict.earnings.agriflowRevenue}
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface font-headline">{formatCurrency(totalActual)}</p>
        </div>

        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
            {dict.earnings.localMandi}
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface-variant font-headline">
            {comparison.hasBenchmark ? formatCurrency(totalBaseline) : "Unavailable"}
          </p>
          {comparison.hasBenchmark && (
            <p className="text-xs text-on-surface-variant mt-1">
              At ₹{localPricePerKg.toFixed(2)}/kg in {localDistrict}
            </p>
          )}
        </div>

        <div className={`rounded-[1.25rem] border p-5 shadow-sm relative overflow-hidden ${
          comparison.isPositive
            ? "border-tertiary/20 bg-tertiary-container/30"
            : comparison.isNegative
              ? "border-amber-500/20 bg-amber-500/10"
              : "border-outline-variant/30 bg-surface-container-lowest"
        }`}>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <Trophy className="size-24" />
          </div>
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
            {comparison.isPositive
              ? dict.earnings.extraEarned
              : comparison.isNegative
                ? dict.earnings.belowLocalMandi
                : "Benchmark Margin"}
          </p>
          <p className={`mt-2 text-2xl font-black font-headline relative z-10 ${
            comparison.isPositive
              ? "text-tertiary"
              : comparison.isNegative
                ? "text-amber-700 dark:text-amber-400"
                : "text-on-surface"
          }`}>
            {comparison.hasBenchmark
              ? (comparison.difference >= 0 ? `+${formatCurrency(comparison.difference)}` : `-${formatCurrency(Math.abs(comparison.difference))}`)
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Bar chart comparing same quantities */}
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
                      {data.hasBenchmark ? (
                        <>
                          <p className="flex justify-between gap-4">
                            <span className="text-on-surface-variant">{dict.earnings.localMandiLabel}</span>
                            <span className="font-bold text-on-surface">{formatCurrency(data.baseline)}</span>
                          </p>
                          <div className="h-px bg-outline-variant/20 my-2" />
                          <p className={`flex justify-between gap-4 ${data.saved >= 0 ? "text-tertiary" : "text-amber-600"}`}>
                            <span>{data.saved >= 0 ? dict.earnings.savedLabel : dict.earnings.netLossLabel}</span>
                            <span className="font-bold">
                              {data.saved >= 0 ? `+${formatCurrency(data.saved)}` : `-${formatCurrency(Math.abs(data.saved))}`}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-on-surface-variant mt-1">Benchmark unavailable</p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            {comparison.hasBenchmark && (
              <Bar dataKey="baseline" radius={[4, 4, 0, 0]} barSize={24} name={dict.earnings.localMandi}>
                {entries.map((_, index) => (
                  <Cell key={`baseline-${index}`} fill="var(--color-surface-container-highest)" />
                ))}
              </Bar>
            )}
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
