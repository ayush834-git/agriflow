import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

import { FarmerDashboardClient } from "@/components/dashboard/farmer-dashboard-client";
import { buildFarmerDashboardData } from "@/lib/dashboard";
import DashboardLoading from "./loading";

// Cache dashboard data per Clerk user for 5 minutes.
// This survives serverless cold starts and prevents repeat API calls.
function getCachedFarmerData(clerkUserId: string | null) {
  return unstable_cache(
    () => buildFarmerDashboardData(clerkUserId),
    // Cache key: unique per user (or "guest" for unauthenticated)
    ["farmer-dashboard", clerkUserId ?? "guest"],
    {
      revalidate: 5 * 60, // 5 minutes
      tags: [`farmer-${clerkUserId ?? "guest"}`],
    },
  )();
}

async function DashboardContent() {
  let clerkUserId: string | null = null;
  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  const data = await getCachedFarmerData(clerkUserId);
  return <FarmerDashboardClient data={data} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
