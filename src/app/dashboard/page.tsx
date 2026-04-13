import { FarmerDashboardClient } from "@/components/dashboard/farmer-dashboard-client";
import { buildFarmerDashboardData } from "@/lib/dashboard";

import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let clerkUserId: string | null = null;

  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  const data = await buildFarmerDashboardData(clerkUserId);

  return <FarmerDashboardClient data={data} />;
}
