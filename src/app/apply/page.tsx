import { SiteHeader } from "@/components/site-shell";
import { VERIFIED_ON } from "@/lib/research";
import { ArrowLeft, ArrowUpRight, MessageCircle, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * The inquiry URL encoded in the Go Abroad BD poster (verified by decoding the
 * artwork). Kept in one place so the printed code and the text fallback can
 * never drift apart.
 */
const INQUIRY_URL = "https://app.leadsnimble.com/go-abroad-bd/f/admission-inquiry";
const INQUIRY_LABEL = "app.leadsnimble.com/go-abroad-bd/f/admission-inquiry";

export const metadata: Metadata = {
  title: "Start your application · Lithuania admission 2027",
  description:
    "Scan the Go Abroad BD admission QR code to start your Lithuania university application, or open the enquiry form directly. A counsellor reviews every submission against the official requirements.",
  robots: { index: true, follow: true },
};

export default function ApplyPage() {
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
                <h1>Scan to start your <em>application.</em></h1>
                <p>A Go Abroad BD counsellor reviews every enquiry against the official requirements for your qualification, then contacts you directly.</p>
              </div>
              <div className="simple-hero-icon"><QrCodeMark /></div>
            </div>
            <div className="apply-hero-badges">
              <span><Smartphone size={14} /> Scan with any phone camera</span>
              <span><MessageCircle size={14} /> Real counselling, not an auto-reply</span>
              <span><ShieldCheck size={14} /> Research checked {VERIFIED_ON}</span>
            </div>
          </div>
        </section>

        <section className="container apply-content">
          {/* One QR only: the poster carries it. A second standalone code next
              to the poster read as two different codes, so there is exactly one. */}
          <div className="qr-panel">
            <div className="qr-panel-art">
              {/* One optimised PNG at full resolution: downscaling or heavy
                  WebP compression blurred the QR modules enough to break
                  scanning, so the palette-optimised PNG (188 KB) is shipped
                  as-is and the code stays sharp. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image would re-encode the QR modules and break scanning */}
              <img
                src="/qr/admission-poster-web.png"
                alt="Go Abroad BD admission poster — scan the QR code to open the enquiry form"
                width={1414}
                height={2000}
              />
            </div>

            <div className="qr-panel-copy">
              <span className="qr-eyebrow"><QrCode size={15} /> ADMISSION INQUIRY</span>
              <h2>Point your camera at the code.</h2>
              <p>
                The form takes a couple of minutes and asks for the details a counsellor actually needs:
                your qualification, English evidence and the universities you are considering.
              </p>

              <ol className="qr-steps">
                <li><span>01</span> Open the camera app on your phone.</li>
                <li><span>02</span> Hold it over the code on the poster until the link appears.</li>
                <li><span>03</span> Tap the link and submit your enquiry.</li>
              </ol>

              <div className="qr-fallback-card">
                <strong>On a computer? Can&apos;t scan?</strong>
                <a className="qr-fallback" href={INQUIRY_URL} target="_blank" rel="noopener noreferrer">
                  {INQUIRY_LABEL} <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function QrCodeMark() {
  return (
    <span className="apply-hero-mark" aria-hidden="true">
      <QrCode size={49} strokeWidth={1.15} />
    </span>
  );
}
