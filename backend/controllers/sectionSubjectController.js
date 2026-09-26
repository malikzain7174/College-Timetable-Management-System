const sectionSubjectService =
    require("../services/sectionSubjectService");


// ======================================================
// BOOLEAN HELPER
// ======================================================

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
// VALIDATE COMMON DATA
// ======================================================

const validateData = async (
    body,
    excludeId = null
) => {

    const {
        SectionId,
        SubjectId,
        TeacherId,
        WeeklyHours,
        SharedWithSectionId
    } = body;


    const sectionId =
        Number(SectionId);

    const subjectId =
        Number(SubjectId);

    const teacherId =
        Number(TeacherId);

    const weeklyHours =
        Number(WeeklyHours);


    if (
        !Number.isInteger(sectionId) ||
        sectionId <= 0
    ) {
        return {
            error:
                "Valid Section is required."
        };
    }


    if (
        !Number.isInteger(subjectId) ||
        subjectId <= 0
    ) {
        return {
            error:
                "Valid Subject is required."
        };
    }


    if (
        !Number.isInteger(teacherId) ||
        teacherId <= 0
    ) {
        return {
            error:
                "Valid Teacher is required."
        };
    }


    if (
        !Number.isInteger(weeklyHours) ||
        weeklyHours <= 0
    ) {
        return {
            error:
                "Weekly Hours must be greater than zero."
        };
    }


    let sharedWithSectionId = null;


    if (
        SharedWithSectionId !== "" &&
        SharedWithSectionId !== null &&
        SharedWithSectionId !== undefined
    ) {

        sharedWithSectionId =
            Number(SharedWithSectionId);


        if (
            !Number.isInteger(
                sharedWithSectionId
            ) ||
            sharedWithSectionId <= 0
        ) {

            return {
                error:
                    "Invalid shared section."
            };
        }


        if (
            sharedWithSectionId ===
            sectionId
        ) {

            return {
                error:
                    "A section cannot be shared with itself."
            };
        }
    }


    const sectionExists =
        await sectionSubjectService
            .sectionExists(
                sectionId
            );


    if (!sectionExists) {

        return {
            error:
                "Selected Section does not exist."
        };
    }


    const subjectExists =
        await sectionSubjectService
            .subjectExists(
                subjectId
            );


    if (!subjectExists) {

        return {
            error:
                "Selected Subject does not exist."
        };
    }


    const teacherExists =
        await sectionSubjectService
            .teacherExists(
                teacherId
            );


    if (!teacherExists) {

        return {
            error:
                "Selected Teacher does not exist."
        };
    }


    if (sharedWithSectionId) {

        const sharedExists =
            await sectionSubjectService
                .sectionExists(
                    sharedWithSectionId
                );


        if (!sharedExists) {

            return {
                error:
                    "Shared section does not exist."
            };
        }
    }


    const duplicate =
        await sectionSubjectService
            .findDuplicate(
                sectionId,
                subjectId,
                excludeId
            );


    if (duplicate) {

        return {
            error:
                "This subject is already assigned to the selected section."
        };
    }


    return {

        data: {

            SectionId:
                sectionId,

            SubjectId:
                subjectId,

            TeacherId:
                teacherId,

            WeeklyHours:
                weeklyHours,

            SharedWithSectionId:
                sharedWithSectionId
        }
    };
};


// ======================================================
// GET ALL
// ======================================================

const getAllSectionSubjects = async (
    req,
    res
) => {

    try {

        const data =
            await sectionSubjectService
                .getAllSectionSubjects();


        return res.status(200).json(
            data
        );


    } catch (error) {

        console.error(
            "GET SECTION SUBJECTS ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to get Section Subjects",

            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getSectionSubjectById = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        if (!Number.isInteger(id)) {

            return res.status(400).json({
                message:
                    "Invalid SectionSubject ID."
            });
        }


        const data =
            await sectionSubjectService
                .getSectionSubjectById(
                    id
                );


        if (!data) {

            return res.status(404).json({
                message:
                    "Section Subject not found."
            });
        }


        return res.status(200).json(
            data
        );


    } catch (error) {

        console.error(
            "GET SECTION SUBJECT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to get Section Subject",

            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createSectionSubject = async (
    req,
    res
) => {

    try {

        const validation =
            await validateData(
                req.body
            );


        if (validation.error) {

            return res.status(400).json({
                message:
                    validation.error
            });
        }


        const result =
            await sectionSubjectService
                .createSectionSubject({

                    ...validation.data,

                    IsActive:
                        parseBoolean(
                            req.body.IsActive,
                            true
                        )
                });


        return res.status(201).json({

            message:
                "Section Subject created successfully.",

            data:
                result
        });


    } catch (error) {

        console.error(
            "CREATE SECTION SUBJECT ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "This Subject is already assigned to this Section."
            });
        }


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Section, Subject or Teacher selected."
            });
        }


        return res.status(500).json({

            message:
                "Failed to create Section Subject",

            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateSectionSubject = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        if (!Number.isInteger(id)) {

            return res.status(400).json({
                message:
                    "Invalid SectionSubject ID."
            });
        }


        const existing =
            await sectionSubjectService
                .getSectionSubjectById(
                    id
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Section Subject not found."
            });
        }


        const validation =
            await validateData(
                req.body,
                id
            );


        if (validation.error) {

            return res.status(400).json({
                message:
                    validation.error
            });
        }


        await sectionSubjectService
            .updateSectionSubject(
                id,
                {

                    ...validation.data,

                    IsActive:
                        parseBoolean(
                            req.body.IsActive,
                            true
                        )
                }
            );


        return res.status(200).json({

            message:
                "Section Subject updated successfully."
        });


    } catch (error) {

        console.error(
            "UPDATE SECTION SUBJECT ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "This Subject is already assigned to this Section."
            });
        }


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Section, Subject or Teacher selected."
            });
        }


        return res.status(500).json({

            message:
                "Failed to update Section Subject",

            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteSectionSubject = async (
    req,
    res
) => {

    const id =
        Number(req.params.id);


    if (!Number.isInteger(id)) {

        return res.status(400).json({
            message:
                "Invalid SectionSubject ID."
        });
    }


    try {

        const existing =
            await sectionSubjectService
                .getSectionSubjectById(
                    id
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Section Subject not found."
            });
        }


        try {

            await sectionSubjectService
                .deleteSectionSubject(
                    id
                );


            return res.status(200).json({
                message:
                    "Section Subject deleted successfully."
            });


        } catch (deleteError) {


            if (
                deleteError.number === 547
            ) {

                await sectionSubjectService
                    .deactivateSectionSubject(
                        id
                    );


                return res.status(200).json({

                    message:
                        "This Section Subject is already used in timetable entries, so it was deactivated instead of permanently deleted.",

                    deactivated:
                        true
                });
            }


            throw deleteError;
        }


    } catch (error) {

        console.error(
            "DELETE SECTION SUBJECT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to delete Section Subject",

            error:
                error.message
        });
    }
};


module.exports = {

    getAllSectionSubjects,

    getSectionSubjectById,

    createSectionSubject,

    updateSectionSubject,

    deleteSectionSubject
};