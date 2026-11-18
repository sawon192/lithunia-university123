import type { SourceKey } from "./research";

/**
 * English Test Alternatives
 * ---------------------------------------------------------------------------
 * One record per institution, keyed by slug, so the existing `University`
 * model is extended rather than duplicated.
 *
 * Rules applied when classifying (see README §6):
 *  - MOI is never assumed. "accepted" / "conditional" require an official
 *    statement on the institution's own admission pages; anything less is
 *    "unconfirmed".
 *  - "not_accepted" is only used where the institution says so explicitly
 *    (Kauno kolegija, LSU, LCC, KVK's Duolingo exclusion, MRU's Alim rule…).
 *  - IELTS, PTE Academic and TOEFL are never listed as "alternatives".
 *  - A conditional policy is never displayed as a general acceptance.
 */

export type MoiStatus = "accepted" | "conditional" | "not_accepted" | "unconfirmed";

export type AlternativeCertificate =
  | "Duolingo English Test"
  | "LanguageCert IESOL"
  | "Cambridge English"
  | "Oxford English Test"
  | "EF SET"
  | "EnglishScore (British Council)"
  | "IGCSE / GCSE English"
  | "C1 Advanced (CAE)";

export type InternalTest = {
  available: boolean;
  name?: string;
  fee?: string;
  format?: string;
  minimumLevel?: string;
  notes?: string;
};

export type EnglishRequirementStatus =
  | "officially_confirmed"
  | "programme_specific"
  | "previous_intake"
  | "not_officially_confirmed"
  | "conflicting";

export type EnglishAlternatives = {
  /** Conditional acceptance is reported separately — never as a blanket yes. */
  moiAccepted: MoiStatus;
  /** What the student must supply, and what can void the waiver. */
  moiConditions?: string;
  internalEnglishTest: InternalTest;
  alternativeEnglishCertificates: AlternativeCertificate[];
  englishRequirementNotes: string;
  /** Official page the classification was taken from. */
  englishRequirementSource: SourceKey;
  /** ISO date of the last check. */
  englishRequirementVerifiedAt: string;
  englishRequirementStatus: EnglishRequirementStatus;
};

const UNKNOWN: EnglishAlternatives = {
  moiAccepted: "unconfirmed",
  internalEnglishTest: { available: false },
  alternativeEnglishCertificates: [],
  englishRequirementNotes: "No English-alternative policy has been verified for this institution yet.",
  englishRequirementSource: "vuLanguage",
  englishRequirementVerifiedAt: "2026-11-16",
  englishRequirementStatus: "not_officially_confirmed",
};

const ON = "2026-11-16";

export const englishAlternativesBySlug: Record<string, EnglishAlternatives> = {
  "vilnius-university": {
    moiAccepted: "conditional",
    moiConditions:
      "Waiver applies only where English was the language of instruction in previous studies, or the applicant is a native speaker. VU requires acceptable documentary evidence — an informal teacher statement is not enough.",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["Duolingo English Test"],
    englishRequirementNotes:
      "Bachelor/Integrated: IELTS Academic 6.0+, PTE 52+, Duolingo 105+. Master: IELTS 6.5+, PTE 59+, Duolingo 120+. Programme pages may set a higher score.",
    englishRequirementSource: "vuLanguage",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "vilnius-tech": {
    moiAccepted: "conditional",
    moiConditions: "Waived only when previous studies were completed fully in English; the MOI document must evidence that full-study condition.",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["Duolingo English Test", "Cambridge English"],
    englishRequirementNotes:
      "IELTS Academic 5.5 with no band below 5.5, TOEFL iBT 70, PTE 48 in all four skills, Duolingo 100. Cambridge and other listed tests are accepted.",
    englishRequirementSource: "techRequirements",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "klaipeda-university": {
    moiAccepted: "unconfirmed",
    moiConditions:
      "The published procedure exempts native English speakers only. It does not establish a general Bangladesh MOI waiver.",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["Duolingo English Test"],
    englishRequirementNotes: "IELTS >5.5, TOEFL >75, Duolingo >110, PTE >59; programme pages may also request CEFR B2.",
    englishRequirementSource: "kuApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "lithuanian-sports-university": {
    moiAccepted: "not_accepted",
    moiConditions:
      "LSU states that English-medium prior study or an MOI alone is not an automatic waiver — those applicants must still provide Duolingo 90+. The exemption covers native speakers or a country where English is the only official language.",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["Duolingo English Test", "LanguageCert IESOL", "Cambridge English"],
    englishRequirementNotes:
      "IELTS Academic 5.5+, TOEFL iBT 46–59, PTE Academic 50+, Duolingo 90+, Cambridge 160+ or LanguageCert IESOL B2.",
    englishRequirementSource: "lsuApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "ism-university": {
    moiAccepted: "conditional",
    moiConditions:
      "Previous education taught wholly in English may support a waiver, but only at the admission committee's discretion. This is not automatic MOI acceptance.",
    internalEnglishTest: {
      available: true,
      name: "ISM English test",
      fee: "Fee not published on the consulted page",
      format: "University-set English assessment",
      minimumLevel: "55 for Bachelor, 70 for Master",
      notes: "Accepted as an alternative to IELTS/TOEFL/PTE/Duolingo.",
    },
    alternativeEnglishCertificates: ["Duolingo English Test"],
    englishRequirementNotes:
      "Bachelor: IELTS 6.0, TOEFL iBT 60, PTE 52, Duolingo 115 or ISM test 55. Master: IELTS 6.5 (6.0 each band), TOEFL iBT 79, PTE 59, Duolingo 125 or ISM test 70.",
    englishRequirementSource: "ismApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "vytautas-magnus-university": {
    moiAccepted: "accepted",
    moiConditions:
      "Previous studies fully taught in English may be documented by an official school or university certificate (MOI), which satisfies the English evidence requirement.",
    internalEnglishTest: {
      available: false,
      notes: "VMU states it does not organise an English admissions test.",
    },
    alternativeEnglishCertificates: ["Duolingo English Test"],
    englishRequirementNotes:
      "When previous studies were not in English, recent valid B2 evidence is required: IELTS 5.5–6.5, TOEFL iBT 87–109, PTE 59, Duolingo 100–125. The programme sets its point within the range.",
    englishRequirementSource: "vmuApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "lcc-international-university": {
    moiAccepted: "not_accepted",
    moiConditions:
      "The BA certificate waiver is restricted to named English-speaking citizenship, study or exchange in those countries, or an International/European Baccalaureate. A generic Bangladesh MOI is not listed as an automatic waiver.",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["LanguageCert IESOL"],
    englishRequirementNotes:
      "BA International Business Administration: IELTS 6.0, TOEFL iBT 61, PTE 53, LanguageCert IESOL B2 or another listed certificate. MA TESOL: IELTS 7.0 or TOEFL iBT 100. LCC states Duolingo is no longer accepted for regular admissions from 2023/24 onward.",
    englishRequirementSource: "lccAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "programme_specific",
  },
  "vilnius-academy-of-arts": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "The 2026/27 MA instructions request CEFR B2, IELTS 5.5 or TOEFL 75 'or other proof of English'. No 2027/28 BA-wide list or named alternative certificate is published, and many MA courses are mainly taught in Lithuanian.",
    englishRequirementSource: "vdaMasters",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "previous_intake",
  },
  "kaunas-university-of-technology": {
    moiAccepted: "conditional",
    moiConditions:
      "KTU may accept fully English-medium previous studies when this is stated in the degree certificate, transcript of records or a confirmation from the school. Whether a Bangladeshi MOI letter alone is sufficient is not published.",
    internalEnglishTest: {
      available: true,
      name: "KTU online English examination",
      fee: "Free of charge",
      format: "Online examination, arranged after the application is reviewed",
      minimumLevel: "CEFR B2 for Bachelor's, C1 for Master's",
      notes: "Offered when the applicant has no official English certificate.",
    },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "Bachelor's: IELTS 5.5 (all components 5.5), TOEFL iBT 75, or an equivalent test taken in the last two years. Master's: IELTS 6.0 (components 5.5), TOEFL iBT 85. PTE Academic is not named in the published list.",
    englishRequirementSource: "ktuBachelor",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "mykolas-romeris-university": {
    moiAccepted: "conditional",
    moiConditions:
      "MRU states no certificate is required if previous studies were conducted fully in English, but does not publish a Bangladesh-specific acceptance statement for an MOI letter — confirm before relying on it.",
    internalEnglishTest: {
      available: true,
      name: "MRU online English language level test",
      fee: "Free of charge",
      format: "Online test, selected inside the apply.mruni.eu application",
      minimumLevel: "B2",
      notes: "Applicants below B2 can take MRU's online Preparatory English Language Courses instead.",
    },
    alternativeEnglishCertificates: ["Duolingo English Test", "Cambridge English", "IGCSE / GCSE English"],
    englishRequirementNotes:
      "B2 required. Duolingo 100–125 (MRU's recommended option), TOEFL iBT 72–94, IELTS 5.5–6.5, PTE 59–75, IGCSE E/3+, Cambridge O Level/GCSE English E/3+, Cambridge B2 First / C1 Advanced at 162+. English for Specific Purposes and Interculturality sets its own requirement.",
    englishRequirementSource: "mruAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "kazimieras-simonavicius-university": {
    moiAccepted: "conditional",
    moiConditions:
      "KSU does not require a certificate at all at Bachelor's level: an applicant may submit one, but English is assessed in the recorded interview regardless. At Master's level an English grade of 8 or higher in the Bachelor's diploma supplement removes the need for any certificate. KSU states the interview assessment takes priority over submitted grades, certificates and test results, so nothing is a guaranteed waiver.",
    internalEnglishTest: {
      available: true,
      name: "Recorded University admission interview (English assessment)",
      fee: "No separate fee — part of the admission process after the €250 registration fee",
      format: "Recorded interview submitted through the KSU admission system (camera and microphone required)",
      minimumLevel: "B2 at Master's level; assessed, not scored, at Bachelor's level",
      notes:
        "If the introductory interview is not judged satisfactory, KSU requires an additional University interview. No separate English placement test or English course fee is published.",
    },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "Bachelor's: a certificate or test result is optional — English is assessed in the recorded interview. Master's: either an English grade of 8+ in the Bachelor's diploma supplement, or an internationally recognised certificate/test at B2 or above (KSU names IELTS and TOEFL as examples). KSU publishes no numeric IELTS, TOEFL, PTE or Duolingo band at either level.",
    englishRequirementSource: "ksuMAOrg",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "kauno-kolegija": {
    moiAccepted: "not_accepted",
    moiConditions: "Kauno kolegija states explicitly that a Medium of Instruction letter is not accepted as proof of English proficiency.",
    internalEnglishTest: {
      available: true,
      name: "Cambridge English Placement Test (Kauno kolegija)",
      fee: "€45",
      format: "Cambridge placement test, available during the admission period",
      minimumLevel: "CEFR B2",
      notes: "An alternative to IELTS/TOEFL/PTE for applicants without a certificate.",
    },
    alternativeEnglishCertificates: ["EnglishScore (British Council)"],
    englishRequirementNotes: "IELTS 5.5+, TOEFL 75+, PTE 59+ or EnglishScore 400+ (CoreSkills) at CEFR B2.",
    englishRequirementSource: "kkApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "lithuania-business-college": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "LBC requires an English language proficiency certificate and states final proficiency must be at least B2, verified during enrolment. No accepted-test list, score band or MOI rule is published.",
    englishRequirementSource: "ltvkRules",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "utenos-kolegija": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "Utenos kolegija teaches Law, Business Management and Innovation and Tourism Services in English for international students, and its older rules mention documents certifying at least B1/B2 English. No current accepted-test list or MOI rule is published.",
    englishRequirementSource: "utenAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "smk-college": {
    moiAccepted: "unconfirmed",
    moiConditions: "SMK has not published an explicit statement on accepting a Bangladesh Medium of Instruction certificate.",
    internalEnglishTest: {
      available: true,
      name: "SMK online English test",
      fee: "€50",
      format: "Online test that also assesses speaking",
      minimumLevel: "Not published",
    },
    alternativeEnglishCertificates: ["Duolingo English Test", "LanguageCert IESOL", "Cambridge English"],
    englishRequirementNotes:
      "IELTS 5.5+, TOEFL 69+, FCE, LanguageCert IESOL B2+, PTE 59+ or Duolingo 110+. SMK's own test is €50.",
    englishRequirementSource: "smkProgrammes",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "vilnius-business-college": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: {
      available: true,
      name: "Oxford Online Placement Test (sat online at VBC)",
      fee: "€50",
      format:
        "Online written test, pre-registered at least two working days ahead, followed by an oral check",
      minimumLevel: "CEFR B2",
      notes:
        "VBC's published route for applicants holding none of its listed international certificates. Separately, applicants below B2 can still be admitted on condition of completing one semester of the Academic English Preparatory Programme (€1,700, online, 28 ECTS) before the degree.",
    },
    alternativeEnglishCertificates: ["Cambridge English", "Oxford English Test"],
    englishRequirementNotes:
      "CEFR B2 or higher. VBC's published list: Cambridge B2 First/First for Schools, Cambridge B2 Business Vantage, IELTS Academic 5.5–6.5, Pearson PTE Level 3 (B2), TOEFL iBT 60, TOEIC 785, LCCI English for Business Level 2 Credit/Level 2 Distinction/Level 3 Pass, or the €50 Oxford Online Placement Test at the College. Duolingo is not on the list.",
    englishRequirementSource: "vbcAdmission2026",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "vilnius-college-of-design": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["Duolingo English Test"],
    englishRequirementNotes:
      "Applicants must prove B2 through IELTS, TOEFL, PTE, Duolingo or an equivalent certificate. No minimum band score or MOI rule is published.",
    englishRequirementSource: "vcdGraphic",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "vilniaus-kolegija": {
    moiAccepted: "unconfirmed",
    moiConditions: "VIKO's published admission page does not state a rule on Medium of Instruction letters.",
    internalEnglishTest: {
      available: true,
      name: "VIKO English Language Centre free online test",
      fee: "Free of charge",
      format: "Online proficiency test run during the admission period",
      minimumLevel: "B1 result waives IELTS/TOEFL",
      notes: "Results submitted after the admission deadline are not accepted.",
    },
    alternativeEnglishCertificates: [],
    englishRequirementNotes: "CEFR B2 required: IELTS overall 5.5–6 or TOEFL overall 72–94, valid for two years only.",
    englishRequirementSource: "vikoAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "klaipeda-state-college": {
    moiAccepted: "accepted",
    moiConditions:
      "KVK states that a native speaker and/or an applicant whose English was the medium of instruction in previous studies is exempt from providing an English language examination certificate.",
    internalEnglishTest: {
      available: false,
      notes: "KVK states that no additional entrance examination is carried out.",
    },
    alternativeEnglishCertificates: ["LanguageCert IESOL", "EF SET", "EnglishScore (British Council)"],
    englishRequirementNotes:
      "B1 required: TOEFL iBT 42–71, IELTS Academic 4.5–5.0, PTE 40.8, LanguageCert IESOL B1 Achiever, EF SET 41–50 (4-skills test), EnglishScore 317 or an equivalent B1 certificate. KVK states the Duolingo test is not accepted.",
    englishRequirementSource: "kvkAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "panevezys-college": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "A valid certificate confirming B2 English is required, with an earlier description mentioning B1 and TOEFL/IELTS-type certificates. No MOI rule or accepted-test list is published.",
    englishRequirementSource: "pankoWelcome",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "alytus-college": {
    moiAccepted: "not_accepted",
    moiConditions:
      "Alytus is now a faculty of Kauno kolegija, so Kauno kolegija's rule applies: MOI letters are expressly not accepted.",
    internalEnglishTest: {
      available: true,
      name: "Cambridge English Placement Test (via Kauno kolegija)",
      fee: "€45",
      format: "Cambridge placement test during the admission period",
      minimumLevel: "CEFR B2",
    },
    alternativeEnglishCertificates: ["EnglishScore (British Council)"],
    englishRequirementNotes: "Kauno kolegija's requirements apply: IELTS 5.5+, TOEFL 75+, PTE 59+ or EnglishScore 400+.",
    englishRequirementSource: "kkApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "siauliai-state-college": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes: "No published English requirement, accepted test list or MOI rule on the consulted admission page.",
    englishRequirementSource: "svakoAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "st-ignatius-of-loyola-college": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: ["EF SET", "EnglishScore (British Council)"],
    englishRequirementNotes:
      "A B2 English level certificate is required, and ILK accepts CEFR, IELTS, TOEFL iBT, EnglishScore and EF SET — linking applicants to the free 90-minute EF SET test. No MOI rule is stated.",
    englishRequirementSource: "ilkApply",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "officially_confirmed",
  },
  "kolpingo-kolegija": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "An official document certifying at least B2 English is required, except for native English speakers. No accepted-test list, score band or MOI rule is published.",
    englishRequirementSource: "kolpingAdmission",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
  "lithuanian-centre-for-social-sciences": {
    moiAccepted: "unconfirmed",
    internalEnglishTest: { available: false },
    alternativeEnglishCertificates: [],
    englishRequirementNotes:
      "Not applicable: LCSS is a research institute without its own degree intake, so it publishes no English requirement for degree applicants. Doctoral language rules are set by the partner university.",
    englishRequirementSource: "lcssAbout",
    englishRequirementVerifiedAt: ON,
    englishRequirementStatus: "not_officially_confirmed",
  },
};

export function getEnglishAlternatives(slug: string): EnglishAlternatives {
  return englishAlternativesBySlug[slug] ?? UNKNOWN;
}

/** The three filter options exposed in the directory. */
export type EnglishAlternativeKey = "moi" | "internal" | "certificate";

export function hasEnglishAlternative(profile: EnglishAlternatives, key: EnglishAlternativeKey): boolean {
  if (key === "moi") return profile.moiAccepted === "accepted" || profile.moiAccepted === "conditional";
  if (key === "internal") return profile.internalEnglishTest.available;
  return profile.alternativeEnglishCertificates.length > 0;
}

export const englishAlternativeLabels: Record<EnglishAlternativeKey, string> = {
  moi: "MOI Accepted",
  internal: "University Internal English Test",
  certificate: "Alternative English Certificate",
};

/**
 * Published minimum scores for the three standard tests, taken from the same
 * official page as the rest of the profile. Displayed verbatim so the profile
 * never paraphrases a score band incorrectly.
 */
export type StandardScores = { ielts: string; pte: string; toefl: string };

const NP = "Not published";
const NP25 = "Named, no band published";
const NA = "Not applicable";

export const standardScoresBySlug: Record<string, StandardScores> = {
  "vilnius-university": { ielts: "6.0 Bachelor / 6.5 Master", pte: "52 Bachelor / 59 Master", toefl: NP },
  "vilnius-tech": { ielts: "5.5, no band below 5.5", pte: "48 in all four skills", toefl: "70" },
  "klaipeda-university": { ielts: "Above 5.5", pte: "Above 59", toefl: "Above 75" },
  "lithuanian-sports-university": { ielts: "5.5+", pte: "50+", toefl: "46–59 iBT" },
  "ism-university": { ielts: "6.0 Bachelor / 6.5 Master", pte: "52 Bachelor / 59 Master", toefl: "60 Bachelor / 79 Master" },
  "vytautas-magnus-university": { ielts: "5.5–6.5", pte: "59", toefl: "87–109 iBT" },
  "lcc-international-university": { ielts: "6.0 BA / 7.0 MA TESOL", pte: "53 BA", toefl: "61 BA / 100 MA TESOL" },
  "vilnius-academy-of-arts": { ielts: "5.5 (2026/27 MA instructions)", pte: NP, toefl: "75 (2026/27)" },
  "kaunas-university-of-technology": { ielts: "5.5 Bachelor / 6.0 Master", pte: "Not named in the published list", toefl: "75 Bachelor / 85 Master" },
  "mykolas-romeris-university": { ielts: "5.5–6.5", pte: "59–75", toefl: "72–94 iBT" },
  "kazimieras-simonavicius-university": { ielts: NP25, pte: NP25, toefl: NP25 },
  "kauno-kolegija": { ielts: "5.5+", pte: "59+", toefl: "75+" },
  "lithuania-business-college": { ielts: NP, pte: NP, toefl: NP },
  "utenos-kolegija": { ielts: NP, pte: NP, toefl: NP },
  "smk-college": { ielts: "5.5+", pte: "59+", toefl: "69+" },
  "vilnius-business-college": { ielts: "5.5–6.5 Academic (B2)", pte: "Level 3 (B2), no numeric score published", toefl: "60 iBT" },
  "vilnius-college-of-design": { ielts: NP25, pte: NP25, toefl: NP25 },
  "vilniaus-kolegija": { ielts: "5.5–6.0 (2-year validity)", pte: NP, toefl: "72–94 (2-year validity)" },
  "klaipeda-state-college": { ielts: "4.5–5.0", pte: "40.8", toefl: "42–71 iBT" },
  "panevezys-college": { ielts: NP25, pte: NP, toefl: NP25 },
  "alytus-college": { ielts: "5.5+", pte: "59+", toefl: "75+" },
  "siauliai-state-college": { ielts: NP, pte: NP, toefl: NP },
  "st-ignatius-of-loyola-college": { ielts: NP25, pte: NP, toefl: NP25 },
  "kolpingo-kolegija": { ielts: NP, pte: NP, toefl: NP },
  "lithuanian-centre-for-social-sciences": { ielts: NA, pte: NA, toefl: NA },
};

export function getStandardScores(slug: string): StandardScores {
  return standardScoresBySlug[slug] ?? { ielts: NP, pte: NP, toefl: NP };
}
