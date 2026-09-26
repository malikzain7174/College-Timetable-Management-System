const express = require("express");

const router = express.Router();

const subjectController =
    require("../controllers/subjectController");


// ======================================================
// GET ALL SUBJECTS
// ======================================================

router.get(
    "/",
    subjectController.getAllSubjects
);


// ======================================================
// GET SUBJECT BY ID
// ======================================================

router.get(
    "/:id",
    subjectController.getSubjectById
);


// ======================================================
// CREATE SUBJECT
// ======================================================

router.post(
    "/",
    subjectController.createSubject
);


// ======================================================
// UPDATE SUBJECT
// ======================================================

router.put(
    "/:id",
    subjectController.updateSubject
);


// ======================================================
// DELETE SUBJECT
// ======================================================

router.delete(
    "/:id",
    subjectController.deleteSubject
);


module.exports = router;