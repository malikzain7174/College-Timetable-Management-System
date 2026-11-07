"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

test("PostgreSQL admin CLI awaits provisioning before closing the connection pool", async () => {
  const clientPath = require.resolve("../postgres/client");
  const authPath = require.resolve("../postgres/authService");
  const migratePath = require.resolve("../postgres/migrate");
  const paths = [clientPath, authPath, migratePath];
  const originals = new Map(paths.map(path => [path, require.cache[path]]));
  const events = [];
  let finishProvisioning;
  const provisioningGate = new Promise(resolve => { finishProvisioning = resolve; });

  try {
    require.cache[clientPath] = {
      id: clientPath, filename: clientPath, loaded: true,
      exports: {
        closePgPool: async () => { events.push("pool closed"); }
      }
    };
    require.cache[authPath] = {
      id: authPath, filename: authPath, loaded: true,
      exports: {
        createPostgresAuthService: () => ({
          provisionAdmin: async () => {
            events.push("provisioning started");
            await provisioningGate;
            events.push("provisioning finished");
            return "Administrator created.";
          }
        })
      }
    };
    delete require.cache[migratePath];
    const { main } = require("../postgres/migrate");
    const resultPromise = main(["admin", "test-admin"]);

    assert.deepEqual(events, ["provisioning started"]);
    finishProvisioning();
    assert.equal(await resultPromise, "Administrator created.");
    assert.deepEqual(events, [
      "provisioning started",
      "provisioning finished",
      "pool closed"
    ]);
  } finally {
    finishProvisioning();
    for (const path of paths) {
      const original = originals.get(path);
      if (original) require.cache[path] = original;
      else delete require.cache[path];
    }
  }
});
