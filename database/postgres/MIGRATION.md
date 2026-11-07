# Neon PostgreSQL migration status

> **Not production-ready.** This branch is isolated from `main` so that the existing SQL Server timetable application remains usable. The Neon/Vercel integration only provisions connection credentials; it does **not** migrate SQL Server data or make T-SQL executable in PostgreSQL.

## Source audit (7 November 2026)

Current application uses Node.js/Express, `mssql`, SQL Server's `dbo` schema and migrations in `database/schema.sql` + `database/migrations`.

The following SQL Server-specific constructs are present in application services (counts are lexical occurrences, not executed query counts):

| Feature | Examples and required migration |
| --- | --- |
| Named SQL Server parameters | `@SectionId`, `@username`: convert to parameterized PostgreSQL `$1`, `$2` using a safe binding layer |
| Insert result syntax | `OUTPUT INSERTED.*`: replace with `RETURNING ...` |
| SQL Server TOP | `TOP (1)` / `TOP 1`: rewrite to `LIMIT 1` while preserving ordering |
| Schema references | `dbo.Users` and `dbo.UserSessions`: migrate schema naming or use consistent search_path |
| Date operations | `SYSUTCDATETIME()`, `DATEADD(...)`: rewrite with `CURRENT_TIMESTAMP` and intervals |
| SQL Server transactions | `sql.Transaction` and `sql.Request`: replace with `pg` client BEGIN/COMMIT/ROLLBACK logic |
| Identity and DDL | `IDENTITY(1,1)`, `nvarchar`, `bit`, `datetime2`, `GO`, `sp_getapplock`: redesign in PostgreSQL DDL and advisory locks |
| Error handling | SQL Server error codes and transaction semantics: map PostgreSQL SQLSTATE codes |
| Data types | SQL Server `sql.Bit`, `sql.Binary`, `sql.DateTime2`: use bool, bytea and timestamptz correctly |

### Verified high-risk services

- `backend/services/authService.js`: token hashes, session expiry and atomic sign-in must preserve security behavior.
- `backend/services/teacherService.js`: SQL Server `MERGE` and transactions need careful rewrite.
- `backend/services/timetableEntryService.js`: scheduling writes and locking need transactional/advisory-lock equivalents.
- `backend/services/timetableRuleService.js`: `OUTPUT INSERTED`, date defaults and write handling.
- Other domain services use `OUTPUT INSERTED`, `TOP` and `@parameter` syntax.

## Completed in this branch

- `001_initial_schema.sql` drafted from the original SQL Server schema and auth-session migration.
- Static repository audit found **20 CREATE TABLE** statements (19 original tables plus UserSessions), **28 foreign keys**, **12 indexes**, **13 named unique constraints**, **12 named CHECK constraints**, and **37 column defaults**.
- The SQL text has been checked for several unconverted SQL Server-only tokens, but **has not yet been parsed or executed by PostgreSQL**. This is not a successful migration or live Neon deployment.
- The SQL is for an **empty disposable test database** and should not be applied to the existing Neon production branch until a PostgreSQL runtime migration test succeeds.

## PostgreSQL application adapter (isolated stage)

- `backend/postgres/client.js`: lazy PostgreSQL pool, transaction and advisory-lock helpers. Production `DATABASE_URL` is read only when used; `pg` must be added to the package manifest **and regenerated lockfile** before activation.
- `backend/postgres/authService.js`: PostgreSQL equivalents of credential validation, SHA-256 hashed sessions, sign-in, sign-out, session lookup, admin provisioning and password rotation.
- `backend/test/postgres-auth.test.js`: mocked unit coverage for invalid credentials, token creation/revocation, and password rotation. These are **not Neon integration tests**.
- The adapter is intentionally **not connected to `backend/server.js`**. The remaining services still depend on SQL Server, so switching the entire application now would break CRUD and timetable generation.
- No credentials have been committed and no Neon project has been modified.

## CRUD port: subjects, rooms and departments (isolated)

- `backend/postgres/subjectService.js` now contains PostgreSQL versions of get-all, get-by-id, create, update, delete, including `RETURNING "SubjectId"`.
- `backend/postgres/roomService.js` now contains PostgreSQL get-all, get-by-id, campus-scoped duplicate lookup, create, update, delete and deactivate.
- `backend/postgres/departmentService.js` contains PostgreSQL list/get, case-insensitive duplicate check, create/update/delete.
- `backend/test/postgres-crud.test.js` contains six mocked query-contract tests including SQL parameter binding and ID rejection.
- All three services explicitly inject a pool for testing and default to `getPgPool()`; neither service is wired into Express yet.
- These test cases are **committed but have not been executed against the actual dependencies or a live PostgreSQL database**. No Neon credentials were retrieved.
- Remaining domain CRUD modules include teachers, sections, section subjects, teaching groups, time slots, rules and timetable writes. The `pg` package and matching lockfile are still not installed.

## Safe implementation order

1. **Draft created, runtime testing pending:** validate `001_initial_schema.sql` on a disposable PostgreSQL branch and correct any parser/constraint errors; keep existing SQL Server scripts unchanged.
2. Add `pg` dependency with correctly regenerated `package-lock.json` (`npm install pg`); add a PostgreSQL pool, binding, transactions and advisory locks. Do not repurpose `mssql` or use unsafe string substitutions.
3. Port authentication, migrations, and admin provisioning. Test salted password verification, token hashing, expiries, revocation, privileges and injection resistance.
4. Port each domain service, using parameterized PostgreSQL queries and PostgreSQL transactions. Preserve scheduling conflict prevention and multi-section assignment behavior.
5. Update isolated SQL integration tests. Run `npm ci`, `npm test`, `npm run db:migrate`, `npm run db:seed` and frontend lint/build against a disposable **PostgreSQL** test database.
6. Configure Vercel backend's `DATABASE_URL` in server-side environment only. Verify /health, login, CRUD, timetable preview/save and conflict reports end-to-end. Review Vercel Functions timeouts and DB pool sizing.
7. Only after checks pass, migrate any real data and deploy. Never put production credentials in GitHub or run destructive seeds on production.

## Immediate deployment warning

The currently deployed API still expects SQL Server `DB_*` settings. The Neon-provided `DATABASE_URL` is **not consumed by the existing backend**. A green Vercel deployment badge is only a build/deployment signal, not evidence of working data access.

If you cannot perform the full service rewrite at once, keep production on SQL Server or mark the Neon build as a prototype until PostgreSQL functional tests pass.
