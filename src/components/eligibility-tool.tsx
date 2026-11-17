"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, ClipboardCheck, FileCheck2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { assessProfile, bestMatches, defaultDocuments, verdictLabels } from "@/lib/eligibility";
import type { Assessment, StudentProfile, StudyLevel, Verdict } from "@/lib/eligibility";
import { sources } from "@/lib/research";
import {
  assessmentLabels,
  assessmentSummary,
  defaultMaxGrade,
  effectiveGapYears,
  INTAKE_LABEL,
  INTAKE_YEAR,
  latestPassingYear,
  makeId,
  qualificationLabels,
  qualificationSummary,
} from "@/lib/student-profile";
import type { AssessmentType, Qualification, QualificationType, StudentAssessment } from "@/lib/student-profile";
import { omptStatusLabels } from "@/lib/ompt";

/* ── Seed rows ───────────────────────────────────────────────────────── */

function newQualification(type: QualificationType): Qualification {
  return { id: makeId("q"), type, maxGrade: defaultMaxGrade[type], completed: true };
}

const seedQualifications: Qualification[] = [newQualification("ssc"), newQualification("hsc")];

function newAssessment(type: AssessmentType): StudentAssessment {
  return { id: makeId("a"), type };
}

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
  qualifications: seedQualifications,
  assessments: [],
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

const number = (value: string) => (value === "" ? undefined : Number(value));

export function EligibilityTool() {
  const [profile, setProfile] = useState<StudentProfile>(initial);
  const [rows, setRows] = useState<Assessment[] | null>(null);
  const [error, setError] = useState("");

  const qualifications = profile.qualifications ?? [];
  const assessments = profile.assessments ?? [];

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const setQualification = (id: string, patch: Partial<Qualification>) =>
    set("qualifications", qualifications.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addQualification = (type: QualificationType) => set("qualifications", [...qualifications, newQualification(type)]);

  const removeQualification = (id: string) => set("qualifications", qualifications.filter((item) => item.id !== id));

  const setAssessment = (id: string, patch: Partial<StudentAssessment>) =>
    set("assessments", assessments.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addAssessment = (type: AssessmentType) => set("assessments", [...assessments, newAssessment(type)]);

  const removeAssessment = (id: string) => set("assessments", assessments.filter((item) => item.id !== id));

  // The automatic gap: latest passing year → September 2027 intake.
  const latest = latestPassingYear(qualifications);
  const autoGap = effectiveGapYears(qualifications);
  const gapInfo = effectiveGapYears(qualifications, profile.gapOverride);

  const generate = () => {
    const hasAnyResult = qualifications.some((item) => typeof item.grade === "number");
    if (!hasAnyResult) {
      setError("Please enter at least one qualification result so the engine has something to assess.");
      return;
    }
    if (profile.level === "Master" && !qualifications.some((item) => item.type === "bachelor" && typeof item.grade === "number")) {
      setError("A Master's assessment needs the Bachelor result (CGPA and scale maximum).");
      return;
    }
    setError("");
    setRows(assessProfile(profile));
    setTimeout(() => document.getElementById("el-report")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const counts = useMemo(() => {
    const base = { eligible: 0, conditional: 0, "not-eligible": 0, unverified: 0 };
    for (const row of rows ?? []) base[row.verdict] += 1;
    return base;
  }, [rows]);

  const eligible = rows?.filter((row) => row.verdict === "eligible") ?? [];
  const conditional = rows?.filter((row) => row.verdict === "conditional") ?? [];
  const notEligible = rows?.filter((row) => row.verdict === "not-eligible") ?? [];
  const unverified = rows?.filter((row) => row.verdict === "unverified") ?? [];
  const top = rows ? bestMatches(rows) : [];
  const documents = rows ? defaultDocuments(top) : [];
  const omptRequired = rows?.filter((row) => row.omptStatus === "required" || row.omptStatus === "programme") ?? [];

  return <div className="eligibility-tool">
    <div className="el-form">
      <div className="el-form-head"><span className="mini-heading"><ClipboardCheck size={17} /> STUDENT PROFILE</span><p>Only details that materially change eligibility are asked. Add any qualification and any entrance assessment — you can leave unknown fields empty, and the engine will mark them as missing conditions instead of guessing.</p></div>

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

      <div className="el-section-head">
        <span className="mini-heading"><FileCheck2 size={16} /> QUALIFICATIONS <em>({qualifications.length})</em></span>
        <div className="el-add-row">
          {(["ssc", "hsc", "alim", "olevel", "alevel", "diploma", "bachelor", "master", "other"] as QualificationType[]).map((type) => (
            <button key={type} type="button" className="el-add" onClick={() => addQualification(type)}>
              <Plus size={12} /> {qualificationLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {qualifications.length === 0 && <p className="el-empty">No qualification added yet — use the buttons above to add SSC, HSC, Diploma, Bachelor&apos;s, Alim, O/A-Level or any other award.</p>}

      <div className="el-rows">
        {qualifications.map((item) => (
          <div className="el-row" key={item.id}>
            <div className="el-row-head">
              <strong>{item.type === "other" ? item.label || "Other qualification" : qualificationLabels[item.type]}</strong>
              <button type="button" className="el-remove" onClick={() => removeQualification(item.id)} aria-label={`Remove ${qualificationLabels[item.type]}`}><Trash2 size={13} /> Remove</button>
            </div>
            <div className="el-row-grid">
              <Field label="Type">
                <select value={item.type} onChange={(event) => setQualification(item.id, { type: event.target.value as QualificationType, maxGrade: defaultMaxGrade[event.target.value as QualificationType] })}>
                  {(Object.keys(qualificationLabels) as QualificationType[]).map((type) => <option key={type} value={type}>{qualificationLabels[type]}</option>)}
                </select>
              </Field>
              {item.type === "other" && (
                <Field label="Name"><input value={item.label ?? ""} onChange={(event) => setQualification(item.id, { label: event.target.value })} placeholder="e.g. Fazil, BTEB short course" /></Field>
              )}
              <Field label="Result"><input type="number" step="0.01" min="0" value={item.grade ?? ""} onChange={(event) => setQualification(item.id, { grade: number(event.target.value) })} placeholder="e.g. 4.75" /></Field>
              <Field label="Scale max"><input type="number" step="0.01" min="1" value={item.maxGrade ?? ""} onChange={(event) => setQualification(item.id, { maxGrade: number(event.target.value) })} placeholder="5 or 4" /></Field>
              <Field label="Passing year"><input type="number" min="1971" max={INTAKE_YEAR} value={item.passingYear ?? ""} onChange={(event) => setQualification(item.id, { passingYear: number(event.target.value) })} placeholder="2024" /></Field>
            </div>
          </div>
        ))}
      </div>

      <div className="el-section-head">
        <span className="mini-heading"><Calculator size={16} /> ENTRANCE ASSESSMENTS <em>({assessments.length})</em></span>
        <div className="el-add-row">
          {(Object.keys(assessmentLabels) as AssessmentType[]).map((type) => (
            <button key={type} type="button" className="el-add" onClick={() => addAssessment(type)}>
              <Plus size={12} /> {assessmentLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {assessments.length === 0 && <p className="el-empty">Nothing recorded. OMPT is only needed at the institutions that publish it — add a result here if you have one and the report checks it against each institution&apos;s exact rule.</p>}

      <div className="el-rows">
        {assessments.map((item) => (
          <div className="el-row" key={item.id}>
            <div className="el-row-head">
              <strong>{item.type === "other" ? item.name || "Other assessment" : assessmentLabels[item.type]}</strong>
              <button type="button" className="el-remove" onClick={() => removeAssessment(item.id)} aria-label="Remove assessment"><Trash2 size={13} /> Remove</button>
            </div>
            <div className="el-row-grid">
              <Field label="Type">
                <select value={item.type} onChange={(event) => setAssessment(item.id, { type: event.target.value as AssessmentType })}>
                  {(Object.keys(assessmentLabels) as AssessmentType[]).map((type) => <option key={type} value={type}>{assessmentLabels[type]}</option>)}
                </select>
              </Field>
              {(item.type === "other" || item.type === "institution-test") && (
                <Field label="Name"><input value={item.name ?? ""} onChange={(event) => setAssessment(item.id, { name: event.target.value })} placeholder="e.g. KTU entrance exam" /></Field>
              )}
              {item.type === "ompt" && (
                <Field label="OMPT version">
                  <select value={item.version ?? ""} onChange={(event) => setAssessment(item.id, { version: (event.target.value || undefined) as StudentAssessment["version"] })}>
                    <option value="">Not recorded</option>
                    {(["A", "B", "C", "D", "E", "F"] as const).map((version) => <option key={version} value={version}>OMT-{version}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Score %"><input type="number" step="1" min="0" max="100" value={item.scorePercent ?? ""} onChange={(event) => setAssessment(item.id, { scorePercent: number(event.target.value) })} placeholder="e.g. 75" /></Field>
              <Field label="Year"><input type="number" min="2000" max={INTAKE_YEAR} value={item.year ?? ""} onChange={(event) => setAssessment(item.id, { year: number(event.target.value) })} placeholder="2026" /></Field>
            </div>
          </div>
        ))}
      </div>

      <div className="el-grid">
        <Field label="Subject / major (optional)"><input type="text" placeholder="e.g. Civil Engineering" value={profile.subject} onChange={(event) => set("subject", event.target.value)} /></Field>
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
          <Field label="Test score"><input type="number" step="0.5" placeholder="e.g. 6.0" value={profile.englishScore ?? ""} onChange={(event) => set("englishScore", number(event.target.value))} /></Field>
        )}
      </div>

      <div className="el-gap-card">
        <div className="el-gap-head"><Calculator size={16} /><strong>Study gap — calculated automatically</strong></div>
        <p>
          {autoGap.years === undefined
            ? <>Add a <strong>passing year</strong> to any qualification and the gap to {INTAKE_LABEL} is worked out here.</>
            : <>Latest passing year <strong>{latest}</strong> &rarr; {INTAKE_LABEL}, so the study gap is <strong>{autoGap.years} {autoGap.years === 1 ? "year" : "years"}</strong>.</>}
        </p>
        <Field label="Override the calculated gap (optional)" note="Leave empty to use the calculated figure. An override never hides a published limit — the report still applies each institution's rule.">
          <input type="number" min="0" max="30" placeholder={autoGap.years === undefined ? "e.g. 2" : `${autoGap.years}`} value={profile.gapOverride ?? ""} onChange={(event) => set("gapOverride", number(event.target.value))} />
        </Field>
        <small className="el-gap-source">
          {gapInfo.source === "override" ? `Using your override: ${gapInfo.years} years.` : gapInfo.source === "derived" ? "Using the calculated gap from your passing years." : "No gap recorded — institutions with a published gap limit will be marked as needing that detail."}
        </small>
      </div>

      <div className="el-grid">
        <Field label="Preferred subject area"><input type="text" placeholder="e.g. Business, IT, Nursing" value={profile.subject} onChange={(event) => set("subject", event.target.value)} /></Field>
        <Field label="Preferred city">
          <select value={profile.city} onChange={(event) => set("city", event.target.value as StudentProfile["city"])}>
            <option value="any">Any city</option><option value="vilnius">Vilnius</option><option value="kaunas">Kaunas</option><option value="klaipeda">Klaipėda</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Maximum annual tuition (€)"><input type="number" min="0" step="100" placeholder="e.g. 4000" value={profile.budgetEur ?? ""} onChange={(event) => set("budgetEur", number(event.target.value))} /></Field>
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
        <p className="el-report-sub">Generated from the verified research database ({new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}). Every threshold restates an officially sourced rule — unknown answers never upgrade a verdict.</p>
      </div>

      <div className="el-profile-card"><span className="mini-heading"><FileCheck2 size={17} /> STUDENT PROFILE</span>
        <div className="el-profile-grid">
          <div><span>Nationality / education</span>{profile.nationality} · {profile.educationCountry}</div>
          <div><span>Study level</span>{profile.level === "Bachelor" ? "Bachelor\u2019s" : "Master\u2019s"}</div>
          <div><span>Qualifications</span>{qualifications.length === 0 ? "None recorded" : qualifications.map(qualificationSummary).join(" · ")}</div>
          <div><span>Assessments</span>{assessments.length === 0 ? "None recorded" : assessments.map(assessmentSummary).join(" · ")}</div>
          <div><span>English</span>{profile.englishTest === "none" ? "No test yet" : profile.englishTest === "moi" ? "MOI only" : `${profile.englishTest.toUpperCase()} ${profile.englishScore ?? "—"}`}</div>
          <div><span>Study gap</span>{gapInfo.years === undefined ? "Not recorded" : `${gapInfo.years} ${gapInfo.years === 1 ? "year" : "years"}${gapInfo.source === "derived" ? " (auto)" : gapInfo.source === "override" ? " (override)" : ""}`}</div>
          <div><span>Preferences</span>{profile.subject || "Any subject"} · {profile.city === "any" ? "any city" : profile.city}{profile.budgetEur ? ` · ≤ €${profile.budgetEur}/yr` : ""}</div>
          <div><span>Intake</span>{INTAKE_LABEL}</div>
        </div>
      </div>

      <div className="el-tally">
        <div><span>Eligible</span><strong>{counts.eligible}</strong></div>
        <div><span>Conditional</span><strong>{counts.conditional}</strong></div>
        <div><span>Not eligible</span><strong>{counts["not-eligible"]}</strong></div>
        <div><span>Unverified</span><strong>{counts.unverified}</strong></div>
        <div><span>OMPT institutions</span><strong>{omptRequired.length}</strong></div>
      </div>

      <section className="el-section"><h3><span>A</span> Eligible institutions <em>({eligible.length})</em></h3>
        {eligible.length === 0 ? <p className="el-empty">No institution meets every published requirement with the current profile — see sections B and D for realistic routes.</p> :
          <div className="el-table-wrap"><table className="el-table"><thead><tr><th>Institution</th><th>Programme</th><th>Academic requirement</th><th>English requirement</th><th>OMPT</th><th>Tuition</th><th>Status</th></tr></thead><tbody>
            {eligible.map((row) => <tr key={row.institution.slug}>
              <td><Link href={`/universities/${row.institution.slug}`}>{row.institution.name}</Link></td>
              <td>{bestProgramme(row)}</td>
              <td>{row.academicDetail}</td>
              <td>{row.englishDetail}</td>
              <td>{omptStatusLabels[row.omptStatus]}{row.omptCheck === "pass" ? " · met" : ""}</td>
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
              <td><ul className="el-mini-list">{row.missing.slice(0, 6).map((item) => <li key={item}>{item}</li>)}{row.reasons.map((item) => <li key={item}>{item}</li>)}</ul></td>
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
            <td><ul className="el-mini-list">{row.academicCheck === "unknown" && <li>{row.academicDetail || "No published grade rule."}</li>}{row.englishCheck === "unknown" && <li>{row.englishDetail}</li>}{row.omptCheck === "unknown" && <li>OMPT not published: {row.ompt.note}</li>}{row.routeCheck === "unknown" && <li>Diploma equivalence not officially confirmed.</li>}</ul></td>
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
              <li>{omptStatusLabels[row.omptStatus]}{row.omptCheck === "pass" ? " — met" : row.omptCheck === "pending" ? " — result needed" : ""}</li>
              {row.tuitionEur && <li>{row.budgetFit === false ? `Tuition from €${row.tuitionEur}/yr — above the stated budget` : `Tuition from €${row.tuitionEur}/yr`}</li>}
              {row.gapExceeded && <li>Study gap ({row.gapYears} yr) exceeds the published guidance</li>}
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
          <p><strong>OMPT note.</strong> {omptRequired.length === 0 ? "No institution in this result list publishes an OMPT obligation." : `${omptRequired.length} of the assessed institutions publish an OMPT obligation (${omptRequired.slice(0, 3).map((row) => row.institution.abbreviation).join(", ")}${omptRequired.length > 3 ? "…" : ""}). OMPT is never assumed to be waived where an institution is silent — check each one.`}</p>
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
