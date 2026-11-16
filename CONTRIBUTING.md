# Contributing

Short guide for anyone picking this up — including future me.

## Getting it running

```bash
npm install
npm run dev          # http://localhost:3000
```

No database or `.env` file is required for local browsing. See `.env.example` and README §4 for the
Supabase configuration needed for applications, uploads and shared shortlists.

## Before opening a pull request

```bash
npx tsc --noEmit     # must be clean
npx eslint .         # must be 0 errors
npm run build        # must succeed
npm run check:db     # if you touched supabase/migrations (needs @electric-sql/pglite)
```

Build memory note: this project's build peaks above 2 GB of heap. On a constrained machine run it as
`NODE_OPTIONS=--max-old-space-size=1400 npm run build`.

## Research data rules

This is the part of the codebase where a careless edit does real harm to students.

1. **Never invent admission facts.** Every fact in `src/lib/research.ts` and `src/lib/colleges.ts`
   carries a `sources` key pointing at a real official page and a `verifiedOn` date. If you cannot
   verify something, mark it `unconfirmed` — the UI then shows "Awaiting official confirmation".
2. **A university-wide rule is not a programme rule.** If a requirement is published per programme,
   use `status: "programme"` so the UI shows "Published – Programme Specific".
3. **Never assume a Medium of Instruction letter is accepted.** Only `moiAccepted: "accepted"` or
   `"conditional"` with an official statement behind it. Evidence-free guesses are `"unconfirmed"`.
4. **IELTS, PTE Academic and TOEFL are never "alternative certificates."** They are standard
   requirements and live in `standardScoresBySlug`, above the alternatives grid.
5. **Record the source and the date you checked it**, not just the conclusion.

## Code conventions

- Navy `#0d2d50` primary, gold `#d4a54f` accent, white/light-grey surfaces. Keep new UI inside that
  palette and follow the existing block structure in `src/app/globals.css`.
- Prefer extending `src/lib/research.ts` and `src/lib/colleges.ts` over creating parallel models.
- Use the shared `BrandLogo` component rather than re-importing the emblem image.
- Escape apostrophes in JSX text (`&apos;` or typographic quotes) — the lint config rejects bare `'`.

## Commits

Conventional-ish prefixes (`feat:`, `fix:`, `docs:`, `chore:`) and a body explaining *why*. Never
commit `.env`, `.env.local`, `.data/`, `uploads/`, or exported application CSVs — `.gitignore` covers
them; check `git status` before you stage.
