"use strict";

// Isolated PostgreSQL adapter. Existing SQL Server routes stay unchanged
// until all data services and queries have been migrated.
let pool;

function getPgPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for PostgreSQL connections.");
    }
    // The pg package must be installed and locked before activating this path.
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Math.max(1, Math.min(10, Number(process.env.PG_POOL_MAX) || 3)),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });
    pool.on("error", err => console.error("PostgreSQL pool error:", err.code || "unknown"));
  }
  return pool;
}

async function withPgTransaction(callback, connectionPool = getPgPool()) {
  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); }
    catch (rollbackError) { console.error("PostgreSQL rollback failed:", rollbackError.code || "unknown"); }
    throw error;
  } finally {
    client.release();
  }
}

async function withPgAdvisoryLock(name, callback, connectionPool = getPgPool()) {
  return withPgTransaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [name]);
    return callback(client);
  }, connectionPool);
}

async function closePgPool() {
  if (pool) {
    const old = pool;
    pool = undefined;
    await old.end();
  }
}

module.exports = { getPgPool, withPgTransaction, withPgAdvisoryLock, closePgPool };
