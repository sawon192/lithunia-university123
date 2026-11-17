import { SiteHeader } from "@/components/site-shell";
import { EligibilityTool } from "@/components/eligibility-tool";
import { BadgeCheck, ClipboardCheck, GraduationCap, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Eligibility Check · September 2027 Lithuania Admission Assessment",
  description: "Check your eligibility for Lithuanian universities and colleges for the September 2027 intake. An evidence-based assessment against officially published admission requirements — built for Bangladeshi applicants.",
};

export default function EligibilityPage() {
  return <>
    <SiteHeader />
    <main className="eligibility-page">
      <section className="diploma-hero"><div className="container">
        <div className="detail-breadcrumb"><Link href="/">Home</Link><span>/</span><strong>Eligibility check</strong></div>
        <div className="section-kicker"><span>FREE ASSESSMENT</span> SEPTEMBER 2027 INTAKE</div>
        <h1>Check your eligibility<br /><em>in minutes.</em></h1>
        <p className="diploma-lead">Enter the student&apos;s academic profile and get a full eligibility assessment against every researched Lithuanian university and college — which institutions are eligible, conditionally eligible, not eligible, or need confirmation, with the official source behind every rule.</p>
        <div className="diploma-legend">
          <span><i className="legend-published" /> Verified rules only</span>
          <span><i className="legend-earlier" /> Provisional 2027 information labelled</span>
          <span><i className="legend-unconfirmed" /> Unknowns never guessed</span>
        </div>
      </div></section>

      <section className="eligibility-intro container">
        <div className="el-intro-grid">
          <div className="el-intro-card"><span className="diploma-mark"><ClipboardCheck size={19} /></span><div><strong>Structured like a counsellor assessment</strong><p>Four verdicts per institution — Eligible, Conditionally Eligible, Not Eligible, Unverified — plus best matches, application information and a document checklist.</p></div></div>
          <div className="el-intro-card"><span className="diploma-mark"><ShieldCheck size={19} /></span><div><strong>Evidence-based, not optimistic</strong><p>Every minimum CGPA, English score and diploma rule restates an officially sourced fact. Bangladesh CGPA values are never converted into foreign percentages.</p></div></div>
          <div className="el-intro-card"><span className="diploma-mark"><GraduationCap size={19} /></span><div><strong>Built for Bangladeshi applicants</strong><p>SSC/HSC grading scale, Diploma-in-Engineering routes, Alim treatment, OMPT rules and country-specific document requirements are all modelled.</p></div></div>
        </div>
      </section>

      <section className="eligibility-body container">
        <EligibilityTool />
      </section>

      <section className="diploma-notes container">
        <div className="diploma-note"><span className="note-icon"><TriangleAlert size={22} strokeWidth={1.6} /></span><div><strong>What this assessment is — and is not</strong><p>This tool compares a profile against published admission requirements (reviewed 5 November 2026, labelled provisional for 2027 where needed). It is not an admission guarantee, not a qualification-recognition decision, and not a substitute for the institution&apos;s own admissions office.</p></div></div>
        <div className="diploma-note"><span className="note-icon"><BadgeCheck size={22} strokeWidth={1.6} /></span><div><strong>Need a human counsellor?</strong><p>Submit the application form and the GO ABROAD BD counsellor desk will review the profile, request confirmations from institutions where information is unverified, and guide the document preparation.</p><Link href="/apply">Start an application <ShieldCheck size={15} /></Link></div></div>
      </section>
    </main>
  </>;
}
