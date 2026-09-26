const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/teachingGroupSectionController");


router.get(
    "/",
    controller.getAllTeachingGroupSections
);


router.get(
    "/group/:teachingGroupId",
    controller.getByTeachingGroupId
);


router.put(
    "/group/:teachingGroupId/sync",
    controller.syncTeachingGroupSections
);


router.get(
    "/:id",
    controller.getTeachingGroupSectionById
);


router.post(
    "/",
    controller.createTeachingGroupSection
);


router.put(
    "/:id",
    controller.updateTeachingGroupSection
);


router.delete(
    "/:id",
    controller.deleteTeachingGroupSection
);


module.exports = router;