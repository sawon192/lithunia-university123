import "server-only";
import { isDatabaseConfigured } from "@/lib/supabase/server";

export type DashboardMode =
  | { kind: "supabase"; label: "Supabase connected"; detail: "Records are stored in Postgres with row level security." }
  | { kind: "local"; label: "Local development store"; detail: "Records are written to .data/applications.json — configure Supabase before going live." };

export function dashboardMode(): DashboardMode {
  return isDatabaseConfigured()
    ? { kind: "supabase", label: "Supabase connected", detail: "Records are stored in Postgres with row level security." }
    : { kind: "local", label: "Local development store", detail: "Records are written to .data/applications.json — configure Supabase before going live." };
}
