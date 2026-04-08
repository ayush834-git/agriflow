"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";
import type { DashboardPricePoint } from "@/lib/dashboard";

function formatCurrencyString(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MarketPriceChart({ prices, localDistrict }: { prices: DashboardPricePoint[], localDistrict: string }) {
  // Sort prices descending
  const sortedPrices = [...prices].sort((a, b) => b.modalPrice - a.modalPrice).slice(0, 8);

  return (
    <div className="h-[280px] w-full rounded-[1.4rem] border border-border/70 bg-background/60 p-5 mt-4 mb-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Regional Price Ladder</h3>
        <p className="text-xs text-muted-foreground">Highest performing districts across the state</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sortedPrices} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="district" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "rgba(33,79,56,0.7)" }} 
            dy={10} 
          />
          <Tooltip 
            cursor={{ fill: "transparent" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                 const data = payload[0].payload as DashboardPricePoint;
                 return (
                    <div className="rounded-xl border border-border bg-background p-3 shadow-md">
                      <p className="font-semibold text-foreground">{data.district}</p>
                      <p className="mt-1 text-sm font-medium text-[rgba(33,79,56,1)]">{formatCurrencyString(data.modalPrice)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{data.arrivalsTonnes ? `${data.arrivalsTonnes}t arrivals` : ""}</p>
                    </div>
                 )
              }
              return null;
            }}
          />
          <Bar dataKey="modalPrice" radius={[6, 6, 6, 6]} barSize={36}>
            {sortedPrices.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.district === localDistrict ? "rgba(33,79,56,0.85)" : "rgba(33,79,56,0.15)"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
