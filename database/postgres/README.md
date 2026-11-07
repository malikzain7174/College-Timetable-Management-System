# Draft PostgreSQL schema: isolated verification

This directory contains a **draft**, not yet validated on a PostgreSQL server. Neither running these scripts nor connecting Neon makes the SQL Server backend compatible.

## Static preflight (no database required)

```sh
node database/postgres/verify-schema.test.js
```

This checks table coverage, reference targets and selected SQL Server artifacts, **not actual PostgreSQL syntax or runtime compatibility**.

## Schema execution (disposable database only)

Create a **new empty database whose name ends in `_test` or `_dev`**, preferably on a throwaway Neon branch. Install the PostgreSQL command-line client (`psql`) locally.

Set `DATABASE_URL` to the **throwaway database's connection URL** and `PG_ALLOW_DISPOSABLE_MIGRATION=YES` in your terminal, then run:

```sh
node database/postgres/apply-disposable.js
```

The runner uses `psql` with `ON_ERROR_STOP=1` and the SQL file wraps the schema changes in a transaction. It refuses unmarked databases and will not read a secret from GitHub. **Never point it at the existing Neon production database.**

After applying the schema, inspect table structure and constraints in your test database. Actual SQL syntax/execution and backend compatibility are **not yet verified**.

## Backend migration remains

A complete backend port still requires a PostgreSQL driver, rewritten query parameters, DDL and transaction handlers, auth sessions, timetable locking, and end-to-end tests. Do not deploy this draft as a working PostgreSQL backend.
