import { SiteHeader } from "@/components/site-shell";
import { VERIFIED_ON } from "@/lib/research";
import { ArrowLeft, ArrowUpRight, MessageCircle, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * The inquiry URL encoded in both QR images supplied by Go Abroad BD
 * (verified by decoding the artwork). Kept in one place so the printed code,
 * the on-page code and the plain-text fallback can never drift apart.
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
          <div className="qr-panel">
            <div className="qr-panel-copy">
              <span className="qr-eyebrow"><QrCode size={15} /> ADMISSION INQUIRY</span>
              <h2>Point your camera at the code.</h2>
              <p>
                The form takes a couple of minutes and asks for the details a counsellor actually needs:
                your qualification, English evidence and the universities you are considering.
              </p>

              <figure className="qr-code-card">
                {/* Plain <img>, not next/image: the optimiser can recompress the
                    module pattern and break scanning. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/qr/admission-inquiry-qr.png"
                  alt="QR code linking to the Go Abroad BD admission inquiry form"
                  width={240}
                  height={240}
                  className="qr-code"
                />
                <figcaption>
                  <strong>Can&apos;t scan with this device?</strong>
                  <a className="qr-fallback" href={INQUIRY_URL} target="_blank" rel="noopener noreferrer">
                    {INQUIRY_LABEL} <ArrowUpRight size={14} />
                  </a>
                </figcaption>
              </figure>

              <ol className="qr-steps">
                <li><span>01</span> Open the camera app on your phone.</li>
                <li><span>02</span> Hold it over the code until the link appears.</li>
                <li><span>03</span> Tap the link and submit your enquiry.</li>
              </ol>
            </div>

            <div className="qr-panel-art">
              <picture>
                <source srcSet="/qr/admission-poster.webp" type="image/webp" />
                <img
                  src="/qr/admission-poster.jpg"
                  alt="Go Abroad BD admission poster with a QR code for the enquiry form"
                  width={900}
                  height={1273}
                />
              </picture>
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
