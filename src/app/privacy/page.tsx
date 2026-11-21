import { SiteHeader } from "@/components/site-shell";
import { privacyFacts, VERIFIED_ON } from "@/lib/research";
import { ArrowLeft, Lock, Mail, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How Go Abroad BD collects, stores and deletes student information submitted through the Lithuania 2027 admission enquiry.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="simple-page">
        <section className="simple-hero method-hero">
          <div className="container">
            <Link href="/" className="simple-back"><ArrowLeft size={16} /> Back to the guide</Link>
            <div className="section-kicker light-kicker"><span>YOUR DATA</span> PRIVACY NOTICE</div>
            <div className="simple-hero-row">
              <div>
                <h1>What we keep, <em>and why.</em></h1>
                <p>
                  This notice explains exactly what happens to the information a student submits through the
                  September 2027 admission enquiry. It applies from {VERIFIED_ON}.
                </p>
              </div>
              <div className="simple-hero-icon"><ShieldCheck size={48} strokeWidth={1.15} /></div>
            </div>
          </div>
        </section>

        <section className="container method-content">
          <div className="method-intro">
            <div className="section-kicker"><span>01</span> WHO IS RESPONSIBLE</div>
            <h2>The short <em>version.</em></h2>
            <p>{privacyFacts.summary}</p>
          </div>

          <div className="privacy-enquiry-note">
            <Mail size={18} />
            <div>
              <strong>Where the enquiry form lives</strong>
              <p>
                The September 2027 enquiry is collected through Go Abroad BD&apos;s own admissions enquiry
                system (LeadsNimble), reached by the QR code on the apply page or the direct link beside it.
                The counsellor team reads submissions there and contacts the student using the details
                provided. This site itself no longer stores application forms or uploaded documents.
              </p>
            </div>
          </div>

          <div className="privacy-grid">
            <article>
              <span className="method-step-icon"><Mail size={21} /></span>
              <h3>What we collect</h3>
              <ul>
                {privacyFacts.collected.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article>
              <span className="method-step-icon"><Lock size={21} /></span>
              <h3>How it is protected</h3>
              <ul>
                {privacyFacts.protected.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article>
              <span className="method-step-icon"><Trash2 size={21} /></span>
              <h3>Retention and deletion</h3>
              <ul>
                {privacyFacts.retention.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          </div>

          <div className="privacy-body">
            <h2>Full notice</h2>
            {privacyFacts.sections.map((section) => (
              <div key={section.title} className="privacy-section">
                <h3>{section.title}</h3>
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            ))}
          </div>

          <div className="method-cta">
            <span>QUESTIONS ABOUT YOUR DATA?</span>
            <h3>Ask us before you submit.</h3>
            <a className="button button-gold" href="https://wa.me/8801714640238" target="_blank" rel="noreferrer">
              Message the Go Abroad BD team
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
