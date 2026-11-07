const conflicts = require("../services/conflictService");
const { positiveId } = require("../lib/httpError");

const filterSession = req => req.query.academicSessionId === undefined
    ? null
    : positiveId(req.query.academicSessionId, "academic session");

async function getAllConflicts(req, res) {
    const academicSessionId = filterSession(req);
    const items = await conflicts.getAllConflicts(academicSessionId);
    res.json({ success: true, academicSessionId, totalConflicts: items.length, conflicts: items });
}

async function getConflictSummary(req, res) {
    res.json({ success: true, data: await conflicts.getConflictSummary(filterSession(req)) });
}

async function validateTimetable(req, res) {
    const session = positiveId(req.params.academicSessionId, "academic session");
    res.json({ success: true, data: await conflicts.validateTimetable(session) });
}

module.exports = { getAllConflicts, getConflictSummary, validateTimetable };
