import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ApplicationInput } from "@/lib/validation";
import { getServiceSupabase, isDatabaseConfigured } from "@/lib/supabase/server";

export const APPLICATION_STATUSES = [
  "New",
  "Under Review",
  "Documents Required",
  "Eligible",
  "Not Eligible",
  "Ready to Apply",
  "Application Submitted",
  "Offer Received",
  "Visa Processing",
  "Visa Approved",
  "Visa Refused",
  "Closed",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type StoredEducation = {
  qualification: string;
  institution: string;
  subject_group?: string | null;
  passing_year?: number | null;
  result_text?: string | null;
  awarding_body?: string | null;
};

export type StoredEnglish = { test_type: string; score?: string | null; test_date?: string | null };

export type StoredPreference = {
  university_slug?: string | null;
  university_name: string;
  programme_name?: string | null;
  level?: string | null;
  subject_area?: string | null;
  intake: string;
  is_alternative: boolean;
};

export type StoredDocument = {
  id: string;
  kind: string;
  file_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_path: string;
  uploaded_at: string;
};

export type StoredNote = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type StoredHistory = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name?: string | null;
  note?: string | null;
  created_at: string;
};

export type StoredApplication = {
  id: string;
  reference: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  current_country?: string | null;
  address?: string | null;
  email: string;
  mobile: string;
  whatsapp?: string | null;
  alt_contact?: string | null;
  study_gap?: string | null;
  visa_refusal?: string | null;
  comments?: string | null;
  referral_source?: string | null;
  consent_data: boolean;
  consent_contact: boolean;
  consent_storage: boolean;
  consent_at?: string | null;
  status: ApplicationStatus;
  assigned_to?: string | null;
  assigned_name?: string | null;
  created_at: string;
  updated_at: string;
  education?: StoredEducation[];
  english?: StoredEnglish[];
  preferences?: StoredPreference[];
  documents?: StoredDocument[];
  notes?: StoredNote[];
  history?: StoredHistory[];
};

export type CreateResult =
  | { ok: true; reference: string; id: string }
  | { ok: false; reason: "duplicate" | "error"; message?: string };

/** Same student, same email, same first choice, within 24 hours ⇒ duplicate. */
function dedupeHash(input: ApplicationInput) {
  const first = input.preferences.find((item) => !item.isAlternative) ?? input.preferences[0];
  const material = [input.email.toLowerCase(), input.fullName.toLowerCase(), first?.universitySlug ?? first?.universityName ?? ""].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${ip}:${process.env.RATE_LIMIT_SALT ?? "go-abroad-bd"}`).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Local development backend (used only when Supabase env vars are absent).
// Data lands in .data/applications.json, which is git-ignored.
// ---------------------------------------------------------------------------

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_FILE = path.join(LOCAL_DIR, "applications.json");

async function readLocal(): Promise<StoredApplication[]> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocal(rows: StoredApplication[]) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function localReference(rows: StoredApplication[]) {
  const next = 1001 + rows.length;
  return `GBD-2027-${String(next).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Public API used by the routes
// ---------------------------------------------------------------------------

export async function createApplication(input: ApplicationInput, meta: { ipHash: string }): Promise<CreateResult> {
  const dedupe = dedupeHash(input);
  const supabase = getServiceSupabase();

  if (!supabase) {
    const rows = await readLocal();
    const since = Date.now() - 24 * 3600 * 1000;
    const clash = rows.find(
      (row) => createHash("sha256").update([row.email, row.full_name.toLowerCase(), row.preferences?.find((p) => !p.is_alternative)?.university_slug ?? row.preferences?.[0]?.university_name ?? ""].join("|")).digest("hex") === dedupe
        && new Date(row.created_at).getTime() > since
    );
    if (clash) return { ok: false, reason: "duplicate" };

    const id = randomUUID();
    const reference = localReference(rows);
    const now = new Date().toISOString();
    rows.push({
      id,
      reference,
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      nationality: input.nationality,
      current_country: input.currentCountry ?? null,
      address: input.address ?? null,
      email: input.email,
      mobile: input.mobile,
      whatsapp: input.whatsapp ?? null,
      alt_contact: input.altContact ?? null,
      study_gap: input.studyGap ?? null,
      visa_refusal: input.visaRefusal ?? null,
      comments: input.comments ?? null,
      referral_source: input.referralSource ?? null,
      consent_data: input.consentData,
      consent_contact: input.consentContact,
      consent_storage: input.consentStorage,
      consent_at: now,
      status: "New",
      assigned_to: null,
      assigned_name: null,
      created_at: now,
      updated_at: now,
      education: input.education.map((row) => ({
        qualification: row.qualification,
        institution: row.institution,
        subject_group: row.subjectGroup ?? null,
        passing_year: row.passingYear ?? null,
        result_text: row.result ?? null,
        awarding_body: row.awardingBody ?? null,
      })),
      english: input.english.map((row) => ({ test_type: row.testType, score: row.score ?? null, test_date: row.testDate ?? null })),
      preferences: input.preferences.map((row) => ({
        university_slug: row.universitySlug ?? null,
        university_name: row.universityName,
        programme_name: row.programmeName ?? null,
        level: row.level ?? null,
        subject_area: row.subjectArea ?? null,
        intake: "September 2027",
        is_alternative: row.isAlternative === true,
      })),
      documents: [],
      notes: [],
      history: [{ id: randomUUID(), from_status: null, to_status: "New", changed_by_name: "Student submission", created_at: now }],
    });
    await writeLocal(rows);
    return { ok: true, reference, id };
  }

  const { data: duplicate } = await supabase
    .from("student_applications")
    .select("id")
    .eq("dedupe_hash", dedupe)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  if (duplicate) return { ok: false, reason: "duplicate" };

  const { data: referenceRow, error: refError } = await supabase.rpc("next_application_reference");
  if (refError) return { ok: false, reason: "error", message: refError.message };
  const reference = referenceRow as unknown as string;

  const { data: inserted, error } = await supabase
    .from("student_applications")
    .insert({
      reference,
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth || null,
      gender: input.gender ?? null,
      nationality: input.nationality,
      current_country: input.currentCountry ?? null,
      address: input.address ?? null,
      email: input.email,
      mobile: input.mobile,
      whatsapp: input.whatsapp ?? null,
      alt_contact: input.altContact ?? null,
      study_gap: input.studyGap ?? null,
      visa_refusal: input.visaRefusal ?? null,
      comments: input.comments ?? null,
      referral_source: input.referralSource ?? null,
      consent_data: input.consentData,
      consent_contact: input.consentContact,
      consent_storage: input.consentStorage,
      consent_at: new Date().toISOString(),
      status: "New",
      dedupe_hash: dedupe,
      ip_hash: meta.ipHash,
    })
    .select("id, reference")
    .single();

  if (error || !inserted) return { ok: false, reason: "error", message: error?.message };

  const applicationId = inserted.id as string;

  await supabase.from("student_education").insert(
    input.education.map((row, index) => ({
      application_id: applicationId,
      qualification: row.qualification,
      institution: row.institution,
      subject_group: row.subjectGroup ?? null,
      passing_year: row.passingYear ?? null,
      result_text: row.result ?? null,
      awarding_body: row.awardingBody ?? null,
      sort_order: index,
    }))
  );

  await supabase.from("student_english_tests").insert(
    input.english.map((row) => ({
      application_id: applicationId,
      test_type: row.testType,
      score: row.score ?? null,
      test_date: row.testDate || null,
    }))
  );

  await supabase.from("student_preferences").insert(
    input.preferences.map((row, index) => ({
      application_id: applicationId,
      university_slug: row.universitySlug ?? null,
      university_name: row.universityName,
      programme_name: row.programmeName ?? null,
      level: row.level ?? null,
      subject_area: row.subjectArea ?? null,
      intake: "September 2027",
      is_alternative: row.isAlternative === true,
      sort_order: index,
    }))
  );

  return { ok: true, reference: inserted.reference as string, id: applicationId };
}

export async function listApplications(): Promise<StoredApplication[]> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const rows = await readLocal();
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await supabase
    .from("student_applications")
    .select("*, student_preferences(*), counsellors(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];

  return data.map((row) => {
    const record = row as unknown as Record<string, unknown> & {
      student_preferences?: StoredPreference[];
      counsellors?: { full_name?: string } | null;
    };
    return {
      ...(record as unknown as StoredApplication),
      preferences: record.student_preferences ?? [],
      assigned_name: record.counsellors?.full_name ?? null,
    };
  });
}

export async function getApplication(id: string): Promise<StoredApplication | null> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const rows = await readLocal();
    return rows.find((row) => row.id === id || row.reference === id) ?? null;
  }

  const { data, error } = await supabase
    .from("student_applications")
    .select("*, student_education(*), student_english_tests(*), student_preferences(*), student_documents(*), counsellor_notes(*), application_status_history(*), counsellors(full_name)")
    .or(`id.eq.${id},reference.eq.${id}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const record = data as unknown as Record<string, unknown> & {
    student_education?: unknown;
    student_english_tests?: unknown;
    student_preferences?: StoredPreference[];
    student_documents?: StoredDocument[];
    counsellor_notes?: StoredNote[];
    application_status_history?: StoredHistory[];
    counsellors?: { full_name?: string } | null;
  };

  return {
    ...(record as unknown as StoredApplication),
    education: (record.student_education as StoredEducation[]) ?? [],
    english: (record.student_english_tests as StoredEnglish[]) ?? [],
    preferences: record.student_preferences ?? [],
    documents: record.student_documents ?? [],
    notes: (record.counsellor_notes ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    history: (record.application_status_history ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    assigned_name: record.counsellors?.full_name ?? null,
  };
}

export async function updateStatus(id: string, status: ApplicationStatus, actor: string, note?: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const rows = await readLocal();
    const row = rows.find((item) => item.id === id);
    if (!row) return false;
    const from = row.status;
    row.status = status;
    row.updated_at = new Date().toISOString();
    row.history = [
      { id: randomUUID(), from_status: from, to_status: status, changed_by_name: actor, note: note ?? null, created_at: row.updated_at },
      ...(row.history ?? []),
    ];
    await writeLocal(rows);
    return true;
  }

  const { data: before } = await supabase.from("student_applications").select("status").eq("id", id).single();
  const { error } = await supabase.from("student_applications").update({ status }).eq("id", id);
  if (error) return false;
  await supabase.from("application_status_history").insert({
    application_id: id,
    from_status: (before as { status?: string } | null)?.status ?? null,
    to_status: status,
    changed_by_name: actor,
    note: note ?? null,
  });
  return true;
}

export async function addNote(id: string, author: string, body: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const rows = await readLocal();
    const row = rows.find((item) => item.id === id);
    if (!row) return false;
    row.notes = [{ id: randomUUID(), author_name: author, body, created_at: new Date().toISOString() }, ...(row.notes ?? [])];
    await writeLocal(rows);
    return true;
  }
  const { error } = await supabase.from("counsellor_notes").insert({ application_id: id, author_name: author, body });
  return !error;
}

export async function attachDocument(
  id: string,
  doc: { kind: string; fileName: string; mimeType: string; size: number; storagePath: string }
) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const rows = await readLocal();
    const row = rows.find((item) => item.id === id);
    if (!row) return false;
    row.documents = [
      ...(row.documents ?? []),
      {
        id: randomUUID(),
        kind: doc.kind,
        file_name: doc.fileName,
        mime_type: doc.mimeType,
        size_bytes: doc.size,
        storage_path: doc.storagePath,
        uploaded_at: new Date().toISOString(),
      },
    ];
    await writeLocal(rows);
    return true;
  }
  const { error } = await supabase.from("student_documents").insert({
    application_id: id,
    kind: doc.kind,
    file_name: doc.fileName,
    mime_type: doc.mimeType,
    size_bytes: doc.size,
    storage_path: doc.storagePath,
  });
  return !error;
}

/** Signed URL for a private document. Returns null when storage is unavailable. */
export async function signedDocumentUrl(storagePath: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadDocumentObject(storagePath: string, bytes: ArrayBuffer, mimeType: string) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    const target = path.join(LOCAL_DIR, "uploads", storagePath.replace(/\.\./g, "_"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(bytes));
    return storagePath;
  }
  const { error } = await supabase.storage.from("student-documents").upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return storagePath;
}

export const databaseMode = isDatabaseConfigured;
