import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getRequiredSupabaseEnv } from "@/lib/env";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getRequiredSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Route handlers and server actions can write cookies.
          // Server components should be allowed to no-op here.
        }
      },
    },
  });
}
