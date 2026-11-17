/**
 * Student eligibility assessment engine for the GO ABROAD BD admission desk.
 *
 * Research rules honoured here (same as CONTRIBUTING.md):
 * - Every threshold restates a sourced fact on the institution profile; where an
 *   institution publishes nothing, the rule says so and the verdict is UNVERIFIED.
 * - A Bangladesh CGPA is never converted into a foreign percentage. Percentage
 *   rules are compared as "fraction of the maximum possible grade" only where the
 *   institution words its rule that way (scale-free), or on the exact metric the
 *   institution publishes (e.g. HSC GPA on the 5.00 scale).
 * - Unknown answers downgrade a verdict; they never upgrade it.
 */
import { institutions } from "./research";
import type { DiplomaRoute, FactStatus, Institution } from "./research";
import { checkOmptResult, getOmpt, requiresOmpt } from "./ompt";
import type { OmptProfile, OmptStatus } from "./ompt";
import {
  assessmentSummary,
  effectiveGapYears,
  hasType,
  ofType,
  qualificationLabels,
  ratioCandidate,
} from "./student-profile";
import type { Qualification, StudentAssessment } from "./student-profile";

export type StudyLevel = "Bachelor" | "Master";
export type TestKey = "ielts" | "toefl" | "pte" | "duolingo" | "englishScore" | "other";

export type EnglishRule = {
  /** Published minimum scores per test. Absent tests are not published — never guessed. */
  tests?: Partial<Record<TestKey, number>>;
  /** CEFR level when the institution publishes only a CEFR band. */
  cefr?: "B2" | "C1";
  /** True when numeric test bands are an approximate CEFR mapping, not published by the institution. */
  provisionalMapping?: boolean;
  moi: "accepted" | "conditional" | "not-accepted" | "unconfirmed";
  note: string;
  status: FactStatus;
};

export type GradeRule = {
  /** hscGpa5 = exact HSC GPA on the 5.00 scale · ratio = fraction of maximum possible grade · bachelorCgpa4 = Honours CGPA on the 4.00 scale · none = nothing published. */
  metric: "hscGpa5" | "ratio" | "bachelorCgpa4" | "none";
  min?: number;
  note: string;
  status: FactStatus;
};

export type LevelRule = { grade: GradeRule; english: EnglishRule };

export type InstitutionRule = {
  slug: string;
  levels: StudyLevel[];
  bachelor?: LevelRule;
  master?: LevelRule;
  /** Extra published hurdles that apply to every level → CONDITIONALLY ELIGIBLE when present. */
  conditions: string[];
  /** Hurdles that apply only to Bachelor's or Master's applicants. */
  bachelorConditions?: string[];
  masterConditions?: string[];
  notes: string[];
  maxGapYears?: number;
};

/**
 * The profile the engine assesses.
 *
 * `qualifications` and `assessments` are the OPEN model: any qualification type
 * and any entrance assessment can be recorded, and the passing years drive the
 * automatic study-gap. The legacy flat fields (sscGpa, hscGpa, hasDiploma…)
 * are still accepted so an older caller — or a saved draft — keeps working;
 * `normaliseProfile` folds them into the open list before assessment.
 */
export type StudentProfile = {
  level: StudyLevel;
  nationality: string;
  educationCountry: string;
  /** Open qualification list — preferred over the legacy flat fields. */
  qualifications?: Qualification[];
  /** Any entrance assessments the student holds (OMPT, own tests, portfolios…). */
  assessments?: StudentAssessment[];
  /** Explicit study-gap override. When absent the engine derives it from passing years. */
  gapOverride?: number;
  /** Legacy flat fields — folded into `qualifications` when that list is absent. */
  sscGpa?: number;
  hscGpa?: number;
  hasDiploma: boolean;
  diplomaGrade?: number;
  diplomaMax?: number;
  hasBachelor: boolean;
  bachelorGrade?: number;
  bachelorMax?: number;
  subject: string;
  graduationYear?: number;
  gapYears?: number;
  englishTest: TestKey | "moi" | "none";
  englishScore?: number;
  city: "any" | "vilnius" | "kaunas" | "klaipeda" | "other";
  budgetEur?: number;
  institutionType: "any" | "university" | "college";
};

/**
 * The legacy flat fields, resolved into the open qualification list. Callers
 * that already build `qualifications` get them passed through untouched.
 */
export type ResolvedProfile = StudentProfile & {
  qualifications: Qualification[];
  assessments: StudentAssessment[];
};

export function normaliseProfile(profile: StudentProfile): ResolvedProfile {
  const qualifications: Qualification[] = [...(profile.qualifications ?? [])];
  const has = (type: Qualification["type"]) => qualifications.some((item) => item.type === type);
  const add = (item: Qualification) => {
    if (!has(item.type)) qualifications.push(item);
  };

  if (typeof profile.sscGpa === "number") {
    add({ id: "legacy-ssc", type: "ssc", grade: profile.sscGpa, maxGrade: 5 });
  }
  if (typeof profile.hscGpa === "number") {
    add({ id: "legacy-hsc", type: "hsc", grade: profile.hscGpa, maxGrade: 5 });
  }
  if (profile.hasDiploma) {
    add({ id: "legacy-diploma", type: "diploma", grade: profile.diplomaGrade, maxGrade: profile.diplomaMax });
  }
  if (profile.hasBachelor) {
    add({ id: "legacy-bachelor", type: "bachelor", grade: profile.bachelorGrade, maxGrade: profile.bachelorMax });
  }
  if (typeof profile.graduationYear === "number" && qualifications.every((item) => item.passingYear === undefined)) {
    // An explicit graduation year is the student's own statement about the latest pass.
    qualifications.push({ id: "legacy-year", type: "other", passingYear: profile.graduationYear });
  }
  return { ...profile, qualifications, assessments: profile.assessments ?? [] };
}

export type Verdict = "eligible" | "conditional" | "not-eligible" | "unverified";
export type CheckState = "pass" | "fail" | "unknown" | "pending";

export type Assessment = {
  institution: Institution;
  rule: InstitutionRule;
  verdict: Verdict;
  levelCheck: CheckState;
  routeCheck: CheckState;
  academicCheck: CheckState;
  englishCheck: CheckState;
  /** OMPT obligation for this institution, read from the single shared table. */
  ompt: OmptProfile;
  omptStatus: OmptStatus;
  /** Whether the student's recorded OMPT result satisfies the published rule. */
  omptCheck: CheckState;
  omptDetail: string;
  academicDetail: string;
  englishDetail: string;
  missing: string[];
  actions: string[];
  reasons: string[];
  notes: string[];
  matchedProgramme?: string;
  subjectMatch: boolean;
  cityMatch: boolean;
  budgetFit?: boolean;
  tuitionEur?: number;
  /** Study gap used for this run, and where it came from. */
  gapYears?: number;
  gapSource: "override" | "derived" | "none";
  /** True when the derived gap exceeds this institution's published guidance. */
  gapExceeded?: boolean;
  score: number;
};

export const verdictLabels: Record<Verdict, string> = {
  eligible: "Eligible",
  conditional: "Conditionally eligible",
  "not-eligible": "Not eligible",
  unverified: "Unverified",
};

/* ── Rules database ────────────────────────────────────────────────────
   Each rule restates the sourced profile facts. Sources are rendered from
   the institution's own facts at runtime, so the citation trail is always
   the official pages recorded in research.ts / colleges.ts. */

export const entryRules: Record<string, InstitutionRule> = {
  "vilnius-university": {
    slug: "vilnius-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "hscGpa5", min: 4.5, note: "HSC GPA at least 4.50 for academic programmes (CGPA at least 3.50 on VU's published measure for technical programmes). Alim does not grant access.", status: "published" },
      english: { tests: { ielts: 6, pte: 52, duolingo: 105 }, moi: "conditional", note: "Bachelor: IELTS 6.0 / PTE 52 / Duolingo 105. Waiver possible with acceptable English-medium evidence (not an informal letter). Programme pages may set higher scores.", status: "published" },
    },
    master: {
      grade: { metric: "bachelorCgpa4", min: 3, note: "Honours Bachelor's degree with final CGPA at least 3.00 (4.00 scale). A Pass degree does not grant Master's access.", status: "published" },
      english: { tests: { ielts: 6.5, pte: 59, duolingo: 120 }, moi: "conditional", note: "Master: IELTS 6.5 / PTE 59 / Duolingo 120. Same waiver principle as Bachelor level.", status: "published" },
    },
    conditions: [],
    notes: ["Programme-specific subject requirements apply.", "Maximum five-year gap since the most recent qualification (programme guidance) — enforced via the gap check.", "Predicted HSC results are not accepted for Bangladesh — final results only."],
    maxGapYears: 5,
  },
  "vilnius-tech": {
    slug: "vilnius-tech", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.6, note: "Minimum 60% CGPA on the published measure for Bangladesh HSC/SSC holders.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 70, pte: 48, duolingo: 100 }, moi: "conditional", note: "IELTS 5.5 (all bands 5.5) / TOEFL iBT 70 / PTE 48 all skills / Duolingo 100. Waived only for fully English-medium previous studies.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.6, note: "Relevant Bachelor's degree with at least 60% CGPA.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 70, pte: 48, duolingo: 100 }, moi: "conditional", note: "Same published test minimums as Bachelor level.", status: "published" },
    },
    conditions: [],
    notes: ["Study-gap limit is three years for Master's; relevant work evidence can support an exception.", "Architecture has a separate entrance test."],
    maxGapYears: 3,
  },
  "klaipeda-university": {
    slug: "klaipeda-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.7, note: "Bangladesh-specific minimum of 70% (general rule: above 60%), measured under KU's recognition process. The current and older KU pages differ on the Bangladesh formulation — reconfirm the evaluation with KU.", status: "conflicting" },
      english: { tests: { ielts: 5.5, toefl: 75, pte: 59, duolingo: 110 }, moi: "not-accepted", note: "IELTS >5.5 / TOEFL >75 / Duolingo >110 / PTE >59 (programme pages may also request CEFR B2). No general Bangladeshi MOI waiver.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.7, note: "Same Bangladesh 70% minimum for Master's; four-year Bachelor's with final thesis and internship required.", status: "conflicting" },
      english: { tests: { ielts: 5.5, toefl: 75, pte: 59, duolingo: 110 }, moi: "not-accepted", note: "Same published thresholds as Bachelor level.", status: "published" },
    },
    conditions: ["Only final (not provisional) diplomas are accepted"],
    bachelorConditions: ["Bangladesh Bachelor's: at least half a year of university transcript"],
    masterConditions: ["Master's: Bachelor's final thesis, prior internship and at least four years of previous study"],
    notes: ["KU issues official acceptance only from @ku.lt or DreamApply."],
  },
  "lithuanian-sports-university": {
    slug: "lithuanian-sports-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.65, note: "CGPA at least 65% of the transcript maximum, with no subject below 60%.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 46, pte: 50, duolingo: 90 }, moi: "not-accepted", note: "IELTS 5.5 / TOEFL 46–59 as listed / PTE 50 / Duolingo 90 / Cambridge 160 / LanguageCert B2. English-medium prior study does not waive the test — Duolingo 90 still required.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.65, note: "Same 65% / no-subject-below-60% rule on the relevant degree.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 46, pte: 50, duolingo: 90 }, moi: "not-accepted", note: "Same published test minimums as Bachelor level.", status: "published" },
    },
    conditions: ["LSU-organised knowledge and ability assessment (Bangladesh Bachelor's)", "Certificates and transcripts attested by Bangladesh MoFA and MoE"],
    notes: [],
  },
  "ism-university": {
    slug: "ism-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "hscGpa5", min: 4.5, note: "HSC GPA at least 4.50 with Mathematics or Higher Mathematics as an elective.", status: "published" },
      english: { tests: { ielts: 6, toefl: 60, pte: 52, duolingo: 115 }, moi: "conditional", note: "IELTS 6.0 / TOEFL 60 / PTE 52 / Duolingo 115 / ISM English test 55. English-medium studies may support a waiver at committee discretion only.", status: "published" },
    },
    master: {
      grade: { metric: "none", min: undefined, note: "Relevant undergraduate degree with programme-specific background (e.g. 18 ECTS in related subjects for some programmes); no single published CGPA cut-off.", status: "unconfirmed" },
      english: { tests: { ielts: 6.5, toefl: 79, pte: 59, duolingo: 125 }, moi: "conditional", note: "IELTS 6.5 (each ≥6.0) / TOEFL 79 / PTE 59 / Duolingo 125 / ISM English test 70. Waiver at committee discretion only.", status: "published" },
    },
    conditions: ["Motivation interview after document screening"],
    notes: [],
  },
  "vytautas-magnus-university": {
    slug: "vytautas-magnus-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.6, note: "At least 60% CGPA in the previous relevant diploma/transcript. Bangladesh document route: HSC + SSC with transcripts.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 87, pte: 59, duolingo: 100 }, moi: "accepted", note: "B2 evidence when previous studies were not in English: IELTS 5.5–6.5 / TOEFL iBT 87–109 / PTE 59 / Duolingo 100–125 (programme sets the point in range). Official MOI certificate accepted for English-medium studies.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.6, note: "Same 60% rule on the relevant Bachelor diploma/transcript.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 87, pte: 59, duolingo: 100 }, moi: "accepted", note: "Same B2 band as Bachelor level; official MOI certificate accepted.", status: "published" },
    },
    conditions: [],
    notes: [],
  },
  "lcc-international-university": {
    slug: "lcc-international-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "none", note: "BA applications use high-school results from the last three years; no Bangladesh-specific minimum HSC GPA is published.", status: "unconfirmed" },
      english: { tests: { ielts: 6, toefl: 61, pte: 53 }, moi: "not-accepted", note: "BA: IELTS 6.0 / TOEFL 61 / PTE 53 / LanguageCert IESOL B2. Duolingo is no longer accepted for regular admissions. A generic Bangladesh MOI is not an automatic waiver.", status: "published" },
    },
    master: {
      grade: { metric: "none", note: "Recognised Bachelor's degree required; MA TESOL-specific CGPA minimum not published.", status: "unconfirmed" },
      english: { tests: { ielts: 7, toefl: 100 }, moi: "not-accepted", note: "MA TESOL: IELTS 7.0 or TOEFL iBT 100.", status: "published" },
    },
    conditions: ["Interview"],
    bachelorConditions: ["LCC Skills and Knowledge Test (Bangladesh HSC route)"],
    notes: ["MA TESOL includes online coursework plus a short Lithuania residency."],
  },
  "vilnius-academy-of-arts": {
    slug: "vilnius-academy-of-arts", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "none", note: "Bangladesh SSC/HSC equivalencies and GPA cut-offs are not stated on the consulted VDA pages; portfolio and entrance exam decide.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 75 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "MA instructions request CEFR B2 / IELTS 5.5 / TOEFL 75. A BA-wide minimum and a Bangladesh MOI waiver are not established.", status: "unconfirmed" },
    },
    master: {
      grade: { metric: "none", note: "Relevant Bachelor diploma required; no published CGPA minimum.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 75 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "CEFR B2 / IELTS 5.5 / TOEFL 75 for the 2026/27 MA instructions. Many MA subjects are mainly Lithuanian-taught with English support.", status: "published" },
    },
    conditions: ["Portfolio (50% of the admission score)", "Online entrance exam/interview"],
    notes: ["A programme runs only if its minimum cohort of four is admitted."],
  },
  "kaunas-university-of-technology": {
    slug: "kaunas-university-of-technology", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.6, note: "Minimum average grade above 60% in each entry subject, plus a passed state or equivalent examination (or KTU's entrance examination).", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 75 }, cefr: "B2", moi: "accepted", note: "CEFR B2: IELTS 5.5 (each ≥5.5) / TOEFL 75 or equivalent (test within two years). English-medium studies stated on the certificate/transcript are accepted; otherwise a free online KTU English exam may be offered. PTE minimums are not published.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.6, note: "Relevant Bachelor's qualification with weighted GPA at least 60%.", status: "published" },
      english: { tests: { ielts: 6, toefl: 85 }, cefr: "C1", moi: "accepted", note: "CEFR C1: IELTS 6.0 (each ≥5.5) / TOEFL 85 or equivalent (within two years). Same MOI principle as Bachelor level.", status: "published" },
    },
    conditions: [],
    masterConditions: ["Motivation assessment (letter or interview) — mandatory for Master's applicants"],
    notes: ["KTU performs free academic recognition (up to one month) — it does not guarantee admission."],
  },
  "mykolas-romeris-university": {
    slug: "mykolas-romeris-university", levels: ["Bachelor", "Master"],
    bachelor: {
      grade: { metric: "ratio", min: 0.6, note: "Secondary education diploma with at least 60% of the maximum possible GPA (competitive ranking — the minimum does not guarantee admission).", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 100 }, cefr: "B2", moi: "unconfirmed", note: "B2 with published equivalences (ranges per programme): Duolingo 100–125, TOEFL 72–94, IELTS 5.5–6.5, PTE 59–75, Cambridge 162+. Free MRU online English test available. A Bangladesh MOI letter alone is not expressly confirmed.", status: "published" },
    },
    master: {
      grade: { metric: "ratio", min: 0.6, note: "Bachelor's degree of at least three years; some programmes require a diploma in a specific field.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 100 }, cefr: "B2", moi: "unconfirmed", note: "Same B2 equivalences as Bachelor level; free MRU English test available.", status: "published" },
    },
    conditions: ["Only humanities or science backgrounds are considered (Bangladesh table)"],
    notes: ["A gap of three or more years after high school may trigger additional knowledge tests.", "The motivational letter is screened with specialised software and must be written without AI assistance."],
    maxGapYears: 3,
  },

  /* Colleges */
  "kauno-kolegija": {
    slug: "kauno-kolegija", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "ratio", min: 0.5, note: "Notarised secondary certificate and transcript with at least a 50% GPA (SKVC country rules apply). A competitive score ≥3.2 is needed for non-state-funded places.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 75, pte: 59, englishScore: 400 }, moi: "not-accepted", note: "IELTS 5.5 / TOEFL 75 / PTE 59 / EnglishScore 400 (CEFR B2). MOI letters are expressly not accepted; the college's own €45 test is an alternative.", status: "published" },
    },
    conditions: ["Key competence test (score ≥3)", "Motivation interview on many programmes"],
    notes: [],
  },
  "lithuania-business-college": {
    slug: "lithuania-business-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "A secondary education diploma (or equivalent, apostilled) is required; no Bangladesh-specific GPA minimum is published.", status: "unconfirmed" },
      english: { tests: {}, moi: "unconfirmed", note: "An English proficiency certificate is required and English is verified at enrolment; no exact score band and no Bangladesh MOI rule are published.", status: "unconfirmed" },
    },
    conditions: [],
    notes: ["First-year tuition is paid before visa/TRP mediation; these payments are not refunded."],
  },
  "utenos-kolegija": {
    slug: "utenos-kolegija", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "A recognised secondary school graduation certificate is required; no Bangladesh-specific HSC GPA threshold is published.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "Older admission rules mention B1/B2-level English evidence; a current accepted-test list and minimum score are not published. Numeric bands shown are an approximate CEFR mapping.", status: "earlier" },
    },
    conditions: [],
    notes: ["Confirm full-time programme availability — part-time study is EU/EEA-only."],
  },
  "smk-college": {
    slug: "smk-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "ratio", min: 0.5, note: "Secondary school diploma, school leaving certificate or college diploma with a minimum overall score of 50% (qualification evaluation through SKVC).", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 69, pte: 59, duolingo: 110 }, moi: "unconfirmed", note: "IELTS 5.5 / TOEFL 69 / PTE 59 / Duolingo 110 / LanguageCert IESOL B2 / FCE. SMK's own online English test costs €50. No explicit Bangladesh MOI statement.", status: "published" },
    },
    conditions: ["Motivation interview"],
    notes: ["Non-EU students must cover a full year of tuition before arrival."],
  },
  "vilnius-business-college": {
    slug: "vilnius-business-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Secondary education or high school diploma with transcripts; no Bangladesh-specific minimum grade is published.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "CEFR B2 required on programme pages. A preparatory English programme is offered below B2. Bangladesh MOI acceptance is unconfirmed. Numeric bands shown are an approximate CEFR mapping.", status: "published" },
    },
    conditions: ["Admission interview with a VBC officer", "Affidavit of support and bank evidence (~€7,000/year)"],
    notes: [],
  },
  "vilnius-college-of-design": {
    slug: "vilnius-college-of-design", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "The college evaluates applications individually and generally recommends a minimum GPA of about 3.5 — a recommendation, not a fixed cut-off.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "B2 English via IELTS/TOEFL/PTE/Duolingo or equivalent; no published minimum band and no Bangladesh MOI rule. Numeric bands shown are an approximate CEFR mapping.", status: "published" },
    },
    conditions: ["Portfolio (50% of the entrance examination)", "Motivational interview"],
    notes: ["Programmes run only if a sufficient student group forms."],
  },
  "vilniaus-kolegija": {
    slug: "vilniaus-kolegija", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Qualification documents (certificate + supplement) are evaluated; no VIKO-published minimum grade or Bangladesh-specific rule.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72 }, cefr: "B2", moi: "unconfirmed", note: "CEFR B2 / IELTS 5.5–6.0 / TOEFL 72–94 (results valid two years). VIKO's free online English test is an alternative; a B1 result waives IELTS/TOEFL.", status: "published" },
    },
    conditions: [],
    notes: ["One intake per year — a missed deadline means waiting a full academic year."],
  },
  "klaipeda-state-college": {
    slug: "klaipeda-state-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Documents are submitted for academic verification; no Bangladesh-specific grade threshold is published.", status: "unconfirmed" },
      english: { tests: {}, moi: "unconfirmed", note: "No specific accepted-test list or minimum English score is published on the consulted pages.", status: "unconfirmed" },
    },
    conditions: ["Statement about any study gap of more than three years", "Apostilled/notarised translations presented on arrival"],
    notes: [],
  },
  "panevezys-college": {
    slug: "panevezys-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Applicants need an education level appropriate to the chosen programme (academic recognition carried out by the college); no Bangladesh-specific GPA minimum.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "One page requires a valid B2 certificate, another states B1 minimum for English-taught study — the pages conflict. Numeric bands shown are an approximate CEFR mapping; confirm with admissions.", status: "conflicting" },
    },
    conditions: ["Email the admissions coordinator before paying anything"],
    notes: ["English groups may be combined or retimed if few students enrol."],
  },
  "alytus-college": {
    slug: "alytus-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "ratio", min: 0.5, note: "Kauno kolegija rules apply through the Alytus Faculty: at least 50% GPA (SKVC country rules), competitive score ≥3.2 for non-state-funded places.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 75, pte: 59, englishScore: 400 }, moi: "not-accepted", note: "Kauno kolegija's English rules apply: IELTS 5.5 / TOEFL 75 / PTE 59 / EnglishScore 400; MOI letters expressly not accepted (own €45 test available).", status: "published" },
    },
    conditions: ["Key competence test (score ≥3)", "Motivation interview", "Apply through Kauno kolegija — no separate Alytus application"],
    notes: [],
  },
  "siauliai-state-college": {
    slug: "siauliai-state-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Senior/higher secondary education with internal academic recognition; no Bangladesh-specific grade threshold is published.", status: "unconfirmed" },
      english: { tests: {}, moi: "unconfirmed", note: "No published English requirement, accepted tests or minimum scores on the consulted page.", status: "unconfirmed" },
    },
    conditions: ["Confirm the September 2027 timetable and fee by email before applying"],
    notes: [],
  },
  "st-ignatius-of-loyola-college": {
    slug: "st-ignatius-of-loyola-college", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "ratio", min: 0.46, note: "Average score across high school graduation exams of at least 46%.", status: "published" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "B2 English with a certificate (valid within two years) or the college's free 90-minute EFSET test. Bangladesh MOI acceptance unconfirmed. Numeric bands shown are an approximate CEFR mapping.", status: "published" },
    },
    conditions: ["Motivational interview", "Legalised police clearance certificate", "Bank statement showing sufficient resources", "Only one programme is currently open to international students"],
    notes: ["Studies combine online and in-person teaching."],
  },
  "kolpingo-kolegija": {
    slug: "kolpingo-kolegija", levels: ["Bachelor"],
    bachelor: {
      grade: { metric: "none", note: "Legalised certificate/diploma and transcript per country-specific requirements; no published grade threshold.", status: "unconfirmed" },
      english: { tests: { ielts: 5.5, toefl: 72, pte: 59, duolingo: 105 }, cefr: "B2", provisionalMapping: true, moi: "unconfirmed", note: "An official B2 English document is required (native speakers exempt); no accepted-test list is published. Numeric bands shown are an approximate CEFR mapping.", status: "published" },
    },
    conditions: ["Legalised affidavit of support", "Legalised bank statement"],
    notes: ["No college accommodation — arrange housing independently."],
  },
  "lithuanian-centre-for-social-sciences": {
    slug: "lithuanian-centre-for-social-sciences", levels: [],
    conditions: [],
    notes: ["LCSS is a research centre with doctoral cooperation only (VILNIUS TECH, KTU, VMU) — apply to the partner university for Bachelor's or Master's study."],
  },
};

/* ── Engine ─────────────────────────────────────────────────────────── */

const ratio = (grade?: number, max?: number) =>
  typeof grade === "number" && typeof max === "number" && max > 0 ? grade / max : undefined;

const tuitionOf = (institution: Institution): number | undefined => {
  for (const programme of institution.featuredProgrammes) {
    const match = programme.tuition.match(/€\s*(\d[\d.,]*)/);
    if (match) return Number(match[1].replace(/[.,]/g, (m) => (m === "," ? "" : m)));
  }
  const fallback = institution.feeSummary.match(/€\s*(\d[\d.,]*)/);
  return fallback ? Number(fallback[1].replace(/[.,]/g, (m) => (m === "," ? "" : m))) : undefined;
};

function subjectMatchFor(institution: Institution, subject: string): string | undefined {
  const needle = subject.toLowerCase().trim();
  if (!needle) return undefined;
  const words = needle.split(/\s+/).filter((word) => word.length > 3);
  const pool = [
    ...institution.featuredProgrammes.map((programme) => programme.name),
    ...institution.bestFor,
  ];
  for (const entry of pool) {
    const lower = entry.toLowerCase();
    if (lower.includes(needle) || words.some((word) => lower.includes(word))) return entry;
  }
  return undefined;
}

export function assessProfile(input: StudentProfile): Assessment[] {
  const profile = normaliseProfile(input);
  const gap = effectiveGapYears(profile.qualifications, profile.gapOverride ?? profile.gapYears);
  const omptResults = profile.assessments.filter((item) => item.type === "ompt");
  const otherAssessments = profile.assessments.filter((item) => item.type !== "ompt");

  return institutions.map((institution) => {
    const rule = entryRules[institution.slug];
    const ompt = getOmpt(institution.slug);
    const missing: string[] = [];
    const actions: string[] = [];
    const reasons: string[] = [];
    const notes: string[] = [...(rule?.notes ?? [])];
    let levelCheck: CheckState = "pass";
    let routeCheck: CheckState = "pass";
    let academicCheck: CheckState = "pass";
    let englishCheck: CheckState = "pass";
    let omptCheck: CheckState = "pass";
    let omptDetail = ompt.note;
    let academicDetail = "";
    let englishDetail = "";
    let gapExceeded: boolean | undefined;
    let hardFail = false;
    let unknown = false;

    if (!rule || !rule.levels.includes(profile.level)) {
      const assessment: Assessment = {
        institution, rule: rule ?? { slug: institution.slug, levels: [], conditions: [], notes: [] },
        verdict: "not-eligible", levelCheck: "fail", routeCheck: "pass", academicCheck: "unknown", englishCheck: "unknown",
        ompt, omptStatus: ompt.status, omptCheck: "unknown", omptDetail,
        academicDetail: "", englishDetail: "", missing: [], actions: [], reasons: [], notes,
        subjectMatch: false, cityMatch: false, score: 0,
        gapYears: gap.years, gapSource: gap.source,
      };
      assessment.reasons.push(rule ? `Does not offer ${profile.level} level programmes.` : "No verified entry rules in the research database.");
      if (!rule?.levels.length) assessment.actions.push("Redirect the application to a partner university (see the profile).");
      return assessment;
    }

    // Diploma route (Bachelor level only). The open list decides whether the
    // student is presenting a Diploma, and only when it is the best Bachelor
    // qualification (no HSC/A-Level recorded).
    const usesDiploma =
      profile.level === "Bachelor" &&
      hasType(profile.qualifications, "diploma") &&
      !hasType(profile.qualifications, "hsc") &&
      !hasType(profile.qualifications, "alevel");
    if (usesDiploma) {
      const route: DiplomaRoute = institution.diplomaCgpa.diploma;
      if (route === "excluded") {
        routeCheck = "fail";
        hardFail = true;
        reasons.push(`Diploma background excluded: ${institution.diplomaCgpa.diplomaSummary}.`);
      } else if (route === "accepted") {
        routeCheck = "pass";
        notes.push(`Diploma background accepted — ${institution.diplomaCgpa.diplomaSummary}.`);
      } else if (route === "conditional") {
        routeCheck = "pending";
        missing.push("Diploma-route conditions");
        actions.push(institution.diplomaCgpa.diplomaSummary);
      } else if (route === "na") {
        routeCheck = "fail";
        hardFail = true;
        reasons.push("No degree intake for this route.");
      } else {
        routeCheck = "unknown";
        unknown = true;
        actions.push("Request a written recognition decision for the Diploma background before applying.");
      }
    }

    // Academic
    const levelRule = (profile.level === "Master" ? rule.master : rule.bachelor) ?? rule.bachelor;
    if (!levelRule) {
      academicCheck = "unknown";
      unknown = true;
    } else {
      const grade = levelRule.grade;
      academicDetail = grade.note;
      if (grade.status === "unconfirmed" || grade.metric === "none") {
        academicCheck = "unknown";
        unknown = true;
        actions.push("Ask admissions for a country-specific grade evaluation (no published minimum).");
      } else {
        let value: number | undefined;
        let label = "";
        if (grade.metric === "hscGpa5") {
          // The institution publishes the HSC GPA on the 5.00 scale itself.
          // A-Level/other 5.00-scale awards are the same scale; A-Level on a
          // letter or UCAS scale is never converted, so it is left unknown.
          const hsc = ofType(profile.qualifications, "hsc")[0];
          const alevel = ofType(profile.qualifications, "alevel")[0];
          const candidate = hsc ?? (alevel && (alevel.maxGrade ?? 5) === 5 ? alevel : undefined);
          value = candidate?.grade;
          label = hsc ? "HSC GPA (5.00 scale)" : "A-Level GPA (5.00 scale)";
          if (candidate === undefined) {
            academicCheck = "pending";
            missing.push("HSC GPA result (5.00 scale)");
          }
        } else if (grade.metric === "bachelorCgpa4") {
          const bachelor = ofType(profile.qualifications, "bachelor")[0];
          if (bachelor && bachelor.grade !== undefined) {
            const isFourScale = bachelor.maxGrade !== undefined && bachelor.maxGrade >= 3.5 && bachelor.maxGrade <= 4.5;
            if (isFourScale) {
              value = bachelor.grade;
              label = "Bachelor CGPA (4.00 scale)";
            } else {
              academicCheck = "unknown";
              unknown = true;
              actions.push("Provide the Bachelor CGPA on the 4.00 scale or ask VU for an official conversion (no automatic conversion applied).");
            }
          } else {
            academicCheck = "pending";
            missing.push("Honours Bachelor's degree with CGPA (4.00 scale)");
          }
        } else {
          // ratio — fraction of the maximum possible grade on the student's own scale.
          // Any qualification type can supply this: the engine only ever divides
          // the student's own result by the student's own scale maximum.
          const candidate = ratioCandidate(profile.qualifications, profile.level, usesDiploma);
          if (!candidate) {
            academicCheck = "pending";
            missing.push(profile.level === "Master" ? "Bachelor's degree result" : "Secondary/Diploma qualification result");
          } else if (candidate.grade === undefined) {
            academicCheck = "pending";
            missing.push(`${qualificationLabels[candidate.type]} result`);
          } else {
            value = ratio(candidate.grade, candidate.maxGrade);
            label = `${qualificationLabels[candidate.type]} result`;
            if (value === undefined) {
              // Grade recorded without a scale maximum — needed for a % rule.
              academicCheck = "pending";
              missing.push(`Scale maximum for the ${qualificationLabels[candidate.type]} result`);
            }
          }
        }
        if (value !== undefined && grade.min !== undefined) {
          const passes = value + 1e-9 >= grade.min;
          if (passes) {
            academicCheck = "pass";
          } else if (grade.status === "published") {
            academicCheck = "fail";
            hardFail = true;
            reasons.push(`${label} below the published minimum (needs ${grade.metric === "hscGpa5" ? `HSC GPA ${grade.min}` : `${Math.round(grade.min * 100)}% of the maximum grade`}).`);
          } else {
            academicCheck = "unknown";
            unknown = true;
            actions.push(`Grades may be below the stated figure — but the rule is not officially confirmed (${grade.note})`);
          }
        } else if (academicCheck === "pass" && value === undefined) {
          academicCheck = "pending";
        }
      }
    }

    // English
    const englishRule = levelRule?.english;
    if (!englishRule || englishRule.status === "unconfirmed") {
      englishCheck = "unknown";
      englishDetail = englishRule?.note ?? "No published English requirement in the research database.";
      unknown = true;
      if (englishRule) actions.push("Ask admissions which English tests and minimum scores are accepted.");
    } else {
      englishDetail = englishRule.note;
      const test = profile.englishTest;
      if (test === "none") {
        englishCheck = "pending";
        missing.push("English language test (or qualifying MOI evidence)");
        actions.push("Take IELTS/TOEFL/PTE/Duolingo at the published level (check which tests the institution accepts).");
      } else if (test === "moi") {
        if (englishRule.moi === "accepted") {
          englishCheck = "pass";
          notes.push("MOI route: provide an official Medium of Instruction certificate from the school/university.");
        } else if (englishRule.moi === "conditional") {
          englishCheck = "pending";
          missing.push("Official English-medium study evidence (MOI waiver is conditional)");
          actions.push("Request an official MOI/English-medium confirmation — acceptance is at the institution's discretion.");
        } else if (englishRule.moi === "not-accepted") {
          englishCheck = "pending";
          missing.push("English test — MOI is not accepted at this institution");
          actions.push("Book an accepted English test (MOI letters are expressly not accepted here).");
        } else {
          englishCheck = "unknown";
          unknown = true;
          actions.push("Ask admissions whether a Bangladesh MOI letter is accepted before relying on it.");
        }
      } else {
        const minimum = englishRule.tests?.[test];
        if (minimum === undefined) {
          englishCheck = "unknown";
          unknown = true;
          actions.push(`This institution does not publish a ${test} minimum — confirm the test is accepted, or take a listed alternative.`);
        } else if (profile.englishScore !== undefined && profile.englishScore >= minimum) {
          englishCheck = "pass";
        } else if (profile.englishScore !== undefined) {
          englishCheck = "pending";
          missing.push(`English score below the published minimum (${test} ${minimum}${englishRule.provisionalMapping ? " approx. for CEFR " + (englishRule.cefr ?? "B2") : ""})`);
          actions.push("Retake the English test or use an accepted alternative.");
        } else {
          englishCheck = "pending";
          missing.push("English test score");
        }
      }
    }

    // OMPT — read from the single shared table (src/lib/ompt.ts), and checked
    // against any OMPT result the student has actually recorded.
    omptDetail = ompt.note;
    if (requiresOmpt(ompt)) {
      if (omptResults.length === 0) {
        omptCheck = "pending";
        missing.push(
          ompt.status === "required"
            ? "OMPT result (published requirement for this institution)"
            : "OMPT check for the chosen programme (the version and score differ per programme)",
        );
        actions.push(ompt.note);
      } else {
        const best = omptResults.reduce((chosen, current) =>
          (current.scorePercent ?? -1) > (chosen.scorePercent ?? -1) ? current : chosen,
        );
        const result = checkOmptResult(ompt, best);
        if (result.ok) {
          omptCheck = "pass";
          notes.push(`OMPT evidence recorded: ${assessmentSummary(best)}.`);
        } else {
          omptCheck = "pending";
          missing.push(`OMPT result does not yet meet the published rule (${result.reasons.join("; ")})`);
          actions.push("Book another OMPT attempt (at most two attempts where the institution says so) or confirm the exact programme requirement.");
        }
      }
    } else if (ompt.status === "unconfirmed") {
      // Silence is not an exemption, so it never counts as a pass — it is
      // recorded as unknown and the student is told the published alternative.
      omptCheck = "unknown";
      unknown = true;
      notes.push(ompt.note);
      if (ompt.alternative) {
        actions.push(`This institution's published assessment is ${ompt.alternative} — not an OMPT certificate.`);
      }
    } else if (ompt.status === "not-applicable") {
      omptCheck = "unknown";
      notes.push(ompt.note);
    }

    // Any other assessment the student holds is recorded, never substituted
    // for an OMPT obligation the institution actually publishes.
    for (const item of otherAssessments) {
      notes.push(`Assessment on file: ${assessmentSummary(item)} — this is not an OMPT certificate unless the institution says it is.`);
    }

    for (const condition of [
      ...rule.conditions,
      ...(profile.level === "Master" ? rule.masterConditions ?? [] : rule.bachelorConditions ?? []),
    ]) {
      missing.push(condition);
    }

    // Study gap — derived automatically from the latest passing year unless the
    // student overrode it. An unknown gap never counts as a pass or a fail.
    if (rule.maxGapYears !== undefined) {
      if (gap.years === undefined) {
        notes.push(`This institution publishes a study-gap limit of ${rule.maxGapYears} years — record your latest passing year so it can be checked.`);
      } else if (gap.years > rule.maxGapYears) {
        gapExceeded = true;
        missing.push(`Study gap of ${gap.years} years exceeds the published guidance (${rule.maxGapYears})`);
        actions.push("Prepare work/study evidence covering the gap.");
      }
    }

    // Verdict
    let verdict: Verdict;
    if (hardFail) verdict = "not-eligible";
    else if (unknown) verdict = "unverified";
    else if (missing.length) verdict = "conditional";
    else verdict = "eligible";

    const matchedProgramme = subjectMatchFor(institution, profile.subject);
    const cityMatch = profile.city !== "any" && institution.city.toLowerCase().includes(profile.city === "other" ? "\u0000" : profile.city);
    const tuitionEur = tuitionOf(institution);
    const budgetFit = profile.budgetEur && tuitionEur ? tuitionEur <= profile.budgetEur : undefined;

    const score =
      (verdict === "eligible" ? 40 : verdict === "conditional" ? 26 : verdict === "unverified" ? 12 : 0) +
      (academicCheck === "pass" ? 12 : 0) +
      (englishCheck === "pass" ? 10 : 0) +
      (routeCheck === "pass" ? 5 : 0) +
      (omptCheck === "pass" && requiresOmpt(ompt) ? 4 : 0) +
      (matchedProgramme ? 8 : 0) +
      (budgetFit ? 6 : budgetFit === false ? -4 : 0) +
      (cityMatch ? 3 : 0) +
      (profile.institutionType === "any" || (profile.institutionType === "university") === (institution.category === "university") ? 2 : -2);

    return {
      institution, rule, verdict, levelCheck, routeCheck, academicCheck, englishCheck,
      ompt, omptStatus: ompt.status, omptCheck, omptDetail,
      academicDetail, englishDetail, missing, actions, reasons, notes,
      matchedProgramme, subjectMatch: Boolean(matchedProgramme), cityMatch, budgetFit, tuitionEur,
      gapYears: gap.years, gapSource: gap.source, gapExceeded, score,
    };
  });
}

export function bestMatches(rows: Assessment[], limit = 5): Assessment[] {
  return [...rows]
    .filter((row) => row.verdict !== "not-eligible")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function defaultDocuments(rows: Assessment[]): string[] {
  const documents = [
    "Passport (valid for the full study period)",
    "SSC and HSC certificates and transcripts (all pages)",
    "English language certificate (or an official Medium of Instruction letter where accepted)",
    "Passport photographs and translated/notarised document copies",
  ];
  const joined = rows.map((row) => row.missing.join(" | ")).join(" | ").toLowerCase();
  if (joined.includes("ompt")) documents.push("OMPT certificate (book early — results take several working days)");
  if (joined.includes("portfolio")) documents.push("Portfolio (PDF + accessible online links)");
  if (joined.includes("police")) documents.push("Legalised police clearance certificate");
  if (joined.includes("bank") || joined.includes("affidavit")) documents.push("Bank statement / affidavit of support (legalised where required)");
  if (joined.includes("attested")) documents.push("Certificates attested by Bangladesh MoFA and MoE (double legalisation)");
  if (joined.includes("university transcript")) documents.push("University transcript (half-year or more) where the institution requires it");
  return documents;
}
