-- ============================================================================
-- Migration 0002 — research_catalogue seed
-- Keeps university/programme/source rows in the database for the admin research
-- desk. The public site keeps reading src/lib/research.ts so the guide still
-- works with no database configured.
-- Run after 0001_init.sql.
-- ============================================================================

insert into public.research_sources (key, label, url, publisher) values
  ('ktuAdmissions', 'KTU admissions portal', 'https://admissions.ktu.edu/', 'Kaunas University of Technology'),
  ('ktuNews2027',   'KTU opens admissions for international students 2027', 'https://admissions.ktu.edu/news/ktu-opens-admissions-for-international-students-2027/', 'Kaunas University of Technology'),
  ('ktuBachelor',   'KTU Bachelor admission & fees', 'https://admissions.ktu.edu/bachelor/', 'Kaunas University of Technology'),
  ('ktuMaster',     'KTU Master admission & fees', 'https://admissions.ktu.edu/master/', 'Kaunas University of Technology'),
  ('ktuRecognition','KTU academic recognition & OMPT rules', 'https://admissions.ktu.edu/academic-recognition/', 'Kaunas University of Technology'),
  ('mruAdmission',  'MRU admission information & 2027–28 deadlines', 'https://www.mruni.eu/en/admission_procedure/', 'Mykolas Romeris University'),
  ('mruCountry',    'MRU Bangladesh country-specific requirements', 'https://www.mruni.eu/en/admission_procedure/country-specific-requirements/', 'Mykolas Romeris University'),
  ('mruPsych',      'MRU BSc Psychology', 'https://www.mruni.eu/en/study_program/psychology/', 'Mykolas Romeris University'),
  ('mruLawSecurity','MRU BSc Law and Global Security', 'https://www.mruni.eu/en/study_program/law-and-global-security-2/', 'Mykolas Romeris University')
on conflict (key) do update set label = excluded.label, url = excluded.url, publisher = excluded.publisher;

insert into public.universities (slug, name, abbreviation, category, city, area, website, apply_url, status, verified_on)
values
  ('kaunas-university-of-technology', 'Kaunas University of Technology', 'KTU', 'university', 'Kaunas',
   'Engineering · Informatics · Technology · Business', 'https://en.ktu.edu/', 'https://apply.ktu.edu/', 'dates', '2026-11-15'),
  ('mykolas-romeris-university', 'Mykolas Romeris University', 'MRU', 'university', 'Vilnius',
   'Law · Social sciences · Business · Psychology · Informatics', 'https://www.mruni.eu/en/', 'https://apply.mruni.eu/', 'dates', '2026-11-15')
on conflict (slug) do update
  set name = excluded.name, verified_on = excluded.verified_on, apply_url = excluded.apply_url;

with u as (select id, slug from public.universities where slug in ('kaunas-university-of-technology','mykolas-romeris-university'))
insert into public.programmes (university_id, name, level, duration, language, intake, tuition_text, source_url)
select u.id, p.name, p.level, p.duration, p.language, p.intake, p.tuition_text, p.source_url
from u
join (values
  ('kaunas-university-of-technology','Artificial Intelligence','Bachelor','4 years','English','September 2027','€4,201 / year · 2026/27 rate','https://apply.ktu.edu/courses/course/189-bsc-artificial-intelligence'),
  ('kaunas-university-of-technology','Informatics','Bachelor','4 years','English','September 2027','€4,201 / year · 2026/27 rate','https://apply.ktu.edu/courses/course/18-bsc-informatics'),
  ('kaunas-university-of-technology','Business Digitalization Management','Bachelor','3 years','English','September 2027','€3,250 / year · 2026/27 rate','https://apply.ktu.edu/courses/course/190-bsc-business-digitalization-management'),
  ('kaunas-university-of-technology','Mechatronics','Bachelor','4 years','English','September 2027','€4,201 / year · 2026/27 rate','https://apply.ktu.edu/courses/course/54-bsc-mechatronics'),
  ('kaunas-university-of-technology','Artificial Intelligence in Computer Science','Master','2 years','English','September 2027','€5,641 / year · 2025/26 rate','https://apply.ktu.edu/courses/course/19-msc-artificial-intelligence-computer-science'),
  ('kaunas-university-of-technology','Accounting and Auditing','Master','1.5 years','English','September 2027','€4,690 / year · 2025/26 rate','https://apply.ktu.edu/courses/course/59-msc-accounting-and-auditing'),
  ('mykolas-romeris-university','Psychology','Bachelor','3.5 years','English','September 2027','€4,200 / year · 2026–27','https://www.mruni.eu/en/study_program/psychology/'),
  ('mykolas-romeris-university','Communication and Digital Marketing','Bachelor','3 years','English','September 2027','€3,250 / year · 2026–27','https://www.mruni.eu/en/study_program/communication-and-digital-marketing/'),
  ('mykolas-romeris-university','Law and Global Security','Bachelor','3.5 years','English','September 2027','€3,250 / year · 2026–27','https://www.mruni.eu/en/study_program/law-and-global-security-2/'),
  ('mykolas-romeris-university','English for Specific Purposes & Second Foreign Language','Bachelor','3.5 years','English','September 2027','€4,200 / year · 2026–27','https://www.mruni.eu/en/study_program/english-for-specific-purposes-and-the-second-foreign-language/'),
  ('mykolas-romeris-university','European Union Law and Governance','Master','1.5 years','English','September 2027','€4,690 / year · 2026–27','https://www.mruni.eu/en/study_program/european-union-law-and-governance/'),
  ('mykolas-romeris-university','Law, Technology and Business','Master','1.5 years','English','September 2027','€3,518 / year · 2026–27','https://www.mruni.eu/en/study_program/law-technology-and-business/')
) as p(slug, name, level, duration, language, intake, tuition_text, source_url)
  on p.slug = u.slug
on conflict do nothing;

insert into public.application_deadlines (university_id, intake, opens_on, closes_on, applicant_group, note, verification, source_url, verified_on)
select id, 'September 2027', '2026-10-15', '2027-05-31', 'Non-EU (including Bangladesh)',
       'Published in KTU''s own 2027 international admission announcement.',
       'Officially Confirmed', 'https://admissions.ktu.edu/news/ktu-opens-admissions-for-international-students-2027/', '2026-11-15'
from public.universities where slug = 'kaunas-university-of-technology';

insert into public.application_deadlines (university_id, intake, opens_on, closes_on, applicant_group, note, verification, source_url, verified_on)
select id, 'September 2027', '2026-11-01', '2027-06-01', 'Non-EU (including Bangladesh)',
       'MRU publishes 1 June 2027 for non-EU applicants and 24 July 2027 for EU/EFTA. Country quota of 200 applications applies.',
       'Officially Confirmed', 'https://www.mruni.eu/en/admission_procedure/', '2026-11-15'
from public.universities where slug = 'mykolas-romeris-university';
