import { SiteHeader } from "@/components/site-shell";
import { getShortlist } from "@/lib/shortlist-store";
import { institutions, sources, statusLabels } from "@/lib/research";
import { ArrowLeft, ArrowUpRight, CalendarDays, Heart, MapPin, Share2, Wallet } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shortlist = await getShortlist(slug);
  return {
    title: shortlist?.title ? `${shortlist.title} · Shared shortlist` : "Shared university shortlist",
    description: shortlist
      ? `A ${shortlist.items.length}-institution Lithuania shortlist for September 2027, shared from Go Abroad BD.`
      : "This shared shortlist could not be found.",
    robots: { index: false, follow: false },
  };
}

export default async function SharedShortlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shortlist = await getShortlist(slug);

  if (!shortlist) {
    return (
      <>
        <SiteHeader />
        <main className="simple-page">
          <section className="container shared-missing">
            <h1>This shortlist is <em>unavailable.</em></h1>
            <p>The link may have been mistyped, or the list was never published. Ask the sender to share it again.</p>
            <Link href="/#universities" className="button button-navy">Browse all institutions</Link>
          </section>
        </main>
      </>
    );
  }

  const rows = shortlist.items
    .map((item) => ({ item, institution: institutions.find((entry) => entry.slug === item.university_slug) }))
    .filter((row): row is { item: typeof row.item; institution: (typeof institutions)[number] } => Boolean(row.institution));

  const sharedOn = new Date(shortlist.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <SiteHeader />
      <main className="shared-page">
        <section className="simple-hero shared-hero">
          <div className="container">
            <Link href="/" className="simple-back"><ArrowLeft size={16} /> Go Abroad BD · Lithuania guide</Link>
            <div className="section-kicker light-kicker"><span>SHARED</span> UNIVERSITY SHORTLIST</div>
            <div className="simple-hero-row">
              <div>
                <h1>{shortlist.title ?? "A shortlist for September 2027"}</h1>
                <p>
                  {rows.length} institution{rows.length === 1 ? "" : "s"} selected for the September 2027 intake
                  {shortlist.owner_name ? ` · prepared with ${shortlist.owner_name}` : ""} · updated {sharedOn}
                </p>
              </div>
              <div className="simple-hero-icon"><Heart size={48} strokeWidth={1.15} /></div>
            </div>
            <div className="shared-badges">
              <span><Share2 size={13} /> Read-only link — anyone with it can view, nobody can edit</span>
            </div>
          </div>
        </section>

        <section className="container shared-content">
          {rows.map(({ institution, item }) => {
            const firstSource = institution.officialLinks[0];
            return (
              <article key={institution.slug} className="shared-row" style={{ borderLeftColor: institution.accent }}>
                <div className="shared-row-head">
                  <span className="university-emblem small" aria-hidden="true"><span>{institution.initial}</span></span>
                  <div>
                    <h2><Link href={`/universities/${institution.slug}`}>{institution.name}</Link></h2>
                    <p className="shared-meta">
                      <span><MapPin size={12} /> {institution.city}</span>
                      <span className={`research-status status-${institution.status}`}><span className="status-light" />{statusLabels[institution.status]}</span>
                    </p>
                  </div>
                </div>
                {item.note && <p className="shared-note">{item.note}</p>}
                <div className="shared-facts">
                  <div><span><Wallet size={13} /> Application fee</span><strong>{institution.feeSummary}</strong></div>
                  <div><span><CalendarDays size={13} /> Bangladesh deadline</span><strong>{institution.deadlineSummary}</strong></div>
                  <div><span>Entrance test</span><strong>{institution.omptSummary}</strong></div>
                </div>
                <div className="shared-links">
                  <Link href={`/universities/${institution.slug}`}>Read the full research profile <ArrowUpRight size={15} /></Link>
                  <a href={sources[firstSource].url} target="_blank" rel="noopener noreferrer">Official source <ArrowUpRight size={14} /></a>
                </div>
              </article>
            );
          })}

          <div className="shared-foot">
            <p>
              This page is a saved research shortlist, not an offer of admission. Fees, deadlines and English
              requirements change — always confirm on the university&apos;s own page before paying anything.
            </p>
            <Link href="/apply" className="button button-gold">Start an application <ArrowUpRight size={16} /></Link>
          </div>
        </section>
      </main>
    </>
  );
}
