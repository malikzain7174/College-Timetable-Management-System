const express = require("express");

const router = express.Router();

const {
    getAllConflicts,
    getConflictSummary,
    validateTimetable
} = require(
    "../controllers/conflictController"
);


router.get(
    "/",
    getAllConflicts
);


router.get(
    "/summary",
    getConflictSummary
);


router.get(
    "/validate/:academicSessionId",
    validateTimetable
);


module.exports = router;