const timetableEntryService =
    require("../services/timetableEntryService");


// ======================================================
// VALIDATION
// ======================================================

const validateEntry = async (
    body,
    timetableEntryId = null
) => {

    const sectionSubjectId =
        Number(body.SectionSubjectId);

    const roomId =
        Number(body.RoomId);

    const timeSlotId =
        Number(body.TimeSlotId);

    const academicSessionId =
        Number(body.AcademicSessionId);


    if (
        !Number.isInteger(
            sectionSubjectId
        ) ||
        sectionSubjectId <= 0
    ) {

        return {
            error:
                "Valid Section Subject is required."
        };
    }


    if (
        !Number.isInteger(roomId) ||
        roomId <= 0
    ) {

        return {
            error:
                "Valid Room is required."
        };
    }


    if (
        !Number.isInteger(timeSlotId) ||
        timeSlotId <= 0
    ) {

        return {
            error:
                "Valid Time Slot is required."
        };
    }


    if (
        !Number.isInteger(
            academicSessionId
        ) ||
        academicSessionId <= 0
    ) {

        return {
            error:
                "Valid Academic Session is required."
        };
    }


    const classType =
        String(
            body.ClassType || ""
        ).trim();


    if (!classType) {

        return {
            error:
                "Class Type is required."
        };
    }


    if (classType.length > 30) {

        return {
            error:
                "Class Type cannot exceed 30 characters."
        };
    }


    const sectionSubject =
        await timetableEntryService
            .getSectionSubjectDetails(
                sectionSubjectId
            );


    if (!sectionSubject) {

        return {
            error:
                "Section Subject does not exist."
        };
    }


    if (
        !sectionSubject.IsActive ||
        !sectionSubject.SectionIsActive
    ) {

        return {
            error:
                "Selected Section Subject or Section is inactive."
        };
    }


    if (
        Number(
            sectionSubject.AcademicSessionId
        ) !== academicSessionId
    ) {

        return {
            error:
                "Selected Section does not belong to this Academic Session."
        };
    }


    const room =
        await timetableEntryService
            .getRoomById(
                roomId
            );


    if (!room || !room.IsActive) {

        return {
            error:
                "Selected Room is invalid or inactive."
        };
    }


    if (
        Number(room.CampusId) !==
        Number(
            sectionSubject.CampusId
        )
    ) {

        return {
            error:
                "Room must belong to the same Campus as the Section."
        };
    }


    if (
        Number(room.Capacity) <
        Number(
            sectionSubject.StudentCount
        )
    ) {

        return {
            error:
                "Room capacity is smaller than the Section student count."
        };
    }


    const timeSlot =
        await timetableEntryService
            .getTimeSlotById(
                timeSlotId
            );


    if (
        !timeSlot ||
        !timeSlot.IsActive
    ) {

        return {
            error:
                "Selected Time Slot is invalid or inactive."
        };
    }


    const conflicts =
        await timetableEntryService
            .checkConflicts({

                timetableEntryId,

                sectionId:
                    Number(
                        sectionSubject.SectionId
                    ),

                sectionSubjectId,

                teacherId:
                    Number(
                        sectionSubject.TeacherId
                    ),

                roomId,

                timeSlotId,

                academicSessionId
            });


    if (conflicts.length > 0) {

        const types =
            [
                ...new Set(
                    conflicts.map(
                        item =>
                            item.ConflictType
                    )
                )
            ];


        return {
            error:
                `Cannot save timetable entry. Conflict detected: ${types.join(", ")}.`
        };
    }


    return {

        data: {

            SectionSubjectId:
                sectionSubjectId,

            TeacherId:
                Number(
                    sectionSubject.TeacherId
                ),

            RoomId:
                roomId,

            TimeSlotId:
                timeSlotId,

            AcademicSessionId:
                academicSessionId,

            ClassType:
                classType,

            Notes:
                body.Notes
                    ? String(
                        body.Notes
                    ).trim()
                    : null
        }
    };
};


// ======================================================
// GET ALL
// ======================================================

const getAllTimetableEntries = async (
    req,
    res
) => {

    try {

        const data =
            await timetableEntryService
                .getAllTimetableEntries();


        return res.status(200).json(
            data
        );


    } catch (error) {

        console.error(
            "GET TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to get timetable entries",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY SESSION
// ======================================================

const getTimetableEntriesBySession = async (
    req,
    res
) => {

    try {

        const sessionId =
            Number(
                req.params.academicSessionId
            );


        if (
            !Number.isInteger(sessionId) ||
            sessionId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Invalid Academic Session ID."
            });
        }


        const data =
            await timetableEntryService
                .getTimetableEntriesBySession(
                    sessionId
                );


        return res.status(200).json(
            data
        );


    } catch (error) {

        console.error(
            "GET SESSION TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to get session timetable",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getTimetableEntryById = async (
    req,
    res
) => {

    try {

        const data =
            await timetableEntryService
                .getTimetableEntryById(
                    req.params.id
                );


        if (!data) {

            return res.status(404).json({
                message:
                    "Timetable entry not found."
            });
        }


        return res.status(200).json(
            data
        );


    } catch (error) {

        return res.status(500).json({
            message:
                "Failed to get timetable entry",
            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createTimetableEntry = async (
    req,
    res
) => {

    try {

        const validation =
            await validateEntry(
                req.body
            );


        if (validation.error) {

            return res.status(409).json({
                message:
                    validation.error
            });
        }


        const result =
            await timetableEntryService
                .createTimetableEntry(
                    validation.data
                );


        return res.status(201).json({

            message:
                "Timetable entry created successfully.",

            data:
                result
        });


    } catch (error) {

        console.error(
            "CREATE TIMETABLE ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "Duplicate timetable entry."
            });
        }


        return res.status(500).json({
            message:
                "Failed to create timetable entry",
            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateTimetableEntry = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        const existing =
            await timetableEntryService
                .getTimetableEntryById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Timetable entry not found."
            });
        }


        const validation =
            await validateEntry(
                req.body,
                id
            );


        if (validation.error) {

            return res.status(409).json({
                message:
                    validation.error
            });
        }


        await timetableEntryService
            .updateTimetableEntry(
                id,
                validation.data
            );


        return res.status(200).json({
            message:
                "Timetable entry updated successfully."
        });


    } catch (error) {

        console.error(
            "UPDATE TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to update timetable entry",
            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteTimetableEntry = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        const existing =
            await timetableEntryService
                .getTimetableEntryById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Timetable entry not found."
            });
        }


        await timetableEntryService
            .deleteTimetableEntry(id);


        return res.status(200).json({
            message:
                "Timetable entry deleted successfully."
        });


    } catch (error) {

        return res.status(500).json({
            message:
                "Failed to delete timetable entry",
            error:
                error.message
        });
    }
};


module.exports = {

    getAllTimetableEntries,

    getTimetableEntriesBySession,

    getTimetableEntryById,

    createTimetableEntry,

    updateTimetableEntry,

    deleteTimetableEntry
};