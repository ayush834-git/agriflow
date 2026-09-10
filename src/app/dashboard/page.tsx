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
  let user = null;
  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
    if (clerkUserId) {
      user = await findUserByClerkId(clerkUserId);
      if (user?.role === "FPO") {
        redirect("/dashboard/fpo");
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    clerkUserId = null;
  }

  // Pass already-resolved user directly to avoid a duplicate database query
  const data = await buildFarmerDashboardData(user ?? clerkUserId);
  return <FarmerDashboardClient data={data} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
