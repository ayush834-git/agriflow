import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Clerk middleware for AgriFlow.
 *
 * When Clerk keys are configured (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY),
 * full auth protection is applied. When keys are missing (demo / dev mode),
 * the middleware passes through silently so the app functions without auth.
 */

const isPublicRoute = createRouteMatcher([
  "/",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/cron/(.*)",
  "/api/whatsapp/(.*)",
  "/api/voice/(.*)",
  "/api/sms/(.*)",
  "/api/demo/(.*)",
  "/api/prices/(.*)",
  "/api/gaps/(.*)",
  "/manifest.webmanifest",
]);

function hasClerkKeys() {
  return (
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY)
  );
}

export default function proxy(request: NextRequest) {
  // When Clerk is not configured, pass through (demo mode)
  if (!hasClerkKeys()) {
    return NextResponse.next();
  }

  // When Clerk IS configured, use full auth middleware
  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, {} as never);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
