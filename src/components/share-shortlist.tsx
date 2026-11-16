"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";

const STORAGE_KEY = "go-abroad-bd-shortlist";
const SHARE_KEY = "go-abroad-bd-shared-link";

function readSlugs(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function ShareShortlist() {
  const [slugs, setSlugs] = useState<string[]>(() => (typeof window === "undefined" ? [] : readSlugs()));
  const [link, setLink] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(SHARE_KEY)
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep in sync when the student saves another institution in the directory.
  useEffect(() => {
    const sync = () => setSlugs(readSlugs());
    window.addEventListener("go-abroad-bd-shortlist-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("go-abroad-bd-shortlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: readSlugs(), title: "My Lithuania 2027 shortlist" }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Could not create the link.");
        return;
      }
      const url = `${window.location.origin}/s/${json.shareSlug}`;
      window.localStorage.setItem(SHARE_KEY, url);
      // The edit token stays in this browser only — it is never placed in the URL.
      window.localStorage.setItem(`${SHARE_KEY}-token:${json.shareSlug}`, json.editToken as string);
      setLink(url);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Copy failed — select the link and copy it manually.");
    }
  }

  if (slugs.length === 0) return null;

  return (
    <div className="share-box">
      <div className="share-box-head">
        <span className="share-box-icon"><Share2 size={17} /></span>
        <div>
          <strong>Share this shortlist</strong>
          <small>
            Creates a permanent link that works on any device — phone, office laptop, or a counsellor&apos;s computer.
            Anyone with the link can view it; only you can edit it.
          </small>
        </div>
      </div>

      {link ? (
        <div className="share-link-row">
          <Link2 size={15} />
          <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} aria-label="Shareable shortlist link" />
          <button type="button" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</button>
          <a href={link} target="_blank" rel="noreferrer">Open</a>
        </div>
      ) : (
        <button type="button" className="button button-navy" onClick={share} disabled={busy}>
          {busy ? <><Loader2 size={15} className="spin" /> Creating link…</> : <>Create a shareable link ({slugs.length})</>}
        </button>
      )}

      {error && <p className="share-error">{error}</p>}
      <p className="share-note">
        Students can submit this list with their application, or send it to a counsellor who does not have an account.
      </p>
    </div>
  );
}
