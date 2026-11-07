const { getPgPool } = require("./client");
const { getSchedulingData } = require("./timetableData");
const { evaluateSchedule } = require("../services/schedulingConstraints");

async function validateTimetable(academicSessionId) {
    const data = await getSchedulingData(academicSessionId);
    return { academicSessionId, ...evaluateSchedule(data, data.entries) };
}

async function getResults(academicSessionId) {
    if (academicSessionId !== null) return [await validateTimetable(academicSessionId)];
    const pool = getPgPool();
    const { rows: sessions } = await pool.query('SELECT "AcademicSessionId" FROM "AcademicSessions" ORDER BY "AcademicSessionId"');
    return Promise.all(sessions.map(session => validateTimetable(session.AcademicSessionId)));
}

async function getAllConflicts(academicSessionId = null) {
    const results = await getResults(academicSessionId);
    return results.flatMap(result => result.conflicts);
}

async function getConflictSummary(academicSessionId = null) {
    const results = await getResults(academicSessionId);
    const conflicts = results.flatMap(result => result.conflicts);
    const missingAssignments = results.flatMap(result => result.missingAssignments);
    const totalEntries = results.reduce((sum, result) => sum + result.totalEntries, 0);
    const countType = type => conflicts.filter(item => item.type === type).length;
    const status = conflicts.length ? "conflicts" : !totalEntries ? "empty" : missingAssignments.length ? "incomplete" : "ready";

    return {
        academicSessionId, status, totalEntries, missingAssignments, isValid: status === "ready",
        totalConflicts: conflicts.length,
        teacherConflicts: countType("Teacher Conflict"),
        roomConflicts: countType("Room Conflict"),
        sectionConflicts: countType("Section Conflict"),
        roomCapacityConflicts: countType("Room Capacity Conflict") + countType("Common Room Capacity Conflict"),
        teacherDailyLoadConflicts: countType("Teacher Daily Load Conflict"),
        highSeverity: conflicts.filter(item => item.severity === "HIGH").length,
        mediumSeverity: conflicts.filter(item => item.severity === "MEDIUM").length
    };
}

module.exports = { getAllConflicts, getConflictSummary, validateTimetable };
