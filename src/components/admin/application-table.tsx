"use client";

import { useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import type { StoredApplication } from "@/lib/applications/store";
import { APPLICATIONS_COMPACT_STATUSES } from "@/lib/applications/status-labels";

export function ApplicationTable({ rows, onOpen }: { rows: StoredApplication[]; onOpen: (row: StoredApplication) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [university, setUniversity] = useState("all");

  const universities = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => (row.preferences ?? []).map((p) => p.university_name)))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const first = row.preferences?.find((p) => !p.is_alternative) ?? row.preferences?.[0];
      const matchesSearch = !term || `${row.reference} ${row.full_name} ${row.email} ${row.mobile}`.toLowerCase().includes(term);
      const matchesStatus = status === "all" || row.status === status;
      const matchesUniversity =
        university === "all" || (row.preferences ?? []).some((p) => p.university_name === university);
      return matchesSearch && matchesStatus && matchesUniversity && Boolean(first);
    });
  }, [rows, query, status, university]);

  const exportHref = `/api/admin/export?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`;

  return (
    <div className="admin-table-block">
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, reference, email or phone" aria-label="Search applications" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <label className="admin-select">
          <SlidersHorizontal size={15} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {APPLICATIONS_COMPACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="admin-select">
          <select value={university} onChange={(e) => setUniversity(e.target.value)} aria-label="Filter by university">
            <option value="all">All universities</option>
            {universities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <a className="admin-export" href={exportHref}>
          <Download size={15} /> Export CSV ({filtered.length})
        </a>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference</th><th>Student</th><th>Contact</th><th>Preferences</th><th>Status</th><th>Submitted</th><th>Owner</th><th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const first = row.preferences?.find((p) => !p.is_alternative) ?? row.preferences?.[0];
              const alternative = row.preferences?.find((p) => p.is_alternative);
              return (
                <tr key={row.id}>
                  <td className="admin-ref">{row.reference}</td>
                  <td><strong>{row.full_name}</strong><small>{row.nationality ?? "Bangladesh"}</small></td>
                  <td><span>{row.email}</span><small>{row.mobile}</small></td>
                  <td>
                    <span>{first?.university_name}</span>
                    <small>{first?.programme_name ?? first?.subject_area ?? "Programme undecided"}{alternative ? " · +1 alternative" : ""}</small>
                  </td>
                  <td><span className={`admin-status status-${row.status.replace(/\s+/g, "-").toLowerCase()}`}>{row.status}</span></td>
                  <td><span>{new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span><small>{new Date(row.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</small></td>
                  <td><span>{row.assigned_name ?? "Unassigned"}</span></td>
                  <td><button type="button" className="admin-open" onClick={() => onOpen(row)}>Open</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-empty">
            <p>No applications match these filters.</p>
            <button type="button" onClick={() => { setQuery(""); setStatus("all"); setUniversity("all"); }}>Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
