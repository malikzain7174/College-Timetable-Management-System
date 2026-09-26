const subjectService =
    require("../services/subjectService");


// ======================================================
// VALIDATION
// ======================================================

const validateSubject = body => {

    const SubjectCode =
        String(
            body.SubjectCode || ""
        ).trim();


    const SubjectName =
        String(
            body.SubjectName || ""
        ).trim();


    const CreditHours =
        body.CreditHours === null ||
        body.CreditHours === undefined ||
        body.CreditHours === ""
            ? null
            : Number(
                body.CreditHours
            );


    const WeeklyHours =
        Number(
            body.WeeklyHours
        );


    if (!SubjectCode) {

        return {
            error:
                "Subject code is required."
        };
    }


    if (!SubjectName) {

        return {
            error:
                "Subject name is required."
        };
    }


    if (
        CreditHours !== null &&
        (
            Number.isNaN(
                CreditHours
            ) ||
            CreditHours < 0
        )
    ) {

        return {
            error:
                "Credit hours are invalid."
        };
    }


    if (
        !Number.isInteger(
            WeeklyHours
        ) ||
        WeeklyHours <= 0
    ) {

        return {
            error:
                "Weekly hours must be greater than 0."
        };
    }


    return {

        data: {

            SubjectCode,

            SubjectName,

            CreditHours,

            WeeklyHours,

            IsPractical:
                Boolean(
                    body.IsPractical
                ),

            IsActive:
                body.IsActive !== false
        }
    };
};


// ======================================================
// GET ALL
// ======================================================

const getAllSubjects = async (
    req,
    res
) => {

    try {

        const subjects =
            await subjectService
                .getAllSubjects();


        return res.status(200).json(
            subjects
        );


    } catch (error) {

        console.error(
            "GET SUBJECTS ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to load subjects.",

            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getSubjectById = async (
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

            return res.status(400).json({
                message:
                    "Invalid subject."
            });
        }


        const subject =
            await subjectService
                .getSubjectById(id);


        if (!subject) {

            return res.status(404).json({
                message:
                    "Subject not found."
            });
        }


        return res.status(200).json(
            subject
        );


    } catch (error) {

        console.error(
            "GET SUBJECT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to load subject.",

            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createSubject = async (
    req,
    res
) => {

    try {

        const validation =
            validateSubject(
                req.body
            );


        if (validation.error) {

            return res.status(400).json({
                message:
                    validation.error
            });
        }


        const subject =
            await subjectService
                .createSubject(
                    validation.data
                );


        return res.status(201).json({

            message:
                "Subject added successfully.",

            subject
        });


    } catch (error) {

        console.error(
            "CREATE SUBJECT ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "A subject with this code already exists."
            });
        }


        return res.status(500).json({

            message:
                "Failed to create subject.",

            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateSubject = async (
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

            return res.status(400).json({
                message:
                    "Invalid subject."
            });
        }


        const existing =
            await subjectService
                .getSubjectById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Subject not found."
            });
        }


        const validation =
            validateSubject(
                req.body
            );


        if (validation.error) {

            return res.status(400).json({
                message:
                    validation.error
            });
        }


        await subjectService
            .updateSubject(
                id,
                validation.data
            );


        return res.status(200).json({
            message:
                "Subject updated successfully."
        });


    } catch (error) {

        console.error(
            "UPDATE SUBJECT ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "A subject with this code already exists."
            });
        }


        return res.status(500).json({

            message:
                "Failed to update subject.",

            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteSubject = async (
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

            return res.status(400).json({
                message:
                    "Invalid subject."
            });
        }


        const existing =
            await subjectService
                .getSubjectById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Subject not found."
            });
        }


        await subjectService
            .deleteSubject(id);


        return res.status(200).json({
            message:
                "Subject deleted successfully."
        });


    } catch (error) {

        console.error(
            "DELETE SUBJECT ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to delete subject. It may be assigned to a section.",

            error:
                error.message
        });
    }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getAllSubjects,

    getSubjectById,

    createSubject,

    updateSubject,

    deleteSubject
};