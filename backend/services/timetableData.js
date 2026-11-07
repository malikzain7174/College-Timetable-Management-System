const { sql, getPool } = require("../config/db");
const { HttpError } = require("../lib/httpError");
const { getAllRules } = require("./timetableRuleService");

const groupJoin = `
    OUTER APPLY (
        SELECT MIN(tg.TeachingGroupId) AS TeachingGroupId, COUNT(*) AS ActiveGroupCount
        FROM TeachingGroupSections tgs
        JOIN TeachingGroups tg ON tg.TeachingGroupId = tgs.TeachingGroupId
        WHERE tgs.SectionId = s.SectionId AND tg.IsActive = 1
            AND tg.CampusId = s.CampusId AND tg.AcademicSessionId = s.AcademicSessionId
            AND tg.ClassYearId = s.ClassYearId
    ) grp
`;

const timetableSelect = `
    SELECT te.TimetableEntryId, te.SectionSubjectId, te.TeacherId, te.RoomId, te.TimeSlotId,
        te.AcademicSessionId, te.ClassType, te.Notes, te.CreatedAt, te.UpdatedAt,
        ss.SectionId, ss.SubjectId, ss.TeacherId AS AssignedTeacherId,
        ss.WeeklyHours, ss.IsActive AS AssignmentIsActive,
        s.AcademicSessionId AS SectionSessionId, s.CampusId, s.ClassYearId, s.DefaultRoomId,
        s.SectionCode, s.SectionName, s.StudentCount, s.IsActive AS SectionIsActive,
        sub.SubjectCode, sub.SubjectName, sub.IsPractical, sub.IsActive AS SubjectIsActive,
        t.IsActive AS TeacherIsActive, CONCAT_WS(' ', t.FirstName, NULLIF(t.LastName, '')) AS TeacherName,
        r.RoomNumber, r.RoomName, r.RoomType, r.Capacity,
        ts.DayOfWeek, CONVERT(varchar(8), ts.StartTime, 108) AS StartTime,
        CONVERT(varchar(8), ts.EndTime, 108) AS EndTime, ts.SlotName,
        grp.TeachingGroupId, grp.ActiveGroupCount, a.SessionName, a.IsCurrent
    FROM TimetableEntries te
    JOIN SectionSubjects ss ON ss.SectionSubjectId = te.SectionSubjectId
    JOIN Sections s ON s.SectionId = ss.SectionId
    JOIN Subjects sub ON sub.SubjectId = ss.SubjectId
    JOIN Teachers t ON t.TeacherId = te.TeacherId
    JOIN Rooms r ON r.RoomId = te.RoomId
    JOIN TimeSlots ts ON ts.TimeSlotId = te.TimeSlotId
    JOIN AcademicSessions a ON a.AcademicSessionId = te.AcademicSessionId
    ${groupJoin}
`;

const sortEntries = "ORDER BY te.AcademicSessionId, ts.DayOfWeek, ts.StartTime, s.SectionCode, te.TimetableEntryId";

async function listEntries(filter = {}, db) {
    db ??= await getPool();
    const request = db.request();
    const predicates = [];
    for (const [key, column] of [
        ["sessionId", "AcademicSessionId"], ["entryId", "TimetableEntryId"], ["teacherId", "TeacherId"]
    ]) {
        if (filter[key] !== undefined) {
            request.input(key, sql.Int, filter[key]);
            predicates.push(`te.${column} = @${key}`);
        }
    }
    const where = predicates.length ? "WHERE " + predicates.join(" AND ") : "";
    return (await request.query(`${timetableSelect} ${where} ${sortEntries};`)).recordset;
}

async function getSchedulingData(sessionId, db) {
    db ??= await getPool();
    const requestForSession = () => db.request().input("sessionId", sql.Int, sessionId);
    const { recordset: [session] } = await requestForSession()
        .query("SELECT AcademicSessionId, SessionName FROM AcademicSessions WHERE AcademicSessionId = @sessionId;");
    if (!session) throw new HttpError(404, "Academic session was not found.");

    const { recordset: assignments } = await requestForSession().query(`
        SELECT ss.SectionSubjectId, ss.SectionId, ss.SubjectId, ss.TeacherId, ss.WeeklyHours,
            ss.IsActive AS AssignmentIsActive, s.CampusId, s.AcademicSessionId, s.ClassYearId,
            s.DefaultRoomId, s.SectionCode, s.SectionName, s.StudentCount, s.IsActive AS SectionIsActive,
            sub.SubjectCode, sub.SubjectName, sub.IsPractical, sub.IsActive AS SubjectIsActive,
            t.IsActive AS TeacherIsActive, CONCAT_WS(' ', t.FirstName, NULLIF(t.LastName, '')) AS TeacherName,
            grp.TeachingGroupId, grp.ActiveGroupCount
        FROM SectionSubjects ss
        JOIN Sections s ON s.SectionId = ss.SectionId
        JOIN Subjects sub ON sub.SubjectId = ss.SubjectId
        JOIN Teachers t ON t.TeacherId = ss.TeacherId
        ${groupJoin}
        WHERE s.AcademicSessionId = @sessionId
        ORDER BY ss.SectionSubjectId;
    `);

    const { recordset: timeSlots } = await db.request().query(`
        SELECT TimeSlotId, DayOfWeek, CONVERT(varchar(8), StartTime, 108) AS StartTime,
            CONVERT(varchar(8), EndTime, 108) AS EndTime, SlotName, IsActive
        FROM TimeSlots ORDER BY DayOfWeek, StartTime, TimeSlotId;
    `);
    const { recordset: rooms } = await requestForSession().query(`
        SELECT r.RoomId, r.CampusId, r.RoomNumber, r.RoomName, r.RoomType, r.Capacity, r.IsLab, r.IsActive,
            assigned.SectionId AS AssignedSectionId, assigned.SectionCode AS AssignedSectionCode
        FROM Rooms r
        OUTER APPLY (
            SELECT TOP 1 s.SectionId, s.SectionCode FROM Sections s
            WHERE s.DefaultRoomId = r.RoomId AND s.IsActive = 1 AND s.AcademicSessionId = @sessionId
            ORDER BY s.SectionId
        ) assigned
        ORDER BY r.CampusId, r.RoomNumber, r.RoomId;
    `);

    const entries = await listEntries({ sessionId }, db);
    const rules = await getAllRules(db);
    return { session, assignments, timeSlots, rooms, entries, rules };
}

module.exports = { listEntries, getSchedulingData };
