"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

let database = "";
try { database = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)); } catch {}
const enabled = process.env.RUN_PG_TESTS === "1" && /_test$|_dev$/i.test(database);

test("PostgreSQL Express API: health, login, authorized routes and logout", { skip: !enabled }, async () => {
  process.env.DB_PROVIDER = "postgres";
  const { closePgPool } = require("../postgres/client");
  const auth = require("../postgres").authService;
  const app = require("../server");
  const password = "temporary-API-Test-Password-2026";
  await auth.provisionAdmin("ci-api-admin", password, false);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let response = await fetch(base + "/health");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, "connected");

    response = await fetch(base + "/api/sections");
    assert.equal(response.status, 401);

    response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "ci-api-admin", password })
    });
    assert.equal(response.status, 200);
    const login = await response.json();
    assert.match(login.token, /^[\w-]{43}$/);
    const headers = { Authorization: "Bearer " + login.token };

    response = await fetch(base + "/api/auth/me", { headers });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).role, "Admin");

    response = await fetch(base + "/api/sections", { headers });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(await response.json()));

    response = await fetch(base + "/api/auth/logout", { method: "POST", headers });
    assert.equal(response.status, 204);

    response = await fetch(base + "/api/sections", { headers });
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await closePgPool();
  }
});
