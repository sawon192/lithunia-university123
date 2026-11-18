import { SiteHeader } from "@/components/site-shell";
import { institutions, diplomaRouteLabels, factStatusLabels, sources, VERIFIED_ON } from "@/lib/research";
import type { Fact, FactStatus, Institution, SourceKey } from "@/lib/research";
import { ArrowRight, ArrowUpRight, BadgeCheck, ExternalLink, GraduationCap, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diploma & CGPA Guide · Which institutions accept a diploma background",
  description: "Which Lithuanian universities and colleges accept a Bangladesh Diploma-in-Engineering background, and every published minimum CGPA or grade — one sourced row per institution.",
};

const worstStatus = (facts: Fact[]): FactStatus => {
  const list = facts.map((item) => item.status ?? "published");
  if (list.includes("conflicting")) return "conflicting";
  if (list.includes("unconfirmed")) return "unconfirmed";
  if (list.includes("earlier")) return "earlier";
  if (list.includes("programme")) return "programme";
  return "published";
};

function SourcePills({ keys }: { keys?: SourceKey[] }) {
  const unique = keys ? [...new Set(keys)] : [];
  if (!unique.length) return null;
  return <span className="fact-sources">{unique.map((key) => <a key={key} href={sources[key].url} target="_blank" rel="noopener noreferrer" title={sources[key].label}><ExternalLink size={12} /> {sources[key].label}</a>)}</span>;
}

function DiplomaRow({ item }: { item: Institution }) {
  const data = item.diplomaCgpa;
  const status = worstStatus(data.facts);
  return (
    <tr>
      <td className="diploma-name"><Link href={`/universities/${item.slug}`}>{item.name} <ArrowUpRight size={14} /></Link><small>{item.city} · {item.area}</small></td>
      <td><span className={`route-badge route-${data.diploma}`}>{diplomaRouteLabels[data.diploma]}</span><span className="diploma-cell-note">{data.diplomaSummary}</span></td>
      <td className="diploma-cgpa">{data.cgpaSummary}</td>
      <td><span className={`fact-status fact-status-${status}`}>{factStatusLabels[status]}</span></td>
      <td className="diploma-sources"><SourcePills keys={data.facts.flatMap((fact) => fact.sources ?? [])} /></td>
    </tr>
  );
}

export default function DiplomaGuidePage() {
  const universityRows = institutions.filter((item) => (item.category ?? "university") === "university");
  const collegeRows = institutions.filter((item) => item.category === "college");

  return <>
    <SiteHeader />
    <main className="diploma-page">
      <section className="diploma-hero"><div className="container">
        <div className="detail-breadcrumb"><Link href="/">Home</Link><span>/</span><strong>Diploma &amp; CGPA guide</strong></div>
        <div className="section-kicker"><span>THE BANGLADESH LENS</span> QUALIFICATION ROUTE GUIDE</div>
        <h1>Diploma background<br /><em>and minimum CGPA.</em></h1>
        <p className="diploma-lead">Applying with a Diploma-in-Engineering, a college diploma, or checking the lowest published grade? Every institution below is one row: whether a diploma background is accepted, what the published minimum CGPA or grade is, and how official the answer is.</p>
        <div className="diploma-legend">
          <span><i className="legend-published" /> Officially confirmed</span>
          <span><i className="legend-programme" /> Programme specific</span>
          <span><i className="legend-earlier" /> Previous intake</span>
          <span><i className="legend-unconfirmed" /> Awaiting confirmation</span>
        </div>
      </div></section>

      <section className="diploma-routes"><div className="container">
        <div className="route-cards">
          <div className="route-card"><span className="route-badge route-accepted">Accepted</span><p>An official page names a college / vocational diploma as an entry document.</p></div>
          <div className="route-card"><span className="route-badge route-conditional">Conditional route</span><p>The institution accepts a qualification document, but admission turns on its academic-recognition decision — often SKVC — rather than on a named diploma. Read the conditions.</p></div>
          <div className="route-card"><span className="route-badge route-excluded">Not accepted</span><p>An official country rule explicitly refuses this background. Do not pay an application fee.</p></div>
          <div className="route-card"><span className="route-badge route-unconfirmed">Awaiting confirmation</span><p>No official statement found yet. Our counsellors can ask the institution before you apply.</p></div>
        </div>
      </div></section>

      <section className="diploma-list container">
        <div className="section-heading-row"><div><div className="section-kicker"><span>01</span> UNIVERSITIES</div><h2>Universities <em>at a glance.</em></h2></div><span className="colleges-count">{universityRows.length} RESEARCHED <span>↗</span></span></div>
        <div className="diploma-table-wrap"><table className="diploma-table"><thead><tr><th>Institution</th><th>Diploma background</th><th>Minimum CGPA / grade</th><th>Verification</th><th>Sources</th></tr></thead><tbody>{universityRows.map((item) => <DiplomaRow key={item.slug} item={item} />)}</tbody></table></div>
        <p className="diploma-section-note">Universities publish country tables built on the HSC, so a diploma assessment is a recognition decision there — that is why this block still carries unresolved rows while the college block does not.</p>
      </section>

      <section className="diploma-list container">
        <div className="section-heading-row"><div><div className="section-kicker"><span>02</span> COLLEGES</div><h2>Colleges <em>at a glance.</em></h2></div><span className="colleges-count">{collegeRows.length} RESEARCHED <span>↗</span></span></div>
        <div className="diploma-table-wrap"><table className="diploma-table"><thead><tr><th>Institution</th><th>Diploma background</th><th>Minimum CGPA / grade</th><th>Verification</th><th>Sources</th></tr></thead><tbody>{collegeRows.map((item) => <DiplomaRow key={item.slug} item={item} />)}</tbody></table></div>
      </section>

      <section className="diploma-notes container">
        <div className="diploma-note"><span className="note-icon"><TriangleAlert size={22} strokeWidth={1.6} /></span><div><strong>How to read this guide</strong><p>Rows restate only what an institution has officially published, reviewed on {VERIFIED_ON}. &quot;Awaiting confirmation&quot; means no official statement was found — it is not a yes and not a no. Never treat this table as an admission guarantee; every row links to the full sourced profile.</p></div></div>
        <div className="diploma-note"><span className="note-icon"><GraduationCap size={22} strokeWidth={1.6} /></span><div><strong>Diploma in Engineering? Start here</strong><p>Kauno kolegija says outright that a 4-year Diploma in Engineering makes you eligible for admission to higher education in engineering, and SMK lists a college diploma as an entry document. VILNIUS TECH publishes an OMPT route for vocational graduates. MRU explicitly excludes a Diploma in Engineering. Every other college is a conditional route, so ask the counsellor desk to request a written recognition decision before paying any fee.</p><Link href="/eligibility">Run the eligibility check <ArrowRight size={15} /></Link><Link href="/apply">Start an application <ArrowRight size={15} /></Link></div></div>
      </section>

      <section className="closing-banner"><div className="container closing-inner"><div><div className="section-kicker light-kicker"><span>03</span> RESEARCH WITH CLARITY</div><h2>Check the route<br /><em>before the fee.</em></h2><p>Save institutions to your shortlist, read the full sourced profile, and let our counsellors confirm anything still marked as awaiting confirmation.</p><div className="closing-buttons"><Link href="/shortlist" className="button button-gold">View your shortlist <ArrowUpRight size={17} /></Link><Link href="/methodology" className="closing-text-link">Our research method <ArrowRight size={17} /></Link></div></div><div className="closing-graphic" aria-hidden="true"><div className="closing-orbit orbit-one" /><div className="closing-orbit orbit-two" /><div className="closing-orbit orbit-three" /><div className="closing-center"><BadgeCheck size={55} strokeWidth={1.1} /><span>SOURCED<br />NOT GUESSED</span></div><span className="orbit-star orbit-star-one">✦</span><span className="orbit-star orbit-star-two">✳</span></div></div></section>
    </main>
  </>;
}
