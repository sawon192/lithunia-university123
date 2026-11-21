"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  FileUp,
  GraduationCap,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";

type Option = { slug: string; name: string; city: string; category: string };

type EducationRow = {
  qualification: string;
  institution: string;
  subjectGroup: string;
  passingYear: string;
  result: string;
  awardingBody: string;
};

type EnglishRow = { testType: string; score: string; testDate: string };

type PreferenceRow = { universitySlug: string; universityName: string; programmeName: string; level: string; subjectArea: string };

const QUALIFICATIONS = ["SSC", "O-Level", "HSC", "A-Level", "Alim", "Fazil", "Diploma", "Diploma in Engineering", "Bachelors", "BBA", "BSc", "BEng", "LLB", "MBBS", "Masters", "MBA", "MSc", "Other"];

/** Suggested groups per qualification — the field stays free text, these are datalist hints. */
const SUBJECT_GROUP_HINTS: Record<string, string[]> = {
  SSC: ["Science", "Humanities", "Business Studies", "Vocational", "General"],
  "O-Level": ["Science", "Humanities", "Business Studies"],
  HSC: ["Science", "Humanities", "Business Studies", "Vocational (BTEB)"],
  "A-Level": ["Science", "Humanities", "Business Studies", "Art & Design"],
  Alim: ["General (Alim)"],
  Fazil: ["Fazil"],
  Diploma: ["Civil Engineering", "Electrical Engineering", "Electronics", "Mechanical Engineering", "Computer Science", "Automobile", "Textile", "Chemical", "Agriculture", "Medical Technology", "Nursing", "Pharmacy", "Business Studies", "Accounting", "IT", "Design"],
  "Diploma in Engineering": ["Civil", "Electrical", "Electronics", "Mechanical", "Computer", "Automobile", "Construction", "Textile", "Chemical"],
  Bachelors: ["BA General", "BSc", "BSS", "BCom", "LLB", "B.Ed", "Design"],
  BBA: ["Accounting & Finance", "Marketing", "HR / Management", "Banking & Insurance", "Tourism & Hospitality"],
  BSc: ["Computer Science", "Software Engineering", "IT", "Data Science / AI", "Electrical & Electronic Engineering", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Chemical Engineering", "Industrial & Production", "Textile Engineering", "Aeronautical", "Mathematics / Statistics", "Physics", "Chemistry", "Biology / Botany / Zoology", "Biotechnology", "Pharmacy", "Nursing / Public Health", "Agriculture", "Environmental Science", "Architecture"],
  BEng: ["Civil", "Electrical & Electronic", "Mechanical", "Chemical", "Industrial & Production", "Textile", "Automobile", "Aeronautical"],
  LLB: ["Law"],
  MBBS: ["Medicine", "Dentistry"],
  Masters: ["MA", "MSS", "MSc", "MBA", "LLM"],
  MBA: ["Business Administration"],
  MSc: ["Computer Science / IT", "Engineering", "Natural Sciences", "Public Health"],
  Other: [],
};
const TEST_TYPES = ["IELTS", "PTE", "TOEFL", "Duolingo", "Other", "None"];
const DOCUMENT_SLOTS: { kind: string; label: string; optional?: boolean }[] = [
  { kind: "passport", label: "Passport", optional: true },
  { kind: "ssc_certificate", label: "SSC certificate" },
  { kind: "ssc_transcript", label: "SSC transcript" },
  { kind: "hsc_certificate", label: "HSC certificate" },
  { kind: "hsc_transcript", label: "HSC transcript" },
  { kind: "diploma_certificate", label: "Diploma certificate", optional: true },
  { kind: "diploma_transcript", label: "Diploma transcript", optional: true },
  { kind: "bachelor_certificate", label: "Bachelor's certificate", optional: true },
  { kind: "bachelor_transcript", label: "Bachelor's transcript", optional: true },
  { kind: "english_certificate", label: "English test certificate", optional: true },
  { kind: "cv", label: "CV / résumé", optional: true },
  { kind: "other", label: "Other supporting document", optional: true },
];

const STEPS = [
  "Personal",
  "Contact",
  "Academics",
  "English",
  "Preferences",
  "Documents",
  "Background",
  "Consent",
];

const emptyEducation = (qualification: string): EducationRow => ({
  qualification,
  institution: "",
  subjectGroup: "",
  passingYear: "",
  result: "",
  awardingBody: "",
});

type Submission = { reference: string; id: string };

export function ApplyForm({ universities, subjects }: { universities: Option[]; subjects: string[] }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);

  const [personal, setPersonal] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Bangladesh",
    currentCountry: "Bangladesh",
    address: "",
  });
  const [contact, setContact] = useState({ email: "", mobile: "", whatsapp: "", altContact: "" });
  const [education, setEducation] = useState<EducationRow[]>([emptyEducation("HSC"), emptyEducation("SSC")]);
  const [english, setEnglish] = useState<EnglishRow[]>([{ testType: "IELTS", score: "", testDate: "" }]);
  const [preferences, setPreferences] = useState<PreferenceRow[]>([
    { universitySlug: "", universityName: "", programmeName: "", level: "Bachelor", subjectArea: "" },
    { universitySlug: "", universityName: "", programmeName: "", level: "Bachelor", subjectArea: "" },
  ]);
  const [background, setBackground] = useState({ studyGap: "", visaRefusal: "", comments: "", referralSource: "" });
  const [consent, setConsent] = useState({ consentData: false, consentContact: false, consentStorage: false });
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  const canContinue = useMemo(() => {
    if (step === 0) return personal.fullName.trim().length > 2;
    if (step === 1) return /\S+@\S+\.\S+/.test(contact.email) && contact.mobile.replace(/\D/g, "").length >= 8;
    if (step === 2) return education.some((row) => row.institution.trim().length > 1);
    if (step === 4) return preferences.some((row) => row.universityName);
    if (step === 7) return consent.consentData && consent.consentContact && consent.consentStorage;
    return true;
  }, [step, personal, contact, education, preferences, consent]);

  const selectedUniversities = useMemo(() => {
    const set = new Set(universities.map((item) => item.slug));
    return set;
  }, [universities]);

  function setEducationRow(index: number, patch: Partial<EducationRow>) {
    setEducation((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function pickUniversity(index: number, slug: string) {
    const match = universities.find((item) => item.slug === slug);
    setPreferences((rows) =>
      rows.map((row, i) => (i === index ? { ...row, universitySlug: slug, universityName: match?.name ?? "" } : row))
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      ...personal,
      ...contact,
      education: education.filter((row) => row.institution.trim()),
      english,
      preferences: preferences
        .filter((row) => row.universityName)
        .map((row, index) => ({ ...row, isAlternative: index > 0 })),
      ...background,
      ...consent,
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        if (json.fieldErrors) setFieldErrors(json.fieldErrors);
        return;
      }

      const next = { reference: json.reference as string, id: json.id as string };

      // Documents are optional at enquiry stage: upload what was chosen, then confirm.
      const pending = DOCUMENT_SLOTS.filter((slot) => files[slot.kind]);
      if (pending.length) {
        for (const slot of pending) {
          const file = files[slot.kind];
          if (!file) continue;
          const form = new FormData();
          form.append("kind", slot.kind);
          form.append("file", file);
          const upload = await fetch(`/api/applications/${next.id}/documents`, { method: "POST", body: form });
          if (upload.ok) setUploaded((current) => ({ ...current, [slot.kind]: file.name }));
        }
      }

      setSubmission(next);
      setStep(8);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submission) {
    return <Confirmation submission={submission} personal={personal} contact={contact} education={education} english={english} preferences={preferences} uploaded={uploaded} />;
  }

  return (
    <div className="apply-card">
      <ol className="apply-steps" aria-label="Application progress">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}>
            <button type="button" onClick={() => index < step && setStep(index)} disabled={index > step}>
              <span className="apply-step-index">{index < step ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
              <span className="apply-step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="apply-body">
        {error && (
          <div className="apply-alert" role="alert">
            <CircleAlert size={17} /><p>{error}</p>
          </div>
        )}

        {step === 0 && (
          <StepShell title="Personal information" hint="Use the name exactly as it appears on the passport.">
            <Field label="Full name" required error={fieldErrors.fullName}>
              <input value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} autoComplete="name" placeholder="e.g. Tasnim Rahman" />
            </Field>
            <div className="apply-grid-2">
              <Field label="Date of birth" error={fieldErrors.dateOfBirth}>
                <input type="date" value={personal.dateOfBirth} onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })} />
              </Field>
              <Field label="Gender (optional)">
                <select value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </div>
            <div className="apply-grid-2">
              <Field label="Nationality" required>
                <input value={personal.nationality} onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })} />
              </Field>
              <Field label="Current country of residence">
                <input value={personal.currentCountry} onChange={(e) => setPersonal({ ...personal, currentCountry: e.target.value })} />
              </Field>
            </div>
            <Field label="Present address" hint="Street, area, city, postcode.">
              <textarea rows={3} value={personal.address} onChange={(e) => setPersonal({ ...personal, address: e.target.value })} />
            </Field>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Contact information" hint="We use this to reach you about your application — not for marketing.">
            <Field label="Email address" required error={fieldErrors.email}>
              <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" placeholder="you@example.com" />
            </Field>
            <div className="apply-grid-2">
              <Field label="Mobile number" required error={fieldErrors.mobile} hint="e.g. +880 1714 640238">
                <input type="tel" value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} autoComplete="tel" />
              </Field>
              <Field label="WhatsApp number" error={fieldErrors.whatsapp}>
                <input type="tel" value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} />
              </Field>
            </div>
            <Field label="Alternative contact number (optional)" error={fieldErrors.altContact}>
              <input type="tel" value={contact.altContact} onChange={(e) => setContact({ ...contact, altContact: e.target.value })} />
            </Field>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Academic background" hint="Add every qualification you want assessed. SSC and HSC are pre-filled for most applicants.">
            {fieldErrors.education && <p className="apply-field-error">{fieldErrors.education}</p>}
            {education.map((row, index) => (
              <div className="apply-subcard" key={index}>
                <div className="apply-subcard-head">
                  <strong>Qualification {index + 1}</strong>
                  {education.length > 1 && (
                    <button type="button" className="apply-remove" onClick={() => setEducation((rows) => rows.filter((_, i) => i !== index))}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
                <div className="apply-grid-2">
                  <Field label="Qualification" required error={fieldErrors[`education.${index}.qualification`]}>
                    <select value={row.qualification} onChange={(e) => setEducationRow(index, { qualification: e.target.value })}>
                      {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q === "Bachelors" ? "Bachelor's" : q === "Masters" ? "Master's" : q}</option>)}
                    </select>
                  </Field>
                  <Field label="Passing year" error={fieldErrors[`education.${index}.passingYear`]}>
                    <input inputMode="numeric" value={row.passingYear} onChange={(e) => setEducationRow(index, { passingYear: e.target.value })} placeholder="2024" />
                  </Field>
                </div>
                <Field label="Institution name" required error={fieldErrors[`education.${index}.institution`]}>
                  <input value={row.institution} onChange={(e) => setEducationRow(index, { institution: e.target.value })} placeholder="School or college name" />
                </Field>
                <div className="apply-grid-2">
                  <Field label="Group / subject" hint="Your stream, or the exact award — e.g. Science, Business Studies, BSc in Computer Science.">
                    <input
                      list={`groups-${index}`}
                      value={row.subjectGroup}
                      onChange={(e) => setEducationRow(index, { subjectGroup: e.target.value })}
                      placeholder="Science / Business Studies / BSc in Computer Science"
                    />
                    <datalist id={`groups-${index}`}>
                      {(SUBJECT_GROUP_HINTS[row.qualification] ?? []).map((hint) => <option key={hint} value={hint} />)}
                    </datalist>
                  </Field>
                  <Field label="GPA / CGPA / result">
                    <input value={row.result} onChange={(e) => setEducationRow(index, { result: e.target.value })} placeholder="4.75" />
                  </Field>
                </div>
                <Field label="Education board or awarding institution">
                  <input value={row.awardingBody} onChange={(e) => setEducationRow(index, { awardingBody: e.target.value })} placeholder="Dhaka Board" />
                </Field>
              </div>
            ))}
            <button type="button" className="apply-add" onClick={() => setEducation((rows) => [...rows, emptyEducation("Bachelors")])}>
              + Add another qualification
            </button>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="English language" hint="No test yet? That is fine — choose “No English test yet” and we will advise on the options.">
            {english.map((row, index) => (
              <div className="apply-subcard" key={index}>
                <div className="apply-subcard-head">
                  <strong>Test {index + 1}</strong>
                  {english.length > 1 && (
                    <button type="button" className="apply-remove" onClick={() => setEnglish((rows) => rows.filter((_, i) => i !== index))}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
                <div className="apply-grid-2">
                  <Field label="Test" required error={fieldErrors[`english.${index}.testType`]}>
                    <select
                      value={row.testType}
                      onChange={(e) => setEnglish((rows) => rows.map((r, i) => (i === index ? { ...r, testType: e.target.value } : r)))}
                    >
                      {TEST_TYPES.map((t) => <option key={t} value={t}>{t === "None" ? "No English test yet" : t}</option>)}
                    </select>
                  </Field>
                  {row.testType !== "None" && (
                    <Field label="Overall score" required error={fieldErrors[`english.${index}.score`]}>
                      <input value={row.score} onChange={(e) => setEnglish((rows) => rows.map((r, i) => (i === index ? { ...r, score: e.target.value } : r)))} placeholder="6.0" />
                    </Field>
                  )}
                </div>
                {row.testType !== "None" && (
                  <Field label="Test date">
                    <input type="date" value={row.testDate} onChange={(e) => setEnglish((rows) => rows.map((r, i) => (i === index ? { ...r, testDate: e.target.value } : r)))} />
                  </Field>
                )}
              </div>
            ))}
            <button type="button" className="apply-add" onClick={() => setEnglish((rows) => [...rows, { testType: "PTE", score: "", testDate: "" }])}>
              + Add another test
            </button>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Study preferences" hint="September 2027 intake. Pick your first choice, then an alternative.">
            {fieldErrors.preferences && <p className="apply-field-error">{fieldErrors.preferences}</p>}
            {preferences.map((row, index) => (
              <div className="apply-subcard" key={index}>
                <div className="apply-subcard-head">
                  <strong>{index === 0 ? "First choice" : index === 1 ? "Alternative choice" : `Choice ${index + 1}`}</strong>
                </div>
                <Field label="University" required={index === 0}>
                  <select value={row.universitySlug} onChange={(e) => pickUniversity(index, e.target.value)}>
                    <option value="">Select a university or college</option>
                    {universities.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}{item.category === "college" ? " (college)" : ""} — {item.city}
                      </option>
                    ))}
                    <option value="other">Not sure yet / other</option>
                  </select>
                </Field>
                {row.universitySlug === "other" && (
                  <Field label="University name">
                    <input
                      value={row.universityName}
                      onChange={(e) => setPreferences((rows) => rows.map((r, i) => (i === index ? { ...r, universityName: e.target.value } : r)))}
                      placeholder="Type the institution name"
                    />
                  </Field>
                )}
                <div className="apply-grid-2">
                  <Field label="Degree level">
                    <select value={row.level} onChange={(e) => setPreferences((rows) => rows.map((r, i) => (i === index ? { ...r, level: e.target.value } : r)))}>
                      <option value="Bachelor">Bachelor&apos;s</option>
                      <option value="Master">Master&apos;s</option>
                    </select>
                  </Field>
                  <Field label="Preferred subject area">
                    <select value={row.subjectArea} onChange={(e) => setPreferences((rows) => rows.map((r, i) => (i === index ? { ...r, subjectArea: e.target.value } : r)))}>
                      <option value="">Any / undecided</option>
                      {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Programme name (if known)">
                  <input
                    value={row.programmeName}
                    onChange={(e) => setPreferences((rows) => rows.map((r, i) => (i === index ? { ...r, programmeName: e.target.value } : r)))}
                    placeholder="e.g. Artificial Intelligence"
                  />
                </Field>
              </div>
            ))}
            <button
              type="button"
              className="apply-add"
              onClick={() => setPreferences((rows) => [...rows, { universitySlug: "", universityName: "", programmeName: "", level: "Bachelor", subjectArea: "" }])}
            >
              + Add another choice
            </button>
            <p className="apply-inline-note">Intake: <strong>September 2027</strong> · You can select more than one university.</p>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Documents" hint="Optional at this stage — PDF, JPG, PNG or WEBP, up to 10 MB each. Files are stored privately.">
            <div className="apply-docs">
              {DOCUMENT_SLOTS.map((slot) => (
                <label key={slot.kind} className={`apply-doc ${uploaded[slot.kind] ? "is-done" : ""}`}>
                  <span className="apply-doc-label">{slot.label}{slot.optional ? <em> optional</em> : null}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setFiles((current) => ({ ...current, [slot.kind]: file }));
                    }}
                  />
                  <span className="apply-doc-state">
                    {uploaded[slot.kind] ? <><Check size={13} /> {uploaded[slot.kind]}</> : files[slot.kind] ? <><FileUp size={13} /> {files[slot.kind]!.name}</> : "Choose file"}
                  </span>
                </label>
              ))}
            </div>
            <p className="apply-inline-note">
              Uploads happen after you submit, so nothing is lost if you change your mind. You can also send documents later on WhatsApp.
            </p>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="Additional information" hint="Anything a counsellor should know before the first call.">
            <Field label="Study gap" hint="Months or years between your last qualification and September 2027.">
              <select value={background.studyGap} onChange={(e) => setBackground({ ...background, studyGap: e.target.value })}>
                <option value="">No gap</option>
                <option value="Under 1 year">Under 1 year</option>
                <option value="1–2 years">1–2 years</option>
                <option value="3–5 years">3–5 years</option>
                <option value="More than 5 years">More than 5 years</option>
              </select>
            </Field>
            <Field label="Previous visa refusal (optional)" hint="Country, year and reason if you remember.">
              <textarea rows={2} value={background.visaRefusal} onChange={(e) => setBackground({ ...background, visaRefusal: e.target.value })} />
            </Field>
            <Field label="Additional comments">
              <textarea rows={4} value={background.comments} onChange={(e) => setBackground({ ...background, comments: e.target.value })} placeholder="Budget, scholarship interest, family situation, deadlines…" />
            </Field>
            <Field label="How did you hear about Go Abroad BD?">
              <select value={background.referralSource} onChange={(e) => setBackground({ ...background, referralSource: e.target.value })}>
                <option value="">Select one</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Friend or family">Friend or family</option>
                <option value="Existing student">Existing student</option>
                <option value="Google search">Google search</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell title="Consent and submission" hint="Please read each statement. All three are required to submit.">
            <label className={`apply-consent ${fieldErrors.consentData ? "has-error" : ""}`}>
              <input type="checkbox" checked={consent.consentData} onChange={(e) => setConsent({ ...consent, consentData: e.target.checked })} />
              <span><strong>Processing of personal information.</strong> I agree that Go Abroad BD may process the personal and academic information in this form to assess my eligibility and advise me on Lithuanian admission.</span>
            </label>
            <label className={`apply-consent ${fieldErrors.consentContact ? "has-error" : ""}`}>
              <input type="checkbox" checked={consent.consentContact} onChange={(e) => setConsent({ ...consent, consentContact: e.target.checked })} />
              <span><strong>Contact about my admission.</strong> I agree to be contacted by email, phone or WhatsApp about this enquiry and my application.</span>
            </label>
            <label className={`apply-consent ${fieldErrors.consentStorage ? "has-error" : ""}`}>
              <input type="checkbox" checked={consent.consentStorage} onChange={(e) => setConsent({ ...consent, consentStorage: e.target.checked })} />
              <span><strong>Secure storage of documents.</strong> I agree that any documents I upload are stored privately and accessed only by authorised Go Abroad BD staff, and I understand I can ask for them to be deleted.</span>
            </label>
            <div className="apply-summary">
              <strong>Before you submit</strong>
              <ul>
                <li>{personal.fullName || "Name not entered"}</li>
                <li>{contact.email || "Email not entered"} · {contact.mobile || "Mobile not entered"}</li>
                <li>{education.filter((row) => row.institution).length} qualification(s) · {english.find((row) => row.testType === "None") ? "no English test yet" : `${english.length} test result(s)`}</li>
                <li>{preferences.filter((row) => row.universityName).length} university preference(s) · September 2027</li>
              </ul>
              <p>Submitting does not commit you to anything and does not create an account. Read our <Link href="/privacy" target="_blank">privacy notice</Link>.</p>
            </div>
          </StepShell>
        )}

        <div className="apply-nav">
          <button type="button" className="button button-outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
            <ArrowLeft size={16} /> Back
          </button>
          {step < 7 ? (
            <button type="button" className="button button-navy" onClick={() => setStep((s) => Math.min(7, s + 1))} disabled={!canContinue}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="button button-gold" onClick={submit} disabled={!canContinue || busy}>
              {busy ? <><Loader2 size={16} className="spin" /> Submitting…</> : <>Submit application <BadgeCheck size={17} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="apply-shell">
      <h2>{title}</h2>
      <p className="apply-hint">{hint}</p>
      <div className="apply-fields">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`apply-field ${error ? "has-error" : ""}`}>
      <span className="apply-label">{label}{required ? <em> *</em> : null}</span>
      {children}
      {hint && !error && <span className="apply-field-hint">{hint}</span>}
      {error && <span className="apply-field-error">{error}</span>}
    </label>
  );
}

function Confirmation({
  submission,
  personal,
  contact,
  education,
  english,
  preferences,
  uploaded,
}: {
  submission: Submission;
  personal: { fullName: string; dateOfBirth: string; nationality: string; address: string; currentCountry: string; gender: string };
  contact: { email: string; mobile: string; whatsapp: string };
  education: EducationRow[];
  english: EnglishRow[];
  preferences: PreferenceRow[];
  uploaded: Record<string, string>;
}) {
  return (
    <div className="apply-card apply-confirm" id="confirmation">
      <div className="apply-confirm-head">
        <span className="apply-confirm-icon"><Check size={26} /></span>
        <div>
          <h2>Application received</h2>
          <p>Your reference number is below. Quote it whenever you contact us — it is the fastest way to find your file.</p>
        </div>
      </div>

      <div className="apply-reference">
        <span>YOUR REFERENCE</span>
        <strong>{submission.reference}</strong>
        <small>Submitted {new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })} · September 2027 intake</small>
      </div>

      <div className="apply-print-area">
        <h3><GraduationCap size={18} /> Submission summary</h3>
        <dl className="apply-recap">
          <div><dt>Name</dt><dd>{personal.fullName}</dd></div>
          <div><dt>Email</dt><dd>{contact.email}</dd></div>
          <div><dt>Mobile</dt><dd>{contact.mobile}</dd></div>
          {contact.whatsapp && <div><dt>WhatsApp</dt><dd>{contact.whatsapp}</dd></div>}
          {personal.dateOfBirth && <div><dt>Date of birth</dt><dd>{personal.dateOfBirth}</dd></div>}
          <div><dt>Nationality</dt><dd>{personal.nationality}</dd></div>
          <div><dt>Qualifications</dt><dd>{education.filter((row) => row.institution).map((row) => `${row.qualification} — ${row.institution}${row.result ? ` (${row.result})` : ""}`).join("; ")}</dd></div>
          <div><dt>English</dt><dd>{english.map((row) => (row.testType === "None" ? "No test yet" : `${row.testType} ${row.score}`)).join("; ")}</dd></div>
          <div><dt>Preferences</dt><dd>{preferences.filter((row) => row.universityName).map((row, i) => `${i === 0 ? "First" : "Alternative"}: ${row.universityName}${row.programmeName ? ` — ${row.programmeName}` : ""} (${row.level})`).join("; ")}</dd></div>
          <div><dt>Intake</dt><dd>September 2027</dd></div>
          {Object.keys(uploaded).length > 0 && <div><dt>Documents</dt><dd>{Object.values(uploaded).join(", ")}</dd></div>}
        </dl>
      </div>

      <div className="apply-confirm-actions">
        <button type="button" className="button button-navy" onClick={() => window.print()}>
          <Printer size={16} /> Print / save as PDF
        </button>
        <a className="button button-gold" href={`https://wa.me/8801714640238?text=${encodeURIComponent(`Hello Go Abroad BD, my application reference is ${submission.reference}.`)}`} target="_blank" rel="noreferrer">
          Message us on WhatsApp
        </a>
        <Link className="button button-outline" href="/">Back to the guide</Link>
      </div>

      <p className="apply-inline-note">
        Keep this reference. Our counsellors will contact you within two working days using the details above.
      </p>
    </div>
  );
}
