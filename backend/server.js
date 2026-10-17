require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { poolPromise } = require("./config/db");

// ======================================================
// ROUTES
// ======================================================

const teacherRoutes = require("./routes/teacherRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const roomRoutes = require("./routes/roomRoutes");
const timeSlotRoutes = require("./routes/timeSlotRoutes");
const sectionSubjectRoutes = require("./routes/sectionSubjectRoutes");
const timetableEntryRoutes = require("./routes/timetableEntryRoutes");
const teachingGroupRoutes = require("./routes/teachingGroupRoutes");
const teachingGroupSectionRoutes = require("./routes/teachingGroupSectionRoutes");
const conflictRoutes = require("./routes/conflictRoutes");
const timetableGeneratorRoutes = require("./routes/timetableGeneratorRoutes");
const timetableRuleRoutes = require("./routes/timetableRuleRoutes");

// ======================================================
// APP
// ======================================================

const app = express();

// ======================================================
// CORS
// ======================================================

const allowedOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.length === 0) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("CORS origin is not allowed"));
        },
        credentials: true
    })
);

app.use(express.json({ limit: "1mb" }));

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", async (req, res) => {
    try {
        await poolPromise;

        return res.status(200).json({
            status: "ok",
            database: "connected"
        });
    } catch (error) {
        return res.status(503).json({
            status: "error",
            database: "disconnected",
            message: error.message
        });
    }
});

// ======================================================
// ROUTE REGISTRATION
// ======================================================

app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/timeslots", timeSlotRoutes);
app.use("/api/sectionsubjects", sectionSubjectRoutes);
app.use("/api/timetableentries", timetableEntryRoutes);
app.use("/api/teaching-groups", teachingGroupRoutes);
app.use("/api/teaching-group-sections", teachingGroupSectionRoutes);
app.use("/api/conflicts", conflictRoutes);
app.use("/api/timetable-generator", timetableGeneratorRoutes);
app.use("/api/timetable-rules", timetableRuleRoutes);

// ======================================================
// ROOT
// ======================================================

app.get("/", async (req, res) => {
    try {
        await poolPromise;

        return res.status(200).json({
            message: "College Timetable API is running.",
            environment: process.env.NODE_ENV || "development"
        });
    } catch (error) {
        console.error("Database Connection Error:", error);

        return res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);

    res.status(500).json({
        message: "Internal Server Error",
        error:
            process.env.NODE_ENV === "production"
                ? undefined
                : err.message
    });
});

// ======================================================
// START SERVER
// ======================================================

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
