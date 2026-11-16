import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Study in Lithuania 2027 | Go Abroad BD Research Desk",
    template: "%s | Go Abroad BD",
  },
  description: "Source-linked Lithuania university admissions research for students applying from Bangladesh. Compare 2027 deadlines, fees, English tests, programmes and OMPT rules.",
  applicationName: "GO ABROAD BD",
  openGraph: {
    title: "Study in Lithuania 2027 | Go Abroad BD",
    description: "Verified, source-linked Lithuania admission guidance for students applying from Bangladesh.",
    siteName: "GO ABROAD BD",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "GO ABROAD BD emblem" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study in Lithuania 2027 | Go Abroad BD",
    description: "Verified, source-linked Lithuania admission guidance for students applying from Bangladesh.",
    images: ["/brand/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<SiteFooter /></body>
    </html>
  );
}
