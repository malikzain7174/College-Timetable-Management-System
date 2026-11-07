const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");

test("SQL-backed timetable and authorization regressions", { skip: process.env.RUN_SQL_TESTS !== "1" }, async t => {
    assert.match(process.env.DB_DATABASE || "", /^CollegeTimetableTest\w*$/, "Run SQL tests only in an isolated CollegeTimetableTest database.");
    const bcrypt = require("bcryptjs");
    const app = require("../server");
    const { getPool, closePool } = require("../config/db");
    const { provisionAdmin } = require("../services/authService");
    const pool = await getPool();

    const query = async (text, values = {}) => {
        const request = pool.request();
        for (const [key, value] of Object.entries(values)) request.input(key, value);
        return request.query(text);
    };
    const password = randomBytes(18).toString("base64url");
    const suffix = randomBytes(5).toString("hex");
    const admin = "qa-admin-" + suffix;
    const teacher = "qa-teacher-" + suffix;
    const { recordset: [demo] } = await query("SELECT AcademicSessionId FROM AcademicSessions WHERE SessionName = N'Demo Session';");
    assert.ok(demo, "Run npm run db:migrate and npm run db:seed first.");
    const sessionId = demo.AcademicSessionId;
    const { recordset: mappings } = await query(`
        SELECT ss.SectionSubjectId, ss.TeacherId, ss.SectionId, sub.IsPractical
        FROM SectionSubjects ss JOIN Subjects sub ON sub.SubjectId = ss.SubjectId
        JOIN Sections s ON s.SectionId = ss.SectionId WHERE s.AcademicSessionId = @sessionId
        ORDER BY ss.SectionSubjectId;
    `, { sessionId });
    const shared = mappings.filter(row => !row.IsPractical);
    const [one, two] = shared;
    const practical = mappings.find(row => row.IsPractical);
    const { recordset: [room] } = await query("SELECT RoomId FROM Rooms WHERE RoomNumber = N'DEMO-101';");
    const { recordset: slots } = await query("SELECT TimeSlotId, DayOfWeek FROM TimeSlots WHERE IsActive = 1 ORDER BY DayOfWeek, StartTime;");
    const [first, second] = slots;
    const { recordset: [group] } = await query("SELECT * FROM TeachingGroups WHERE GroupName = N'Demo Shared Group';");

    await provisionAdmin(admin, password, false);
    await query(`
        INSERT Users (Username, PasswordHash, Role, TeacherId, IsActive, CreatedAt, AuthVersion)
        VALUES (@teacher, @hash, 'Teacher', @teacherId, 1, SYSUTCDATETIME(), 0);
    `, { teacher, hash: await bcrypt.hash(password, 12), teacherId: one.TeacherId });

    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    let token;
    const authHeaders = sessionToken => sessionToken ? { Authorization: "Bearer " + sessionToken } : {};
    async function call(path, method = "GET", body, sessionToken = token) {
        const headers = authHeaders(sessionToken);
        if (body !== undefined) headers["Content-Type"] = "application/json";
        const response = await fetch(base + path, {
            method, headers, body: body === undefined ? undefined : JSON.stringify(body)
        });
        return { status: response.status, body: response.status === 204 ? null : await response.json() };
    }
    function status(response, expected) {
        assert.equal(response.status, expected, response.body?.message);
        return response.body;
    }
    const list = async () => status(await call("/timetableentries/session/" + sessionId), 200);
    const clear = async () => status(await call("/timetable-generator/" + sessionId, "DELETE"), 200);
    const generate = (options = {}) => call("/timetable-generator/generate", "POST", { AcademicSessionId: sessionId, ...options });
    const entry = (mapping = one, slot = first, classType = "Regular") => ({
        SectionSubjectId: mapping.SectionSubjectId, RoomId: room.RoomId, TimeSlotId: slot.TimeSlotId,
        AcademicSessionId: sessionId, ClassType: classType
    });
    const createRule = (overrides = {}) => call("/timetable-rules", "POST", {
        RuleCode: "TEACHER_BLOCK_DAY", RuleName: "QA rule " + suffix, RuleType: "BlockedDay",
        ScopeType: "Teacher", ScopeId: one.TeacherId, RuleValue: { dayOfWeek: first.DayOfWeek }, ...overrides
    });

    try {
        await t.test("anonymous writes denied and teacher sessions limited to own timetable", async () => {
            status(await call("/timetableentries", "POST", entry()), 401);
            status(await call("/timetable-generator/" + sessionId, "DELETE"), 401);
            status(await call("/auth/login", "POST", { username: admin, password: "incorrect" }), 401);
            token = status(await call("/auth/login", "POST", { username: admin, password }), 200).token;
            const teacherToken = status(await call("/auth/login", "POST", { username: teacher, password }, null), 200).token;
            status(await call("/timetableentries", "POST", entry(), teacherToken), 403);
            status(await call("/teachers", "GET", undefined, teacherToken), 403);
            await clear();
            status(await call("/timetableentries", "POST", entry()), 201);
            const lessons = status(await call("/auth/timetable", "GET", undefined, teacherToken), 200);
            assert.equal(lessons.length, 1);
            assert.equal(lessons[0].TeacherId, one.TeacherId);
            status(await call("/auth/logout", "POST", undefined, teacherToken), 204);
            status(await call("/auth/me", "GET", undefined, teacherToken), 401);
        });

        await t.test("preview is read-only and repeat append does not duplicate lessons", async () => {
            await clear();
            const preview = status(await generate({ PreviewOnly: true }), 200).data;
            assert.equal(preview.status, "ready");
            assert.equal((await list()).length, 0);
            const saved = status(await generate({ PreviewFingerprint: preview.previewFingerprint }), 201).data;
            assert.equal(saved.totalGenerated, 5);
            assert.equal(status(await generate(), 200).data.totalGenerated, 0);
            assert.equal((await list()).length, 5);
            assert.equal(status(await call("/conflicts/validate/" + sessionId), 200).data.isValid, true);
        });

        await t.test("parallel manual writes cannot double-book the same teacher and room", async () => {
            await clear();
            const results = await Promise.all([one, two].map(mapping => call("/timetableentries", "POST", entry(mapping))));
            assert.deepEqual(results.map(row => row.status).sort(), [201, 409]);
            assert.equal((await list()).length, 1);
        });

        await t.test("replacement rolls back on a SQL insert failure", async () => {
            const before = (await list()).map(row => row.TimetableEntryId);
            const { data: preview } = status(await generate({ ClearExisting: true, PreviewOnly: true }), 200);
            assert.equal(preview.isValid, true);
            await query(`
                CREATE OR ALTER TRIGGER dbo.QA_BlockScheduleWrite ON dbo.TimetableEntries AFTER INSERT AS
                BEGIN
                    SET NOCOUNT ON;
                    THROW 51005, 'Injected timetable write failure', 1;
                END;
            `);
            try {
                status(await generate({ ClearExisting: true, PreviewFingerprint: preview.previewFingerprint }), 500);
                assert.deepEqual((await list()).map(row => row.TimetableEntryId), before);
            } finally {
                await query("DROP TRIGGER IF EXISTS dbo.QA_BlockScheduleWrite;");
            }
        });

        await t.test("blocked days, labs, inactive mappings and incomplete replacements are checked", async () => {
            const before = (await list()).map(row => row.TimetableEntryId);
            const ruleIds = [];
            for (const dayOfWeek of [...new Set(slots.map(row => row.DayOfWeek))]) {
                ruleIds.push(status(await createRule({ RuleValue: { dayOfWeek } }), 201).RuleId);
            }
            try {
                const preview = status(await generate({ ClearExisting: true, PreviewOnly: true }), 200).data;
                assert.equal(preview.isValid, false);
                assert.ok(preview.missingAssignments.length > 0);
                status(await generate({ ClearExisting: true, PreviewFingerprint: preview.previewFingerprint }), 422);
                assert.deepEqual((await list()).map(row => row.TimetableEntryId), before);
                assert.match(status(await call("/timetableentries", "POST", entry(one, second)), 409).message, /unavailable/);
                assert.match(status(await call("/timetableentries", "POST", entry(practical, second, "Practical")), 409).message, /lab/);
                await query("UPDATE Teachers SET IsActive = 0 WHERE TeacherId = @id;", { id: one.TeacherId });
                const inactive = status(await generate({ ClearExisting: true, PreviewOnly: true }), 200).data;
                assert.ok(inactive.missingAssignments.some(row => row.reason.includes("inactive")));
                status(await call("/conflicts/validate/2147483000"), 404);
            } finally {
                await query("UPDATE Teachers SET IsActive = 1 WHERE TeacherId = @id;", { id: one.TeacherId });
                for (const ruleId of ruleIds) status(await call("/timetable-rules/" + ruleId, "DELETE"), 200);
            }
        });

        await t.test("shared lectures move and delete as one, and invalid rules and memberships are rejected", async () => {
            await clear();
            const created = status(await call("/timetableentries", "POST", entry(one, first, "Common")), 201);
            assert.equal(created.affectedRows, 2);
            const id = created.data.TimetableEntryId;
            const moved = status(await call("/timetableentries/" + id, "PUT", entry(one, second, "Common")), 200);
            assert.equal(moved.affectedRows, 2);
            assert.ok((await list()).every(row => row.TimeSlotId === second.TimeSlotId));
            assert.equal(status(await call("/timetableentries/" + id, "DELETE"), 200).deletedRows, 2);
            assert.equal(status(await call("/conflicts/validate/" + sessionId), 200).data.status, "empty");

            status(await createRule({ RuleCode: "UNKNOWN_RULE" }), 400);
            status(await createRule({ RuleValue: "malformed" }), 400);
            status(await createRule({ ScopeId: 2147483000 }), 400);
            const groupPayload = {
                GroupName: "QA competing " + suffix, CampusId: group.CampusId,
                AcademicSessionId: sessionId, ClassYearId: group.ClassYearId
            };
            status(await call("/teaching-groups", "POST", { ...groupPayload, SectionIds: [one.SectionId] }), 409);
            const rejectedGroup = await query("SELECT TeachingGroupId FROM TeachingGroups WHERE GroupName = @name;", { name: groupPayload.GroupName });
            assert.equal(rejectedGroup.recordset.length, 0);

            const { recordset: [competing] } = await query(`
                INSERT TeachingGroups (GroupName, CampusId, AcademicSessionId, ClassYearId)
                OUTPUT INSERTED.TeachingGroupId
                VALUES (@name, @campus, @session, @year);
            `, { name: "QA competing " + suffix, campus: group.CampusId, session: sessionId, year: group.ClassYearId });
            try {
                status(await call("/teaching-group-sections", "POST", {
                    TeachingGroupId: competing.TeachingGroupId, SectionId: one.SectionId
                }), 409);
                status(await call(`/teaching-group-sections/group/${competing.TeachingGroupId}/sync`, "PUT", {
                    SectionIds: [one.SectionId]
                }), 409);
            } finally {
                await query("DELETE FROM TeachingGroups WHERE TeachingGroupId = @id;", { id: competing.TeachingGroupId });
            }
        });
    } finally {
        await query("DELETE FROM TimetableRules WHERE RuleName = @rule; DELETE FROM Users WHERE Username IN (@admin, @teacher);",
            { rule: "QA rule " + suffix, admin, teacher });
        await new Promise(resolve => server.close(resolve));
        await closePool();
    }
});
