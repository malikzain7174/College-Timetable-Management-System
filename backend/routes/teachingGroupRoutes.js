const express = require("express");

const router = express.Router();

const teachingGroupController =
    require("../controllers/teachingGroupController");


router.get(
    "/",
    teachingGroupController.getAllTeachingGroups
);


router.get(
    "/:id",
    teachingGroupController.getTeachingGroupById
);


router.post(
    "/",
    teachingGroupController.createTeachingGroup
);


router.put(
    "/:id",
    teachingGroupController.updateTeachingGroup
);


router.delete(
    "/:id",
    teachingGroupController.deleteTeachingGroup
);


module.exports = router;