const express = require("express");

const router = express.Router();

const {
    generateTimetable,
    getGeneratedTimetable,
    deleteGeneratedTimetable
} = require("../controllers/timetableGeneratorController");


// ============================================================
// GENERATE TIMETABLE
// POST /api/timetable-generator/generate
// ============================================================

router.post(
    "/generate",
    generateTimetable
);


// ============================================================
// GET GENERATED TIMETABLE
// GET /api/timetable-generator/:academicSessionId
// ============================================================

router.get(
    "/:academicSessionId",
    getGeneratedTimetable
);


// ============================================================
// DELETE GENERATED TIMETABLE
// DELETE /api/timetable-generator/:academicSessionId
// ============================================================

router.delete(
    "/:academicSessionId",
    deleteGeneratedTimetable
);


module.exports = router;