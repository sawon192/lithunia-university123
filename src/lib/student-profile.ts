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
  const grade = typeof qualification.grade === "number"
    ? ` · ${qualification.grade}${typeof qualification.maxGrade === "number" ? `/${qualification.maxGrade}` : ""}`
    : "";
  const year = typeof qualification.passingYear === "number" ? ` · passed ${qualification.passingYear}` : "";
  return `${name}${grade}${year}`;
}

export function assessmentSummary(assessment: StudentAssessment): string {
  const version = assessment.type === "ompt" && assessment.version ? `-${assessment.version}` : "";
  const score = typeof assessment.scorePercent === "number" ? ` · ${assessment.scorePercent}%` : "";
  const name = assessment.type === "other" || assessment.type === "institution-test"
    ? assessment.name || assessmentLabels[assessment.type]
    : assessmentLabels[assessment.type];
  return `${name}${version}${score}`;
}
