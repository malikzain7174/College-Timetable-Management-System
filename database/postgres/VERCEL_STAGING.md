# Staging release checklist: Neon PostgreSQL + Vercel

**Status:** PostgreSQL 17 CI integration tests pass on the migration branch. The app has **not** been verified against the user's Neon database or deployed as a working Vercel production backend. Do not merge to `main` or change the live project without staging verification.

## 1. Validate GitHub tests

Check [PostgreSQL migration checks](https://github.com/malikzain7174/College-Timetable-Management-System/actions) on `feature/neon-postgres-migration`. The workflow creates a disposable PostgreSQL 17 service, runs the schema and Node tests, and discards its database after the job. This is not a Neon production test.

## 2. Initialize an empty Neon staging database

Create a **separate empty database/branch** in Neon for staging. Use its secure connection string with `sslmode=require`; keep it in server-side environment settings, not GitHub or frontend code. Do not copy database URL into chat or screenshots.

From a trusted machine with Node.js 22+ and the repository checked out to `feature/neon-postgres-migration`:

```sh
cd backend
npm ci
```

Configure `DATABASE_URL`, `DB_PROVIDER=postgres` and **temporarily** `PG_ALLOW_SCHEMA_MIGRATION=YES` in a private shell/session. Run:

```sh
npm run db:migrate
```

This migration requires an empty schema; it records its version in `SchemaMigrations`, and aborts if an untracked schema exists. Do not persist `PG_ALLOW_SCHEMA_MIGRATION` in Vercel runtime.

Then set a strong one-time `ADMIN_PASSWORD` in the private shell and run:

```sh
npm run db:admin -- staging-admin
```

Unset both temporary variables after running these steps. Never commit an administrator password.

## 3. Deploy an isolated **backend staging** Vercel project

- Import the **same GitHub repository**, selecting the `feature/neon-postgres-migration` branch for staging.
- Root Directory: `backend`; use framework **Other** / Node.js Express; install `npm ci` using the committed lockfile.
- Runtime environment: `NODE_ENV=production`, `DB_PROVIDER=postgres`, secure Neon `DATABASE_URL`, `PG_POOL_MAX=3`, `CORS_ORIGIN=https://YOUR-FRONTEND-DOMAIN`.
- Deploy and request `/health`. Expected: `{"status":"ok","database":"connected"}`.
- Test `/api/auth/login`, `/api/auth/me`, admin CRUD, session expiry, timetable preview, timetable save, group/shared-room logic, conflicts and account roles.

For SQL Server legacy deployments **omit** `DB_PROVIDER=postgres`. Do not enable PostgreSQL mode in an existing production deployment before its database is initialized.

## 4. Deploy an isolated **frontend staging** Vercel project

- Root Directory: `backend/frontend`; Vite build `npm run build`; output `dist`.
- Build-time environment: `VITE_API_BASE_URL=https://YOUR-STAGING-BACKEND.vercel.app`.
- Ensure backend `CORS_ORIGIN` matches the frontend origin exactly.
- Redeploy the frontend after any `VITE_API_BASE_URL` change.

## 5. Release gates

- GitHub PostgreSQL test workflow green on the final commit.
- Successful direct **Neon staging** test, followed by functional testing through Vercel's staging deployment.
- Confirm SQL Server-to-PostgreSQL **data migration requirements**. These scripts create schema; they do not import existing teachers, sections, users, timetable entries or historical records.
- Confirm backups, admin credentials, CORS, HTTPS, error logging, concurrent schedule generation and session invalidation.
- Then merge the PR to `main` and promote the tested build deliberately.

**Connection note:** Vercel's Neon Marketplace integration provides `DATABASE_URL`, but it does not apply SQL schema or create administrator accounts automatically. `PG_ALLOW_SCHEMA_MIGRATION=YES` is only for an explicit one-time CLI migration, never a normal runtime switch.
