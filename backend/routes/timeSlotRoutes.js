const express = require("express");

const router = express.Router();

const timeSlotController =
    require("../controllers/timeSlotController");


router.get(
    "/",
    timeSlotController.getAllTimeSlots
);


router.get(
    "/:id",
    timeSlotController.getTimeSlotById
);


router.post(
    "/",
    timeSlotController.createTimeSlot
);


router.put(
    "/:id",
    timeSlotController.updateTimeSlot
);


router.delete(
    "/:id",
    timeSlotController.deleteTimeSlot
);


module.exports = router;