const { readFile, readdir } = require("node:fs/promises");
const path = require("node:path");
const { closePool, withDatabaseLock } = require("../config/db");
const { provisionAdmin } = require("../services/authService");

const databaseDir = path.resolve(__dirname, "../../database");

async function runSqlFile(db, filename) {
    const text = await readFile(path.join(databaseDir, filename), "utf8");
    for (const batch of text.split(/^\s*GO\s*$/im)) {
        if (batch.trim()) await db.request().batch(batch);
    }
}

async function migrate() {
    await withDatabaseLock("timetable:migrations", async db => {
        const { recordset: [state] } = await db.request().query(`
            SELECT OBJECT_ID(N'dbo.AcademicSessions', N'U') AS baseTable;
        `);
        if (!state.baseTable) await runSqlFile(db, "schema.sql");

        const files = await readdir(path.join(databaseDir, "migrations"));
        for (const file of files.filter(name => name.endsWith(".sql")).sort()) {
            await runSqlFile(db, path.join("migrations", file));
        }
    });
    return "Database schema is ready.";
}

async function main([command, username, option]) {
    if (command === "migrate") return migrate();
    if (command === "seed") {
        await withDatabaseLock("timetable:migrations", db => runSqlFile(db, "demo-seed.sql"));
        return "Synthetic demo data is ready.";
    }
    if (command === "admin" && (!option || option === "--rotate")) {
        return provisionAdmin(username, process.env.ADMIN_PASSWORD, option === "--rotate");
    }
    throw new Error("Use db:migrate, db:seed or db:admin -- <username> [--rotate].");
}

if (require.main === module) {
    main(process.argv.slice(2))
        .then(message => console.log(message))
        .catch(error => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(closePool);
}

module.exports = { migrate };
