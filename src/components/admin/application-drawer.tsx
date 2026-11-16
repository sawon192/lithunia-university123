"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, X } from "lucide-react";
import type { StoredApplication } from "@/lib/applications/store";
import { APPLICATIONS_COMPACT_STATUSES } from "@/lib/applications/status-labels";

export function ApplicationDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter();
  const [record, setRecord] = useState<StoredApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(`/api/admin/applications/${id}`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const json = (await response.json()) as { application: StoredApplication };
      if (cancelled) return;
      setRecord(json.application);
      setStatus(json.application.status);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveStatus() {
    if (!record) return;
    setBusy(true);
    const response = await fetch(`/api/admin/applications/${record.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (response.ok) {
      setRecord({ ...record, status: status as StoredApplication["status"] });
      setMessage("Status updated.");
      router.refresh();
    } else {
      setMessage("Could not update the status.");
    }
  }

  async function saveNote() {
    if (!record || note.trim().length < 2) return;
    setBusy(true);
    const response = await fetch(`/api/admin/applications/${record.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    setBusy(false);
    if (response.ok) {
      setNote("");
      setMessage("Note saved.");
      const refreshed = await fetch(`/api/admin/applications/${record.id}`);
      if (refreshed.ok) setRecord(((await refreshed.json()) as { application: StoredApplication }).application);
      router.refresh();
    } else {
      setMessage("Could not save the note.");
    }
  }

  async function openDocument(storagePath: string) {
    const response = await fetch(`/api/admin/applications/${record?.id}/document?path=${encodeURIComponent(storagePath)}`);
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.url) window.open(json.url as string, "_blank", "noopener");
    else setMessage(json.error ?? "This document could not be opened.");
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="admin-drawer" onClick={(event) => event.stopPropagation()} aria-label="Application details">
        <header className="admin-drawer-head">
          <div>
            <span className="admin-drawer-ref">{record?.reference ?? "Loading…"}</span>
            <h2>{record?.full_name ?? "Application"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        {loading && <div className="admin-drawer-loading"><Loader2 size={18} className="spin" /> Loading record…</div>}

        {record && (
          <div className="admin-drawer-body">
            {message && <div className="admin-drawer-note">{message}</div>}

            <section>
              <h3>Contact</h3>
              <dl className="admin-dl">
                <div><dt>Email</dt><dd><a href={`mailto:${record.email}`}>{record.email}</a></dd></div>
                <div><dt>Mobile</dt><dd><a href={`tel:${record.mobile}`}>{record.mobile}</a></dd></div>
                {record.whatsapp && <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${record.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{record.whatsapp}</a></dd></div>}
                {record.alt_contact && <div><dt>Alt. contact</dt><dd>{record.alt_contact}</dd></div>}
                <div><dt>Nationality</dt><dd>{record.nationality ?? "Bangladesh"}</dd></div>
                {record.current_country && <div><dt>Residence</dt><dd>{record.current_country}</dd></div>}
                {record.address && <div><dt>Address</dt><dd>{record.address}</dd></div>}
                {record.date_of_birth && <div><dt>Date of birth</dt><dd>{record.date_of_birth}</dd></div>}
              </dl>
            </section>

            <section>
              <h3>Academic background</h3>
              <ul className="admin-list">
                {(record.education ?? []).map((row, index) => (
                  <li key={index}>
                    <strong>{row.qualification}</strong> · {row.institution}
                    <small>{[row.subject_group, row.result_text, row.passing_year, row.awarding_body].filter(Boolean).join(" · ")}</small>
                  </li>
                ))}
                {(record.education ?? []).length === 0 && <li className="is-muted">No qualifications recorded.</li>}
              </ul>
            </section>

            <section>
              <h3>English tests</h3>
              <ul className="admin-list">
                {(record.english ?? []).map((row, index) => (
                  <li key={index}><strong>{row.test_type === "None" ? "No test yet" : row.test_type}</strong>{row.score ? ` · ${row.score}` : ""}{row.test_date ? <small>{row.test_date}</small> : null}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>University preferences</h3>
              <ul className="admin-list">
                {(record.preferences ?? []).map((row, index) => (
                  <li key={index}>
                    <strong>{row.is_alternative ? "Alternative" : "First choice"}</strong> · {row.university_name}
                    <small>{[row.programme_name, row.level, row.subject_area, row.intake].filter(Boolean).join(" · ")}</small>
                  </li>
                ))}
              </ul>
            </section>

            {record.documents && record.documents.length > 0 && (
              <section>
                <h3>Documents</h3>
                <ul className="admin-list">
                  {record.documents.map((doc) => (
                    <li key={doc.id}>
                      <button type="button" className="admin-doc-link" onClick={() => openDocument(doc.storage_path)}>
                        <FileText size={14} /> {doc.file_name}
                      </button>
                      <small>{doc.kind.replace(/_/g, " ")} · {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : "size unknown"}</small>
                    </li>
                  ))}
                </ul>
                <p className="admin-hint">Links are signed and expire after 10 minutes.</p>
              </section>
            )}

            <section>
              <h3>Status</h3>
              <div className="admin-status-row">
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {APPLICATIONS_COMPACT_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <button type="button" className="button button-navy" onClick={saveStatus} disabled={busy || status === record.status}>Save status</button>
              </div>
            </section>

            <section>
              <h3>Counsellor notes</h3>
              <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal note — not visible to the student." />
              <button type="button" className="admin-note-save" onClick={saveNote} disabled={busy || note.trim().length < 2}>Add note</button>
              <ul className="admin-notes">
                {(record.notes ?? []).map((item) => (
                  <li key={item.id}><strong>{item.author_name}</strong><span>{new Date(item.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span><p>{item.body}</p></li>
                ))}
                {(record.notes ?? []).length === 0 && <li className="is-muted">No notes yet.</li>}
              </ul>
            </section>

            <section>
              <h3>History</h3>
              <ol className="admin-history">
                {(record.history ?? []).map((item) => (
                  <li key={item.id}>
                    <strong>{item.to_status}</strong>
                    <span>{item.from_status ? `from ${item.from_status} · ` : ""}{new Date(item.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    {item.changed_by_name && <small>by {item.changed_by_name}</small>}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3>Additional information</h3>
              <dl className="admin-dl">
                <div><dt>Study gap</dt><dd>{record.study_gap ?? "—"}</dd></div>
                <div><dt>Visa refusal</dt><dd>{record.visa_refusal ?? "None declared"}</dd></div>
                <div><dt>Referral</dt><dd>{record.referral_source ?? "—"}</dd></div>
                <div><dt>Comments</dt><dd>{record.comments ?? "—"}</dd></div>
                <div><dt>Consent</dt><dd>Data {record.consent_data ? "✓" : "✗"} · Contact {record.consent_contact ? "✓" : "✗"} · Storage {record.consent_storage ? "✓" : "✗"}{record.consent_at ? ` · ${new Date(record.consent_at).toLocaleDateString("en-GB")}` : ""}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
