const express =
    require("express");

const router =
    express.Router();

const sectionController =
    require(
        "../controllers/sectionController"
    );


// ======================================================
// SECTIONS
// ======================================================

router.get(
    "/",
    sectionController.getAllSections
);


// ======================================================
// LOOKUPS
// ======================================================

router.get(
    "/lookups",
    sectionController.getSectionLookups
);


// ======================================================
// CREATE CAMPUS FROM SECTION PAGE
// ======================================================

router.post(
    "/lookups/campuses",
    sectionController.createCampus
);


// ======================================================
// CREATE SESSION FROM SECTION PAGE
// ======================================================

router.post(
    "/lookups/sessions",
    sectionController.createAcademicSession
);


// ======================================================
// GET SECTION
//
// MUST remain after /lookups routes
// ======================================================

router.get(
    "/:id",
    sectionController.getSectionById
);


// ======================================================
// CREATE SECTION
// ======================================================

router.post(
    "/",
    sectionController.createSection
);


// ======================================================
// UPDATE
// ======================================================

router.put(
    "/:id",
    sectionController.updateSection
);


// ======================================================
// DELETE
// ======================================================

router.delete(
    "/:id",
    sectionController.deleteSection
);


module.exports = router;