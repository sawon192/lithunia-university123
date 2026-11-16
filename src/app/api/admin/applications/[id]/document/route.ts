import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";
import { signedDocumentUrl } from "@/lib/applications/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns a short-lived signed URL for one private document.
 * Requires a staff session — documents are never served from a public path.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });

  await params;
  const storagePath = new URL(request.url).searchParams.get("path");
  if (!storagePath) return NextResponse.json({ error: "Missing document path." }, { status: 400 });

  const url = await signedDocumentUrl(storagePath);
  if (!url) {
    return NextResponse.json(
      { error: "This file is stored in the local development vault. Configure Supabase Storage to open it." },
      { status: 501 }
    );
  }
  return NextResponse.json({ url });
}
