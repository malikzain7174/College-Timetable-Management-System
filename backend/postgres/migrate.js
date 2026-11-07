"use strict";

const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { getPgPool, closePgPool, withPgTransaction } = require("./client");
const { createPostgresAuthService } = require("./authService");

const version = "001_initial_schema";
const schemaPath = path.resolve(__dirname, "../../database/postgres/001_initial_schema.sql");

async function migrate() {
  if (process.env.PG_ALLOW_SCHEMA_MIGRATION !== "YES") {
    throw new Error("Refusing schema modification: set PG_ALLOW_SCHEMA_MIGRATION=YES explicitly after backup/review.");
  }
  const source = await readFile(schemaPath, "utf8");
  if (!source.includes("\nBEGIN;") || !source.trimEnd().endsWith("COMMIT;")) {
    throw new Error("Unexpected PostgreSQL schema transaction markers.");
  }
  // The migration runner owns a single transaction and the advisory lock.
  const statements = source.replace(/\nBEGIN;\s*/, "\n").replace(/\nCOMMIT;\s*$/, "\n");
  const pool = getPgPool();
  return withPgTransaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('timetable:migrations',0))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SchemaMigrations" (
        "Version" varchar(100) PRIMARY KEY,
        "AppliedAt" timestamp(6) NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
      )
    `);
    const { rows: [applied] } = await client.query(
      'SELECT "Version" FROM "SchemaMigrations" WHERE "Version"=$1', [version]);
    if (applied) return "PostgreSQL schema is already migrated.";
    const { rows: [existing] } = await client.query(`
      SELECT to_regclass('public."Users"') IS NOT NULL AS "hasUsers",
             to_regclass('public."TimetableEntries"') IS NOT NULL AS "hasEntries"
    `);
    if (existing.hasUsers || existing.hasEntries) {
      throw new Error("Existing untracked schema detected. Review or use an empty database; no modifications applied.");
    }
    await client.query(statements);
    await client.query('INSERT INTO "SchemaMigrations" ("Version") VALUES ($1)', [version]);
    return "PostgreSQL schema migrated successfully.";
  }, pool);
}

async function main([command,username,option]) {
  try {
    // Await the operation before finally closes the PostgreSQL pool.
    if(command==="migrate")return await migrate();
    if(command==="admin"&&(!option||option==="--rotate"))
      return await createPostgresAuthService().provisionAdmin(username,process.env.ADMIN_PASSWORD,option==="--rotate");
    if(command==="seed")throw new Error("PostgreSQL demo seed is not implemented. Use a disposable test database and integration smoke test.");
    throw new Error("Supported PostgreSQL commands: db:migrate or db:admin -- <username> [--rotate].");
  } finally {
    await closePgPool();
  }
}
module.exports={migrate,main};
