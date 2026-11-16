import { isDatabaseConfigured, storageMode } from "@/lib/supabase/server";

/**
 * Deployment health probe.
 * Reports capability, never credentials or record counts.
 */
export async function GET() {
  const database = isDatabaseConfigured();
  return Response.json(
    {
      ok: true,
      database: database ? "supabase" : "disabled",
      documents: database ? "supabase-private-bucket" : "local-file",
      shortlist: "server-persisted",
      storage: storageMode(),
      applications: database ? "postgres" : "local-file",
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
