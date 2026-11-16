import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { getApplication } from "@/lib/applications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff-only single record read. Never exposed without a signed session. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const { id } = await params;
  const application = await getApplication(id);
  if (!application) return NextResponse.json({ error: "Record not found." }, { status: 404 });

  return NextResponse.json(
    { application },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}
