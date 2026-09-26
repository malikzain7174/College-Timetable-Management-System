const express = require("express");

const router = express.Router();

const sectionSubjectController =
    require("../controllers/sectionSubjectController");


router.get(
    "/",
    sectionSubjectController.getAllSectionSubjects
);


router.get(
    "/:id",
    sectionSubjectController.getSectionSubjectById
);


router.post(
    "/",
    sectionSubjectController.createSectionSubject
);


router.put(
    "/:id",
    sectionSubjectController.updateSectionSubject
);


router.delete(
    "/:id",
    sectionSubjectController.deleteSectionSubject
);


module.exports = router;