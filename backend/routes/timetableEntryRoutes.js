const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/timetableEntryController");


router.get(
    "/",
    controller.getAllTimetableEntries
);


router.get(
    "/session/:academicSessionId",
    controller.getTimetableEntriesBySession
);


router.get(
    "/:id",
    controller.getTimetableEntryById
);


router.post(
    "/",
    controller.createTimetableEntry
);


router.put(
    "/:id",
    controller.updateTimetableEntry
);


router.delete(
    "/:id",
    controller.deleteTimetableEntry
);


module.exports = router;