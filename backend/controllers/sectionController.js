const sectionService =
    require(
        "../services/sectionService"
    );


// ======================================================
// GET ALL
// ======================================================

const getAllSections =
    async (
        req,
        res
    ) => {

        try {

            const sections =
                await sectionService
                    .getAllSections();


            return res
                .status(200)
                .json(
                    sections
                );


        } catch (error) {

            console.error(
                "GET SECTIONS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to load sections.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// LOOKUPS
// ======================================================

const getSectionLookups =
    async (
        req,
        res
    ) => {

        try {

            const data =
                await sectionService
                    .getSectionLookups();


            return res
                .status(200)
                .json(
                    data
                );


        } catch (error) {

            console.error(
                "SECTION LOOKUPS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to load section dropdown data.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// CREATE CAMPUS
// ======================================================

const createCampus =
    async (
        req,
        res
    ) => {

        try {

            const CampusName =
                String(
                    req.body.CampusName ||
                    ""
                ).trim();


            const CampusCode =
                String(
                    req.body.CampusCode ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const Location =
                String(
                    req.body.Location ||
                    ""
                ).trim();


            if (!CampusName) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Campus name is required."
                    });
            }


            if (!CampusCode) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Campus code is required."
                    });
            }


            const campus =
                await sectionService
                    .createCampus({

                        CampusName,

                        CampusCode,

                        Location,

                        IsActive:
                            true
                    });


            return res
                .status(201)
                .json({

                    message:
                        "Campus added successfully.",

                    campus
                });


        } catch (error) {

            console.error(
                "CREATE CAMPUS ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Campus name or code already exists."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to create campus.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// CREATE ACADEMIC SESSION
// ======================================================

const createAcademicSession =
    async (
        req,
        res
    ) => {

        try {

            const SessionName =
                String(
                    req.body.SessionName ||
                    ""
                ).trim();


            const StartDate =
                req.body.StartDate;


            const EndDate =
                req.body.EndDate;


            const IsCurrent =
                Boolean(
                    req.body.IsCurrent
                );


            if (!SessionName) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Session name is required."
                    });
            }


            if (!StartDate) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Start date is required."
                    });
            }


            if (!EndDate) {

                return res
                    .status(400)
                    .json({

                        message:
                            "End date is required."
                    });
            }


            if (
                new Date(EndDate) <
                new Date(StartDate)
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "End date cannot be before start date."
                    });
            }


            const session =
                await sectionService
                    .createAcademicSession({

                        SessionName,

                        StartDate,

                        EndDate,

                        IsCurrent
                    });


            return res
                .status(201)
                .json({

                    message:
                        "Academic session added successfully.",

                    session
                });


        } catch (error) {

            console.error(
                "CREATE SESSION ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Academic session already exists."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to create academic session.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// GET BY ID
// ======================================================

const getSectionById =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid section."
                    });
            }


            const section =
                await sectionService
                    .getSectionById(
                        id
                    );


            if (!section) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Section not found."
                    });
            }


            return res
                .status(200)
                .json(
                    section
                );


        } catch (error) {

            console.error(
                "GET SECTION ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to load section.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// VALIDATE
// ======================================================

const validateSection =
    body => {

        const CampusId =
            Number(
                body.CampusId
            );


        const AcademicSessionId =
            Number(
                body.AcademicSessionId
            );


        const ClassYearId =
            Number(
                body.ClassYearId
            );


        const ProgramId =
            Number(
                body.ProgramId
            );


        const DefaultRoomId =
            Number(
                body.DefaultRoomId
            );


        const SectionName =
            String(
                body.SectionName ||
                ""
            ).trim();


        const SectionCode =
            String(
                body.SectionCode ||
                ""
            ).trim();


        const StudentCount =
            Number(
                body.StudentCount
            );


        if (
            !Number.isInteger(
                CampusId
            ) ||
            CampusId <= 0
        ) {

            return {
                error:
                    "Please select a campus."
            };
        }


        if (
            !Number.isInteger(
                AcademicSessionId
            ) ||
            AcademicSessionId <= 0
        ) {

            return {
                error:
                    "Please select an academic session."
            };
        }


        if (
            !Number.isInteger(
                ClassYearId
            ) ||
            ClassYearId <= 0
        ) {

            return {
                error:
                    "Please select a class year."
            };
        }


        if (
            !Number.isInteger(
                ProgramId
            ) ||
            ProgramId <= 0
        ) {

            return {
                error:
                    "Please select a program."
            };
        }


        if (
            !Number.isInteger(
                DefaultRoomId
            ) ||
            DefaultRoomId <= 0
        ) {

            return {
                error:
                    "Please assign a room to this section."
            };
        }


        if (!SectionName) {

            return {
                error:
                    "Section name is required."
            };
        }


        if (!SectionCode) {

            return {
                error:
                    "Section code could not be generated."
            };
        }


        if (
            !Number.isInteger(
                StudentCount
            ) ||
            StudentCount <= 0
        ) {

            return {
                error:
                    "Student count must be greater than 0."
            };
        }


        return {

            data: {

                CampusId,

                AcademicSessionId,

                ClassYearId,

                ProgramId,

                DefaultRoomId,

                SectionName,

                SectionCode,

                StudentCount,

                IsActive:
                    body.IsActive !== false
            }
        };
    };


// ======================================================
// CREATE SECTION
// ======================================================

const createSection =
    async (
        req,
        res
    ) => {

        try {

            const validation =
                validateSection(
                    req.body
                );


            if (validation.error) {

                return res
                    .status(400)
                    .json({

                        message:
                            validation.error
                    });
            }


            const roomValidation =
                await sectionService
                    .validateRoomAssignment({

                        roomId:
                            validation
                                .data
                                .DefaultRoomId,

                        campusId:
                            validation
                                .data
                                .CampusId,

                        studentCount:
                            validation
                                .data
                                .StudentCount,

                        academicSessionId:
                            validation
                                .data
                                .AcademicSessionId,

                        currentSectionId:
                            null
                    });


            if (!roomValidation.valid) {

                return res
                    .status(400)
                    .json({

                        message:
                            roomValidation.message
                    });
            }


            const section =
                await sectionService
                    .createSection(
                        validation.data
                    );


            return res
                .status(201)
                .json({

                    message:
                        "Section added successfully.",

                    section
                });


        } catch (error) {

            console.error(
                "CREATE SECTION ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "A section with this code already exists."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to create section.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// UPDATE SECTION
// ======================================================

const updateSection =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid section."
                    });
            }


            const existing =
                await sectionService
                    .getSectionById(
                        id
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Section not found."
                    });
            }


            const validation =
                validateSection(
                    req.body
                );


            if (validation.error) {

                return res
                    .status(400)
                    .json({

                        message:
                            validation.error
                    });
            }


            const roomValidation =
                await sectionService
                    .validateRoomAssignment({

                        roomId:
                            validation
                                .data
                                .DefaultRoomId,

                        campusId:
                            validation
                                .data
                                .CampusId,

                        studentCount:
                            validation
                                .data
                                .StudentCount,

                        academicSessionId:
                            validation
                                .data
                                .AcademicSessionId,

                        currentSectionId:
                            id
                    });


            if (!roomValidation.valid) {

                return res
                    .status(400)
                    .json({

                        message:
                            roomValidation.message
                    });
            }


            await sectionService
                .updateSection(
                    id,
                    validation.data
                );


            return res
                .status(200)
                .json({

                    message:
                        roomValidation.shared

                            ? "Section updated successfully. Room is shared with its Teaching Group."

                            : "Section updated successfully."
                });


        } catch (error) {

            console.error(
                "UPDATE SECTION ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "A section with this code already exists."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to update section.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// DELETE SECTION
// ======================================================

const deleteSection =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid section."
                    });
            }


            const existing =
                await sectionService
                    .getSectionById(
                        id
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Section not found."
                    });
            }


            await sectionService
                .deleteSection(
                    id
                );


            return res
                .status(200)
                .json({

                    message:
                        "Section deleted successfully."
                });


        } catch (error) {

            console.error(
                "DELETE SECTION ERROR:",
                error
            );


            if (
                error.number === 547
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Section is already used by academic/timetable records and cannot be deleted."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to delete section.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    getAllSections,

    getSectionLookups,

    createCampus,

    createAcademicSession,

    getSectionById,

    createSection,

    updateSection,

    deleteSection
};