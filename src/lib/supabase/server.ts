import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * This module is server-only: importing it from a client component is a build
 * error. The service-role key bypasses RLS, so it must never reach the browser.
 */
let cached: SupabaseClient | null | undefined;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "go-abroad-bd" } },
  });
  return cached;
}

export function isDatabaseConfigured() {
  return getServiceSupabase() !== null;
}

/** Storage backend actually in use, surfaced on /api/health so ops can verify config. */
export function storageMode(): "supabase" | "local-file" {
  return isDatabaseConfigured() ? "supabase" : "local-file";
}
