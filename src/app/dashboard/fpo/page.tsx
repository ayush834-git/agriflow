import { FpoDashboardClient } from "@/components/dashboard/fpo-dashboard-client";
import { buildFpoDashboardData } from "@/lib/dashboard";

import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function FpoDashboardPage() {
  let clerkUserId: string | null = null;

  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  const data = await buildFpoDashboardData(clerkUserId);

  return <FpoDashboardClient data={data} />;
}
