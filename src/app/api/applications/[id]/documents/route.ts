import { NextResponse } from "next/server";
import { attachDocument, getApplication, uploadDocumentObject } from "@/lib/applications/store";
import { DOCUMENT_KINDS } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const SAFE_NAME = /[^A-Za-z0-9._-]/g;

/**
 * POST /api/applications/:reference/documents
 * Multipart upload used right after submission. The reference number acts as
 * the capability — it is unguessable and only shown to the student.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = rateLimit(`upload:${clientIp(request)}`, 40, 60 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const application = await getApplication(id);
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "");
  if (!DOCUMENT_KINDS.includes(kind as (typeof DOCUMENT_KINDS)[number])) {
    return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPG, PNG or WEBP files are accepted." }, { status: 415 });
  }

  const safeName = file.name.replace(SAFE_NAME, "_").slice(-90);
  const storagePath = `${application.id}/${kind}-${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  try {
    await uploadDocumentObject(storagePath, bytes, file.type);
  } catch {
    return NextResponse.json({ error: "The file could not be stored. Please try again." }, { status: 500 });
  }

  const saved = await attachDocument(application.id, {
    kind,
    fileName: safeName,
    mimeType: file.type,
    size: file.size,
    storagePath,
  });
  if (!saved) return NextResponse.json({ error: "The upload could not be recorded." }, { status: 500 });

  return NextResponse.json({ ok: true, kind, fileName: safeName });
}
