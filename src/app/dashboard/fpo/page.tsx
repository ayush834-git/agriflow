export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { FpoDashboardClient } from "@/components/dashboard/fpo-dashboard-client";
import { buildFpoDashboardData } from "@/lib/dashboard";
import { findUserByClerkId } from "@/lib/users/store";
import FpoDashboardLoading from "./loading";

async function FpoContent() {
  let clerkUserId: string | null = null;
  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
  } catch {
    clerkUserId = null;
  }

  let user: import("@/lib/users/types").AppUser | null = null;
  // If logged in as FARMER, redirect to farmer dashboard
  if (clerkUserId) {
    try {
      user = await findUserByClerkId(clerkUserId);
      if (user?.role === "FARMER") {
        redirect("/dashboard");
      }
    } catch (err) {
      if ((err as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) {
        throw err;
      }
      // ignore — proceed with FPO dashboard
    }
  }

  // Pass pre-resolved user to avoid duplicate DB query
  const data = await buildFpoDashboardData(user ?? clerkUserId);
  return <FpoDashboardClient data={data} />;
}

export default function FpoDashboardPage() {
  return (
    <Suspense fallback={<FpoDashboardLoading />}>
      <FpoContent />
    </Suspense>
  );
}
