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
    <section className="space-y-5 rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.45)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">My Earnings</h3>
            <p className="text-sm text-muted-foreground">
              {cropName} profit tracker ·{" "}
              {isDemo ? "Illustrative projections" : `${completedMatches.length} completed trades`}
            </p>
          </div>
        </div>
        {isDemo ? (
          <Badge variant="outline" className="w-fit text-amber-700 border-amber-200">
            Projected savings
          </Badge>
        ) : (
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 w-fit">
            Verified trades
          </Badge>
        )}
      </div>

      {/* Hero stat */}
      <div className="rounded-[1.6rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(33,79,56,0.06),rgba(212,154,34,0.04))] p-5">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/70">
          {isDemo ? "Projected extra earnings" : "You saved with AgriFlow"}
        </p>
        <p className="mt-2 flex items-center gap-2 text-4xl font-bold tracking-tight text-primary">
          <IndianRupee className="size-7" />
          {formatCurrency(totalSaved).replace("₹", "")}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-emerald-600" />
            <span>{percentImprovement}% improvement over local mandi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            <span>
              {isDemo ? "Based on current gap" : "From completed transactions"}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            AgriFlow revenue
          </p>
          <p className="mt-1 text-lg font-semibold text-primary">
            {formatCurrency(totalActual)}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Local mandi baseline
          </p>
          <p className="mt-1 text-lg font-semibold text-muted-foreground">
            {formatCurrency(totalBaseline)}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-emerald-200/60 bg-emerald-50/50 p-3">
          <p className="text-xs uppercase tracking-wider text-emerald-700/70">
            Extra earned
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-800">
            {formatCurrency(totalSaved)}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-[240px] w-full rounded-[1.4rem] border border-border/60 bg-background/60 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={entries}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="label"
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
                const data = payload[0]?.payload as EarningsEntry;
                return (
                  <div className="rounded-xl border border-border bg-background p-3 shadow-md">
                    <p className="font-semibold text-foreground">{data.label}</p>
                    <p className="mt-1 text-sm text-primary">
                      AgriFlow: {formatCurrency(data.actual)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Local mandi: {formatCurrency(data.baseline)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      Saved: {formatCurrency(data.saved)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="baseline" radius={[4, 4, 0, 0]} barSize={28} name="Local Mandi">
              {entries.map((_, index) => (
                <Cell key={`baseline-${index}`} fill="rgba(33,79,56,0.12)" />
              ))}
            </Bar>
            <Bar dataKey="actual" radius={[4, 4, 0, 0]} barSize={28} name="AgriFlow">
              {entries.map((_, index) => (
                <Cell key={`actual-${index}`} fill="rgba(33,79,56,0.8)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isDemo
          ? "These are projected savings based on the current price gap. Complete transactions via WhatsApp or the listing flow to see real earnings."
          : `Based on ${completedMatches.length} completed trades this season.`}
      </p>
    </section>
  );
}
