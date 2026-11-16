import type { EnglishAlternatives, MoiStatus } from "@/lib/english-alternatives";
import { getStandardScores } from "@/lib/english-alternatives";
import { sources } from "@/lib/research";
import type { Institution } from "@/lib/research";
import { BadgeCheck, ExternalLink, Globe2 } from "lucide-react";

const moiVerdict: Record<MoiStatus, { label: string; className: string }> = {
  accepted: { label: "Accepted", className: "verdict-accepted" },
  conditional: { label: "Conditionally accepted", className: "verdict-conditional" },
  not_accepted: { label: "Not accepted", className: "verdict-not-accepted" },
  unconfirmed: { label: "Not officially confirmed", className: "verdict-unconfirmed" },
};

const statusCopy: Record<EnglishAlternatives["englishRequirementStatus"], string> = {
  officially_confirmed: "Officially confirmed",
  programme_specific: "Programme specific",
  previous_intake: "Previous intake",
  not_officially_confirmed: "Not officially confirmed",
  conflicting: "Conflicting official information",
};

export function EnglishAlternativesProfile({ institution }: { institution: Institution }) {
  const profile = institution.english;
  const tests = getStandardScores(institution.slug);
  const source = sources[profile.englishRequirementSource];
  const verdict = moiVerdict[profile.moiAccepted];
  const internal = profile.internalEnglishTest;

  return (
    <section id="english-alternatives" className="english-profile" aria-labelledby="english-alt-title">
      <div className="english-profile-head">
        <div>
          <h3 id="english-alt-title"><Globe2 size={18} /> English language requirements &amp; alternatives</h3>
          <p>Can you apply without IELTS, PTE Academic or TOEFL? This is what {institution.abbreviation} has actually published.</p>
        </div>
        <span className="english-profile-status">{statusCopy[profile.englishRequirementStatus]}</span>
      </div>

      <div className="english-tests">
        <div><span>IELTS</span><strong>{tests.ielts}</strong></div>
        <div><span>PTE Academic</span><strong>{tests.pte}</strong></div>
        <div><span>TOEFL</span><strong>{tests.toefl}</strong></div>
      </div>

      <div className="english-alt-grid">
        <div className="english-alt-cell">
          <h4>Medium of Instruction (MOI) <span className={`english-verdict ${verdict.className}`}>{verdict.label}</span></h4>
          <p>
            {profile.moiConditions ??
              (profile.moiAccepted === "unconfirmed"
                ? "Not officially confirmed — this institution has not published a rule on accepting a Medium of Instruction certificate as proof of English."
                : profile.moiAccepted === "accepted"
                  ? "An official certificate showing English was the medium of instruction is accepted as English evidence."
                  : "An MOI letter is expressly not accepted as proof of English proficiency.")}
          </p>
        </div>

        <div className="english-alt-cell">
          <h4>University internal English test <span className={`english-verdict ${internal.available ? "verdict-accepted" : "verdict-unconfirmed"}`}>{internal.available ? "Available" : "None published"}</span></h4>
          {internal.available ? (
            <div className="english-internal">
              <dl>
                <div><dt>Test</dt><dd>{internal.name}</dd></div>
                <div><dt>Cost</dt><dd>{internal.fee ?? "Not published"}</dd></div>
                <div><dt>Format</dt><dd>{internal.format ?? "Not published"}</dd></div>
                <div><dt>Minimum</dt><dd>{internal.minimumLevel ?? "Not published"}</dd></div>
                {internal.notes && <div><dt>Notes</dt><dd>{internal.notes}</dd></div>}
              </dl>
            </div>
          ) : (
            <p>{internal.notes ?? "No institution-run English examination is published for international applicants."}</p>
          )}
        </div>

        <div className="english-alt-cell">
          <h4>Alternative English certificates <span className={`english-verdict ${profile.alternativeEnglishCertificates.length ? "verdict-accepted" : "verdict-unconfirmed"}`}>{profile.alternativeEnglishCertificates.length ? `${profile.alternativeEnglishCertificates.length} accepted` : "None published"}</span></h4>
          {profile.alternativeEnglishCertificates.length ? (
            <ul className="english-cert-list">
              {profile.alternativeEnglishCertificates.map((certificate) => <li key={certificate}>{certificate}</li>)}
            </ul>
          ) : (
            <p>No alternative certificate scheme (Duolingo, LanguageCert, EF SET and similar) is confirmed on the official pages.</p>
          )}
        </div>

        <div className="english-alt-cell">
          <h4>Conditions and notes</h4>
          <p>{profile.englishRequirementNotes}</p>
          <p style={{ marginTop: 8 }}>
            IELTS, PTE Academic and TOEFL are listed as standard requirements above, never as an &ldquo;alternative&rdquo;.
            A conditional policy applies to specific qualifications or programmes — it is not a general acceptance.
          </p>
        </div>
      </div>

      <div className="english-profile-foot">
        <p>
          <BadgeCheck size={13} style={{ verticalAlign: -2, marginRight: 4, color: "#709b7c" }} />
          Last verified {profile.englishRequirementVerifiedAt} · Source: {source.label}
        </p>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} /> Official English requirement page
        </a>
      </div>
    </section>
  );
}
