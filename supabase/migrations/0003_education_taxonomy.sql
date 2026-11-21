-- ============================================================================
-- Migration 0003 — widen the education taxonomy
-- Applicants are not limited to SSC / HSC / Diploma / Bachelors / Masters /
-- Other: a Bangladeshi applicant may hold O-Level, A-Level, Alim, Fazil, a
-- Diploma in Engineering (BTEB), a BBA, BSc, BEng, LLB or MBBS. The desk also
-- wants the group / discipline recorded so a "Science" or "BSc in Computer
-- Science" background can be grouped and filtered.
--
-- The original inline CHECK constraint from 0001 is replaced by a named one so
-- it can be altered later without another full table rewrite. Existing rows all
-- use values that remain valid, so no data migration is needed.
-- Run after 0002_research_catalogue.sql.
-- ============================================================================

-- 1. Drop the anonymous inline check and replace it with a named constraint.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where rel.relname = 'student_education'
      and nsp.nspname = 'public'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%qualification%'
  loop
    execute format('alter table public.student_education drop constraint %I', constraint_name);
  end loop;

  alter table public.student_education
    add constraint student_education_qualification_check check (qualification in (
      'SSC', 'O-Level',
      'HSC', 'A-Level',
      'Alim', 'Fazil',
      'Diploma', 'Diploma in Engineering',
      'Bachelors', 'BBA', 'BSc', 'BEng', 'LLB', 'MBBS',
      'Masters', 'MBA', 'MSc',
      'Other'
    ));
end $$;

-- 2. Record the stream / group / discipline next to the qualification.
--    subject_group already exists for the HSC "Science / Business Studies"
--    style value; discipline is the broad bucket used for filtering.
alter table public.student_education
  add column if not exists discipline text;

comment on column public.student_education.subject_group is
  'Exact stream or award the applicant named, e.g. Science, Business Studies, BSc in Computer Science.';
comment on column public.student_education.discipline is
  'Broad discipline bucket derived from the stream: science, humanities, business, engineering, it, health, design, law, education, agriculture, other.';

create index if not exists education_discipline_idx
  on public.student_education(discipline);
