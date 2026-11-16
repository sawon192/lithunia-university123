import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getServiceSupabase } from "@/lib/supabase/server";

export type SharedShortlist = {
  id: string;
  share_slug: string;
  title: string | null;
  owner_name: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items: { university_slug: string; note: string | null; sort_order: number }[];
};

const LOCAL_FILE = path.join(process.cwd(), ".data", "shortlists.json");
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function makeSlug(length = 10) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

async function readLocal(): Promise<(SharedShortlist & { edit_token: string })[]> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocal(rows: (SharedShortlist & { edit_token: string })[]) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function createShortlist(input: {
  title?: string;
  ownerName?: string;
  ownerEmail?: string;
  slugs: string[];
}): Promise<{ shareSlug: string; editToken: string }> {
  const editToken = randomBytes(24).toString("base64url");
  const shareSlug = makeSlug();
  const supabase = getServiceSupabase();
  const unique = Array.from(new Set(input.slugs)).slice(0, 60);

  if (!supabase) {
    const rows = await readLocal();
    rows.push({
      id: randomUUID(),
      share_slug: shareSlug,
      title: input.title ?? null,
      owner_name: input.ownerName ?? null,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      edit_token: editToken,
      items: unique.map((slug, index) => ({ university_slug: slug, note: null, sort_order: index })),
    });
    await writeLocal(rows);
    return { shareSlug, editToken };
  }

  const { data, error } = await supabase
    .from("shortlists")
    .insert({
      share_slug: shareSlug,
      title: input.title ?? null,
      owner_name: input.ownerName ?? null,
      owner_email: input.ownerEmail ?? null,
      edit_token: editToken,
      is_public: true,
    })
    .select("id, share_slug")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the shortlist.");

  await supabase.from("shortlist_items").insert(
    unique.map((slug, index) => ({ shortlist_id: data.id, university_slug: slug, sort_order: index }))
  );

  return { shareSlug: data.share_slug as string, editToken };
}

export async function getShortlist(shareSlug: string): Promise<SharedShortlist | null> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const rows = await readLocal();
    const row = rows.find((item) => item.share_slug === shareSlug && item.is_public);
    if (!row) return null;
    const { edit_token: _ignored, ...rest } = row;
    return rest;
  }

  const { data, error } = await supabase
    .from("shortlists")
    .select("id, share_slug, title, owner_name, is_public, created_at, updated_at, shortlist_items(university_slug, note, sort_order)")
    .eq("share_slug", shareSlug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;

  const items = ((data as unknown as { shortlist_items?: SharedShortlist["items"] }).shortlist_items ?? []).sort(
    (a, b) => a.sort_order - b.sort_order
  );
  return {
    id: data.id as string,
    share_slug: data.share_slug as string,
    title: (data.title as string) ?? null,
    owner_name: (data.owner_name as string) ?? null,
    is_public: true,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    items,
  };
}

export async function updateShortlist(
  shareSlug: string,
  editToken: string,
  patch: { title?: string; ownerName?: string; slugs?: string[] }
): Promise<"ok" | "forbidden" | "missing"> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const rows = await readLocal();
    const row = rows.find((item) => item.share_slug === shareSlug);
    if (!row) return "missing";
    if (row.edit_token !== editToken) return "forbidden";
    if (typeof patch.title === "string") row.title = patch.title;
    if (typeof patch.ownerName === "string") row.owner_name = patch.ownerName;
    if (patch.slugs) {
      row.items = Array.from(new Set(patch.slugs)).map((slug, index) => ({ university_slug: slug, note: null, sort_order: index }));
    }
    row.updated_at = new Date().toISOString();
    await writeLocal(rows);
    return "ok";
  }

  const { data: row, error } = await supabase
    .from("shortlists")
    .select("id, edit_token")
    .eq("share_slug", shareSlug)
    .maybeSingle();
  if (error || !row) return "missing";
  if (row.edit_token !== editToken) return "forbidden";

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.title === "string") update.title = patch.title;
  if (typeof patch.ownerName === "string") update.owner_name = patch.ownerName;
  await supabase.from("shortlists").update(update).eq("share_slug", shareSlug);

  if (patch.slugs) {
    await supabase.from("shortlist_items").delete().eq("shortlist_id", row.id);
    const unique = Array.from(new Set(patch.slugs));
    if (unique.length) {
      await supabase.from("shortlist_items").insert(
        unique.map((slug, index) => ({ shortlist_id: row.id, university_slug: slug, sort_order: index }))
      );
    }
  }

  return "ok";
}
