import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { addNote } from "@/lib/applications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body.body ?? "").trim();
  if (text.length < 2) return NextResponse.json({ error: "Write a note first." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Notes are limited to 4000 characters." }, { status: 400 });

  const ok = await addNote(id, session.name, text);
  if (!ok) return NextResponse.json({ error: "Could not save the note." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
