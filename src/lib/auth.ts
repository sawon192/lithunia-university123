import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Staff session handling without an extra dependency.
 *
 * Sign-in is verified against Supabase Auth (GoTrue) using the service role, or
 * — when Supabase is not yet configured — against ADMIN_PASSWORD for local
 * development. The result is a short-lived HMAC-signed cookie that the server
 * verifies on every admin request.
 */

export type StaffSession = {
  email: string;
  name: string;
  role: "admin" | "counsellor";
  exp: number;
};

const COOKIE = "gabd_staff";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-only-insecure-secret";
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(session: Omit<StaffSession, "exp">) {
  const body: StaffSession = { ...session, exp: Date.now() + MAX_AGE * 1000 };
  const payload = b64url(JSON.stringify(body));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): StaffSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StaffSession;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;

export type SignInResult = { ok: true; session: Omit<StaffSession, "exp"> } | { ok: false; message: string };

export async function authenticate(email: string, password: string): Promise<SignInResult> {
  const normalised = email.trim().toLowerCase();

  // 1. Supabase Auth path (production)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey },
      body: JSON.stringify({ email: normalised, password }),
    });
    if (!response.ok) return { ok: false, message: "Email or password is incorrect." };

    const json = (await response.json()) as { user?: { id?: string; email?: string; user_metadata?: { full_name?: string } } };
    const userId = json.user?.id;
    if (!userId) return { ok: false, message: "Email or password is incorrect." };

    const { getServiceSupabase } = await import("@/lib/supabase/server");
    const supabase = getServiceSupabase();
    const { data: staff } = await supabase!
      .from("admin_users")
      .select("email, full_name, role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (!staff) return { ok: false, message: "This account is not authorised for the admin desk." };
    if (!staff.is_active) return { ok: false, message: "This account has been deactivated." };

    return {
      ok: true,
      session: {
        email: (staff.email as string) ?? normalised,
        name: (staff.full_name as string) ?? normalised,
        role: (staff.role as "admin" | "counsellor") ?? "counsellor",
      },
    };
  }

  // 2. Local development fallback
  const devPassword = process.env.ADMIN_PASSWORD;
  const devEmail = (process.env.ADMIN_EMAIL ?? "counsellor@goabroadbd.com").toLowerCase();
  if (devPassword) {
    if (normalised === devEmail && password === devPassword) {
      return { ok: true, session: { email: normalised, name: "Counsellor", role: "admin" } };
    }
    return { ok: false, message: "Email or password is incorrect." };
  }

  return { ok: false, message: "Staff sign-in is not configured on this deployment." };
}
