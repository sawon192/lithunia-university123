// Offline syntax/semantics check for the Supabase migrations.
// Supabase-specific pieces (auth schema, storage schema, anon/authenticated
// roles) are stubbed so the real DDL can be executed against embedded Postgres.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');

const MIGRATIONS = [
  path.join(__dirname, '..', 'supabase/migrations/0001_init.sql'),
  path.join(__dirname, '..', 'supabase/migrations/0002_research_catalogue.sql'),
];

(async () => {
  const db = await PGlite.create();
  await db.exec(`
    create schema if not exists auth;
    create schema if not exists storage;
    create table if not exists auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table if not exists storage.buckets (
      id text primary key, name text not null, public boolean default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text, name text
    );
  `);

  for (const file of MIGRATIONS) {
    // pglite ships without pgcrypto; Supabase has it. Drop the line for the check only.
    const sql = fs.readFileSync(file, 'utf8').replace(/create extension if not exists "pgcrypto";/i, '');
    try {
      await db.exec(sql);
      console.log(`PASS  ${path.basename(file)}`);
    } catch (error) {
      console.error(`FAIL  ${path.basename(file)}\n${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const tables = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`);
  console.log('tables:', tables.rows.map((r) => r.table_name).join(', '));

  const policies = await db.query(`select count(*)::int as n from pg_policies where schemaname='public'`);
  console.log('rls policies on public:', policies.rows[0].n);

  const seeded = await db.query(`select
      (select count(*) from public.universities)::int as universities,
      (select count(*) from public.programmes)::int as programmes,
      (select count(*) from public.application_deadlines)::int as deadlines`);
  console.log('seed:', JSON.stringify(seeded.rows[0]));

  // exercise the reference generator + status audit trigger
  const ref = await db.query(`select public.next_application_reference() as ref`);
  console.log('reference:', ref.rows[0].ref);

  const ins = await db.query(`
    insert into public.student_applications
      (reference, full_name, email, mobile, consent_data, consent_contact, consent_storage, consent_at)
    values (public.next_application_reference(), 'Test Student', 'test@example.com', '+8801700000000', true, true, true, now())
    returning id, reference, status`);
  console.log('insert application:', JSON.stringify(ins.rows[0]));

  await db.query(`update public.student_applications set status='Under Review' where id=$1`, [ins.rows[0].id]);
  const hist = await db.query(`select count(*)::int as n from public.application_status_history`);
  console.log('status history rows after update:', hist.rows[0].n);

  // consent constraint must reject a submission without consent
  try {
    await db.query(`
      insert into public.student_applications (reference, full_name, email, mobile, consent_data, consent_contact, consent_storage)
      values (public.next_application_reference(), 'No Consent', 'x@example.com', '123', false, false, false)`);
    console.log('FAIL  consent constraint did not fire');
    process.exitCode = 1;
  } catch (error) {
    console.log('PASS  consent constraint rejected the row');
  }
})();
