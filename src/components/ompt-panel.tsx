import { Calculator, ShieldCheck } from "lucide-react";
import { getOmpt, omptStatusLabels, omptVersionLabel, requiresOmpt } from "@/lib/ompt";

/**
 * OMPT requirement panel for an institution profile. Renders from the single
 * shared OMPT table (src/lib/ompt.ts) — the same table behind the directory
 * filter and the eligibility engine, so the three can never disagree.
 */
export function OmptPanel({ slug }: { slug: string }) {
  const ompt = getOmpt(slug);
  const versions = omptVersionLabel(ompt.versions);

  return (
    <section id="ompt-panel" className="ompt-panel" aria-labelledby="ompt-panel-title">
      <div className="ompt-panel-head">
        <h3 id="ompt-panel-title"><Calculator size={18} /> OMPT entrance requirement</h3>
        <span className={`ompt-panel-badge ompt-${ompt.status}`}>{omptStatusLabels[ompt.status]}</span>
      </div>

      <div className="ompt-panel-grid">
        <div className="ompt-cell">
          <span>Published obligation</span>
          <strong>
            {ompt.status === "required" ? "Required" : ompt.status === "programme" ? "By programme" : ompt.status === "not-applicable" ? "Not applicable" : "Not mentioned"}
          </strong>
        </div>
        <div className="ompt-cell">
          <span>Version(s) named</span>
          <strong>{versions ?? "Not published"}</strong>
        </div>
        <div className="ompt-cell">
          <span>Minimum score</span>
          <strong>{ompt.minimumPercent !== undefined ? `${ompt.minimumPercent}% (lowest published)` : "Not published"}</strong>
        </div>
        <div className="ompt-cell">
          <span>Published alternative</span>
          <strong>{ompt.alternative ?? "None published"}</strong>
        </div>
      </div>

      <p className="ompt-panel-note">{ompt.note}</p>

      <div className="ompt-panel-foot">
        <ShieldCheck size={15} />
        <span>
          {requiresOmpt(ompt)
            ? "OMPT is a published obligation here. Book early — results take several working days, and some institutions cap attempts or set an early test deadline."
            : ompt.status === "not-applicable"
              ? "This institution has no Bachelor's or Master's intake of its own."
              : "No OMPT obligation is published on the consulted pages. That silence is recorded as unconfirmed, never as a formal exemption — ask admissions in writing before relying on it."}
        </span>
      </div>
    </section>
  );
}
