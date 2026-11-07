"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const bcrypt = require("bcryptjs");
const { createPostgresAuthService } = require("../postgres/authService");

function fakePool(onQuery) {
  const history = [];
  const client = {
    async query(text, values = []) {
      history.push({ text, values });
      return onQuery(text, values);
    },
    release() { history.push({ text: "RELEASE" }); }
  };
  return { ...client, async connect() { return client; }, history };
}

function fakeLocks(onQuery) {
  const client = { query: async (...args) => onQuery(...args) };
  return async (_resource, action) => action(client);
}

test("rejects invalid sign-in input before database access", async () => {
  const pool = fakePool(() => { throw new Error("Unexpected query"); });
  const auth = createPostgresAuthService(pool);
  await assert.rejects(auth.signIn("", "password"), { status: 400 });
  await assert.rejects(auth.signIn("x", ""), { status: 400 });
  assert.equal(pool.history.length, 0);
});

test("invalid credentials do not create sessions", async () => {
  const pool = fakePool(() => ({ rows: [] }));
  const auth = createPostgresAuthService(pool);
  await assert.rejects(auth.signIn("missing", "wrong"), { status: 401 });
  assert.equal(pool.history.length, 1);
  assert.equal(pool.history[0].values[0], "missing");
});

test("successful login creates hashed session in a transaction", async () => {
  const password = "correct horse battery staple";
  const passwordHash = await bcrypt.hash(password, 4);
  const pool = fakePool((sql) => {
    if (sql.includes('FROM "Users" u LEFT JOIN')) return { rows: [{ UserId: 7, Username: "admin", TeacherId: null, Role: "Admin", AuthVersion: 2, PasswordHash: passwordHash }] };
    if (sql.includes('RETURNING "ExpiresAt"')) return { rows: [{ ExpiresAt: new Date("2026-11-07T18:00:00Z") }] };
    return { rows: [] };
  });
  const auth = createPostgresAuthService(pool);
  const res = await auth.signIn("admin", password);
  assert.match(res.token, /^[\\w-]{43}$/);
  assert.equal(res.user.role, "Admin");
  const insert = pool.history.find(x => x.text.includes('INSERT INTO "UserSessions"'));
  assert.ok(Buffer.isBuffer(insert.values[0]));
  assert.equal(insert.values[0].length, 32);
  assert.equal(insert.values[2], 8);
  assert.equal(pool.history.at(-2).text, "COMMIT");
  assert.equal(pool.history.at(-1).text, "RELEASE");
});

test("logout deletes only session matching SHA-256 digest", async () => {
  const pool = fakePool(() => ({ rows: [] }));
  const auth = createPostgresAuthService(pool);
  await auth.signOut("a".repeat(43));
  assert.ok(pool.history[0].text.includes('DELETE FROM "UserSessions"'));
  assert.equal(pool.history[0].values[0].length, 32);
  await auth.signOut("invalid");
  assert.equal(pool.history.length, 1);
});

test("admin password rotation revokes sessions and reset tokens", async () => {
  const commands = [];
  const auth = createPostgresAuthService(fakePool(() => ({ rows: [] })), fakeLocks(async (sql, args) => {
    commands.push({ sql, args });
    if (sql.includes('FROM "Users" WHERE')) return { rows: [{ UserId: 17, Role: "Admin" }] };
    return { rows: [] };
  }));
  const result = await auth.provisionAdmin("admin", "longSecretPassword!", true);
  assert.match(result, /rotated/);
  assert.ok(commands.some(x => x.sql.includes('DELETE FROM "UserSessions"')));
  assert.ok(commands.some(x => x.sql.includes('UPDATE "PasswordResetTokens"')));
  assert.ok(commands.every(x => !x.sql.includes("longSecretPassword!")));
});
