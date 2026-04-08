import { createBrowserClient } from "@supabase/ssr";

import { getRequiredSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getRequiredSupabaseEnv();

    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
