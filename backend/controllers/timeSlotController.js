const timeSlotService =
    require("../services/timeSlotService");


// ======================================================
// HELPERS
// ======================================================

const normalizeTime = (value) => {

    if (!value) {
        return null;
    }

    const time =
        String(value).trim();


    if (
        /^([01]\d|2[0-3]):[0-5]\d$/.test(
            time
        )
    ) {
        return `${time}:00`;
    }


    if (
        /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(
            time
        )
    ) {
        return time;
    }


    return null;
};


const parseBoolean = (
    value,
    defaultValue = true
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return defaultValue;
    }


    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
};


// ======================================================
// GET ALL
// ======================================================

const getAllTimeSlots = async (
    req,
    res
) => {

    try {

        const timeSlots =
            await timeSlotService
                .getAllTimeSlots();


        return res.status(200).json(
            timeSlots
        );


    } catch (error) {

        console.error(
            "GET TIME SLOTS ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to get time slots",

            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getTimeSlotById = async (
    req,
    res
) => {

    try {

        const timeSlotId =
            Number(req.params.id);


        if (
            !Number.isInteger(
                timeSlotId
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid Time Slot ID."
            });
        }


        const timeSlot =
            await timeSlotService
                .getTimeSlotById(
                    timeSlotId
                );


        if (!timeSlot) {

            return res.status(404).json({
                message:
                    "Time Slot not found."
            });
        }


        return res.status(200).json(
            timeSlot
        );


    } catch (error) {

        console.error(
            "GET TIME SLOT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to get time slot",

            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createTimeSlot = async (
    req,
    res
) => {

    try {

        const {
            DayOfWeek,
            StartTime,
            EndTime,
            SlotName,
            IsActive
        } = req.body;


        const dayOfWeek =
            Number(DayOfWeek);


        if (
            !Number.isInteger(
                dayOfWeek
            ) ||
            dayOfWeek < 1 ||
            dayOfWeek > 7
        ) {

            return res.status(400).json({
                message:
                    "DayOfWeek must be between 1 and 7."
            });
        }


        const startTime =
            normalizeTime(
                StartTime
            );


        const endTime =
            normalizeTime(
                EndTime
            );


        if (!startTime) {

            return res.status(400).json({
                message:
                    "Valid Start Time is required."
            });
        }


        if (!endTime) {

            return res.status(400).json({
                message:
                    "Valid End Time is required."
            });
        }


        if (
            startTime >= endTime
        ) {

            return res.status(400).json({
                message:
                    "End Time must be after Start Time."
            });
        }


        const overlap =
            await timeSlotService
                .findOverlappingTimeSlot(
                    dayOfWeek,
                    startTime,
                    endTime
                );


        if (overlap) {

            return res.status(409).json({

                message:
                    `This time overlaps with existing slot ${overlap.SlotName || overlap.TimeSlotId} (${overlap.StartTime} - ${overlap.EndTime}).`
            });
        }


        const timeSlot =
            await timeSlotService
                .createTimeSlot({

                    DayOfWeek:
                        dayOfWeek,

                    StartTime:
                        startTime,

                    EndTime:
                        endTime,

                    SlotName:
                        SlotName?.trim() || null,

                    IsActive:
                        parseBoolean(
                            IsActive,
                            true
                        )
                });


        return res.status(201).json({

            message:
                "Time Slot Added Successfully",

            timeSlot
        });


    } catch (error) {

        console.error(
            "CREATE TIME SLOT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to create time slot",

            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateTimeSlot = async (
    req,
    res
) => {

    try {

        const timeSlotId =
            Number(req.params.id);


        if (
            !Number.isInteger(
                timeSlotId
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid Time Slot ID."
            });
        }


        const existing =
            await timeSlotService
                .getTimeSlotById(
                    timeSlotId
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Time Slot not found."
            });
        }


        const {
            DayOfWeek,
            StartTime,
            EndTime,
            SlotName,
            IsActive
        } = req.body;


        const dayOfWeek =
            Number(DayOfWeek);


        if (
            !Number.isInteger(
                dayOfWeek
            ) ||
            dayOfWeek < 1 ||
            dayOfWeek > 7
        ) {

            return res.status(400).json({
                message:
                    "DayOfWeek must be between 1 and 7."
            });
        }


        const startTime =
            normalizeTime(
                StartTime
            );


        const endTime =
            normalizeTime(
                EndTime
            );


        if (!startTime || !endTime) {

            return res.status(400).json({
                message:
                    "Valid Start Time and End Time are required."
            });
        }


        if (
            startTime >= endTime
        ) {

            return res.status(400).json({
                message:
                    "End Time must be after Start Time."
            });
        }


        const overlap =
            await timeSlotService
                .findOverlappingTimeSlot(
                    dayOfWeek,
                    startTime,
                    endTime,
                    timeSlotId
                );


        if (overlap) {

            return res.status(409).json({

                message:
                    `This time overlaps with existing slot ${overlap.SlotName || overlap.TimeSlotId} (${overlap.StartTime} - ${overlap.EndTime}).`
            });
        }


        await timeSlotService
            .updateTimeSlot(
                timeSlotId,
                {

                    DayOfWeek:
                        dayOfWeek,

                    StartTime:
                        startTime,

                    EndTime:
                        endTime,

                    SlotName:
                        SlotName?.trim() || null,

                    IsActive:
                        parseBoolean(
                            IsActive,
                            true
                        )
                }
            );


        return res.status(200).json({
            message:
                "Time Slot Updated Successfully"
        });


    } catch (error) {

        console.error(
            "UPDATE TIME SLOT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to update time slot",

            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteTimeSlot = async (
    req,
    res
) => {

    const timeSlotId =
        Number(req.params.id);


    if (
        !Number.isInteger(
            timeSlotId
        )
    ) {

        return res.status(400).json({
            message:
                "Invalid Time Slot ID."
        });
    }


    try {

        const existing =
            await timeSlotService
                .getTimeSlotById(
                    timeSlotId
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Time Slot not found."
            });
        }


        try {

            await timeSlotService
                .deleteTimeSlot(
                    timeSlotId
                );


            return res.status(200).json({
                message:
                    "Time Slot Deleted Successfully"
            });


        } catch (deleteError) {


            if (
                deleteError.number === 547
            ) {

                await timeSlotService
                    .deactivateTimeSlot(
                        timeSlotId
                    );


                return res.status(200).json({

                    message:
                        "This time slot is already used in timetable entries, so it was deactivated instead of permanently deleted.",

                    deactivated:
                        true
                });
            }


            throw deleteError;
        }


    } catch (error) {

        console.error(
            "DELETE TIME SLOT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to delete time slot",

            error:
                error.message
        });
    }
};


module.exports = {

    getAllTimeSlots,

    getTimeSlotById,

    createTimeSlot,

    updateTimeSlot,

    deleteTimeSlot
};