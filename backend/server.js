require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { getPool } = require("./config/db");
const { getPgPool } = require("./postgres/client");
const { HttpError } = require("./lib/httpError");
const { requireSession, requireAdmin } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set("trust proxy", proxyHops);

const allowedOrigins = new Set((process.env.CORS_ORIGIN || "").split(",").map(value => value.trim()).filter(Boolean));
if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:5173");
    allowedOrigins.add("http://127.0.0.1:5173");
}

app.use(cors((req, callback) => {
    const origin = req.get("Origin");
    const sameOrigin = origin === `${req.protocol}://${req.get("Host")}`;
    if (origin && !sameOrigin && !allowedOrigins.has(origin)) {
        return callback(new HttpError(403, "Request origin is not allowed."));
    }
    callback(null, { origin: origin || false });
}));
app.use(express.json({ limit: "1mb" }));

async function health(req, res) {
    res.set("Cache-Control", "no-store");
    try {
        if (process.env.DB_PROVIDER === "postgres") {
            const { rows: [row] } = await getPgPool().query(`
                SELECT to_regclass('public."UserSessions"') IS NOT NULL
                  AND to_regclass('public."TimetableEntries"') IS NOT NULL AS ready
            `);
            if (!row?.ready) throw new Error("PostgreSQL migrations are required.");
        } else {
            const pool = await getPool();
            const { recordset: [row] } = await pool.request().query(`
                SELECT CASE WHEN OBJECT_ID(N'dbo.UserSessions', N'U') IS NOT NULL
                    AND OBJECT_ID(N'dbo.TimetableEntries', N'U') IS NOT NULL THEN 1 ELSE 0 END AS ready;
            `);
            if (!row.ready) throw new Error("SQL Server migrations are required.");
        }
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        console.error("Health check failed:", error.code || error.message);
        res.status(503).json({ status: "unavailable", database: "unavailable" });
    }
}

app.get("/health", health);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", requireSession, requireAdmin);
app.use("/api/teachers", require("./routes/teacherRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/sections", require("./routes/sectionRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/rooms", require("./routes/roomRoutes"));
app.use("/api/timeslots", require("./routes/timeSlotRoutes"));
app.use("/api/sectionsubjects", require("./routes/sectionSubjectRoutes"));
app.use("/api/timetableentries", require("./routes/timetableEntryRoutes"));
app.use("/api/teaching-groups", require("./routes/teachingGroupRoutes"));
app.use("/api/teaching-group-sections", require("./routes/teachingGroupSectionRoutes"));
app.use("/api/conflicts", require("./routes/conflictRoutes"));
app.use("/api/timetable-generator", require("./routes/timetableGeneratorRoutes"));
app.use("/api/timetable-rules", require("./routes/timetableRuleRoutes"));
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found." }));

const frontend = path.join(__dirname, "frontend", "dist");
if (existsSync(path.join(frontend, "index.html"))) {
    app.use(express.static(frontend));
    app.get("/{*path}", (req, res) => res.sendFile(path.join(frontend, "index.html")));
} else {
    app.get("/", health);
}

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof HttpError ? error.status : error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    if (status >= 500) console.error(error);
    const message = error instanceof HttpError
        ? error.message
        : ({ 400: "Invalid request body.", 413: "Request body is too large." })[status] || "Internal server error.";
    res.status(status).json({ success: false, message, data: error instanceof HttpError ? error.data : undefined });
});

if (require.main === module) {
    const port = Number(process.env.PORT || 5000);
    app.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Server running on port ${port}`));
}

module.exports = app;
