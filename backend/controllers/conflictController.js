const conflictService =
    require("../services/conflictService");


// ============================================================
// GET ALL CONFLICTS
//
// GET /api/conflicts
// GET /api/conflicts?academicSessionId=1
// ============================================================

const getAllConflicts = async (req, res) => {

    try {

        const academicSessionId =
            req.query.academicSessionId
                ? Number(req.query.academicSessionId)
                : null;

        const conflicts =
            await conflictService.getAllConflicts(
                academicSessionId
            );

        res.status(200).json({
            success: true,
            academicSessionId,
            totalConflicts: conflicts.length,
            conflicts
        });

    } catch (error) {

        console.error(
            "Conflict Detection Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to detect conflicts",
            error: error.message
        });
    }
};


// ============================================================
// GET CONFLICT SUMMARY
//
// GET /api/conflicts/summary
// GET /api/conflicts/summary?academicSessionId=1
// ============================================================

const getConflictSummary = async (req, res) => {

    try {

        const academicSessionId =
            req.query.academicSessionId
                ? Number(req.query.academicSessionId)
                : null;

        const summary =
            await conflictService
                .getConflictSummary(
                    academicSessionId
                );

        res.status(200).json({
            success: true,
            data: summary
        });

    } catch (error) {

        console.error(
            "Conflict Summary Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to get conflict summary",
            error: error.message
        });
    }
};


// ============================================================
// VALIDATE TIMETABLE
//
// GET /api/conflicts/validate/1
// ============================================================

const validateTimetable = async (req, res) => {

    try {

        const academicSessionId =
            Number(
                req.params.academicSessionId
            );

        if (!academicSessionId) {

            return res.status(400).json({
                success: false,
                message:
                    "AcademicSessionId is required."
            });
        }

        const result =
            await conflictService
                .validateTimetable(
                    academicSessionId
                );

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Timetable Validation Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to validate timetable",
            error: error.message
        });
    }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    getAllConflicts,
    getConflictSummary,
    validateTimetable
};