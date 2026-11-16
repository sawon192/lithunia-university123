import { NextResponse } from "next/server";
import { getShortlist, updateShortlist } from "@/lib/shortlist-store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — public read-only view of a shared shortlist. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shortlist = await getShortlist(slug);
  if (!shortlist) return NextResponse.json({ error: "Shortlist not found." }, { status: 404 });
  return NextResponse.json({ shortlist }, { headers: { "Cache-Control": "public, max-age=30" } });
}

/** PATCH — requires the edit token issued when the list was created. */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = rateLimit(`shortlist-edit:${clientIp(request)}`, 60, 60 * 60 * 1000);
  if (!gate.allowed) return NextResponse.json({ error: "Too many edits. Try again later." }, { status: 429 });

  const token = request.headers.get("x-shortlist-token");
  if (!token) return NextResponse.json({ error: "This link is read-only." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { title?: unknown; ownerName?: unknown; slugs?: unknown };
  const result = await updateShortlist(slug, token, {
    title: typeof body.title === "string" ? body.title.slice(0, 120) : undefined,
    ownerName: typeof body.ownerName === "string" ? body.ownerName.slice(0, 120) : undefined,
    slugs: Array.isArray(body.slugs) ? body.slugs.filter((item): item is string => typeof item === "string") : undefined,
  });

  if (result === "missing") return NextResponse.json({ error: "Shortlist not found." }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "This link is read-only." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
