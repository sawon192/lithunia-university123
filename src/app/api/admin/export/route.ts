import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { listApplications } from "@/lib/applications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "reference",
  "full_name",
  "email",
  "mobile",
  "whatsapp",
  "nationality",
  "first_choice",
  "preferred_programme",
  "level",
  "intake",
  "status",
  "assigned_counsellor",
  "education_summary",
  "english_summary",
  "submitted_at",
];

/** Escapes a cell for CSV and neutralises spreadsheet formula injection. */
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  // Guard against spreadsheet formula injection, but leave +880… phone numbers readable.
  if (/^[=\-@\t\r]/.test(text) || /^\+\s*[A-Za-z(]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const search = (url.searchParams.get("q") ?? "").toLowerCase();

  const rows = (await listApplications()).filter((row) => {
    if (statusFilter && statusFilter !== "all" && row.status !== statusFilter) return false;
    if (search) {
      const haystack = `${row.reference} ${row.full_name} ${row.email} ${row.mobile}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    const first = row.preferences?.find((p) => !p.is_alternative) ?? row.preferences?.[0];
    const education = (row.education ?? []).map((e) => `${e.qualification}: ${e.institution}${e.result_text ? ` (${e.result_text})` : ""}`).join(" | ");
    const english = (row.english ?? []).map((e) => (e.test_type === "None" ? "No test yet" : `${e.test_type} ${e.score ?? ""}`.trim())).join(" | ");
    lines.push(
      [
        row.reference,
        row.full_name,
        row.email,
        row.mobile,
        row.whatsapp ?? "",
        row.nationality ?? "",
        first?.university_name ?? "",
        first?.programme_name ?? "",
        first?.level ?? "",
        first?.intake ?? "September 2027",
        row.status,
        row.assigned_name ?? "",
        education,
        english,
        row.created_at,
      ].map(cell).join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="go-abroad-bd-applications-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
