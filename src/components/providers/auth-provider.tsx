"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

function hasClerkPublicKey() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!hasClerkPublicKey()) {
    // Demo mode — no Clerk, just render children
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2f6b46",
          borderRadius: "1rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
