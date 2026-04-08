import { FpoDashboardClient } from "@/components/dashboard/fpo-dashboard-client";
import { buildFpoDashboardData } from "@/lib/dashboard";

import { getIntegrationReadiness } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function FpoDashboardPage() {
  let userId: string | null = null;
  if (getIntegrationReadiness().clerk) {
    const session = await auth();
    userId = session.userId;
  }
  const data = await buildFpoDashboardData(userId);

  return <FpoDashboardClient data={data} />;
}
