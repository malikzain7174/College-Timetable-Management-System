const express = require("express");
const cors = require("cors");

const { poolPromise } =
    require("./config/db");


// ======================================================
// ROUTES
// ======================================================

const teacherRoutes =
    require("./routes/teacherRoutes");

const subjectRoutes =
    require("./routes/subjectRoutes");

const sectionRoutes =
    require("./routes/sectionRoutes");

const departmentRoutes =
    require("./routes/departmentRoutes");

const roomRoutes =
    require("./routes/roomRoutes");

const timeSlotRoutes =
    require("./routes/timeSlotRoutes");

const sectionSubjectRoutes =
    require("./routes/sectionSubjectRoutes");

const timetableEntryRoutes =
    require("./routes/timetableEntryRoutes");

const teachingGroupRoutes =
    require("./routes/teachingGroupRoutes");

const teachingGroupSectionRoutes =
    require("./routes/teachingGroupSectionRoutes");

const conflictRoutes =
    require("./routes/conflictRoutes");

const timetableGeneratorRoutes =
    require("./routes/timetableGeneratorRoutes");


// ======================================================
// APP
// ======================================================

const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());


// ======================================================
// ROUTE REGISTRATION
// ======================================================

app.use(
    "/api/teachers",
    teacherRoutes
);

app.use(
    "/api/subjects",
    subjectRoutes
);

app.use(
    "/api/sections",
    sectionRoutes
);

app.use(
    "/api/departments",
    departmentRoutes
);

app.use(
    "/api/rooms",
    roomRoutes
);

app.use(
    "/api/timeslots",
    timeSlotRoutes
);

app.use(
    "/api/sectionsubjects",
    sectionSubjectRoutes
);

app.use(
    "/api/timetableentries",
    timetableEntryRoutes
);

app.use(
    "/api/teaching-groups",
    teachingGroupRoutes
);

app.use(
    "/api/teaching-group-sections",
    teachingGroupSectionRoutes
);

app.use(
    "/api/conflicts",
    conflictRoutes
);

app.use(
    "/api/timetable-generator",
    timetableGeneratorRoutes
);


// ======================================================
// ROOT
// ======================================================

app.get("/", async (req, res) => {

    try {

        await poolPromise;

        return res.status(200).json({
            message:
                "Backend and SQL Server are connected successfully!"
        });

    } catch (error) {

        console.error(
            "Database Connection Error:",
            error
        );

        return res.status(500).json({
            message:
                "Database connection failed",
            error:
                error.message
        });
    }
});


// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error(
        "Unhandled Server Error:",
        err
    );

    res.status(500).json({
        message:
            "Internal Server Error",
        error:
            err.message
    });
});


// ======================================================
// START SERVER
// ======================================================

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );
});