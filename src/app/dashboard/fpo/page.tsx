import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

import { FpoDashboardClient } from "@/components/dashboard/fpo-dashboard-client";
import { buildFpoDashboardData } from "@/lib/dashboard";
import FpoDashboardLoading from "./loading";

function getCachedFpoData(clerkUserId: string | null) {
  return unstable_cache(
    () => buildFpoDashboardData(clerkUserId),
    ["fpo-dashboard", clerkUserId ?? "guest"],
    {
      revalidate: 5 * 60,
      tags: [`fpo-${clerkUserId ?? "guest"}`],
    },
  )();
}

async function FpoContent() {
  let clerkUserId: string | null = null;
  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  const data = await getCachedFpoData(clerkUserId);
  return <FpoDashboardClient data={data} />;
}

export default function FpoDashboardPage() {
  return (
    <Suspense fallback={<FpoDashboardLoading />}>
      <FpoContent />
    </Suspense>
  );
}
