import { NextResponse } from "next/server";
import { parseApplication } from "@/lib/validation";
import { createApplication, hashIp } from "@/lib/applications/store";
import { clientIp, rateLimit, sweepRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/applications — public student submission. No account required. */
export async function POST(request: Request) {
  sweepRateLimit();
  const ip = clientIp(request);
  const gate = rateLimit(`apply:${ip}`, 5, 60 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Please try again later or contact us on WhatsApp." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The form could not be read. Please try again." }, { status: 400 });
  }

  const parsed = parseApplication(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Please correct the highlighted fields.", fieldErrors: parsed.errors }, { status: 422 });
  }

  const result = await createApplication(parsed.value, { ipHash: hashIp(ip) });

  if (!result.ok && result.reason === "duplicate") {
    return NextResponse.json(
      {
        error:
          "We already have an application from this email for the same first-choice university in the last 24 hours. Our team will contact you — please do not submit again.",
      },
      { status: 409 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ error: "We could not save the application. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ reference: result.reference, id: result.id }, { status: 201 });
}

/** GET is intentionally closed: student records are never exposed publicly. */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
