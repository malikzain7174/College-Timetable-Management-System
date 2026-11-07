const { sql, withDatabaseLock } = require("../config/db");
const { HttpError, positiveId } = require("../lib/httpError");
const { listEntries, getSchedulingData } = require("./timetableData");
const { commonCohort, lectureKey, lectureProblems, placedPeriods } = require("./schedulingConstraints");

const withTimetableLock = (sessionId, operation) => withDatabaseLock(`timetable:session:${sessionId}`, operation);

async function insertEntries(db, entries) {
    if (!entries.length) return [];
    const { recordset } = await db.request()
        .input("entries", sql.NVarChar(sql.MAX), JSON.stringify(entries))
        .query(`
            DECLARE @inserted TABLE (TimetableEntryId int);
            INSERT dbo.TimetableEntries
                (SectionSubjectId, TeacherId, RoomId, TimeSlotId, AcademicSessionId, ClassType, Notes, CreatedAt, UpdatedAt)
            OUTPUT INSERTED.TimetableEntryId INTO @inserted
            SELECT SectionSubjectId, TeacherId, RoomId, TimeSlotId, AcademicSessionId, ClassType, Notes,
                SYSUTCDATETIME(), SYSUTCDATETIME()
            FROM OPENJSON(@entries) WITH (
                SectionSubjectId int, TeacherId int, RoomId int, TimeSlotId int, AcademicSessionId int,
                ClassType nvarchar(30), Notes nvarchar(500)
            );
            SELECT TimetableEntryId FROM @inserted ORDER BY TimetableEntryId;
        `);
    return recordset;
}

async function clearEntries(db, sessionId) {
    const { rowsAffected } = await db.request().input("id", sql.Int, sessionId)
        .query("DELETE FROM dbo.TimetableEntries WHERE AcademicSessionId = @id;");
    return { deletedRows: rowsAffected[0] || 0 };
}

function readEntry(body = {}) {
    const classType = body.ClassType;
    if (!["Regular", "Practical", "Common", "Lab"].includes(classType)) {
        throw new HttpError(400, "Select a valid class type.");
    }
    if (body.Notes != null && (typeof body.Notes !== "string" || body.Notes.length > 500)) {
        throw new HttpError(400, "Notes must be 500 characters or fewer.");
    }
    return {
        SectionSubjectId: positiveId(body.SectionSubjectId, "section subject"),
        RoomId: positiveId(body.RoomId, "room"),
        TimeSlotId: positiveId(body.TimeSlotId, "time slot"),
        AcademicSessionId: positiveId(body.AcademicSessionId, "academic session"),
        ClassType: classType === "Lab" ? "Practical" : classType,
        Notes: body.Notes?.trim() || null
    };
}

function buildLecture(data, entry, previous = []) {
    const mapping = data.assignments.find(row => row.SectionSubjectId === entry.SectionSubjectId);
    if (!mapping) throw new HttpError(409, "The subject assignment is not in this academic session.");

    const common = entry.ClassType === "Common";
    if (previous.length && ((previous[0].ClassType === "Common") !== common)) {
        throw new HttpError(409, "Create a new lecture to change between shared and individual scheduling.");
    }

    const mappings = common ? commonCohort(mapping, data.assignments) : [mapping];
    if (common && mappings.length < 2) {
        throw new HttpError(409, "A shared lecture needs a matching subject and teacher across an active teaching group.");
    }
    const previousByAssignment = new Map(previous.map(row => [row.SectionSubjectId, row.TimetableEntryId]));
    if (common && previous.length && (
        mappings.length !== previous.length || mappings.some(row => !previousByAssignment.has(row.SectionSubjectId))
    )) {
        throw new HttpError(409, "This shared lecture no longer matches the group. Clear it and schedule the current group.");
    }
    const rows = mappings.map(row => ({
        ...row, ...entry, SectionSubjectId: row.SectionSubjectId,
        TimetableEntryId: common ? previousByAssignment.get(row.SectionSubjectId) : previous[0]?.TimetableEntryId
    }));
    const previousIds = new Set(previous.map(row => row.TimetableEntryId));
    const others = data.entries.filter(row => !previousIds.has(row.TimetableEntryId));
    const problems = lectureProblems(rows, others, data);
    const placed = placedPeriods(others);
    if (rows.some(row => (placed.get(row.SectionSubjectId) || 0) >= row.WeeklyHours)) {
        problems.push({ type: "Weekly Demand Conflict", message: "The assignment already has all its weekly periods." });
    }
    if (problems.length) throw new HttpError(409, problems.map(problem => problem.message).join(" "), problems);
    return rows;
}

async function getTimetableEntryById(id, db) {
    const [entry] = await listEntries({ entryId: id }, db);
    if (!entry) throw new HttpError(404, "Timetable entry not found.");
    return entry;
}

async function createTimetableEntry(body) {
    const entry = readEntry(body);
    return withTimetableLock(entry.AcademicSessionId, async db => {
        const data = await getSchedulingData(entry.AcademicSessionId, db);
        const inserted = await insertEntries(db, buildLecture(data, entry));
        return {
            data: await getTimetableEntryById(inserted[0].TimetableEntryId, db),
            affectedRows: inserted.length
        };
    });
}

async function withExistingLecture(id, operation) {
    const initial = await getTimetableEntryById(id);
    return withTimetableLock(initial.AcademicSessionId, async db => {
        const data = await getSchedulingData(initial.AcademicSessionId, db);
        const selected = data.entries.find(row => row.TimetableEntryId === id);
        if (!selected) throw new HttpError(404, "Timetable entry not found.");
        const key = lectureKey(selected);
        return operation(db, data, data.entries.filter(row => lectureKey(row) === key));
    });
}

async function updateTimetableEntry(id, body) {
    const entry = readEntry(body);
    return withExistingLecture(id, async (db, data, previous) => {
        if (entry.AcademicSessionId !== data.session.AcademicSessionId) {
            throw new HttpError(409, "An existing lesson cannot be moved to another academic session.");
        }
        const changes = buildLecture(data, entry, previous);
        const result = await db.request().input("entries", sql.NVarChar(sql.MAX), JSON.stringify(changes)).query(`
            UPDATE te
            SET SectionSubjectId = nextRow.SectionSubjectId, TeacherId = nextRow.TeacherId,
                RoomId = nextRow.RoomId, TimeSlotId = nextRow.TimeSlotId, ClassType = nextRow.ClassType,
                Notes = nextRow.Notes, UpdatedAt = SYSUTCDATETIME()
            FROM dbo.TimetableEntries te
            JOIN OPENJSON(@entries) WITH (
                TimetableEntryId int, SectionSubjectId int, TeacherId int, RoomId int, TimeSlotId int,
                ClassType nvarchar(30), Notes nvarchar(500)
            ) nextRow ON nextRow.TimetableEntryId = te.TimetableEntryId;
        `);
        return { data: await getTimetableEntryById(id, db), affectedRows: result.rowsAffected[0] };
    });
}

async function deleteTimetableEntry(id) {
    return withExistingLecture(id, async (db, data, previous) => {
        const ids = previous.map(row => row.TimetableEntryId);
        const result = await db.request().input("ids", sql.NVarChar(sql.MAX), JSON.stringify(ids))
            .query("DELETE FROM dbo.TimetableEntries WHERE TimetableEntryId IN (SELECT CONVERT(int, value) FROM OPENJSON(@ids));");
        return result.rowsAffected[0];
    });
}

module.exports = {
    clearEntries, createTimetableEntry, deleteTimetableEntry, getTimetableEntryById, insertEntries,
    getAllTimetableEntries: () => listEntries(),
    getTimetableEntriesBySession: sessionId => listEntries({ sessionId }),
    getTimetableForTeacher: teacherId => listEntries({ teacherId }),
    updateTimetableEntry, withTimetableLock
};
