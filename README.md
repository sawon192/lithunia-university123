# GO ABROAD BD — Lithuania Admission Guide 2027

> Repository: `sawon192/lithunia-university123` (published 16 November 2026).
> Lineage: this project began as `sawon192/Lithunia-University` at commit `9a50f07`;
> that history and its README are preserved in the commit graph below.

A source-linked Lithuania university admissions guide **and** a student application desk for
Bangladeshi applicants, built with Next.js 16 (App Router, Turbopack), React 19, TypeScript and
Tailwind CSS 4.

- **Public site** — 24 researched institution profiles (13 universities + 11 colleges), the
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
| `/` | static | Home, directory of 24 institutions |
| `/universities/[slug]` | dynamic | Research profile: 8-point table, programmes, Bangladesh lens, sources |
| `/shortlist` | static | Saved institutions + shareable link generator |
| `/s/[slug]` | dynamic | Public read-only shared shortlist |
| `/apply` | static | 8-step student application (no account) |
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
| MOI Accepted | **7** | Accepted: VMU, KVK. Conditional: VU, VILNIUS TECH, ISM, KTU, MRU |
| University Internal English Test | **7** | KTU (free), MRU (free), VIKO (free), ISM, Kauno kolegija (€45), Alytus (€45), SMK (€50) |
| Alternative English Certificate | **14** | Duolingo, LanguageCert IESOL, Cambridge, EF SET, EnglishScore, IGCSE |
| Any of the three | **16** | the union of the above |

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

---

## 7. Student application form

`/apply` — eight steps, no account, mobile-first:

1. Personal · 2. Contact · 3. Academics (unlimited qualifications) · 4. English tests ·
5. Study preferences (multiple universities) · 6. Documents · 7. Background · 8. Consent.

On submit the server returns a reference (`GBD-2027-001001`), the student sees a printable summary
(`window.print()` → save as PDF), and any chosen files are uploaded afterwards.

Guards:

- every field is re-validated server-side in `src/lib/validation.ts`,
- consent is required at the database level (`student_applications_consent` check),
- duplicates are blocked for 24 h on the same email + name + first choice,
- 5 submissions per IP per hour, 40 uploads per IP per hour,
- uploads restricted to PDF/JPG/PNG/WEBP, ≤10 MB.

---

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
npm run verify      # typecheck + lint + build
```

---

## 12. Testing status

Verified on 15–16 November 2026 (English Test Alternatives added 16 November) against a production build (`npm run build` + `npm run start`)
in local mode, plus real PostgreSQL DDL for the migrations.

| # | Test | Result |
|---|---|---|
| 1 | Homepage renders, counters show 24 / 13 / 14 | Pass |
| 2 | Directory search & filters | Pass (unchanged component) |
| 3 | KTU profile (dates, fees, OMPT, sources, status panel) | Pass |
| 4 | MRU profile (Bangladesh table, OMPT, exclusions) | Pass |
| 5–9 | Programme spotlight, methodology, shortlist, privacy, eligibility notes | Pass |
| 10 | Apply form renders all 8 steps | Pass |
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
| E6 | Clear-all restores all 24 institutions | Pass |
| E7 | English filter combines with the city filter | Pass — Vilnius-only subset |
| E8 | Alternative-certificate result (14) and no IELTS/PTE/TOEFL anywhere in the alternative lists or chips | Pass |
| E9 | 390 px mobile: single column, no horizontal overflow | Pass |
| E10 | Profile section renders with anchor nav, IELTS/PTE/TOEFL bands, alternatives, "Last verified" | Pass |
| E11 | A conditional policy is labelled "Conditionally accepted", never as a general acceptance | Pass — MRU |

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
- **Rate limiting** is in-memory; on multi-region serverless scale, swap in Upstash Redis.
- **Audit history** is written by both trigger and API; if you later remove the API write, the
  trigger still covers it.
- **Deletion**: the privacy notice promises deletion on request. Use the Supabase dashboard or a
  small admin action — there is no delete button in the UI yet, deliberately, to prevent accidents.
