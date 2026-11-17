"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ClipboardCheck, FileCheck2, TriangleAlert } from "lucide-react";
import { assessProfile, bestMatches, defaultDocuments, verdictLabels } from "@/lib/eligibility";
import type { Assessment, StudentProfile, StudyLevel, Verdict } from "@/lib/eligibility";
import { sources } from "@/lib/research";

const initial: StudentProfile = {
  level: "Bachelor",
  nationality: "Bangladesh",
  educationCountry: "Bangladesh",
  hasDiploma: false,
  hasBachelor: false,
  subject: "",
  englishTest: "none",
  city: "any",
  institutionType: "any",
};

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return <label className="el-field"><span className="el-label">{label}</span>{children}{note && <small>{note}</small>}</label>;
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  return <span className={`verdict-chip verdict-${verdict}`}>{verdictLabels[verdict]}</span>;
}

function bestProgramme(row: Assessment) {
  return row.matchedProgramme ?? row.institution.featuredProgrammes[0]?.name ?? row.institution.area;
}

export function EligibilityTool() {
  const [profile, setProfile] = useState<StudentProfile>(initial);
  const [rows, setRows] = useState<Assessment[] | null>(null);
  const [error, setError] = useState("");

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const generate = () => {
    const hasAnyResult =
      profile.sscGpa !== undefined || profile.hscGpa !== undefined ||
      (profile.hasDiploma && profile.diplomaGrade !== undefined) ||
      (profile.hasBachelor && profile.bachelorGrade !== undefined);
    if (!hasAnyResult) {
      setError("Please enter at least one qualification result so the engine has something to assess.");
      return;
    }
    if (profile.level === "Master" && !(profile.hasBachelor && profile.bachelorGrade !== undefined)) {
      setError("A Master\u2019s assessment needs the Bachelor result (CGPA and scale maximum).");
      return;
    }
    setError("");
    setRows(assessProfile(profile));
    setTimeout(() => document.getElementById("el-report")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const eligible = rows?.filter((row) => row.verdict === "eligible") ?? [];
  const conditional = rows?.filter((row) => row.verdict === "conditional") ?? [];
  const notEligible = rows?.filter((row) => row.verdict === "not-eligible") ?? [];
  const unverified = rows?.filter((row) => row.verdict === "unverified") ?? [];
  const top = rows ? bestMatches(rows) : [];
  const documents = rows ? defaultDocuments(top) : [];

  return <div className="eligibility-tool">
    <div className="el-form">
      <div className="el-form-head"><span className="mini-heading"><ClipboardCheck size={17} /> STUDENT PROFILE</span><p>Only details that materially change eligibility are asked. You can leave unknown fields empty — the engine will mark them as missing conditions instead of guessing.</p></div>

      <div className="el-grid">
        <Field label="Intended study level">
          <div className="el-toggle">
            {(["Bachelor", "Master"] as StudyLevel[]).map((levelName) => (
              <button key={levelName} type="button" className={profile.level === levelName ? "active" : ""} onClick={() => set("level", levelName)}>{levelName === "Bachelor" ? "Bachelor\u2019s" : "Master\u2019s"}</button>
            ))}
          </div>
        </Field>
        <Field label="Country of education"><input type="text" value={profile.educationCountry} onChange={(event) => set("educationCountry", event.target.value)} /></Field>
      </div>

      <div className="el-grid">
        <Field label="SSC / O-Level GPA (5.00 scale, optional)"><input type="number" step="0.01" min="0" max="5" placeholder="e.g. 4.80" value={profile.sscGpa ?? ""} onChange={(event) => set("sscGpa", event.target.value === "" ? undefined : Number(event.target.value))} /></Field>
        <Field label="HSC / A-Level GPA (5.00 scale, optional)"><input type="number" step="0.01" min="0" max="5" placeholder="e.g. 4.50" value={profile.hscGpa ?? ""} onChange={(event) => set("hscGpa", event.target.value === "" ? undefined : Number(event.target.value))} /></Field>
      </div>

      <div className="el-check-row">
        <label><input type="checkbox" checked={profile.hasDiploma} onChange={(event) => set("hasDiploma", event.target.checked)} /> Diploma (e.g. Diploma-in-Engineering)</label>
        {profile.hasDiploma && <span className="el-inline-fields">
          <input type="number" step="0.01" placeholder="CGPA" value={profile.diplomaGrade ?? ""} onChange={(event) => set("diplomaGrade", event.target.value === "" ? undefined : Number(event.target.value))} />
          <input type="number" step="0.01" placeholder="Scale max (e.g. 4)" value={profile.diplomaMax ?? ""} onChange={(event) => set("diplomaMax", event.target.value === "" ? undefined : Number(event.target.value))} />
        </span>}
      </div>

      <div className="el-check-row">
        <label><input type="checkbox" checked={profile.hasBachelor} onChange={(event) => set("hasBachelor", event.target.checked)} /> Bachelor&apos;s degree</label>
        {profile.hasBachelor && <span className="el-inline-fields">
          <input type="number" step="0.01" placeholder="CGPA" value={profile.bachelorGrade ?? ""} onChange={(event) => set("bachelorGrade", event.target.value === "" ? undefined : Number(event.target.value))} />
          <input type="number" step="0.01" placeholder="Scale max (e.g. 4)" value={profile.bachelorMax ?? ""} onChange={(event) => set("bachelorMax", event.target.value === "" ? undefined : Number(event.target.value))} />
        </span>}
      </div>

      <div className="el-grid">
        <Field label="Subject / major (optional)"><input type="text" placeholder="e.g. Civil Engineering" value={profile.subject} onChange={(event) => set("subject", event.target.value)} /></Field>
        <Field label="Study gap in years (optional)"><input type="number" min="0" max="30" placeholder="e.g. 2" value={profile.gapYears ?? ""} onChange={(event) => set("gapYears", event.target.value === "" ? undefined : Number(event.target.value))} /></Field>
      </div>

      <div className="el-grid">
        <Field label="English proficiency">
          <select value={profile.englishTest} onChange={(event) => set("englishTest", event.target.value as StudentProfile["englishTest"])}>
            <option value="none">No test yet</option>
            <option value="ielts">IELTS Academic</option>
            <option value="toefl">TOEFL iBT</option>
            <option value="pte">PTE Academic</option>
            <option value="duolingo">Duolingo English Test</option>
            <option value="englishScore">British Council EnglishScore</option>
            <option value="other">Other certificate</option>
            <option value="moi">Medium of Instruction (MOI) only</option>
          </select>
        </Field>
        {profile.englishTest !== "none" && profile.englishTest !== "moi" && (
          <Field label="Test score"><input type="number" step="0.5" placeholder="e.g. 6.0" value={profile.englishScore ?? ""} onChange={(event) => set("englishScore", event.target.value === "" ? undefined : Number(event.target.value))} /></Field>
        )}
      </div>

      <div className="el-grid">
        <Field label="Preferred subject area"><input type="text" placeholder="e.g. Business, IT, Nursing" value={profile.subject} onChange={(event) => set("subject", event.target.value)} /></Field>
        <Field label="Preferred city">
          <select value={profile.city} onChange={(event) => set("city", event.target.value as StudentProfile["city"])}>
            <option value="any">Any city</option><option value="vilnius">Vilnius</option><option value="kaunas">Kaunas</option><option value="klaipeda">Klaipėda</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Maximum annual tuition (€)"><input type="number" min="0" step="100" placeholder="e.g. 4000" value={profile.budgetEur ?? ""} onChange={(event) => set("budgetEur", event.target.value === "" ? undefined : Number(event.target.value))} /></Field>
        <Field label="Institution type">
          <select value={profile.institutionType} onChange={(event) => set("institutionType", event.target.value as StudentProfile["institutionType"])}>
            <option value="any">No preference</option><option value="university">University</option><option value="college">College</option>
          </select>
        </Field>
      </div>

      {error && <p className="el-error">{error}</p>}
      <button type="button" className="button button-gold el-generate" onClick={generate}>Generate assessment <ArrowRight size={17} /></button>
    </div>

    {rows && <div id="el-report" className="el-report">
      <div className="el-report-head"><div className="section-kicker"><span>ASSESSMENT</span> STUDENT ELIGIBILITY REPORT</div><h2>Your <em>assessment.</em></h2>
        <p className="el-report-sub">Generated from the verified research database ({new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Every threshold restates an officially sourced rule — unknown answers never upgrade a verdict.</p>
      </div>

      <div className="el-profile-card"><span className="mini-heading"><FileCheck2 size={17} /> STUDENT PROFILE</span>
        <div className="el-profile-grid">
          <div><span>Nationality / education</span>{profile.nationality} · {profile.educationCountry}</div>
          <div><span>Qualification</span>{profile.hasDiploma ? `Diploma${profile.diplomaGrade !== undefined ? ` (${profile.diplomaGrade}/${profile.diplomaMax ?? "?"})` : ""}` : ""}{profile.hasDiploma && profile.hasBachelor ? " · " : ""}{profile.hasBachelor ? `Bachelor${profile.bachelorGrade !== undefined ? ` (${profile.bachelorGrade}/${profile.bachelorMax ?? "?"})` : ""}` : ""}{!profile.hasDiploma && !profile.hasBachelor ? "SSC / HSC" : ""}</div>
          <div><span>SSC / HSC</span>{profile.sscGpa ?? "—"} / {profile.hscGpa ?? "—"} (GPA 5.00)</div>
          <div><span>English</span>{profile.englishTest === "none" ? "No test yet" : profile.englishTest === "moi" ? "MOI only" : `${profile.englishTest.toUpperCase()} ${profile.englishScore ?? "—"}`}</div>
          <div><span>Study level</span>{profile.level === "Bachelor" ? "Bachelor\u2019s" : "Master\u2019s"}</div>
          <div><span>Preferences</span>{profile.subject || "Any subject"} · {profile.city === "any" ? "any city" : profile.city}{profile.budgetEur ? ` · ≤ €${profile.budgetEur}/yr` : ""}</div>
          <div><span>Intake</span>September 2027</div>
        </div>
      </div>

      <section className="el-section"><h3><span>A</span> Eligible institutions <em>({eligible.length})</em></h3>
        {eligible.length === 0 ? <p className="el-empty">No institution meets every published requirement with the current profile — see sections B and D for realistic routes.</p> :
          <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Programme</th><th>Academic requirement</th><th>English requirement</th><th>Tuition</th><th>Status</th></tr></thead><tbody>
            {eligible.map((row) => <tr key={row.institution.slug}>
              <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
              <td>{bestProgramme(row)}</td>
              <td>{row.academicDetail}</td>
              <td>{row.englishDetail}</td>
              <td>{row.institution.feeSummary ? `Fee ${row.institution.feeSummary}` : ""}{row.tuitionEur ? ` · from €${row.tuitionEur}/yr` : ""}</td>
              <td><VerdictChip verdict={row.verdict} /></td>
            </tr>)}
          </tbody></table></div>}
      </section>

      <section className="el-section"><h3><span>B</span> Conditionally eligible <em>({conditional.length})</em></h3>
        {conditional.length === 0 ? <p className="el-empty">Nothing here right now.</p> :
          <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Programme</th><th>Missing requirement</th><th>Recommended action</th></tr></thead><tbody>
            {conditional.map((row) => <tr key={row.institution.slug}>
              <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
              <td>{bestProgramme(row)}</td>
              <td><ul className="el-mini-list">{row.missing.slice(0, 5).map((item) => <li key={item}>{item}</li>)}{row.reasons.map((item) => <li key={item}>{item}</li>)}</ul></td>
              <td><ul className="el-mini-list">{row.actions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></td>
            </tr>)}
          </tbody></table></div>}
      </section>

      <section className="el-section"><h3><span>C</span> Not eligible <em>({notEligible.length})</em></h3>
        <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Programme</th><th>Reason</th></tr></thead><tbody>
          {notEligible.map((row) => <tr key={row.institution.slug}>
            <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
            <td>{bestProgramme(row)}</td>
            <td><ul className="el-mini-list">{row.reasons.map((item) => <li key={item}>{item}</li>)}{row.reasons.length === 0 && <li>At least one mandatory published requirement is not met.</li>}</ul></td>
          </tr>)}
        </tbody></table></div>
      </section>

      <section className="el-section"><h3><span>D</span> Unverified options <em>({unverified.length})</em></h3>
        <p className="el-empty">Official information is insufficient for a reliable decision at these institutions — they are not a yes and not a no. Confirm with admissions before applying.</p>
        <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Why unverified</th><th>What to confirm</th></tr></thead><tbody>
          {unverified.map((row) => <tr key={row.institution.slug}>
            <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
            <td><ul className="el-mini-list">{row.academicCheck === "unknown" && <li>{row.academicDetail || "No published grade rule."}</li>}{row.englishCheck === "unknown" && <li>{row.englishDetail}</li>}{row.routeCheck === "unknown" && <li>Diploma equivalence not officially confirmed.</li>}</ul></td>
            <td><ul className="el-mini-list">{row.actions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}{row.missing.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul></td>
          </tr>)}
        </tbody></table></div>
      </section>

      <section className="el-section"><h3><span>E</span> Best matches <em>(top 5)</em></h3>
        <div className="el-best-grid">{top.map((row, index) => (
          <div className="el-best-card" key={row.institution.slug}>
            <span className="el-best-rank">{String(index + 1).padStart(2, "0")}</span>
            <VerdictChip verdict={row.verdict} />
            <h4><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></h4>
            <p className="el-best-programme">{bestProgramme(row)}</p>
            <ul>
              <li>{row.academicCheck === "pass" ? "Academic requirement met" : row.academicCheck === "pending" ? "Academic result still needed" : "Academic rule needs confirmation"}</li>
              <li>{row.englishCheck === "pass" ? "English requirement met" : row.englishCheck === "pending" ? "English evidence still needed" : "English rule needs confirmation"}</li>
              {row.tuitionEur && <li>{row.budgetFit === false ? `Tuition from €${row.tuitionEur}/yr — above the stated budget` : `Tuition from €${row.tuitionEur}/yr`}</li>}
              {row.cityMatch && <li>Located in the preferred city</li>}
              {row.missing.length > 0 && <li>Conditions: {row.missing.slice(0, 2).join("; ")}</li>}
            </ul>
          </div>
        ))}</div>
      </section>

      <section className="el-section"><h3><span>F</span> Application information</h3>
        <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Official links</th><th>Application fee</th><th>Deadline (published)</th></tr></thead><tbody>
          {top.map((row) => <tr key={row.institution.slug}>
            <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
            <td>{row.institution.officialLinks.slice(0, 3).map((key) => <a key={key} className="el-link" href={sources[key].url} target="_blank" rel="noopener noreferrer">{sources[key].label} <ArrowUpRight size={12} /></a>)}</td>
            <td>{row.institution.feeSummary}</td>
            <td>{row.institution.deadlineSummary}</td>
          </tr>)}
        </tbody></table></div>
      </section>

      <section className="el-section el-final"><h3><span>G</span> Final recommendation</h3>
        <div className="el-final-body">
          <p><strong>Strongest opportunities.</strong> {eligible.length > 0 ? `${eligible.slice(0, 3).map((row) => row.institution.name).join(", ")} meet every published requirement for this profile.` : conditional.length > 0 ? `The most realistic routes are ${top.slice(0, 3).map((row) => row.institution.name).join(", ")} — each needs only the listed conditions to be met.` : "No strong match is available with the current profile; consider broadening the subject or city preferences."}</p>
          <p><strong>Requirements still to fulfil.</strong> {[...new Set(top.flatMap((row) => row.missing))].slice(0, 6).join(" · ") || "None beyond document submission."}</p>
          <p><strong>Prioritise.</strong> {top.slice(0, 3).map((row) => `${row.institution.name} (${verdictLabels[row.verdict].toLowerCase()})`).join(" · ")}. Apply early — non-EU deadlines are firm and residence-permit processing takes months.</p>
          <p><strong>Documents to prepare next.</strong></p>
          <ul className="el-doc-list">{documents.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="el-final-note"><TriangleAlert size={17} /> This is an evidence-based assessment against published requirements, not an admission guarantee. Final decisions rest with each institution&apos;s admissions office.</div>
        </div>
      </section>

      <div className="el-report-foot">
        <Link className="button button-gold" href="/apply">Start an application <ArrowRight size={17} /></Link>
        <Link className="closing-text-link" href="/diploma">Diploma &amp; CGPA guide <ArrowRight size={15} /></Link>
      </div>
    </div>}
  </div>;
}
