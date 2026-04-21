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
  const localPrice =
    prices.find((p) => p.district === localDistrict)?.modalPrice ?? 0;
  const bestRoute =
    routes.find((r) => r.sourceDistrict === localDistrict) ?? routes[0];
  const bestPrice = bestRoute?.targetModalPrice ?? localPrice;

  const completedMatches = matches.filter(
    (m) => m.status === "COMPLETED" || m.status === "ACCEPTED",
  );

  // Build earnings entries from completed matches
  const entries: EarningsEntry[] = useMemo(() => {
    if (completedMatches.length === 0) {
      // Show illustrative data for demo
      const demonstrationEntries: EarningsEntry[] = [
        {
          label: "Week 1",
          actual: bestPrice * 300,
          baseline: localPrice * 300,
          saved: (bestPrice - localPrice) * 300,
        },
        {
          label: "Week 2",
          actual: bestPrice * 500,
          baseline: localPrice * 500,
          saved: (bestPrice - localPrice) * 500,
        },
        {
          label: "Week 3",
          actual: bestPrice * 200,
          baseline: localPrice * 200,
          saved: (bestPrice - localPrice) * 200,
        },
        {
          label: "Week 4",
          actual: bestPrice * 400,
          baseline: localPrice * 400,
          saved: (bestPrice - localPrice) * 400,
        },
      ];
      return demonstrationEntries;
    }

    return completedMatches.map((match, index) => {
      const matchPrice = match.offeredPricePerKg ?? bestPrice;
      const qty = match.quantityKg ?? 100;
      return {
        label: `Match ${index + 1}`,
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
  const isDemo = completedMatches.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-outline-variant/30 bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-container/30 text-primary">
            <Trophy className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">My Earnings</h3>
            <p className="text-sm text-on-surface-variant font-medium mt-1">
              {cropName} profit tracker ·{" "}
              {isDemo ? "Illustrative projections" : `${completedMatches.length} completed trades`}
            </p>
          </div>
        </div>
        {isDemo ? (
          <span className="bg-tertiary-container/50 text-on-tertiary-container border border-tertiary/20 px-3 py-1.5 rounded-lg text-sm font-bold w-fit mt-4 sm:mt-0">
            Projected savings
          </span>
        ) : (
          <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-sm font-bold w-fit mt-4 sm:mt-0">
            Verified trades
          </span>
        )}
      </div>

      {/* Hero stat */}
      <div className="rounded-[1.25rem] border border-primary/20 bg-primary-container/20 p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          {isDemo ? "Projected extra earnings" : "You saved with AgriFlow"}
        </p>
        <p className="mt-3 flex items-center gap-2 text-5xl font-black tracking-tight text-primary font-headline">
          <IndianRupee className="size-10" />
          {formatCurrency(totalSaved).replace("₹", "")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-on-surface font-medium bg-surface-container/50 px-3 py-1.5 rounded-lg border border-outline-variant/20">
            <ArrowUpRight className="size-4 text-tertiary" />
            <span><strong className="text-tertiary">{percentImprovement}% improvement</strong> over local mandi</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-medium">
            <TrendingUp className="size-4 text-primary" />
            <span>
              {isDemo ? "Based on current price gap" : "From completed transactions"}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
            AgriFlow Revenue
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface font-headline">
            {formatCurrency(totalActual)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
          <p className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">
            Local Mandi Baseline
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface-variant font-headline">
            {formatCurrency(totalBaseline)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-tertiary/20 bg-tertiary-container/30 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5">
             <Trophy className="size-24" />
          </div>
          <p className="text-xs uppercase font-bold tracking-wider text-on-tertiary-container">
            Extra earned
          </p>
          <p className="mt-2 text-2xl font-black text-tertiary font-headline relative z-10">
            +{formatCurrency(totalSaved)}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-[280px] w-full rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={entries}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          >
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
                new Intl.NumberFormat("en-IN", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(v)
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
                        <span className="text-on-surface-variant">AgriFlow:</span>
                        <span className="font-bold text-primary">{formatCurrency(data.actual)}</span>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-on-surface-variant">Local mandi:</span>
                        <span className="font-bold text-on-surface">{formatCurrency(data.baseline)}</span>
                      </p>
                      <div className="h-px bg-outline-variant/20 my-2" />
                      <p className="flex justify-between gap-4 text-tertiary">
                        <span>Saved:</span>
                        <span className="font-bold text-tertiary">+{formatCurrency(data.saved)}</span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="baseline" radius={[4, 4, 0, 0]} barSize={24} name="Local Mandi">
              {entries.map((_, index) => (
                <Cell key={`baseline-${index}`} fill="var(--color-surface-container-highest)" />
              ))}
            </Bar>
            <Bar dataKey="actual" radius={[4, 4, 0, 0]} barSize={24} name="AgriFlow">
              {entries.map((_, index) => (
                <Cell key={`actual-${index}`} fill="var(--color-primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-xs font-medium text-on-surface-variant px-4">
        {isDemo
          ? "These are projected savings based on the current price gap. Complete transactions via WhatsApp or the listing flow to see real earnings."
          : `Based on ${completedMatches.length} completed trades this season.`}
      </p>
    </div>
  );
}
