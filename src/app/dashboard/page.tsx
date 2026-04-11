import { FarmerDashboardClient } from "@/components/dashboard/farmer-dashboard-client";
import { buildFarmerDashboardData } from "@/lib/dashboard";

import { getIntegrationReadiness } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await buildFarmerDashboardData(null);

  return <FarmerDashboardClient data={data} />;
}
