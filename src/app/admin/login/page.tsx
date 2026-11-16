import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Lock, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getStaffSession();
  if (session) redirect("/admin");

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) || Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Link href="/" className="admin-brand">
          <span className="brand-mark brand-mark-logo"><BrandLogo size={42} /></span>
          <span className="brand-copy"><strong>GO ABROAD <em>BD</em></strong><small>ADMISSION DESK</small></span>
        </Link>
        <h1>Staff <em>sign in.</em></h1>
        <p className="admin-login-lead">
          Application records, documents and counsellor notes are restricted to authorised Go Abroad BD staff.
        </p>
        <LoginForm disabled={!configured} />
        {!configured && (
          <div className="admin-alert">
            <Lock size={15} />
            <p>
              No authentication backend is configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>, or set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> for
              local development.
            </p>
          </div>
        )}
        <div className="admin-login-foot">
          <ShieldCheck size={14} />
          <span>Sessions are signed, httpOnly and expire after 8 hours.</span>
        </div>
      </div>
    </main>
  );
}
