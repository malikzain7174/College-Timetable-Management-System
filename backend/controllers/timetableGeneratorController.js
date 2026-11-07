const generator = (process.env.DB_PROVIDER === "postgres" ? require("../postgres").timetableGeneratorService : require("../services/timetableGeneratorService"));
const { HttpError, positiveId } = require("../lib/httpError");

async function generateTimetable(req, res) {
    const { AcademicSessionId, ClearExisting = false, PreviewOnly = false, PreviewFingerprint } = req.body || {};
    if (typeof ClearExisting !== "boolean" || typeof PreviewOnly !== "boolean" ||
        (PreviewFingerprint !== undefined && (typeof PreviewFingerprint !== "string" || !/^[a-f\d]{64}$/.test(PreviewFingerprint)))) {
        throw new HttpError(400, "Invalid timetable generation options.");
    }
    const data = await generator.generateTimetable({
        academicSessionId: positiveId(AcademicSessionId, "academic session"),
        clearExisting: ClearExisting, previewOnly: PreviewOnly, previewFingerprint: PreviewFingerprint
    });
    res.status(PreviewOnly || !data.totalGenerated ? 200 : 201).json({
        success: true, message: PreviewOnly ? "Timetable preview ready." : "Timetable saved.", data
    });
}

async function getGeneratedTimetable(req, res) {
    const data = await generator.getGeneratedTimetable(positiveId(req.params.academicSessionId, "academic session"));
    res.json({ success: true, data });
}

async function deleteGeneratedTimetable(req, res) {
    const data = await generator.deleteGeneratedTimetable(positiveId(req.params.academicSessionId, "academic session"));
    res.json({ success: true, message: "Session timetable cleared.", data });
}

module.exports = { generateTimetable, getGeneratedTimetable, deleteGeneratedTimetable };
