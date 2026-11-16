import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { APPLICATION_STATUSES, updateStatus, type ApplicationStatus } from "@/lib/applications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string; note?: string };
  const status = body.status as ApplicationStatus | undefined;

  if (!status || !APPLICATION_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  const ok = await updateStatus(id, status, session.name, body.note?.slice(0, 500));
  if (!ok) return NextResponse.json({ error: "Could not update this record." }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
