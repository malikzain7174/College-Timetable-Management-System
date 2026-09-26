const timetableGeneratorService =
    require("../services/timetableGeneratorService");


// ======================================================
// GENERATE
// ======================================================

const generateTimetable = async (
    req,
    res
) => {

    try {

        const academicSessionId =
            Number(
                req.body.AcademicSessionId
            );


        if (
            !Number.isInteger(
                academicSessionId
            ) ||
            academicSessionId <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Valid AcademicSessionId is required."
            });
        }


        const result =
            await timetableGeneratorService
                .generateTimetable({

                    academicSessionId,

                    clearExisting:
                        req.body.ClearExisting !==
                        false
                });


        return res.status(201).json({

            success:
                true,

            message:
                "Timetable generated successfully.",

            data:
                result
        });


    } catch (error) {

        console.error(
            "GENERATE TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message ||
                "Failed to generate timetable."
        });
    }
};


// ======================================================
// GET
// ======================================================

const getGeneratedTimetable = async (
    req,
    res
) => {

    try {

        const academicSessionId =
            Number(
                req.params.academicSessionId
            );


        if (
            !Number.isInteger(
                academicSessionId
            ) ||
            academicSessionId <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Valid AcademicSessionId is required."
            });
        }


        const result =
            await timetableGeneratorService
                .getGeneratedTimetable(
                    academicSessionId
                );


        return res.status(200).json({

            success:
                true,

            data:
                result
        });


    } catch (error) {

        console.error(
            "GET TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteGeneratedTimetable = async (
    req,
    res
) => {

    try {

        const academicSessionId =
            Number(
                req.params.academicSessionId
            );


        if (
            !Number.isInteger(
                academicSessionId
            ) ||
            academicSessionId <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Valid AcademicSessionId is required."
            });
        }


        const result =
            await timetableGeneratorService
                .deleteGeneratedTimetable(
                    academicSessionId
                );


        return res.status(200).json({

            success:
                true,

            message:
                "Timetable deleted successfully.",

            data:
                result
        });


    } catch (error) {

        console.error(
            "DELETE TIMETABLE ERROR:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message
        });
    }
};


module.exports = {

    generateTimetable,

    getGeneratedTimetable,

    deleteGeneratedTimetable
};