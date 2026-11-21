/**
 * Open student-profile model: qualifications, entrance assessments and the
 * passing-year gap derivation.
 *
 * The eligibility engine used to accept a fixed set of fields (sscGpa, hscGpa,
 * diplomaGrade/diplomaMax, bachelorGrade/bachelorMax). That only fitted the
 * SSC → HSC → Diploma → Bachelor pipeline. This module replaces those fixed
 * slots with an open list, so a student can record ANY qualification type and
 * ANY entrance assessment, while the research rules stay exactly as strict:
 *
 *  - a Bangladesh CGPA is never converted into a foreign percentage; a grade is
 *    only ever compared on its own scale, or as "fraction of the maximum",
 *  - an unknown answer downgrades a verdict, never upgrades it.
 */
import type { OmptVersion } from "./ompt";

/** Every qualification type the desk can record. */
export type QualificationType =
  | "ssc"
  | "hsc"
  | "alim"
  | "olevel"
  | "alevel"
  | "diploma"
  | "bachelor"
  | "master"
  | "other";

export type Qualification = {
  /** Stable id so React rows can be reordered/removed without index churn. */
  id: string;
  type: QualificationType;
  /** Free-text label, used when type is "other" or to name the exact award. */
  label?: string;
  /** Result on the qualification's own scale. Undefined still counts as "held". */
  grade?: number;
  /** Scale maximum (5 for SSC/HSC GPA, 4 for most CGPA systems). */
  maxGrade?: number;
  /** Year of passing — the only input the automatic gap needs. */
  passingYear?: number;
  institution?: string;
  /**
   * The stream / group / discipline the award was taken in — HSC Science, HSC
   * Business Studies, BSc in Computer Science, BBA, Diploma in Electrical
   * Engineering. Held as a code from `streamOptions` so the report can match a
   * published subject rule (e.g. "Business Studies stream") without guessing at
   * free text. `streamOther` carries a written-in value.
   */
  stream?: string;
  streamOther?: string;
  /** True when the qualification is complete. Defaults to true. */
  completed?: boolean;
};

export const qualificationLabels: Record<QualificationType, string> = {
  ssc: "SSC / O-Level",
  hsc: "HSC / A-Level",
  alim: "Alim / Fazil",
  olevel: "O-Level (separate certificate)",
  alevel: "A-Level (separate certificate)",
  diploma: "Diploma (e.g. Diploma-in-Engineering)",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  other: "Other qualification",
};

/** Default scale maximum per type, used to pre-fill the max field. */
export const defaultMaxGrade: Record<QualificationType, number> = {
  ssc: 5,
  hsc: 5,
  alim: 5,
  olevel: 9,
  alevel: 5,
  diploma: 4,
  bachelor: 4,
  master: 4,
  other: 100,
};

/**
 * Every stream / group / discipline the desk can record, grouped by the
 * qualification it belongs to. These are descriptors of what the student
 * studied — NOT a claim about what any institution accepts. The research rules
 * stay the only source for that: a stream here never upgrades a verdict.
 */
export type StreamOption = { value: string; label: string };

export const streamOptions: Record<QualificationType, StreamOption[]> = {
  ssc: [
    { value: "ssc-science", label: "Science" },
    { value: "ssc-humanities", label: "Humanities / Arts" },
    { value: "ssc-business", label: "Business Studies / Commerce" },
    { value: "ssc-vocational", label: "Vocational / Trade" },
    { value: "ssc-general", label: "General" },
  ],
  hsc: [
    { value: "hsc-science", label: "Science" },
    { value: "hsc-humanities", label: "Humanities / Arts" },
    { value: "hsc-business", label: "Business Studies / Commerce" },
    { value: "hsc-vocational", label: "Vocational (BTEB / BM)" },
    { value: "hsc-general", label: "General" },
  ],
  alim: [
    { value: "alim-general", label: "General (Alim)" },
    { value: "alim-fazil", label: "Fazil" },
  ],
  olevel: [
    { value: "olevel-science", label: "Science" },
    { value: "olevel-humanities", label: "Humanities" },
    { value: "olevel-business", label: "Business / Commerce" },
  ],
  alevel: [
    { value: "alevel-science", label: "Science" },
    { value: "alevel-humanities", label: "Humanities" },
    { value: "alevel-business", label: "Business / Commerce" },
    { value: "alevel-arts", label: "Art & Design" },
  ],
  diploma: [
    { value: "dip-civil", label: "Diploma in Civil Engineering" },
    { value: "dip-electrical", label: "Diploma in Electrical Engineering" },
    { value: "dip-electronics", label: "Diploma in Electronics Engineering" },
    { value: "dip-mechanical", label: "Diploma in Mechanical Engineering" },
    { value: "dip-computer", label: "Diploma in Computer Science / Technology" },
    { value: "dip-automobile", label: "Diploma in Automobile Engineering" },
    { value: "dip-construction", label: "Diploma in Construction" },
    { value: "dip-textile", label: "Diploma in Textile Engineering" },
    { value: "dip-chemical", label: "Diploma in Chemical Engineering" },
    { value: "dip-agri", label: "Diploma in Agriculture" },
    { value: "dip-fisheries", label: "Diploma in Fisheries" },
    { value: "dip-livestock", label: "Diploma in Livestock" },
    { value: "dip-forestry", label: "Diploma in Forestry" },
    { value: "dip-medical", label: "Diploma in Medical / Health Technology" },
    { value: "dip-nursing", label: "Diploma in Nursing / Midwifery" },
    { value: "dip-pharmacy", label: "Diploma in Pharmacy" },
    { value: "dip-business", label: "Diploma in Business Studies / Management" },
    { value: "dip-accounting", label: "Diploma in Accounting / Finance" },
    { value: "dip-marketing", label: "Diploma in Marketing" },
    { value: "dip-tourism", label: "Diploma in Tourism / Hospitality" },
    { value: "dip-it", label: "Diploma in Information Technology" },
    { value: "dip-design", label: "Diploma in Design / Multimedia" },
    { value: "dip-other", label: "Other diploma discipline" },
  ],
  bachelor: [
    { value: "ba-general", label: "BA — General / Humanities" },
    { value: "ba-english", label: "BA — English" },
    { value: "ba-bangla", label: "BA — Bangla" },
    { value: "ba-history", label: "BA — History / Civilisation" },
    { value: "ba-islamic", label: "BA — Islamic Studies" },
    { value: "ba-philosophy", label: "BA — Philosophy" },
    { value: "ba-political", label: "BA — Political Science" },
    { value: "ba-sociology", label: "BA — Sociology" },
    { value: "ba-economics", label: "BA — Economics" },
    { value: "ba-geography", label: "BA — Geography / Environment" },
    { value: "ba-psychology", label: "BA — Psychology" },
    { value: "ba-social-work", label: "BA — Social Work" },
    { value: "bss-other", label: "BSS — Other social science" },
    { value: "bba", label: "BBA — Business Administration" },
    { value: "bcom-accounting", label: "BCom / BBA — Accounting & Finance" },
    { value: "bcom-marketing", label: "BCom / BBA — Marketing" },
    { value: "bcom-hrm", label: "BCom / BBA — HR / Management" },
    { value: "bcom-banking", label: "BCom / BBA — Banking & Insurance" },
    { value: "bcom-tourism", label: "BCom / BBA — Tourism & Hospitality" },
    { value: "bsc-cs", label: "BSc — Computer Science" },
    { value: "bsc-se", label: "BSc — Software Engineering" },
    { value: "bsc-it", label: "BSc — Information Technology" },
    { value: "bsc-data", label: "BSc — Data Science / AI" },
    { value: "bsc-eee", label: "BSc — Electrical & Electronic Engineering" },
    { value: "bsc-electrical", label: "BSc — Electrical Engineering" },
    { value: "bsc-mechanical", label: "BSc — Mechanical Engineering" },
    { value: "bsc-civil", label: "BSc — Civil Engineering" },
    { value: "bsc-chemical", label: "BSc — Chemical Engineering" },
    { value: "bsc-industrial", label: "BSc — Industrial & Production Engineering" },
    { value: "bsc-textile", label: "BSc — Textile Engineering" },
    { value: "bsc-automobile", label: "BSc — Automobile / Automotive Engineering" },
    { value: "bsc-aeronautical", label: "BSc — Aeronautical / Aviation Engineering" },
    { value: "bsc-architecture", label: "BSc — Architecture" },
    { value: "bsc-maths", label: "BSc — Mathematics / Statistics" },
    { value: "bsc-physics", label: "BSc — Physics" },
    { value: "bsc-chemistry", label: "BSc — Chemistry" },
    { value: "bsc-biology", label: "BSc — Biology / Botany / Zoology" },
    { value: "bsc-biotech", label: "BSc — Biotechnology / Microbiology" },
    { value: "bsc-pharmacy", label: "BSc — Pharmacy" },
    { value: "bsc-nursing", label: "BSc — Nursing / Public Health" },
    { value: "bsc-agri", label: "BSc — Agriculture / Fisheries / Forestry" },
    { value: "bsc-environment", label: "BSc — Environmental Science" },
    { value: "llb", label: "LLB — Law" },
    { value: "b-ed", label: "B.Ed — Education" },
    { value: "b-arch", label: "B.Arch — Architecture (5-year)" },
    { value: "mbbs", label: "MBBS / BDS — Medicine / Dentistry" },
    { value: "b-design", label: "Bachelor — Design / Fine Arts / Fashion" },
    { value: "b-journalism", label: "Bachelor — Journalism / Media" },
    { value: "bachelor-other", label: "Other bachelor discipline" },
  ],
  master: [
    { value: "ma-english", label: "MA — English / Linguistics" },
    { value: "ma-other", label: "MA — Other humanities" },
    { value: "mss-other", label: "MSS — Social sciences" },
    { value: "mba", label: "MBA — Business Administration" },
    { value: "msc-cs", label: "MSc — Computer Science / IT" },
    { value: "msc-engineering", label: "MSc — Engineering" },
    { value: "msc-science", label: "MSc — Natural sciences" },
    { value: "llm", label: "LLM — Law" },
    { value: "mph", label: "MPH / MSc — Public Health" },
    { value: "master-other", label: "Other master's discipline" },
  ],
  other: [{ value: "other", label: "Other / not listed" }],
};

/** The label for a stored stream code, falling back to the written-in value. */
export function streamLabel(qualification: Pick<Qualification, "stream" | "streamOther" | "type">): string | undefined {
  if (qualification.stream === "other" && qualification.streamOther) return qualification.streamOther;
  if (!qualification.stream) return qualification.streamOther;
  const options = streamOptions[qualification.type] ?? [];
  const match = options.find((option) => option.value === qualification.stream);
  return match?.label ?? qualification.streamOther;
}

/**
 * Broad discipline a stream belongs to, used only to explain a match — never to
 * assert eligibility. Engineering and technology are separated because
 * institutions publish them as different admission groups.
 */
export type Discipline = "science" | "humanities" | "business" | "engineering" | "it" | "health" | "design" | "law" | "education" | "agriculture" | "other";

export const streamDiscipline: Record<string, Discipline> = {
  "alim-general": "humanities", "alim-fazil": "humanities",
  "ssc-science": "science", "ssc-humanities": "humanities", "ssc-business": "business", "ssc-vocational": "other", "ssc-general": "other",
  "hsc-science": "science", "hsc-humanities": "humanities", "hsc-business": "business", "hsc-vocational": "other", "hsc-general": "other",
  "olevel-science": "science", "olevel-humanities": "humanities", "olevel-business": "business",
  "alevel-science": "science", "alevel-humanities": "humanities", "alevel-business": "business", "alevel-arts": "design",
  "dip-civil": "engineering", "dip-electrical": "engineering", "dip-electronics": "engineering", "dip-mechanical": "engineering",
  "dip-computer": "it", "dip-automobile": "engineering", "dip-construction": "engineering", "dip-textile": "engineering",
  "dip-chemical": "engineering", "dip-agri": "agriculture", "dip-fisheries": "agriculture", "dip-livestock": "agriculture",
  "dip-forestry": "agriculture", "dip-medical": "health", "dip-nursing": "health", "dip-pharmacy": "health",
  "dip-business": "business", "dip-accounting": "business", "dip-marketing": "business", "dip-tourism": "business",
  "dip-it": "it", "dip-design": "design", "dip-other": "other",
  "ba-general": "humanities", "ba-english": "humanities", "ba-bangla": "humanities", "ba-history": "humanities",
  "ba-islamic": "humanities", "ba-philosophy": "humanities", "ba-political": "humanities", "ba-sociology": "humanities",
  "ba-economics": "business", "ba-geography": "science", "ba-psychology": "humanities", "ba-social-work": "humanities",
  "bss-other": "humanities", "bba": "business", "bcom-accounting": "business", "bcom-marketing": "business",
  "bcom-hrm": "business", "bcom-banking": "business", "bcom-tourism": "business",
  "bsc-cs": "it", "bsc-se": "it", "bsc-it": "it", "bsc-data": "it",
  "bsc-eee": "engineering", "bsc-electrical": "engineering", "bsc-mechanical": "engineering", "bsc-civil": "engineering",
  "bsc-chemical": "engineering", "bsc-industrial": "engineering", "bsc-textile": "engineering", "bsc-automobile": "engineering",
  "bsc-aeronautical": "engineering", "bsc-architecture": "engineering",
  "bsc-maths": "science", "bsc-physics": "science", "bsc-chemistry": "science", "bsc-biology": "science",
  "bsc-biotech": "science", "bsc-environment": "science", "bsc-agri": "agriculture",
  "bsc-pharmacy": "health", "bsc-nursing": "health", "mbbs": "health", "mph": "health",
  "llb": "law", "llm": "law", "b-ed": "education",
  "b-arch": "engineering", "b-design": "design", "b-journalism": "humanities",
  "ma-english": "humanities", "ma-other": "humanities", "mss-other": "humanities", "mba": "business",
  "msc-cs": "it", "msc-engineering": "engineering", "msc-science": "science",
  "bachelor-other": "other", "master-other": "other", "other": "other",
};

/** Discipline of a qualification's stream, if the student recorded one. */
export function disciplineOf(qualification: Pick<Qualification, "stream">): Discipline | undefined {
  return qualification.stream ? streamDiscipline[qualification.stream] : undefined;
}

/**
 * Any entrance assessment a student may hold. OMPT is first-class because it is
 * the only test the researched institutions name as an obligation; the rest are
 * recorded so the report can show what a student DOES have, without ever
 * treating one instrument as another.
 */
export type AssessmentType =
  | "ompt"
  | "institution-test"
  | "state-exam"
  | "sat"
  | "act"
  | "portfolio"
  | "interview"
  | "other";

export type StudentAssessment = {
  id: string;
  type: AssessmentType;
  /** Free-text name for "other" or to record which institution's own test. */
  name?: string;
  /** OMPT letter version, where the result is an OMPT certificate. */
  version?: OmptVersion;
  /** Score as a percentage of the maximum (0–100). */
  scorePercent?: number;
  year?: number;
};

export const assessmentLabels: Record<AssessmentType, string> = {
  ompt: "OMPT (Online Mathematics Placement Test)",
  "institution-test": "An institution's own entrance test",
  "state-exam": "State / board examination result",
  sat: "SAT",
  act: "ACT",
  portfolio: "Portfolio",
  interview: "Interview / motivation assessment",
  other: "Other assessment",
};

/** Assessments that are the student's own evidence but are not OMPT. */
export const nonOmptAssessments: AssessmentType[] = [
  "institution-test",
  "state-exam",
  "sat",
  "act",
  "portfolio",
  "interview",
  "other",
];

export const INTAKE_YEAR = 2027;
export const INTAKE_LABEL = "September 2027";

export function makeId(prefix = "row"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Latest year of passing across every completed qualification. */
export function latestPassingYear(qualifications: Qualification[]): number | undefined {
  const years = qualifications
    .filter((item) => item.completed !== false && typeof item.passingYear === "number")
    .map((item) => item.passingYear as number);
  return years.length ? Math.max(...years) : undefined;
}

/**
 * Study gap in years between the most recent qualification and the September
 * 2027 intake. Returns undefined when no passing year is recorded — the engine
 * then treats the gap as unknown instead of assuming zero.
 */
export function derivedGapYears(qualifications: Qualification[], intakeYear = INTAKE_YEAR): number | undefined {
  const latest = latestPassingYear(qualifications);
  if (latest === undefined) return undefined;
  return Math.max(0, intakeYear - latest);
}

/** The gap the report should use: an explicit override wins, else the derived one. */
export function effectiveGapYears(
  qualifications: Qualification[],
  override?: number,
  intakeYear = INTAKE_YEAR,
): { years?: number; source: "override" | "derived" | "none" } {
  if (typeof override === "number" && Number.isFinite(override)) return { years: override, source: "override" };
  const derived = derivedGapYears(qualifications, intakeYear);
  return derived === undefined ? { source: "none" } : { years: derived, source: "derived" };
}

/** All qualifications of one type. */
export function ofType(qualifications: Qualification[], type: QualificationType): Qualification[] {
  return qualifications.filter((item) => item.type === type);
}

export function hasType(qualifications: Qualification[], type: QualificationType): boolean {
  return ofType(qualifications, type).length > 0;
}

/**
 * Pick the qualification a percentage-of-maximum rule should be measured on,
 * in the same precedence the engine used before, but over the open list:
 * Master's → Bachelor; Diploma route → Diploma; else HSC → SSC → any other.
 */
export function ratioCandidate(
  qualifications: Qualification[],
  level: "Bachelor" | "Master",
  usesDiplomaRoute: boolean,
): Qualification | undefined {
  if (level === "Master") return ofType(qualifications, "bachelor")[0];
  if (usesDiplomaRoute) {
    const diploma = ofType(qualifications, "diploma")[0];
    if (diploma) return diploma;
  }
  const order: QualificationType[] = ["hsc", "alevel", "ssc", "olevel", "alim", "diploma", "bachelor", "master", "other"];
  for (const type of order) {
    const found = ofType(qualifications, type)[0];
    if (found) return found;
  }
  return undefined;
}

/** Display label for one qualification row. */
export function qualificationSummary(qualification: Qualification): string {
  const name = qualification.type === "other" ? qualification.label || "Other qualification" : qualificationLabels[qualification.type];
  const stream = streamLabel(qualification);
  const grade = typeof qualification.grade === "number"
    ? ` · ${qualification.grade}${typeof qualification.maxGrade === "number" ? `/${qualification.maxGrade}` : ""}`
    : "";
  const year = typeof qualification.passingYear === "number" ? ` · passed ${qualification.passingYear}` : "";
  return `${name}${stream ? ` (${stream})` : ""}${grade}${year}`;
}

export function assessmentSummary(assessment: StudentAssessment): string {
  const version = assessment.type === "ompt" && assessment.version ? `-${assessment.version}` : "";
  const score = typeof assessment.scorePercent === "number" ? ` · ${assessment.scorePercent}%` : "";
  const name = assessment.type === "other" || assessment.type === "institution-test"
    ? assessment.name || assessmentLabels[assessment.type]
    : assessmentLabels[assessment.type];
  return `${name}${version}${score}`;
}
