/**
 * OMPT (Online Mathematics Placement Test) requirement classification.
 * ---------------------------------------------------------------------------
 * ONE record per institution, keyed by slug. The directory filter, the cards,
 * the profile page and the eligibility engine all read from this single table,
 * so a count shown in the UI can never disagree with the verdict in a report.
 *
 * Research rules honoured here (CONTRIBUTING.md):
 *  - `required` / `programme` is only used where the institution publishes an
 *    OMPT obligation. Silence is NEVER an exemption: an institution whose pages
 *    do not mention OMPT is `unconfirmed`, not `none`.
 *  - `minimumPercent` and `versions` are only filled in where the institution
 *    actually publishes them. A programme-specific range stores the LOWEST
 *    published figure and the note lists the higher ones.
 *  - `alternative` records a published assessment that is explicitly a
 *    different instrument (an own test, a state exam, a portfolio). It is never
 *    called an OMPT exemption.
 */

export type OmptVersion = "A" | "B" | "C" | "D" | "E" | "F";

export type OmptStatus =
  /** Published obligation for the applicant's route. */
  | "required"
  /** Published obligation, but only on the programmes that list it. */
  | "programme"
  /** The consulted official pages do not mention OMPT — not an exemption. */
  | "unconfirmed"
  /** The institution does not admit degree students at all. */
  | "not-applicable";

export type OmptProfile = {
  status: OmptStatus;
  /** Lowest published passing score, when the institution publishes one. */
  minimumPercent?: number;
  /** Versions named in the published requirement. Empty = not published. */
  versions?: OmptVersion[];
  /** A published assessment that is explicitly not an OMPT certificate. */
  alternative?: string;
  /** ISO date the requirement was last checked. */
  verifiedOn: string;
  note: string;
};

const ON = "2026-11-17";

const silence = (what: string): OmptProfile => ({
  status: "unconfirmed",
  verifiedOn: ON,
  note: `No OMPT requirement, version, passing score or exemption is published on the consulted pages (${what}). Silence is not a formal exemption — confirm with admissions before relying on it.`,
});

export const omptBySlug: Record<string, OmptProfile> = {
  /* ── Universities ─────────────────────────────────────────────────── */
  "vilnius-university": {
    status: "programme",
    minimumPercent: 55,
    versions: ["A", "C", "D", "E"],
    verifiedOn: ON,
    note: "OMPT is required for Bangladesh applicants on the programmes that list it, and the version differs per programme. Published floors: OMPT-A ≥55% (Quantitative Economics), OMPT-C ≥55% (Lithuanian Studies; Language & AI Management), OMPT-E ≥55% (MA International Communication), OMPT-D ≥60% (MA Geology). Check the exact programme row.",
  },
  "vilnius-tech": {
    status: "required",
    minimumPercent: 50,
    verifiedOn: ON,
    note: "Bangladeshi secondary/vocational graduates need OMPT: at least 60% for university-level Bachelor's and at least 50% for professional Bachelor's. The letter version is not published — confirm the version with admissions.",
  },
  "klaipeda-university": {
    status: "unconfirmed",
    verifiedOn: ON,
    note: "KU's published international application procedure does not mention OMPT. Do not read that silence as a formal exemption — confirm directly with KU admissions.",
  },
  "lithuanian-sports-university": {
    status: "unconfirmed",
    alternative: "LSU-organised knowledge and ability assessment (Bangladesh Bachelor's)",
    verifiedOn: ON,
    note: "LSU requires its own knowledge and ability assessment for Bangladeshi Bachelor's applicants but does not identify it as OMPT, or publish an OMPT version, score or exemption.",
  },
  "ism-university": {
    status: "unconfirmed",
    alternative: "State mathematics examination or ISM's own maths test",
    verifiedOn: ON,
    note: "No ISM OMPT requirement, version, passing score or formal exemption is stated in the consulted admission instructions; the published maths route is a state examination or ISM's own test.",
  },
  "vytautas-magnus-university": {
    status: "programme",
    minimumPercent: 55,
    versions: ["A", "D"],
    verifiedOn: ON,
    note: "Bangladesh applicants need OMPT on the relevant programmes. Published 2027 chart: BA Business Administration OMPT-D ≥55%; BA Economics and Finance OMPT-D ≥65%; BA International Politics and Development Studies OMPT-A ≥65%; MA Applied English Linguistics OMPT-A ≥55%; MA Applied Informatics OMPT-D ≥70%. Test deadline 15 April 2027.",
  },
  "lcc-international-university": {
    status: "unconfirmed",
    alternative: "LCC Skills and Knowledge Test",
    verifiedOn: ON,
    note: "The Bangladesh HSC route adds an LCC Skills and Knowledge Test. No OMPT policy, version, score or exemption is published, and the LCC test is not an OMPT certificate.",
  },
  "vilnius-academy-of-arts": {
    status: "unconfirmed",
    alternative: "Portfolio (50%) + online entrance exam/interview (50%)",
    verifiedOn: ON,
    note: "VDA's full-degree admissions pages do not state an OMPT requirement, version, score or exemption. The clearly published selection is a portfolio plus an entrance exam/interview, not an identified OMPT.",
  },
  "kaunas-university-of-technology": {
    status: "required",
    minimumPercent: 75,
    versions: ["A", "D"],
    verifiedOn: ON,
    note: "KTU requires OMPT for holders of certain third-country qualifications — the OMPT-A or OMPT-D version — with a minimum compulsory score of 75% before an applicant can be considered for a specific programme.",
  },
  "mykolas-romeris-university": {
    status: "required",
    minimumPercent: 75,
    versions: ["A", "D"],
    verifiedOn: ON,
    note: "MRU's Bangladesh country table requires an OMPT result with the application. The published requirement is OMPT-A or OMPT-D at 75% minimum, taken by 1 April, with at most two attempts.",
  },
  "kazimieras-simonavicius-university": {
    ...silence("KSU's 2027/28 programme pages and its apply.ksu.lt admission portal"),
    alternative: "Proof of a final-year school examination in Mathematics, or a science/IT/commerce substitute subject",
  },

  /* ── Colleges ─────────────────────────────────────────────────────── */
  "kauno-kolegija": {
    ...silence("Kauno kolegija's admission procedure and programme pages"),
    alternative: "Key competence test (score ≥3) and, on many programmes, a motivation interview",
  },
  "lithuania-business-college": { ...silence("the college's enrolment pages and application catalogue") },
  "utenos-kolegija": { ...silence("Utenos kolegija's admission pages") },
  "smk-college": { ...silence("SMK's admission and tuition pages"), alternative: "Document assessment plus a motivation interview" },
  "vilnius-business-college": { ...silence("VBC's official admission and programme pages"), alternative: "Admission interview with a VBC officer" },
  "vilnius-college-of-design": { ...silence("VCD's programme and admission pages"), alternative: "Portfolio assessment plus motivational interview" },
  "vilniaus-kolegija": { ...silence("VIKO's admission, fees and application pages") },
  "klaipeda-state-college": { ...silence("KVK's admission and programme pages"), alternative: "Competitive-score weighting (biology, a science subject and English grades)" },
  "panevezys-college": { ...silence("Panevėžio kolegija's admission pages") },
  "alytus-college": { ...silence("the applicable Kauno kolegija procedure") },
  "siauliai-state-college": { ...silence("the college's admission page") },
  "st-ignatius-of-loyola-college": { ...silence("the college's admission pages and rules"), alternative: "Document assessment, exam average and a motivational interview" },
  "kolpingo-kolegija": { ...silence("Kolpingo kolegija's admission information") },
  "lithuanian-centre-for-social-sciences": {
    status: "not-applicable",
    verifiedOn: ON,
    note: "Not applicable — LCSS is a research centre with doctoral cooperation only and has no Bachelor's or Master's intake of its own.",
  },
};

export function getOmpt(slug: string): OmptProfile {
  return omptBySlug[slug] ?? silence("this institution's published admission pages");
}

/** True where the institution publishes an OMPT obligation for some or all applicants. */
export function requiresOmpt(profile: OmptProfile): boolean {
  return profile.status === "required" || profile.status === "programme";
}

export const omptStatusLabels: Record<OmptStatus, string> = {
  required: "OMPT required",
  programme: "OMPT by programme",
  unconfirmed: "OMPT not mentioned",
  "not-applicable": "No degree intake",
};

/** Short card chip text — never claims an exemption that was not published. */
export const omptChipLabels: Record<OmptStatus, string> = {
  required: "OMPT required",
  programme: "OMPT by programme",
  unconfirmed: "OMPT not mentioned",
  "not-applicable": "No degree intake",
};

export function omptVersionLabel(versions?: OmptVersion[]): string | undefined {
  if (!versions || versions.length === 0) return undefined;
  return versions.map((version) => `OMPT-${version}`).join(" / ");
}

/**
 * Whether a recorded OMPT result satisfies the published requirement.
 * Returns "unpublished" when the institution states no version or score, so a
 * caller can never treat an unknown threshold as a pass.
 */
export function checkOmptResult(
  profile: OmptProfile,
  result: { version?: OmptVersion; scorePercent?: number },
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (profile.versions && result.version && !profile.versions.includes(result.version)) {
    reasons.push(`OMPT-${result.version} is not a version this institution names (${omptVersionLabel(profile.versions)})`);
  }
  if (profile.minimumPercent !== undefined && result.scorePercent !== undefined && result.scorePercent < profile.minimumPercent) {
    reasons.push(`OMPT score ${result.scorePercent}% is below the lowest published minimum (${profile.minimumPercent}%)`);
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * One-line summary for the institution card footer and the "at a glance"
 * sidebar. Derived from the same profile, so the card chip, the profile panel
 * and this line can never disagree. The hand-written `omptSummary` strings that
 * used to live in research.ts / colleges.ts are superseded by this.
 */
export function omptSummary(slug: string): string {
  const profile = getOmpt(slug);
  if (profile.status === "required") {
    const score = profile.minimumPercent !== undefined ? ` · ${profile.minimumPercent}%` : "";
    return `OMPT required${score}`;
  }
  if (profile.status === "programme") {
    const score = profile.minimumPercent !== undefined ? ` · from ${profile.minimumPercent}%` : "";
    return `OMPT by programme${score}`;
  }
  if (profile.status === "not-applicable") return "No degree intake";
  return "OMPT not mentioned";
}
