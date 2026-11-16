import { NextResponse } from "next/server";
import { createShortlist } from "@/lib/shortlist-store";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { institutions } from "@/lib/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(institutions.map((institution) => institution.slug));

/** POST /api/shortlist — create a persistent, shareable shortlist. */
export async function POST(request: Request) {
  const gate = rateLimit(`shortlist:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!gate.allowed) return NextResponse.json({ error: "Too many shortlists created. Try again later." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    slugs?: unknown;
    title?: unknown;
    ownerName?: unknown;
    ownerEmail?: unknown;
  };

  const slugs = Array.isArray(body.slugs)
    ? body.slugs.filter((slug): slug is string => typeof slug === "string" && VALID.has(slug))
    : [];

  if (slugs.length === 0) {
    return NextResponse.json({ error: "Select at least one institution first." }, { status: 422 });
  }

  try {
    const result = await createShortlist({
      slugs,
      title: typeof body.title === "string" ? body.title.slice(0, 120) : undefined,
      ownerName: typeof body.ownerName === "string" ? body.ownerName.slice(0, 120) : undefined,
      ownerEmail: typeof body.ownerEmail === "string" ? body.ownerEmail.slice(0, 160) : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The shortlist could not be saved. Please try again." }, { status: 500 });
  }
}
