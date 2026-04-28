import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";

import {
  parseFarmerRegistration,
  parseFpoRegistration,
  RegistrationValidationError,
} from "@/lib/users/registration";
import { registerFarmer, registerFpo } from "@/lib/users/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Get clerk user ID server-side (most reliable source)
    let serverClerkUserId: string | null = null;
    try {
      const session = await auth();
      serverClerkUserId = session.userId ?? null;
    } catch {
      // Clerk auth may not be configured; fall through
    }

    const payload = (await request.json()) as { role?: string; clerkUserId?: string };
    // Prefer server-side clerk ID, fall back to client-provided one
    const clerkUserId = serverClerkUserId || payload.clerkUserId || undefined;

    if (payload.role === "FARMER") {
      const registration = parseFarmerRegistration({ ...payload, clerkUserId });
      const result = await registerFarmer(registration);

      return NextResponse.json({
        ok: true,
        role: "FARMER",
        user: result.user,
        crops: result.crops,
      });
    }

    if (payload.role === "FPO") {
      const registration = parseFpoRegistration({ ...payload, clerkUserId });
      const result = await registerFpo(registration);

      return NextResponse.json({
        ok: true,
        role: "FPO",
        user: result.user,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported registration role.",
      },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please fix the highlighted registration details.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    if (error instanceof RegistrationValidationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Registration request failed.",
      },
      { status: 500 },
    );
  }
}
