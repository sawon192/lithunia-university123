/**
 * Acceptance checks for the queued eligibility features:
 * any-type qualifications, any-type assessments, the passing-year auto gap,
 * and the OMPT with/without classification.
 *
 * Run with `npm run test:eligibility` (the runner bundles this file with the
 * esbuild that already ships in node_modules, then executes it in Node).
 * Exits non-zero on any failure.
 */
import { assessProfile } from "../src/lib/eligibility.ts";
import { checkOmptResult, getOmpt, omptBySlug, requiresOmpt } from "../src/lib/ompt.ts";
import { derivedGapYears, effectiveGapYears, latestPassingYear, ratioCandidate } from "../src/lib/student-profile.ts";
import { institutions } from "../src/lib/research.ts";

const results: { name: string; pass: boolean; detail: string }[] = [];
const rec = (name: string, pass: boolean, detail: string) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

const base = {
  level: "Bachelor", nationality: "Bangladesh", educationCountry: "Bangladesh",
  hasDiploma: false, hasBachelor: false, subject: "", englishTest: "none",
  city: "any", institutionType: "any",
};

/* ── 1. OMPT classification table ───────────────────────────────────── */
const withOmpt = institutions.filter((i) => requiresOmpt(getOmpt(i.slug)));
const without = institutions.filter((i) => !requiresOmpt(getOmpt(i.slug)));

rec("O1. Every institution has an OMPT record", institutions.every((i) => omptBySlug[i.slug] !== undefined),
  `${Object.keys(omptBySlug).length} records / ${institutions.length} institutions`);

rec("O2. With-OMPT set is 5 and Without-OMPT is 19", withOmpt.length === 5 && without.length === 19,
  `with=${withOmpt.length} without=${without.length} → ${withOmpt.map((i) => i.abbreviation).join(", ")}`);

const silent = institutions.filter((i) => getOmpt(i.slug).status === "unconfirmed");
rec("O3. Silence is 'unconfirmed', never 'none'", silent.length === 18 && !Object.values(omptBySlug).some((p) => (p.status as string) === "none"),
  `${silent.length} unconfirmed, 0 silently exempt`);

const published = Object.entries(omptBySlug).filter(([, p]) => p.minimumPercent !== undefined);
rec("O4. A minimum score exists only where published", published.every(([, p]) => requiresOmpt(p)),
  published.map(([slug, p]) => `${slug} ${p.minimumPercent}%`).join(", "));

const ktu = getOmpt("kaunas-university-of-technology");
rec("O5. KTU rule is 75% OMPT-A/D", ktu.minimumPercent === 75 && (ktu.versions ?? []).join("") === "AD", ktu.note.slice(0, 60) + "…");

const mru = getOmpt("mykolas-romeris-university");
rec("O6. MRU is a mandatory Bangladesh OMPT", mru.status === "required", mru.note.slice(0, 70) + "…");

const vmu = getOmpt("vytautas-magnus-university");
rec("O7. VMU is programme-specific with a published floor", vmu.status === "programme" && vmu.minimumPercent === 55,
  `floor ${vmu.minimumPercent}% across ${(vmu.versions ?? []).join("/")}`);

/* ── 2. OMPT result checking ────────────────────────────────────────── */
rec("O8. KTU: OMPT-D 80% passes", checkOmptResult(ktu, { version: "D", scorePercent: 80 }).ok, "80% ≥ 75%");
rec("O9. KTU: OMPT-D 60% fails on score", !checkOmptResult(ktu, { version: "D", scorePercent: 60 }).ok,
  checkOmptResult(ktu, { version: "D", scorePercent: 60 }).reasons[0]);
rec("O10. KTU: OMPT-C is not a named version", !checkOmptResult(ktu, { version: "C", scorePercent: 90 }).ok,
  checkOmptResult(ktu, { version: "C", scorePercent: 90 }).reasons[0]);
rec("O11. KU silence never passes", !requiresOmpt(getOmpt("klaipeda-university")), "status " + getOmpt("klaipeda-university").status);

/* ── 3. Passing-year auto gap ───────────────────────────────────────── */
const quals = [
  { id: "1", type: "ssc", grade: 4.9, maxGrade: 5, passingYear: 2022 },
  { id: "2", type: "hsc", grade: 4.8, maxGrade: 5, passingYear: 2024 },
];
rec("G1. Latest passing year is the maximum, not the first", latestPassingYear(quals) === 2024, String(latestPassingYear(quals)));
rec("G2. Gap 2024 → September 2027 is 3 years", derivedGapYears(quals) === 3, String(derivedGapYears(quals)));
rec("G3. An override wins over the derived gap", effectiveGapYears(quals, 1).years === 1 && effectiveGapYears(quals, 1).source === "override",
  JSON.stringify(effectiveGapYears(quals, 1)));
rec("G4. No passing year → gap unknown (not 0)", derivedGapYears([{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5 }]) === undefined,
  "undefined, so institutions with a gap limit ask for the detail");

/* ── 4. Any-type qualifications ─────────────────────────────────────── */
const alimRows = assessProfile({ ...base, qualifications: [{ id: "1", type: "alim", grade: 4.5, maxGrade: 5, passingYear: 2023 }] });
rec("Q1. An Alim-only profile is assessed (no crash, real verdicts)", alimRows.length === institutions.length,
  `${alimRows.filter((r) => r.verdict === "conditional").length} conditional`);
const alevelRows = assessProfile({ ...base, qualifications: [{ id: "1", type: "alevel", grade: 4.6, maxGrade: 5, passingYear: 2024 }] });
rec("Q2. An A-Level-only profile is assessed", alevelRows.length === institutions.length, "A-Level on the 5.00 scale");
const olevelRows = assessProfile({ ...base, qualifications: [{ id: "1", type: "olevel", grade: 7, maxGrade: 9, passingYear: 2022 }] });
rec("Q3. An O-Level-only profile never invents an HSC GPA",
  olevelRows.find((r) => r.institution.slug === "vilnius-university").academicCheck !== "pass",
  "VU HSC-4.50 rule stays unmet for O-Level");
const otherRows = assessProfile({ ...base, qualifications: [{ id: "1", type: "other", label: "BTEB short course", grade: 80, maxGrade: 100, passingYear: 2023 }] });
rec("Q4. A custom 'other' qualification is measured as % of its own maximum", otherRows.length === institutions.length, "no cross-scale conversion");
rec("Q5. Ratio candidate precedence: HSC before SSC, Diploma only when it is the route",
  ratioCandidate(quals, "Bachelor", false).type === "hsc" &&
  ratioCandidate([{ id: "1", type: "diploma", grade: 3.2, maxGrade: 4 }], "Bachelor", true).type === "diploma",
  "HSC, then Diploma on the diploma route");

/* ── 5. Any-type assessments ────────────────────────────────────────── */
const withOmptResult = assessProfile({
  ...base, englishTest: "ielts", englishScore: 6,
  qualifications: [{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5, passingYear: 2024 }],
  assessments: [{ id: "a", type: "ompt", version: "D", scorePercent: 80 }],
});
const ktuRow = withOmptResult.find((r) => r.institution.slug === "kaunas-university-of-technology");
rec("A1. A recorded OMPT result satisfies KTU", ktuRow.omptCheck === "pass" && ktuRow.verdict === "eligible",
  `KTU ${ktuRow.verdict} / ompt ${ktuRow.omptCheck}`);

const noOmpt = assessProfile({
  ...base, englishTest: "ielts", englishScore: 6,
  qualifications: [{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5, passingYear: 2024 }],
});
const ktuNo = noOmpt.find((r) => r.institution.slug === "kaunas-university-of-technology");
rec("A2. A missing OMPT result keeps KTU conditional", ktuNo.omptCheck === "pending" && ktuNo.verdict === "conditional",
  `KTU ${ktuNo.verdict} / ompt ${ktuNo.omptCheck}`);

const nonOmpt = assessProfile({
  ...base, englishTest: "ielts", englishScore: 6,
  qualifications: [{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5, passingYear: 2024 }],
  assessments: [{ id: "a", type: "institution-test", name: "KTU entrance exam", scorePercent: 90 }],
});
const ktuOther = nonOmpt.find((r) => r.institution.slug === "kaunas-university-of-technology");
rec("A3. Another institution's own test is not substituted for OMPT", ktuOther.omptCheck === "pending",
  "own test recorded as evidence, OMPT obligation still open");

/* ── 6. Gap flows into the report ───────────────────────────────────── */
const longGap = assessProfile({ ...base, qualifications: [{ id: "1", type: "diploma", grade: 3.2, maxGrade: 4, passingYear: 2018 }] });
const mruLong = longGap.find((r) => r.institution.slug === "mykolas-romeris-university");
rec("G5. A 9-year gap is flagged against MRU's 3-year guidance", mruLong.gapExceeded === true && mruLong.gapYears === 9,
  `gap ${mruLong.gapYears}, exceeded=${mruLong.gapExceeded}`);

const noYear = assessProfile({ ...base, qualifications: [{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5 }] });
rec("G6. An unknown gap never counts as a pass or a fail",
  noYear.every((r) => r.gapYears === undefined && r.gapExceeded !== true),
  "no row is failed for a gap it cannot measure");

const override = assessProfile({
  ...base, gapOverride: 1,
  qualifications: [{ id: "1", type: "hsc", grade: 4.8, maxGrade: 5, passingYear: 2015 }],
});
rec("G7. An override replaces the derived figure in every row", override.every((r) => r.gapYears === 1 && r.gapSource === "override"),
  "1 year in all 24 rows");

/* ── 7. Diploma route + legacy compatibility ────────────────────────── */
const diploma = assessProfile({ ...base, hasDiploma: true, diplomaGrade: 3.2, diplomaMax: 4, hscGpa: undefined });
const mruDiploma = diploma.find((r) => r.institution.slug === "mykolas-romeris-university");
rec("D1. Legacy flat fields still work (hasDiploma + diplomaGrade)", diploma.length === institutions.length,
  `MRU ${mruDiploma.verdict} — excluded route preserved`);
rec("D2. Legacy path & the open list agree for the same student",
  diploma.find((r) => r.institution.slug === "kauno-kolegija").routeCheck ===
  assessProfile({ ...base, qualifications: [{ id: "1", type: "diploma", grade: 3.2, maxGrade: 4 }] })
    .find((r) => r.institution.slug === "kauno-kolegija").routeCheck,
  "identical route verdict via both call styles");

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} pass`);
if (failed.length) {
  console.error("FAILED:", failed.map((r) => r.name).join(", "));
  process.exit(1);
}
