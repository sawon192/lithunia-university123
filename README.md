# GO ABROAD BD — Lithuania Admission Guide 2027

> Repository: `sawon192/lithunia-university123` (published 16 November 2026).
> Lineage: this project began as `sawon192/Lithunia-University` at commit `9a50f07`;
> that history and its README are preserved in the commit graph below.

A source-linked Lithuania university admissions guide **and** a student application desk for
Bangladeshi applicants, built with Next.js 16 (App Router, Turbopack), React 19, TypeScript and
Tailwind CSS 4.

- **Public site** — 26 researched institution profiles (11 universities + 15 colleges), the
  eight-point admission research table per institution, programme spotlight, shortlist, and a
  multi-step September 2027 application form.
- **Admin desk** — protected `/admin` area with dashboard counters, student table, filters,
  CSV export, status workflow, internal notes, audit history and signed document access.

> The existing design, branding, routes and research content were preserved. KTU and MRU were
> added; nothing was rebuilt from scratch and no institution record was removed.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind 4 + the project's existing hand-written CSS system |
| Language | TypeScript 5.9 (strict) |
| Database | Supabase (managed PostgreSQL) |
| Storage | Supabase Storage — private `student-documents` bucket |
| Auth | Supabase Auth (staff) → signed httpOnly session cookie |
| Deployment | Vercel (production + preview) |

---

## 2. Quick start (no database needed)

```bash
git clone <your-repo-url>
cd Lithunia-University
npm install
npm run dev            # http://localhost:3000
```

Without Supabase environment variables the app runs in **local development mode**:

- applications are stored in `.data/applications.json` (git-ignored),
- uploaded files go to `.data/uploads/`,
- shared shortlists are stored in `.data/shortlists.json`,
- `/admin` sign-in uses `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env.local`.

Create `.env.local`:

```bash
ADMIN_EMAIL=counsellor@goabroadbd.com
ADMIN_PASSWORD=choose-something-long
```

Then sign in at **/admin/login**.

---

## 3. Environment variables

Copy `.env.example` → `.env.local` (development) and paste the same keys into
**Vercel → Settings → Environment Variables**.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | prod | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | prod | Public key; RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | prod | Bypasses RLS. Never expose to the browser |
| `ADMIN_SESSION_SECRET` | server only | prod | HMAC key for the staff session cookie |
| `RATE_LIMIT_SALT` | server only | prod | Salt for hashed IP abuse detection |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | server only | dev only | Local staff sign-in fallback |

`SUPABASE_SERVICE_ROLE_KEY` is read exclusively inside `src/lib/supabase/server.ts`, which begins
with `import "server-only"` — importing it from a client component is a build error.

---

## 4. Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations in order:

   **Option A — Supabase CLI (recommended)**

   ```bash
   npm i -g supabase
   supabase link --project-ref <your-project-ref>
   supabase db push          # runs supabase/migrations/*.sql in order
   ```

   **Option B — SQL editor**
   Paste `supabase/migrations/0001_init.sql`, then `0002_research_catalogue.sql`, into the SQL
   editor and run them.

3. Create the first staff account:

   ```sql
   -- 1. Supabase dashboard → Authentication → Users → "Add user"
   --    (use email + password, confirm the email)
   -- 2. Then grant the staff role:
   insert into public.admin_users (id, email, full_name, role)
   select id, email, 'Your Name', 'admin'
   from auth.users where email = 'you@goabroadbd.com';
   ```

   Every additional counsellor needs the same row with role `counsellor`.

4. The migrations create the private bucket `student-documents` (10 MB limit, PDF/JPG/PNG/WEBP)
   plus storage policies. No manual bucket creation is needed.

### Tables

`universities`, `programmes`, `admission_requirements`, `application_deadlines`, `research_sources`,
`student_applications`, `student_education`, `student_english_tests`, `student_preferences`,
`student_documents`, `counsellor_notes`, `application_status_history`, `admin_users`, `counsellors`,
`shortlists`, `shortlist_items`.

All use UUID primary keys, foreign keys with `on delete cascade` where appropriate, `created_at` /
`updated_at` timestamps, and CHECK constraints (for example all three consents must be true).

### Security model

- **RLS is enabled on every table.** Student tables have *no* anon policy, so the public key
  cannot read them at all.
- Public form submissions go through `POST /api/applications` using the service role on the server.
- Staff reads/writes are gated by `public.is_staff()` / `public.is_admin()` SQL functions.
- Documents live in a private bucket; staff open them through 10-minute signed URLs.
- Status changes are recorded automatically by the `application_status_audit` trigger **and** by
  the API, so the history survives any client.

Verify the schema without a database using the bundled checker:

```bash
npm i -D @electric-sql/pglite   # embedded Postgres, in-process
npm run check:db
```

It executes both migrations against real PostgreSQL DDL, stubs the Supabase `auth`/`storage`
schemas, and asserts the consent constraint and audit trigger behave correctly.

---

## 5. Routes

| Route | Type | Description |
|---|---|---|
| `/` | static | Home, directory of 26 institutions |
| `/universities/[slug]` | dynamic | Research profile: 8-point table, programmes, Bangladesh lens, sources |
| `/shortlist` | static | Saved institutions + shareable link generator |
| `/s/[slug]` | dynamic | Public read-only shared shortlist |
| `/apply` | static | Admission enquiry QR panel — scans/links to the Go Abroad BD enquiry form |
| `/methodology` | static | Verification standard |
| `/privacy` | static | Student data notice |
| `/admin/login` | dynamic | Staff sign-in |
| `/admin` | dynamic | Dashboard, table, research status board |

API:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/applications` | public + rate limit | Create an application |
| `POST /api/applications/[id]/documents` | public (reference is the capability) | Upload a document |
| `POST /api/shortlist` | public + rate limit | Create a shareable shortlist |
| `GET /api/shortlist/[slug]` | public | Read a published shortlist |
| `PATCH /api/shortlist/[slug]` | `x-shortlist-token` header | Update a shortlist |
| `POST /api/admin/login` / `logout` | — | Staff session |
| `GET /api/admin/applications/[id]` | staff session | Single record |
| `GET /api/admin/applications/[id]/document` | staff session | Signed document URL |
| `POST /api/admin/applications/[id]/status` | staff session | Change status |
| `POST /api/admin/applications/[id]/notes` | staff session | Add internal note |
| `GET /api/admin/export` | staff session | CSV export of filtered records |
| `GET /api/health` | public | Deployment capability probe |

---

## 6. Research data

All editorial research lives in `src/lib/research.ts` (universities + sources + helpers) and
`src/lib/colleges.ts` (colleges). Each fact carries:

```ts
{
  text: "...",
  sources: ["ktuBachelor"],     // key into `sources`
  status: "published",          // published | programme | earlier | unconfirmed | conflicting
  intake?: "September 2027",
  level?: "Bachelor" | "Master" | "Both",
  verifiedOn?: "15 November 2026",
}
```

The five verification states map to the labels counsellors see:

| `status` | Label shown |
|---|---|
| `published` | Officially Confirmed |
| `programme` | Published – Programme Specific |
| `earlier` | Previous Intake Information |
| `unconfirmed` | Awaiting Official Confirmation |
| `conflicting` | Conflicting Official Information |

`verificationRank()` rolls the worst case per profile into a **research status indicator** on every
university page, and `sectionsNeedingUpdate()` lists exactly which of the eight rows need re-checking.
The same list drives the research status board on `/admin`.

### What was added for KTU and MRU

Official sources used (all on the universities' own domains):

- KTU: `admissions.ktu.edu` (2027 announcement, Bachelor's, Master's, academic recognition),
  `apply.ktu.edu` programme pages, 2026 Admission Rules PDF.
- MRU: `mruni.eu` admission procedure, Bangladesh country-specific requirements, OMPT
  requirements PDF, and individual programme pages (`/en/study_program/...`).

Confirmed and published for September 2027:

| | KTU | MRU |
|---|---|---|
| Applications open | 15 Oct 2026 | 1 Nov 2026 |
| Non-EU deadline | 31 May 2027 | 1 June 2027 |
| Application fee | €100 | €100 (non-EU) + €50 registration on acceptance |
| Tuition (current published) | €3,250–€4,201 bachelor's, €4,690–€5,641 master's | €3,250–€4,200 bachelor's, €3,518–€4,690 master's |
| English | B2 bachelor's (IELTS 5.5 / TOEFL 75), C1 master's (IELTS 6.0 / TOEFL 85) | B2 (IELTS 5.5–6.5, TOEFL 72–94, PTE 59–75, Duolingo 100–125) |
| Entrance test | OMPT-A/D, 75% minimum, taken by 1 April, ≤2 attempts — country list confirms per programme | **OMPT mandatory for Bangladesh** (stated in MRU's own country table) |

Explicitly flagged rather than invented: KTU's 2027/28 fee table, its Bangladesh OMPT country
list, MRU's 2027–28 tuition, and MRU's Alim / Diploma-in-Engineering exclusions (which MRU states
positively).

### What was added for KSU

**Kazimieras Simonavičius University (KSU)** — Vilnius, private, slug
`kazimieras-simonavicius-university`. Sources: `apply.ksu.lt` (its DreamApply international portal:
application overview, 2027/28 programme catalogue and every programme page), plus
`ksu.lt/en/admission-2027/`.

Everything below is what KSU has published for the **Fall 2027/28** cycle:

| Item | Published detail |
|---|---|
| Application fee | €250 non-refundable, paid by Flywire once the admissions team invites the applicant forward. Reduced €100 for Lithuanian applicants |
| Applications open | 5 Nov 2026 (Business Management, Aviation Management, Communication and Digital Media); 1 Dec 2026 (Fashion Business and Communication, Film Business Management); 15 Oct 2026 (MA Fashion Management) |
| Deadline | 1 March 2027, 23:59:59 EET — the same date on every open programme |
| Studies begin | 1 October 2027 |
| Bachelor's entry | Completed secondary education **plus** final-year exam proof in Mathematics and one other subject (Math replaceable by science/IT/commerce). Communication and Fashion instead require two subjects of choice |
| Master's entry | Undergraduate diploma in the named fields (Management, Business and other Social Sciences; Communication for Strategic Communication Studies) |
| English | Bachelor's: a certificate is **optional** — English is assessed in the recorded interview. Master's: diploma-supplement English grade 8+, or any B2+ certificate/test (IELTS/TOEFL named as examples). **No numeric band is published at either level** |
| Tuition | €2,450/semester (BA Business Management, Communication, Fashion, Film); €6,000/year (BA Aviation); €4,000/semester (MA Aviation); €3,450/semester (MBA); €9,300/programme (MA Organizational Innovation, MA Strategic Communication); €7,800/programme (MA Fashion) |
| Payment schedule | The **first payment must cover three semesters (1.5 years)** on the semester-priced bachelor's programmes, or the full programme fee on the 1.5-year master's — required before acceptance and before KSU will support a TRP application |
| Study gap | 1–5 years generally acceptable; longer is treated as an academic risk factor that can stop processing |
| OMPT | **Not mentioned anywhere** — recorded as `unconfirmed`, never as an exemption. The only maths element is the final-year Mathematics exam proof |

Recorded as **unconfirmed rather than invented**: KSU's country-specific requirements page is served
behind a security check that returned HTTP 454 to this build, so no Bangladesh-specific document list
or HSC GPA threshold could be read. KSU's programme pages publish no numeric grade minimum for
foreign qualifications either, so the profile says so in writing instead of quoting a number.
The Admission 2027 page also shows a €200 fee figure in one block, which conflicts with the €250 on
the portal and every programme page — that conflict is recorded, not resolved by guessing.

KSU's English route is the one genuinely unusual finding here: it is the first institution in this
guide where a **Bachelor's applicant can be admitted without any English certificate at all**, because
KSU assesses English inside the mandatory recorded interview. The profile states that explicitly —
and also states that this is an assessment, not a waiver a student can rely on in advance.

### English Test Alternatives

A second, purpose-built layer sits on top of the eight research rows:
`src/lib/english-alternatives.ts` holds one verified English profile per institution, keyed by the
same slug, and `src/lib/research.ts` attaches it as `institution.english`. There is no parallel
university model — the directory filter and the profile section read from this single source, so
counts and labels can never disagree.

```ts
{
  moiAccepted: "accepted" | "conditional" | "not_accepted" | "unconfirmed",
  moiConditions?: string,                       // the exact condition, when there is one
  internalEnglishTest: { available, name?, fee?, format?, minimumLevel?, notes? },
  alternativeEnglishCertificates: [...],        // never IELTS / PTE / TOEFL
  englishRequirementNotes: string,
  englishRequirementSource: SourceKey,          // key into `sources`
  englishRequirementVerifiedAt: "2026-11-16",
  englishRequirementStatus: "officially_confirmed" | "programme_specific" | "previous_intake"
                          | "not_officially_confirmed" | "conflicting",
}
```

Published IELTS / PTE / TOEFL bands live next to it in `standardScoresBySlug` and are shown verbatim.

**Classification counts (recomputed from the data, 18 November 2026):**

| Filter option | Institutions | Which ones |
|---|---|---|
| MOI Accepted | **8** | Accepted: VMU, KVK. Conditional: VU, VILNIUS TECH, ISM, KTU, MRU, **KSU** (LIK publishes no MOI rule) |
| University Internal English Test | **9** | KTU (free), MRU (free), VIKO (free), ISM, **KSU (recorded interview)**, **VBC (€50 Oxford placement test)**, Kauno kolegija (€45), Alytus (€45), SMK (€50) |
| Alternative English Certificate | **16** | Duolingo, LanguageCert IESOL, Cambridge, EF SET, EnglishScore, IGCSE |
| Any of the three | **19** | the union of the above |

**Explicitly *not* accepted:** LSU, LCC, Kauno kolegija and its Alytus faculty refuse an MOI
certificate as proof of English — they are shown as "Not accepted", never as unknown.
**Not officially confirmed:** VDA, LBC, Utenos, SMK, VCD, VIKO, Panevėžio, Šiaulių, ILK,
Kolpingo, LCSS. LCSS is a research institute without its own degree intake. VBC is no longer in this
list: its admission page publishes the exact accepted-certificate table, the €50 Oxford Online
Placement Test it runs itself, and the B2 preparatory-course route (see below).

**VBC (re-verified 17 November 2026).** The English profile was previously an approximate
CEFR-to-score mapping because only "B2" had been read from a programme page. VBC's Admission page and
FAQ actually publish the whole table: Cambridge B2 First / B2 Business Vantage, IELTS Academic
5.5–6.5, Pearson PTE **Level 3 (B2)**, TOEFL iBT **60**, TOEIC 785, LCCI Level 2/3 — plus the
**€50 Oxford Online Placement Test** VBC runs online, and one semester of the AEPP (**€1,700**, not
the €3,400 previously recorded) for applicants below B2. Two corrections followed: **Duolingo is not
on VBC's list**, so its invented Duolingo 105 and a guessed TOEFL 72 were removed, and VBC now shows
as having its own English test.

**VMU also accepts the EnglishScore (18 November 2026).** Vytautas Magnus University's own
admission FAQ publishes *"EnglishScore 400–499 (CoreSkills)"* in the B2 list — the same band it
applies to Duolingo 100–125 and IELTS 5.5–6.5, at both Bachelor's and Master's level. It is now
recorded in the facts, in `entryRules` (`englishScore: 400`) and in the alternative-certificate grid.

Reading that FAQ also exposed certificates our VMU row was silently missing, all now recorded:
Cambridge FCE and BEC Vantage 161–180, Michigan ECCE 650+, PTE General Level 3, TOEIC 785 (L&R) /
310 (S&W), Cambridge IGCSE English First or Second Language at grade B, and TOEFL PBT 534–633. The
FAQ also states plainly that VMU offers **no preparatory programme and no English admissions test**,
so a B2 certificate or an MOI is required with the application.

**LIK and the British Council EnglishScore (17 November 2026).** Lietuvos inžinerijos kolegija
(`lik.tech`) was not in the dataset at all — note that it is a *different* institution from ILK,
St. Ignatius of Loyola College, which already listed EnglishScore. It is now a full profile, and its
Degree Studies page publishes the EnglishScore acceptance directly:

| Test | LIK minimum |
|---|---|
| Academic IELTS | 5.5 overall |
| Pearson PTE Academic | 59 |
| TOEFL | 72 |
| CAE | 160 |
| **British Council EnglishScore** | **400** |

Everything else the profile now records, from the same page and the 2026 admission-procedure PDF:
a 7.5/10 (65%) entry score averaged over Mathematics, English, Physics and Chemistry/IT — with
Biology and Geography added for Environmental Engineering — the college's own **mathematics test at
70%**, a mandatory English interview, **€4,000/year** tuition, a **15 April** deadline with **no
spring intake**, and two years of tuition payable before the residence-permit stage.

One discrepancy is recorded rather than smoothed over: the formal admission-procedure PDF lists only
IELTS, PTE, TOEFL and CAE, and does **not** name EnglishScore. The Degree Studies page does, and it is
the more specific and more recent statement, so EnglishScore 400 is marked accepted with the
discrepancy documented in the fact itself.

**Diploma routes, audited college by college (17 November 2026).** Every college's diploma
status was re-checked against its own pages, so no college is left at "awaiting confirmation":

| College | Route | What the college publishes |
|---|---|---|
| SMK | Accepted | diploma listed as an entry document |
| Vilnius Business College | Accepted | "certificate of secondary education or diploma"; 60% overall, 70% English + 70% one subject |
| Kauno kolegija (incl. Alytus Faculty) | Accepted | "If you have a 4-year Diploma in Engineering qualification, you are eligible for admission to higher education in engineering" — Bangladesh HSC GPA ≥ 3.50 otherwise |
| LTVK, Utenos, VCD, VIKO, KVK, Panevėžys, Šiauliai, ILK, Kolpingo, LIK | Conditional | the document class is a diploma/qualification and admission turns on academic recognition, not on a named school-leaving certificate |
| LCSS | Not applicable | no bachelor's intake |

The important distinction this audit produced: a *conditional* route is not a hidden "yes". It means
the college accepts a qualification document in principle but the decision is a recognition
decision, so the profile names the threshold where one exists (Kolpingo 55% CGPA, Šiauliai
competitive score 2.0/10, ILK 46% exam average, KVK 50% in the required subject) and says what to
ask the admissions office where one does not.

Two results worth calling out because they contradict the usual agent advice:

- **KVK accepts an MOI certificate** and states the Duolingo test is *not* accepted
  (EF SET 41–50, LanguageCert B1 and EnglishScore 317 are).
- **Alytus College is now a faculty of Kauno kolegija**, so Kauno kolegija's stricter rule
  (MOI refused, €45 Cambridge placement test) applies there too.

A "conditional" MOI verdict means the institution accepts English-medium prior study but attaches
conditions; it is never rendered as a general acceptance. Standard tests are listed in their own
row above the alternatives grid so they can never be mistaken for an alternative.

**Files:** `src/lib/english-alternatives.ts` (data + helpers), `src/components/english-alternatives-profile.tsx`
(profile section), `src/components/university-directory.tsx` (filter + card chips),
`src/app/globals.css` (`.english-*` blocks), `src/app/universities/[slug]/page.tsx` (section + anchor).

### OMPT requirement table — with / without

A third single-source layer sits beside the English profiles: `src/lib/ompt.ts` holds one verified
OMPT record per institution, keyed by the same slug. The directory filter, the card chip, the
`omptSummary` line in the card footer and sidebar, the profile panel, and the eligibility engine all
read from it — so a count in the UI can never disagree with a verdict in a report.

```ts
{
  status: "required" | "programme" | "unconfirmed" | "not-applicable",
  minimumPercent?: 75,                 // only when the institution publishes a score
  versions?: ["A", "D"],               // only when it names the versions
  alternative?: "…",                   // a published assessment that is NOT OMPT
  verifiedOn: "2026-11-17",
  note: "…",                           // the sourced rule, in full
}
```

**Classification (recomputed from the data, 18 November 2026):**

| Filter | Institutions | Which ones |
|---|---|---|
| **With OMPT** | **5** | VU (by programme, from 55%), VILNIUS TECH (≥60% / ≥50%), VMU (by programme, from 55%), KTU (A/D, 75%), MRU (A/D, 75%) |
| **Without OMPT** | **21** | 5 universities + 16 colleges |

Two rules were applied rather than assumed:

- **Silence is not an exemption.** 20 institutions publish no OMPT rule at all (KSU and LIK among them); they are recorded as
  `unconfirmed`, counted under *Without OMPT* (no published obligation) and never rendered as
  "OMPT not required". The profile panel says so in writing. LIK is the newest of the 20.
- **A published alternative is never called an exemption.** LSU and ISM run their own maths
  assessment, LCC adds a Skills and Knowledge Test, VDA/VCD use a portfolio, VBC/SMK an interview,
  KVK a competitive-score weighting. Those are recorded in `alternative` and the engine keeps any
  real OMPT obligation open.

`npm run test:eligibility` asserts the 5 / 19 split, that no record is silently `"none"`, and that a
minimum score exists only where one was published.

### Eligibility engine: any-type qualifications, any-type assessments, automatic gap

`src/lib/student-profile.ts` replaces the engine's fixed SSC → HSC → Diploma → Bachelor slots with
two open lists, so a student can record **any qualification type** and **any entrance assessment**:

- `qualificationLabels` — SSC/O-Level, HSC/A-Level, Alim/Fazil, separate O-Level, separate A-Level,
  Diploma, Bachelor, Master, or a free-text "other".
- `assessmentLabels` — OMPT (with version), an institution's own entrance test, a state/board
  examination, SAT, ACT, portfolio, interview, or "other".

The research rules are unchanged and still enforced by tests:

1. **No cross-scale conversion.** A percentage rule is only ever measured as the student's own
   result ÷ the student's own scale maximum. An HSC GPA of 4.50/5.00 matches a 60% rule; an
   O-Level grade of 7/9 does not become an HSC GPA, so VU's HSC-4.50 rule stays unmet.
2. **A published HSC rule only reads an HSC-scale award.** `hscGpa5` looks at the HSC row (or an
   A-Level row explicitly on a 5.00 scale) and nothing else.
3. **Unknowns never upgrade.** The existing downgrade rule applies to the new fields too.

**Passing-year auto gap.** Each qualification carries a `passingYear`. The engine takes the latest
one and derives the gap to September 2027 (`derivedGapYears`); the form shows the working
("Latest passing year 2024 → September 2027, so the study gap is 3 years"). An explicit override is
available, and how it was decided is shown in the form and the report (`auto` / `override`).
A gap that cannot be derived is **not** treated as zero: institutions that publish a limit are
noted, never passed or failed on a figure the desk does not have.

**Any-type assessments.** A recorded OMPT result is checked against the institution's own published
rule — version and score (`checkOmptResult`). OMPT-D 80% satisfies KTU; OMPT-D 60% stays open;
OMT-C is rejected because KTU names only A and D. Any other assessment is recorded as evidence and
the report says in as many words that it is *not* an OMPT certificate, so an own test never
silently fills an OMPT obligation.

**Files:** `src/lib/ompt.ts` (OMPT table + checks), `src/lib/student-profile.ts` (open model + gap),
`src/lib/eligibility.ts` (engine), `src/components/eligibility-tool.tsx` (form + report),
`src/components/ompt-panel.tsx` (profile panel), `src/components/university-directory.tsx`
(with/without filter + chips), `src/app/globals.css` (`.ompt-*`, `.el-row*`, `.el-gap-*`, `.el-tally`),
`scripts/eligibility-features.check.ts` (44 acceptance checks).

---

### Qualification backgrounds and streams (A9)

A qualification row now records *what the student studied*, not only *what level they reached*.
A student can say "SSC in Science", "HSC in Business Studies", "Diploma in Mechanical Engineering"
or "BSc in Computer Science", and the same for masters level.

- `streamOptions` in `src/lib/student-profile.ts` — **102 options** across nine types:
  SSC 5, HSC 5, Alim/Fazil 2, O-Level 3, A-Level 4, Diploma 23, Bachelor 49, Master 10, Other 1.
  The list is deliberately longer than the handful of examples in the request (science,
  humanities, commerce, BBA, BSc CS, EEE, mechanical) so it reads as exhaustive; every type ends
  with an "Other …" entry plus a free-text field, so a student is never blocked by a missing option.
- Diploma streams cover Civil, Electrical, Electronics, Mechanical, Computer, Automobile,
  Construction, Textile, Chemical, Agriculture, Fisheries, Livestock, Forestry, Medical, Nursing,
  Pharmacy, Business, Accounting, Marketing, Tourism, IT and Design.
- Bachelor streams cover BBA/BCom variants, the BA family, BSc CS/SE/IT/Data, EEE, Electrical,
  Mechanical, Civil, Chemical, Industrial, Textile, Automobile, Aeronautical, Architecture, the
  science family, Pharmacy, Nursing, Agriculture, Environmental, LLB, B.Ed, B.Arch, MBBS,
  Design and Journalism.

Two rules keep this from becoming a hidden upgrade path:

1. **A stream describes the student, never the institution.** It is used only to *find* the
   programme the student names; the verdict still comes exclusively from the institution's
   published `entryRules`. S5 asserts this.
2. **Streams never rewrite a grade scale.** `defaultMaxGrade`, the HSC-scale rules and the
   no-cross-scale-conversion rule are untouched, so adding a stream cannot move a verdict either
   way on its own.

`eligibility.ts` passes the recorded stream words into `subjectMatchFor`, so a programme named
"Software Engineering" matches `BSc — Software Engineering` and a "Physiotherapy" programme
matches `BSc — Physiotherapy`, without loosening the grade checks. `disciplineOf()` buckets each
stream (`science`, `humanities`, `business`, `engineering`, `it`, `health`, `design`, `law`,
`education`, `agriculture`, `other`); engineering and IT are kept apart on purpose, so
`Diploma in Electrical Engineering` and `BSc — Computer Science` do not collapse into one another.

**Taxonomy in the enquiry pipeline.** `src/lib/validation.ts` accepts **18** qualification labels
(SSC, O-Level, HSC, A-Level, Alim, Fazil, Diploma, Diploma in Engineering, Bachelors, BBA, BSc,
BEng, LLB, MBBS, Masters, MBA, MSc, Other) — validating at 40 characters instead of 20 so
"Diploma in Engineering" is not truncated into an invalid value. `src/components/apply-form.tsx`
offers the same 18 labels with per-label group hints. The stored `student_education` rows now carry
a `discipline` column.

**Migration required:** `supabase/migrations/0003_education_taxonomy.sql` replaces the anonymous
`qualification` CHECK with a named 18-value constraint and adds `discipline` + an index. Until it
is run against the Supabase project, an application that uses one of the new labels is rejected by
the database (the CHECK still lists the original six). The page itself is unaffected — `/apply`
has no form of its own.


---

---

## 7. Admission enquiry (`/apply`)

`/apply` is deliberately **one thing**: a QR panel that puts a student in front of a real
counsellor. It contains no form of its own.

- Large, high-contrast QR at a fixed 240 px (200 px on small screens) as the scan target, generated
  from the same URL the printed artwork encodes:
  `https://app.leadsnimble.com/go-abroad-bd/f/admission-inquiry`
- The Go Abroad BD poster beside it as the visual anchor (WebP 141 KB + JPG fallback, served from
  `public/qr/`; the 5 MB PNG is kept as the print master and is not loaded by the page).
- A visible text fallback link for desktop visitors, who cannot scan their own screen.
- Plain `<img>` rather than `next/image` for the QR: the optimiser can alter the module pattern.

All existing "Apply" links (header, footer, homepage, `/diploma`, `/eligibility`, the report
footnote, `/s/[slug]`) keep their labels and land on this panel.

**The in-house application form is retired from the page.** `src/components/apply-form.tsx` and the
`/api/applications*` routes remain in the codebase but are no longer reachable from the UI, so
nothing new reaches the `/admin` pipeline. Existing applications, notes, status workflow, audit
history and CSV export all keep working from the `/admin` desk. Re-enabling the form is a matter of
rendering `ApplyForm` on a page again — the validation, store and database layers are untouched.

Because submissions are now collected by the enquiry system, `/privacy` carries a short note saying
where the form lives and that this site no longer stores application forms or uploaded documents.

**Assets:** `public/qr/admission-inquiry-qr.png` (generated, error-correction level H, verified by
decoding), `public/qr/admission-poster.webp`, `public/qr/admission-poster.jpg`,
`public/qr/admission-poster.png` (source, not referenced by the page).

> Regenerate the QR with the same URL only. Changing it silently breaks every printed poster.

## 8. Admin workflow

`/admin` (staff only):

- eight counters: total, new, under review, documents pending, eligible, with universities,
  offers, rejected;
- filter by status, university, free text (name, reference, email, phone);
- open a record: contact, academics, English, preferences, documents (signed links), status
  change, notes, history, consents;
- CSV export respects the active filters and neutralises spreadsheet formula injection;
- research status board listing every profile with a stale section.

Statuses: `New → Under Review → Documents Required → Eligible / Not Eligible → Ready to Apply →
Application Submitted → Offer Received → Visa Processing → Visa Approved / Visa Refused → Closed`.

---

## 9. Shareable shortlists

Students save institutions in the browser as before. **Share this shortlist** on `/shortlist` now
POSTs the list to the server and returns a permanent link (`/s/abc123`):

- works across devices, browsers and offices — nothing depends on `localStorage`;
- public visitors get a read-only page;
- the edit token is stored only in the owner's browser and is never placed in the URL;
- `PATCH /api/shortlist/[slug]` returns 401/403 without the token.

---

## 10. Deployment (Vercel)

1. Push the branch: `git push origin feat/ktu-mru-apply-admin`.
2. In the existing Vercel project, set the environment variables from §3 for **Production** and
   **Preview**.
3. Deploy: Vercel builds with `npm run build`; `vercel.json` adds security headers for `/api`,
   `/admin` and `/s`.
4. After the first deploy check:

   ```bash
   curl -s https://<your-domain>/api/health
   # {"ok":true,"database":"supabase","documents":"supabase-private-bucket",...}
   ```

   `"database":"disabled"` means the Supabase variables are missing — the site still renders, but
   applications would be written to a local file that does not persist on serverless hosts.
5. Create the first `admin_users` row (§4.3) before trying `/admin/login`.

### Branch strategy

- `main` stays the production branch.
- Work happens on `feat/ktu-mru-apply-admin` (and any follow-ups), merged only after
  `npm run verify` and a manual pass through the checklist in §12.

---

## 11. Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run check:db    # run migrations against embedded Postgres
npm run test:eligibility  # 44 checks over the OMPT table, open profiles, streams and the auto gap
npm run verify      # typecheck + lint + build
```

---

## 12. Testing status

Verified on 15–16 November 2026 (English Test Alternatives added 16 November) against a production build (`npm run build` + `npm run start`)
in local mode, plus real PostgreSQL DDL for the migrations.

| # | Test | Result |
|---|---|---|
| 1 | Homepage renders, counters show 26 / 11 / 15 | Pass |
| 2 | Directory search & filters | Pass (unchanged component) |
| 3 | KTU profile (dates, fees, OMPT, sources, status panel) | Pass |
| 4 | MRU profile (Bangladesh table, OMPT, exclusions) | Pass |
| 5–9 | Programme spotlight, methodology, shortlist, privacy, eligibility notes | Pass |
| 10 | `/apply` renders the QR panel: QR + poster + fallback URL, no form markup | Pass (structure checked in the rendered HTML) |
| 11 | Server validation rejects bad name/email/phone/consent → 422 | Pass |
| 12 | Document upload accepts PDF, rejects .exe → 415 | Pass |
| 13 | Application persisted with education/English/preferences rows | Pass |
| 14 | Duplicate submission blocked → 409 | Pass |
| 15 | `/admin` without session → 307 redirect to `/admin/login` | Pass |
| 16 | Admin API without session → 401 | Pass |
| 17 | Staff login (correct / wrong password) | Pass |
| 18 | Status change + automatic history entry | Pass |
| 19 | Internal note stored | Pass |
| 20 | CSV export, filtered, formula-injection safe | Pass |
| 21 | Shared shortlist create / public read / 401 without token | Pass |
| 22 | Migrations run clean; consent constraint + audit trigger fire | Pass |
| 23 | Production build, all 23 routes | Pass |
| 24 | Mobile layout | Reviewed at 650/760/820 px breakpoints in CSS; manual device pass recommended |

### English Test Alternatives — acceptance tests

Run against the production build with a headless Chromium (`node scripts/english-alternatives.test.mjs`,
requires `npm run start` on port 3100 and `playwright` installed locally). **11/11 pass.**

| # | Test | Result |
|---|---|---|
| E1 | Exactly three multi-select options are rendered | Pass — MOI Accepted / Internal Test / Alternative Certificate |
| E2 | Per-option counts are computed from data | Pass — 7 / 7 / 14 |
| E3 | MOI Accepted alone → 7 institutions | Pass |
| E4 | Two options selected → union of 11, shared institutions counted once | Pass |
| E5 | Active-filter indicator + clear-all button appear | Pass — "2 of 3 selected" |
| E6 | Clear-all restores all 26 institutions | Pass |
| E7 | English filter combines with the city filter | Pass — Vilnius-only subset |
| E8 | Alternative-certificate result (14) and no IELTS/PTE/TOEFL anywhere in the alternative lists or chips | Pass |
| E9 | 390 px mobile: single column, no horizontal overflow | Pass |
| E10 | Profile section renders with anchor nav, IELTS/PTE/TOEFL bands, alternatives, "Last verified" | Pass |
| E11 | A conditional policy is labelled "Conditionally accepted", never as a general acceptance | Pass — MRU |

### Queued eligibility features — acceptance checks

`npm run test:eligibility` (bundles `scripts/eligibility-features.check.ts` with the project's own
esbuild, then runs it in Node). **44/44 pass.**

| # | Test | Result |
|---|---|---|
| O1–O3 | Every institution has an OMPT record; 5 with / 19 without; silence is `unconfirmed`, never `"none"` | Pass |
| O4–O7 | A minimum score exists only where published; KTU 75% A/D, MRU mandatory, VMU programme floor 55% | Pass |
| O8–O11 | OMPT-D 80% passes KTU, 60% fails, OMPT-C rejected, KU silence never passes | Pass |
| Q1–Q5 | Alim-only, A-Level-only, O-Level-only and custom "other" profiles all assess; no cross-scale conversion | Pass |
| A1–A3 | Recorded OMPT satisfies KTU; missing OMPT keeps it conditional; an own test is never substituted | Pass |
| G1–G7 | Latest passing year wins, 2024 → 3 years, override wins, unknown gap is not zero, 9-year gap flags MRU | Pass |
| D1–D2 | Legacy flat fields still work and agree with the open list | Pass |
| D5–D6 | Kauno kolegija's published 4-year Diploma in Engineering route passes; every college has a resolved diploma route | Pass |
| E1–E4 | EnglishScore appears only where an institution publishes it; VMU's 400 floor is judged both directions; Vilnius University is never treated as accepting it | Pass |
| S1–S5 | Every stream option resolves to a label and a discipline; codes are unique per type; engineering and IT stay apart; a written-in stream survives; a student's own group never becomes an institution rule | Pass |
| T1–T2 | Every qualification label the form offers is accepted by server validation; the diploma-in-engineering and degree names the user asked for are all present | Pass |

DOM-level checks (needs a headless Chromium, as with E1–E11): the with/without filter, its live
counts, the card chips, the profile OMPT panel, adding/removing qualification and assessment rows,
and the gap card recalculating on a passing-year change.

Not testable in this environment (needs your credentials):

- live Supabase reads/writes and storage signed URLs,
- Supabase Auth staff sign-in,
- Vercel deployment itself,
- uploads larger than the 10 MB limit against the real bucket,
- real-device iPhone/Android rendering.

---

## 13. Known gaps

- **Sanctioned migration**: `supabase/migrations` has been executed against real PostgreSQL DDL,
  but not against your Supabase project — run `supabase db push` and confirm.
- **Images**: `/images/vilnius-old-town.jpg` was already missing from the repository before this
  work (`next/image` returns 404). Add `public/images/vilnius-old-town.jpg` or the hero falls back
  to the overlay only.
- **PTE for KTU**: KTU does not name PTE Academic in its published English list. This is flagged as
  "not officially confirmed" rather than assumed.
- **OMPT versions**: VILNIUS TECH and KTU's Bangladesh/Alim route do not publish which letter
  version applies to a given applicant. The table records the versions each institution names
  overall and the engine treats an unnamed version as unverified rather than a pass.
- **Rate limiting** is in-memory; on multi-region serverless scale, swap in Upstash Redis.
- **Audit history** is written by both trigger and API; if you later remove the API write, the
  trigger still covers it.
- **Deletion**: the privacy notice promises deletion on request. Use the Supabase dashboard or a
  small admin action — there is no delete button in the UI yet, deliberately, to prevent accidents.
