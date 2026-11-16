# Security policy

## Reporting a vulnerability

This site handles student application data, including passport-style personal details and uploaded
academic documents. If you find a security issue, please report it privately rather than opening a
public issue.

- Email the maintainer through the address listed on the deployed site's contact section.
- Include the affected route or component, the steps to reproduce, and the impact you believe it has.
- Please do not access, modify, download or delete other people's application records while testing.
  Use your own test submission and delete it afterwards.

We aim to acknowledge reports within a few working days.

## Scope

In scope: this repository's application code, API routes, database migrations and the deployed site.

Out of scope: third-party services (Supabase, Vercel), and the accuracy of published admission
information — that is handled as a data correction, not a security issue.

## Secrets

No credentials are committed to this repository. `.env.example` lists variable names only, with every
value blank. If you believe a secret has been committed, report it as above; the value will be rotated
rather than just deleted from history.

## Student data

`/apply` collects personal data and documents. Do not submit real identity documents in testing.
Locally and on an unconfigured deployment the app falls back to filesystem storage; see the README
for the Supabase configuration required for durable storage.
