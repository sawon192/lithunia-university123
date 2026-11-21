/**
 * Server-side validation for the public application form.
 * No dependency added on purpose — the rules are small enough to express here,
 * and every rule is enforced again on the server regardless of the client state.
 */

/**
 * Qualification names as the applicant sees them. Kept as a widened list (not
 * free text) so the desk can group and filter applications reliably; the
 * spread of award names matters more than a tidy enum, so BBA / BSc / BEng /
 * MBBS are distinct rather than folded into "Bachelors".
 */
export const QUALIFICATIONS = [
  "SSC",
  "O-Level",
  "HSC",
  "A-Level",
  "Alim",
  "Fazil",
  "Diploma",
  "Diploma in Engineering",
  "Bachelors",
  "BBA",
  "BSc",
  "BEng",
  "LLB",
  "MBBS",
  "Masters",
  "MBA",
  "MSc",
  "Other",
] as const;
export const TEST_TYPES = ["IELTS", "PTE", "TOEFL", "Duolingo", "Other", "None"] as const;
export const LEVELS = ["Bachelor", "Master"] as const;

export const DOCUMENT_KINDS = [
  "passport",
  "ssc_certificate",
  "ssc_transcript",
  "hsc_certificate",
  "hsc_transcript",
  "diploma_certificate",
  "diploma_transcript",
  "bachelor_certificate",
  "bachelor_transcript",
  "english_certificate",
  "cv",
  "other",
] as const;

export type Qualification = (typeof QUALIFICATIONS)[number];
export type TestType = (typeof TEST_TYPES)[number];
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type EducationRow = {
  qualification: Qualification;
  institution: string;
  subjectGroup?: string;
  passingYear?: number | null;
  result?: string;
  awardingBody?: string;
};

export type EnglishRow = {
  testType: TestType;
  score?: string;
  testDate?: string | null;
};

export type PreferenceRow = {
  universitySlug?: string;
  universityName: string;
  programmeName?: string;
  level?: (typeof LEVELS)[number];
  subjectArea?: string;
  isAlternative?: boolean;
};

export type ApplicationInput = {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string;
  nationality: string;
  currentCountry?: string;
  address?: string;
  email: string;
  mobile: string;
  whatsapp?: string;
  altContact?: string;
  education: EducationRow[];
  english: EnglishRow[];
  preferences: PreferenceRow[];
  studyGap?: string;
  visaRefusal?: string;
  comments?: string;
  referralSource?: string;
  consentData: boolean;
  consentContact: boolean;
  consentStorage: boolean;
};

export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+]?[\d][\d\s()-]{6,19}$/;

function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optional(value: unknown, max = 500): string | undefined {
  const out = str(value, max);
  return out ? out : undefined;
}

/** Accepts +8801714640238, 01714640238, 880 171 4640238 … */
export function normalisePhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+88${digits}`;
  return value.replace(/\s+/g, "");
}

export function parseApplication(body: unknown): { ok: true; value: ApplicationInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const input = (body ?? {}) as Record<string, unknown>;

  const fullName = str(input.fullName, 120);
  if (fullName.length < 3) errors.fullName = "Enter the student's full name as printed on the passport.";

  const email = str(input.email, 160).toLowerCase();
  if (!EMAIL.test(email)) errors.email = "Enter a valid email address.";

  const mobileRaw = str(input.mobile, 30);
  if (!PHONE.test(mobileRaw)) errors.mobile = "Enter a valid mobile number.";

  const whatsappRaw = optional(input.whatsapp, 30);
  if (whatsappRaw && !PHONE.test(whatsappRaw)) errors.whatsapp = "Enter a valid WhatsApp number, or leave it blank.";

  const altRaw = optional(input.altContact, 30);
  if (altRaw && !PHONE.test(altRaw)) errors.altContact = "Enter a valid alternative number, or leave it blank.";

  const dateOfBirth = optional(input.dateOfBirth, 10);
  if (dateOfBirth) {
    const parsed = new Date(dateOfBirth);
    if (Number.isNaN(parsed.getTime())) errors.dateOfBirth = "Enter a valid date of birth.";
    else {
      const age = (Date.now() - parsed.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 15 || age > 80) errors.dateOfBirth = "Check the date of birth — the age looks out of range.";
    }
  }

  const consentData = input.consentData === true;
  const consentContact = input.consentContact === true;
  const consentStorage = input.consentStorage === true;
  if (!consentData) errors.consentData = "Consent to processing personal information is required.";
  if (!consentContact) errors.consentContact = "Consent to being contacted about admission is required.";
  if (!consentStorage) errors.consentStorage = "Consent to secure document storage is required.";

  const educationRaw = Array.isArray(input.education) ? input.education : [];
  const education: EducationRow[] = [];
  educationRaw.forEach((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    // "Diploma in Engineering" is the longest accepted label; keep headroom so
    // a legitimate value is never silently truncated into an invalid one.
    const qualification = str(item.qualification, 40) as Qualification;
    if (!QUALIFICATIONS.includes(qualification)) {
      if (str(item.institution) || str(item.result)) errors[`education.${index}.qualification`] = "Choose a qualification.";
      return;
    }
    const institution = str(item.institution, 160);
    if (institution.length < 2) {
      errors[`education.${index}.institution`] = "Enter the institution name.";
      return;
    }
    const yearRaw = item.passingYear;
    let passingYear: number | null = null;
    if (yearRaw !== "" && yearRaw !== null && yearRaw !== undefined) {
      const year = Number(yearRaw);
      if (!Number.isInteger(year) || year < 1971 || year > 2030) {
        errors[`education.${index}.passingYear`] = "Enter a four-digit passing year.";
        return;
      }
      passingYear = year;
    }
    education.push({
      qualification,
      institution,
      subjectGroup: optional(item.subjectGroup, 80),
      passingYear,
      result: optional(item.result, 40),
      awardingBody: optional(item.awardingBody, 120),
    });
  });
  if (education.length === 0) errors.education = "Add at least one academic qualification.";

  const englishRaw = Array.isArray(input.english) ? input.english : [];
  const english: EnglishRow[] = [];
  englishRaw.forEach((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const testType = str(item.testType, 20) as TestType;
    if (!TEST_TYPES.includes(testType)) {
      if (str(item.score)) errors[`english.${index}.testType`] = "Choose a test type.";
      return;
    }
    if (testType === "None") {
      english.push({ testType });
      return;
    }
    const score = optional(item.score, 40);
    if (!score) {
      errors[`english.${index}.score`] = "Enter the test score, or choose 'No English test yet'.";
      return;
    }
    english.push({ testType, score, testDate: optional(item.testDate, 10) || null });
  });
  if (english.length === 0) english.push({ testType: "None" });

  const prefsRaw = Array.isArray(input.preferences) ? input.preferences : [];
  const preferences: PreferenceRow[] = [];
  prefsRaw.forEach((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const universityName = str(item.universityName, 160);
    if (!universityName) {
      if (str(item.programmeName)) errors[`preferences.${index}.universityName`] = "Choose a university.";
      return;
    }
    const level = str(item.level, 20) as (typeof LEVELS)[number];
    preferences.push({
      universitySlug: optional(item.universitySlug, 120),
      universityName,
      programmeName: optional(item.programmeName, 160),
      level: LEVELS.includes(level) ? level : undefined,
      subjectArea: optional(item.subjectArea, 120),
      isAlternative: item.isAlternative === true,
    });
  });
  if (preferences.length === 0) errors.preferences = "Add at least one preferred university.";

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName,
      dateOfBirth: dateOfBirth || null,
      gender: optional(input.gender, 20),
      nationality: optional(input.nationality, 60) ?? "Bangladesh",
      currentCountry: optional(input.currentCountry, 60),
      address: optional(input.address, 400),
      email,
      mobile: normalisePhone(mobileRaw),
      whatsapp: whatsappRaw ? normalisePhone(whatsappRaw) : undefined,
      altContact: altRaw ? normalisePhone(altRaw) : undefined,
      education,
      english,
      preferences,
      studyGap: optional(input.studyGap, 120),
      visaRefusal: optional(input.visaRefusal, 400),
      comments: optional(input.comments, 2000),
      referralSource: optional(input.referralSource, 120),
      consentData,
      consentContact,
      consentStorage,
    },
  };
}
