# GO ABROAD BD — Lithuania Admission Guide 2027

> Repository: `sawon192/lithunia-university123` (published 16 November 2026).
> Lineage: this project began as `sawon192/Lithunia-University` at commit `9a50f07`;
> that history and its README are preserved in the commit graph below.

A source-linked Lithuania university admissions guide **and** a student application desk for
Bangladeshi applicants, built with Next.js 16 (App Router, Turbopack), React 19, TypeScript and
Tailwind CSS 4.

- **Public site** — 25 researched institution profiles (14 universities + 11 colleges), the
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
| `/` | static | Home, directory of 25 institutions |
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

**Classification counts (recomputed from the data, 16 November 2026):**

| Filter option | Institutions | Which ones |
|---|---|---|
| MOI Accepted | **8** | Accepted: VMU, KVK. Conditional: VU, VILNIUS TECH, ISM, KTU, MRU, **KSU** |
| University Internal English Test | **8** | KTU (free), MRU (free), VIKO (free), ISM, **KSU (recorded interview)**, Kauno kolegija (€45), Alytus (€45), SMK (€50) |
| Alternative English Certificate | **14** | Duolingo, LanguageCert IESOL, Cambridge, EF SET, EnglishScore, IGCSE |
| Any of the three | **17** | the union of the above |

**Explicitly *not* accepted:** LSU, LCC, Kauno kolegija and its Alytus faculty refuse an MOI
certificate as proof of English — they are shown as "Not accepted", never as unknown.
**Not officially confirmed:** VDA, LBC, Utenos, SMK, VBC, VCD, VIKO, Panevėžio, Šiaulių, ILK,
Kolpingo, LCSS. LCSS is a research institute without its own degree intake.

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

**Classification (recomputed from the data, 17 November 2026):**

| Filter | Institutions | Which ones |
|---|---|---|
| **With OMPT** | **5** | VU (by programme, from 55%), VILNIUS TECH (≥60% / ≥50%), VMU (by programme, from 55%), KTU (A/D, 75%), MRU (A/D, 75%) |
| **Without OMPT** | **20** | 6 universities + 14 colleges |

Two rules were applied rather than assumed:

- **Silence is not an exemption.** 19 institutions publish no OMPT rule at all (KSU among them); they are recorded as
  `unconfirmed`, counted under *Without OMPT* (no published obligation) and never rendered as
  "OMPT not required". The profile panel says so in writing.
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
`scripts/eligibility-features.check.ts` (28 acceptance checks).

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
npm run test:eligibility  # 28 checks over the OMPT table, open profiles and the auto gap
npm run verify      # typecheck + lint + build
```

---

## 12. Testing status

Verified on 15–16 November 2026 (English Test Alternatives added 16 November) against a production build (`npm run build` + `npm run start`)
in local mode, plus real PostgreSQL DDL for the migrations.

| # | Test | Result |
|---|---|---|
| 1 | Homepage renders, counters show 25 / 14 / 11 | Pass |
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
| E6 | Clear-all restores all 25 institutions | Pass |
| E7 | English filter combines with the city filter | Pass — Vilnius-only subset |
| E8 | Alternative-certificate result (14) and no IELTS/PTE/TOEFL anywhere in the alternative lists or chips | Pass |
| E9 | 390 px mobile: single column, no horizontal overflow | Pass |
| E10 | Profile section renders with anchor nav, IELTS/PTE/TOEFL bands, alternatives, "Last verified" | Pass |
| E11 | A conditional policy is labelled "Conditionally accepted", never as a general acceptance | Pass — MRU |

### Queued eligibility features — acceptance checks

`npm run test:eligibility` (bundles `scripts/eligibility-features.check.ts` with the project's own
esbuild, then runs it in Node). **28/28 pass.**

| # | Test | Result |
|---|---|---|
| O1–O3 | Every institution has an OMPT record; 5 with / 19 without; silence is `unconfirmed`, never `"none"` | Pass |
| O4–O7 | A minimum score exists only where published; KTU 75% A/D, MRU mandatory, VMU programme floor 55% | Pass |
| O8–O11 | OMPT-D 80% passes KTU, 60% fails, OMPT-C rejected, KU silence never passes | Pass |
| Q1–Q5 | Alim-only, A-Level-only, O-Level-only and custom "other" profiles all assess; no cross-scale conversion | Pass |
| A1–A3 | Recorded OMPT satisfies KTU; missing OMPT keeps it conditional; an own test is never substituted | Pass |
| G1–G7 | Latest passing year wins, 2024 → 3 years, override wins, unknown gap is not zero, 9-year gap flags MRU | Pass |
| D1–D2 | Legacy flat fields still work and agree with the open list | Pass |

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
