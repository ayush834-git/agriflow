import { FarmerDashboardClient } from "@/components/dashboard/farmer-dashboard-client";
import { buildFarmerDashboardData } from "@/lib/dashboard";

import { getIntegrationReadiness } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let userId: string | null = null;
  if (getIntegrationReadiness().clerk) {
    const session = await auth();
    userId = session.userId;
  }
  const data = await buildFarmerDashboardData(userId);

  return <FarmerDashboardClient data={data} />;
}
