import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getStaffSession } from "@/lib/auth";
import { listApplications } from "@/lib/applications/store";
import { summarise } from "@/lib/applications/stats";
import { dashboardMode } from "@/lib/applications/env-note";
import { AdminWorkspace } from "@/components/admin/workspace";
import { institutions, VERIFIED_ON } from "@/lib/research";
import { AlertTriangle, Database, LogOut, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Admission desk",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");

  const rows = await listApplications();
  const stats = summarise(rows);
  const mode = dashboardMode();

  const researchAlerts = institutions.filter((institution) => {
    const values = Object.values(institution.facts).flat();
    return values.some((item) => (item.status ?? "published") !== "published");
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/" className="admin-brand compact">
            <span className="brand-mark"><ShieldCheck size={19} strokeWidth={1.8} /></span>
            <span className="brand-copy"><strong>GO ABROAD <em>BD</em></strong><small>ADMISSION DESK</small></span>
          </Link>
          <div className="admin-header-right">
            <span className="admin-who">{session.name} · {session.role}</span>
            <Link href="/" className="admin-ghost">Public site</Link>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="admin-ghost"><LogOut size={14} /> Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="admin-container">
        <div className="admin-page-head">
          <div>
            <span className="admin-kicker">SEPTEMBER 2027 · INTAKE DESK</span>
            <h1>Student <em>applications.</em></h1>
            <p>Every submission from the public form, with academic records, English tests, documents and the counsellor audit trail.</p>
          </div>
          <div className={`admin-mode admin-mode-${mode.kind}`}>
            <Database size={15} />
            <div><strong>{mode.label}</strong><small>{mode.detail}</small></div>
          </div>
        </div>

        <div className="admin-stats">
          <article><span>Total applications</span><strong>{stats.total.toString().padStart(2, "0")}</strong></article>
          <article><span>New</span><strong>{stats.newCount.toString().padStart(2, "0")}</strong></article>
          <article><span>Under review</span><strong>{stats.underReview.toString().padStart(2, "0")}</strong></article>
          <article><span>Documents pending</span><strong>{stats.documentsWaiting.toString().padStart(2, "0")}</strong></article>
          <article><span>Eligible</span><strong>{stats.eligible.toString().padStart(2, "0")}</strong></article>
          <article><span>With universities</span><strong>{stats.submitted.toString().padStart(2, "0")}</strong></article>
          <article><span>Offers received</span><strong>{stats.offers.toString().padStart(2, "0")}</strong></article>
          <article><span>Rejected</span><strong>{stats.rejected.toString().padStart(2, "0")}</strong></article>
        </div>

        <AdminWorkspace rows={rows} />

        <section className="admin-research">
          <div className="admin-research-head">
            <div>
              <h2>Research status board</h2>
              <p>{institutions.length} institution profiles · guide last researched {VERIFIED_ON}. {researchAlerts.length} profiles still contain at least one date, fee or requirement that needs re-checking before it is quoted to a student.</p>
            </div>
          </div>
          <div className="admin-research-grid">
            {researchAlerts.map((institution) => {
              const sections = Object.entries(institution.facts)
                .filter(([, facts]) => facts.some((item) => (item.status ?? "published") !== "published"))
                .map(([key]) => key);
              return (
                <Link key={institution.slug} href={`/universities/${institution.slug}`} className="admin-research-card">
                  <span className="admin-research-name">{institution.name}</span>
                  <span className="admin-research-meta">{institution.city} · {institution.verifiedOn ?? VERIFIED_ON}</span>
                  <span className="admin-research-tags">
                    {sections.map((section) => <em key={section}>{section}</em>)}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="admin-research-foot"><AlertTriangle size={14} /> A tagged section means at least one fact is an earlier cycle or awaiting confirmation. Open the profile and re-check the linked official source.</p>
        </section>
      </div>
    </main>
  );
}
