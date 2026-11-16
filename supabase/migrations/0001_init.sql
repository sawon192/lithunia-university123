-- ============================================================================
-- GO ABROAD BD · Lithuania Admission Guide 2027
-- Migration 0001 — research catalogue, student applications, admin, shortlists
-- Target: Supabase (managed PostgreSQL 15+)
--
-- Run with:  supabase db push          (CLI, recommended)
--        or  paste into Supabase → SQL Editor
--
-- Design rules enforced here:
--   * UUID primary keys everywhere
--   * private student data is never readable with the anon key
--   * all student writes go through the server (service role) or a crypto token
--   * uploaded documents live in a private bucket and are read via signed URLs
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum (
      'New',
      'Under Review',
      'Documents Required',
      'Eligible',
      'Not Eligible',
      'Ready to Apply',
      'Application Submitted',
      'Offer Received',
      'Visa Processing',
      'Visa Approved',
      'Visa Refused',
      'Closed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('admin', 'counsellor');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum (
      'Officially Confirmed',
      'Published – Programme Specific',
      'Previous Intake Information',
      'Awaiting Official Confirmation',
      'Conflicting Official Information'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Research catalogue (public, read-only)
--    Mirrors src/lib/research.ts so counsellors can keep research in the
--    database instead of shipping a code change for every date.
-- ---------------------------------------------------------------------------

create table if not exists public.universities (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  abbreviation  text,
  category      text not null default 'university' check (category in ('university', 'college')),
  city          text,
  area          text,
  website       text,
  apply_url     text,
  description   text,
  status        text not null default 'waiting' check (status in ('dates', 'partial', 'waiting', 'none')),
  verified_on   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.programmes (
  id            uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name          text not null,
  level         text not null check (level in ('Bachelor', 'Master', 'Integrated', 'Doctoral', 'Other')),
  duration      text,
  language      text,
  intake        text,
  tuition_text  text,
  source_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists programmes_university_idx on public.programmes(university_id);
create index if not exists programmes_level_idx on public.programmes(level);

create table if not exists public.research_sources (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  label         text not null,
  url           text not null,
  publisher     text,
  created_at    timestamptz not null default now()
);

create table if not exists public.admission_requirements (
  id                  uuid primary key default gen_random_uuid(),
  university_id       uuid not null references public.universities(id) on delete cascade,
  programme_id        uuid references public.programmes(id) on delete cascade,
  section             text not null check (section in (
                        'fee', 'opening', 'deadline', 'academic', 'english', 'tuition', 'programmes', 'ompt'
                      )),
  level               text check (level in ('Bachelor', 'Master', 'Both')),
  intake              text,
  value_text          text not null,
  verification        public.verification_status not null default 'Awaiting Official Confirmation',
  source_url          text,
  verified_on         date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists requirements_university_idx on public.admission_requirements(university_id);
create index if not exists requirements_section_idx on public.admission_requirements(section);

create table if not exists public.application_deadlines (
  id            uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  programme_id  uuid references public.programmes(id) on delete cascade,
  intake        text not null,
  opens_on      date,
  closes_on     date,
  applicant_group text,
  note          text,
  verification  public.verification_status not null default 'Awaiting Official Confirmation',
  source_url    text,
  verified_on   date,
  created_at    timestamptz not null default now()
);
create index if not exists deadlines_university_idx on public.application_deadlines(university_id);

-- ---------------------------------------------------------------------------
-- 2. Admin users + roles
--    A row only exists for staff who were explicitly invited. There is no
--    self-service signup path.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.admin_role not null default 'counsellor',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint admin_users_email_lower check (email = lower(email))
);
create unique index if not exists admin_users_email_key on public.admin_users(email);

-- ---------------------------------------------------------------------------
-- 3. Counsellors (public-safe display records, referenced by applications)
-- ---------------------------------------------------------------------------

create table if not exists public.counsellors (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.admin_users(id) on delete set null,
  full_name   text not null,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Student applications
-- ---------------------------------------------------------------------------

create table if not exists public.student_applications (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  -- step 1 · personal
  full_name          text not null,
  date_of_birth      date,
  gender             text,
  nationality        text not null default 'Bangladesh',
  current_country    text,
  address            text,
  -- step 2 · contact
  email              text not null,
  mobile             text not null,
  whatsapp           text,
  alt_contact        text,
  -- step 7 · additional
  study_gap          text,
  visa_refusal       text,
  comments           text,
  referral_source    text,
  -- step 8 · consent
  consent_data       boolean not null default false,
  consent_contact    boolean not null default false,
  consent_storage    boolean not null default false,
  consent_at         timestamptz,
  -- workflow
  status             public.application_status not null default 'New',
  assigned_to        uuid references public.counsellors(id) on delete set null,
  -- guard against accidental duplicates without blocking a genuine re-apply
  dedupe_hash        text,
  ip_hash            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint student_applications_consent check (consent_data and consent_contact and consent_storage),
  constraint student_applications_email check (position('@' in email) > 1)
);
create index if not exists applications_status_idx on public.student_applications(status);
create index if not exists applications_created_idx on public.student_applications(created_at desc);
create index if not exists applications_assigned_idx on public.student_applications(assigned_to);
create index if not exists applications_dedupe_idx on public.student_applications(dedupe_hash);

create table if not exists public.student_education (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.student_applications(id) on delete cascade,
  qualification    text not null check (qualification in (
                     'SSC', 'HSC', 'Diploma', 'Bachelors', 'Masters', 'Other'
                   )),
  institution      text not null,
  subject_group    text,
  passing_year     integer,
  result_text      text,
  awarding_body    text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists education_application_idx on public.student_education(application_id);

create table if not exists public.student_english_tests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  test_type      text not null check (test_type in ('IELTS', 'PTE', 'TOEFL', 'Duolingo', 'Other', 'None')),
  score          text,
  test_date      date,
  created_at     timestamptz not null default now()
);
create index if not exists english_application_idx on public.student_english_tests(application_id);

create table if not exists public.student_preferences (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.student_applications(id) on delete cascade,
  university_slug  text,
  university_name  text,
  programme_name   text,
  level            text check (level in ('Bachelor', 'Master')),
  intake           text not null default 'September 2027',
  subject_area     text,
  is_alternative   boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists preferences_application_idx on public.student_preferences(application_id);
create index if not exists preferences_university_idx on public.student_preferences(university_slug);

create table if not exists public.student_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  kind           text not null check (kind in (
                   'passport', 'ssc_certificate', 'ssc_transcript', 'hsc_certificate', 'hsc_transcript',
                   'diploma_certificate', 'diploma_transcript', 'bachelor_certificate', 'bachelor_transcript',
                   'english_certificate', 'cv', 'other'
                 )),
  storage_path   text not null,
  file_name      text not null,
  mime_type      text,
  size_bytes     bigint,
  uploaded_at    timestamptz not null default now()
);
create index if not exists documents_application_idx on public.student_documents(application_id);

create table if not exists public.counsellor_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.student_applications(id) on delete cascade,
  author_id      uuid references public.admin_users(id) on delete set null,
  author_name    text,
  body           text not null,
  is_internal    boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists notes_application_idx on public.counsellor_notes(application_id);

create table if not exists public.application_status_history (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.student_applications(id) on delete cascade,
  from_status     public.application_status,
  to_status       public.application_status not null,
  changed_by      uuid references public.admin_users(id) on delete set null,
  changed_by_name text,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists history_application_idx on public.application_status_history(application_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Shareable shortlists (server-side, not localStorage)
-- ---------------------------------------------------------------------------

create table if not exists public.shortlists (
  id             uuid primary key default gen_random_uuid(),
  share_slug     text not null unique,
  title          text,
  owner_name     text,
  owner_email    text,
  edit_token     text not null,
  is_public      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists shortlists_token_idx on public.shortlists(edit_token);

create table if not exists public.shortlist_items (
  id              uuid primary key default gen_random_uuid(),
  shortlist_id    uuid not null references public.shortlists(id) on delete cascade,
  university_slug text not null,
  note            text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (shortlist_id, university_slug)
);
create index if not exists shortlist_items_list_idx on public.shortlist_items(shortlist_id);

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'universities','programmes','admission_requirements','admin_users','student_applications','shortlists'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.universities           enable row level security;
alter table public.programmes             enable row level security;
alter table public.research_sources       enable row level security;
alter table public.admission_requirements enable row level security;
alter table public.application_deadlines  enable row level security;
alter table public.admin_users            enable row level security;
alter table public.counsellors            enable row level security;
alter table public.student_applications   enable row level security;
alter table public.student_education      enable row level security;
alter table public.student_english_tests  enable row level security;
alter table public.student_preferences    enable row level security;
alter table public.student_documents      enable row level security;
alter table public.counsellor_notes       enable row level security;
alter table public.application_status_history enable row level security;
alter table public.shortlists             enable row level security;
alter table public.shortlist_items        enable row level security;

-- Helper: is the caller active staff?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active and a.role = 'admin'
  );
$$;

-- Public research catalogue: anyone may read.
drop policy if exists universities_public_read on public.universities;
create policy universities_public_read on public.universities for select using (true);

drop policy if exists programmes_public_read on public.programmes;
create policy programmes_public_read on public.programmes for select using (true);

drop policy if exists sources_public_read on public.research_sources;
create policy sources_public_read on public.research_sources for select using (true);

drop policy if exists requirements_public_read on public.admission_requirements;
create policy requirements_public_read on public.admission_requirements for select using (true);

drop policy if exists deadlines_public_read on public.application_deadlines;
create policy deadlines_public_read on public.application_deadlines for select using (true);

-- Staff may write research; only admins delete.
drop policy if exists universities_staff_write on public.universities;
create policy universities_staff_write on public.universities for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists programmes_staff_write on public.programmes;
create policy programmes_staff_write on public.programmes for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists requirements_staff_write on public.admission_requirements;
create policy requirements_staff_write on public.admission_requirements for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists deadlines_staff_write on public.application_deadlines;
create policy deadlines_staff_write on public.application_deadlines for all using (public.is_staff()) with check (public.is_staff());

-- Admin users: staff can see the roster; only admins change it.
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists admin_users_admin_write on public.admin_users;
create policy admin_users_admin_write on public.admin_users
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists counsellors_staff_all on public.counsellors;
create policy counsellors_staff_all on public.counsellors for all using (public.is_staff()) with check (public.is_staff());

-- Student data: staff only. NOTE: no anon policy is created on purpose, so the
-- public key cannot read any of these tables. Public submission happens through
-- the /api/applications route using the service role on the server.
drop policy if exists applications_staff_all on public.student_applications;
create policy applications_staff_all on public.student_applications for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists education_staff_all on public.student_education;
create policy education_staff_all on public.student_education for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists english_staff_all on public.student_english_tests;
create policy english_staff_all on public.student_english_tests for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists preferences_staff_all on public.student_preferences;
create policy preferences_staff_all on public.student_preferences for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists documents_staff_all on public.student_documents;
create policy documents_staff_all on public.student_documents for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists notes_staff_all on public.counsellor_notes;
create policy notes_staff_all on public.counsellor_notes for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists history_staff_all on public.application_status_history;
create policy history_staff_all on public.application_status_history for all using (public.is_staff()) with check (public.is_staff());

-- Shortlists: published lists are world-readable; writes are server-side only
-- (the /api/shortlist routes verify the edit token before touching the rows).
drop policy if exists shortlists_public_read on public.shortlists;
create policy shortlists_public_read on public.shortlists for select using (is_public);

drop policy if exists shortlist_items_public_read on public.shortlist_items;
create policy shortlist_items_public_read on public.shortlist_items for select using (
  exists (select 1 from public.shortlists s where s.id = shortlist_id and s.is_public)
);

drop policy if exists shortlists_staff_write on public.shortlists;
create policy shortlists_staff_write on public.shortlists for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists shortlist_items_staff_write on public.shortlist_items;
create policy shortlist_items_staff_write on public.shortlist_items for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- 8. Private storage bucket for student documents
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  10485760, -- 10 MB per file
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

drop policy if exists student_docs_staff_read on storage.objects;
create policy student_docs_staff_read on storage.objects
  for select using (bucket_id = 'student-documents' and public.is_staff());

drop policy if exists student_docs_staff_write on storage.objects;
create policy student_docs_staff_write on storage.objects
  for insert with check (bucket_id = 'student-documents' and public.is_staff());

drop policy if exists student_docs_staff_delete on storage.objects;
create policy student_docs_staff_delete on storage.objects
  for delete using (bucket_id = 'student-documents' and public.is_staff());

-- ---------------------------------------------------------------------------
-- 9. Reference number generator  (GBD-2027-000123)
-- ---------------------------------------------------------------------------

create sequence if not exists public.application_reference_seq start with 1001;

create or replace function public.next_application_reference()
returns text
language sql
volatile
as $$
  select 'GBD-2027-' || lpad(nextval('public.application_reference_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- 10. Audit: record every status change automatically
-- ---------------------------------------------------------------------------

create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.status::text, '') <> coalesce(new.status::text, '') then
    insert into public.application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists application_status_audit on public.student_applications;
create trigger application_status_audit
  after update on public.student_applications
  for each row execute function public.log_status_change();
