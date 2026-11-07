#!/usr/bin/env node
"use strict";

/**
 * Apply the draft PostgreSQL schema ONLY to an empty disposable database.
 * Requires local psql CLI on PATH and DATABASE_URL in the environment.
 *
 * This does not migrate production data, update SQL Server, or switch the app.
 */
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { URL } = require("node:url");

const sqlFile = resolve(__dirname, "001_initial_schema.sql");
const urlString = process.env.DATABASE_URL;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.env.PG_ALLOW_DISPOSABLE_MIGRATION !== "YES") {
  fail("Refusing to run: set PG_ALLOW_DISPOSABLE_MIGRATION=YES for an empty, disposable test database.");
}
if (!urlString) fail("DATABASE_URL is required (keep its value secret).");

let database;
try {
  const uri = new URL(urlString);
  if (!["postgres:", "postgresql:"].includes(uri.protocol)) throw new Error("not PostgreSQL");
  database = decodeURIComponent(uri.pathname.replace(/^\//, ""));
  if (!database) throw new Error("database name is empty");
} catch {
  fail("DATABASE_URL must be a valid PostgreSQL connection URL.");
}
if (!/_test$|_dev$/i.test(database)) {
  fail("Safety check: test database name must end in _test or _dev. Do not apply the draft to a production database.");
}
const args = ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", sqlFile, urlString];
const result = spawnSync("psql", args, { stdio: "inherit", env: process.env });
if (result.error?.code === "ENOENT") fail("psql is not installed. Install PostgreSQL client tools first.");
if (result.error) fail("psql execution failed.");
if (result.status !== 0) fail("Schema application failed; PostgreSQL transaction should have rolled back.");
console.log("PostgreSQL draft schema applied to disposable database.");
