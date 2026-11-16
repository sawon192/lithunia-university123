import { SiteHeader } from "@/components/site-shell";
import { ApplyForm } from "@/components/apply-form";
import { institutions, VERIFIED_ON } from "@/lib/research";
import { ArrowLeft, Clock3, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for September 2027 · Lithuania admission",
  description:
    "Submit your Lithuania university application enquiry to Go Abroad BD without creating an account. SSC, HSC, Diploma and Bachelor's routes reviewed by a counsellor.",
  robots: { index: true, follow: true },
};

export default function ApplyPage() {
  const universities = institutions.map((institution) => ({
    slug: institution.slug,
    name: institution.name,
    city: institution.city,
    category: institution.category ?? "university",
  }));

  const subjects = Array.from(
    new Set(institutions.flatMap((institution) => institution.area.split("·").map((item) => item.trim())).filter(Boolean))
  ).sort();

  return (
    <>
      <SiteHeader />
      <main className="apply-page">
        <section className="simple-hero apply-hero">
          <div className="container">
            <Link href="/" className="simple-back"><ArrowLeft size={16} /> Back to the guide</Link>
            <div className="section-kicker light-kicker"><span>SEPTEMBER 2027</span> STUDENT APPLICATION</div>
            <div className="simple-hero-row">
              <div>
                <h1>Start your <em>application.</em></h1>
                <p>Eight short steps, no account needed. A Go Abroad BD counsellor reviews every submission against the official requirements for your qualification.</p>
              </div>
              <div className="simple-hero-icon"><GraduationCapShield /></div>
            </div>
            <div className="apply-hero-badges">
              <span><Clock3 size={14} /> Takes about 10 minutes</span>
              <span><Lock size={14} /> Documents stored privately</span>
              <span><ShieldCheck size={14} /> Research checked {VERIFIED_ON}</span>
            </div>
          </div>
        </section>
        <section className="container apply-content">
          <ApplyForm universities={universities} subjects={subjects} />
        </section>
      </main>
    </>
  );
}

function GraduationCapShield() {
  return (
    <span className="apply-hero-mark" aria-hidden="true">
      <ShieldCheck size={49} strokeWidth={1.15} />
    </span>
  );
}
