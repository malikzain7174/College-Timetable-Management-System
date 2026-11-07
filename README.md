# College Timetable Management System

Manage academic sessions, sections, subjects, staff, rooms and teaching periods. Review a proposed timetable, save a complete schedule and print class or teacher reports.

## Local setup

1. Install Node.js 22.12 or later and SQL Server 2019 or later. Use SQL Server Developer or Express locally, or an existing Azure SQL database.
2. In SQL Server Management Studio or another SQL client, create an empty database named `CollegeTimetableDB`. For an existing installation, back up the database and point `DB_DATABASE` at it.
3. Copy `backend/.env.example` to `backend/.env` and configure your connection. Use `DB_AUTH=sql` with a SQL Server login on Linux or Azure SQL. On Windows, `DB_AUTH=windows` uses the account running Node and requires the configured Microsoft ODBC driver.
4. From `backend`, install dependencies and migrate the database.

   ```sh
   npm ci
   npm run db:migrate
   ```

5. For an empty development database, optionally run `npm run db:seed` to add synthetic sections, rooms and assignments. The seed creates no user accounts.
6. Set `ADMIN_PASSWORD` in the current shell from a secret prompt or your secret manager, then create an administrator and clear the variable. Choose a password of at least 12 characters and at most 72 UTF-8 bytes.

   ```sh
   npm run db:admin -- college-admin
   npm start
   ```

7. In a second terminal, run `npm ci` and `npm run dev` from `backend/frontend`. Open the URL printed by Vite and sign in.

The database migration creates the base schema in an empty database and adds the authentication session table and missing authentication columns to an existing database. Run migrations with an account that can create and alter tables, then use a restricted SQL account for normal operation.

## Deployment

- Same origin. Run `npm ci` and `npm run build` from `backend/frontend`. The Express server serves the compiled frontend and API together. Keep `VITE_API_BASE_URL` empty.
- Separate frontend hosting. Set `VITE_API_BASE_URL` to the API's HTTPS origin at frontend build time, then set `CORS_ORIGIN` to the frontend origin on the API. Vercel builds require the API origin.
- Configure `PORT`, `HOST` and `NODE_ENV=production` on the API host. Set `TRUST_PROXY_HOPS` to the exact number of trusted reverse-proxy hops if your hosting path is fixed. Use TLS for credentials and authenticated requests.
- `GET /health` returns `200` when the database is reachable and migrated. It returns `503` while the service is unavailable.
- Admins manage timetable data. Teachers with an active account see only their own read-only timetable. Sessions expire after eight hours, and sign-out revokes the current session.

For an existing administrator, set a new `ADMIN_PASSWORD` and run `npm run db:admin -- <username> --rotate`. This replaces the password and revokes the account's existing sessions and reset tokens. Rotate any live credential represented in the historical database export. The current database files contain schema and synthetic data.

## Scheduling workflow

1. Create an academic session, sections, assignments, rooms and time slots.
2. Choose a session on **Timetable** and run **Preview Timetable**. The preview lists missing periods by assignment and any conflicts.
3. Use **Save Timetable** when the preview is complete. With **Replace existing timetable** unchecked, generation fills remaining weekly periods. To replace existing rows, check the option, preview again and confirm the named session.
4. Check **Conflicts**, then open **Class Wise** or **Teacher Wise** and print. Use **Clear Timetable** to remove the selected session's timetable rows.

A shared lecture is created, moved or deleted for its sections together. Each section can join one active teaching group. The manual and automatic workflows check the same resource and availability rules.

## Checks

From `backend`, run `npm test` for the unit tests. To run the SQL regression suite, configure an isolated database whose name starts with `CollegeTimetableTest`, migrate and seed it, then set `RUN_SQL_TESTS=1` and run `npm test`. The SQL tests create and remove synthetic accounts and modify the demo timetable.

From `backend/frontend`, run `npm run lint` and `npm run build`.
