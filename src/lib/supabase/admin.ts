import { createClient } from "@supabase/supabase-js";

import { getRequiredSupabaseAdminEnv } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { url, serviceRoleKey } = getRequiredSupabaseAdminEnv();

    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
