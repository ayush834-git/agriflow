import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  parseFarmerRegistration,
  parseFpoRegistration,
  RegistrationValidationError,
} from "@/lib/users/registration";
import { registerFarmer, registerFpo } from "@/lib/users/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { role?: string };

    if (payload.role === "FARMER") {
      const registration = parseFarmerRegistration(payload);
      const result = await registerFarmer(registration);

      return NextResponse.json({
        ok: true,
        role: "FARMER",
        user: result.user,
        crops: result.crops,
      });
    }

    if (payload.role === "FPO") {
      const registration = parseFpoRegistration(payload);
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
