import { FpoDashboardClient } from "@/components/dashboard/fpo-dashboard-client";
import { buildFpoDashboardData } from "@/lib/dashboard";

import { getIntegrationReadiness } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function FpoDashboardPage() {
  const data = await buildFpoDashboardData(null);

  return <FpoDashboardClient data={data} />;
}
