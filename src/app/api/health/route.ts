import { NextResponse } from "next/server";

import { getIntegrationReadiness } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    project: "AgriFlow",
    phase: "phase-11-demo-system-and-seeding",
    timestamp: new Date().toISOString(),
    integrations: getIntegrationReadiness(),
  });
}
