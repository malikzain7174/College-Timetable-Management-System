const entries = (process.env.DB_PROVIDER === "postgres" ? require("../postgres").timetableEntryService : require("../services/timetableEntryService"));
const { positiveId } = require("../lib/httpError");

async function getAllTimetableEntries(req, res) {
    res.json(await entries.getAllTimetableEntries());
}

async function getTimetableEntriesBySession(req, res) {
    const sessionId = positiveId(req.params.academicSessionId, "academic session");
    res.json(await entries.getTimetableEntriesBySession(sessionId));
}

async function getTimetableEntryById(req, res) {
    res.json(await entries.getTimetableEntryById(positiveId(req.params.id, "entry ID")));
}

async function createTimetableEntry(req, res) {
    const result = await entries.createTimetableEntry(req.body || {});
    res.status(201).json({ message: "Timetable entry added.", ...result });
}

async function updateTimetableEntry(req, res) {
    const result = await entries.updateTimetableEntry(positiveId(req.params.id, "entry ID"), req.body || {});
    res.json({ message: "Timetable entry updated.", ...result });
}

async function deleteTimetableEntry(req, res) {
    const deletedRows = await entries.deleteTimetableEntry(positiveId(req.params.id, "entry ID"));
    res.json({ message: "Timetable entry deleted.", deletedRows });
}

module.exports = {
    getAllTimetableEntries, getTimetableEntriesBySession, getTimetableEntryById,
    createTimetableEntry, updateTimetableEntry, deleteTimetableEntry
};
