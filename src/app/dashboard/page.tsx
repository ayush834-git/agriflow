export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { FarmerDashboardClient } from "@/components/dashboard/farmer-dashboard-client";
import { buildFarmerDashboardData } from "@/lib/dashboard";
import { findUserByClerkId } from "@/lib/users/store";
import DashboardLoading from "./loading";

async function DashboardContent() {
  let clerkUserId: string | null = null;
  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  // If logged in as FPO, redirect to FPO dashboard
  if (clerkUserId) {
    try {
      const user = await findUserByClerkId(clerkUserId);
      if (user?.role === "FPO") {
        redirect("/dashboard/fpo");
      }
    } catch {
      // ignore — proceed with farmer dashboard
    }
  }

  // No caching — always fetch fresh so registration is immediately reflected
  const data = await buildFarmerDashboardData(clerkUserId);
  return <FarmerDashboardClient data={data} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
