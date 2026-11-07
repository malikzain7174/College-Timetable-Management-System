"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

// Do not connect to production databases. CI sets a disposable *_test database.
const enabled = process.env.RUN_PG_TESTS === "1";
const databaseName = (() => {
  try { return decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)); }
  catch { return ""; }
})();
const safe = /_test$|_dev$/i.test(databaseName);

test("PostgreSQL integration: auth, academic CRUD and timetable", { skip: !enabled || !safe }, async () => {
  process.env.DB_PROVIDER = "postgres";
  const { getPgPool, closePgPool } = require("../postgres/client");
  const registry = require("../postgres");
  const { getSchedulingData } = require("../postgres/timetableData");
  const db = getPgPool();
  try {
    // New disposable CI database, no existing academic data or real accounts.
    const { rows: [ready] } = await db.query(`
      SELECT to_regclass('public."Users"') IS NOT NULL
        AND to_regclass('public."TimetableEntries"') IS NOT NULL AS ready
    `);
    assert.equal(ready.ready, true);
    const campus = await registry.sectionService.createCampus({
      CampusName: "CI Campus", CampusCode: "CI-C", IsActive: true
    });
    const session = await registry.sectionService.createAcademicSession({
      SessionName: "CI Session", StartDate: "2026-09-01", EndDate: "2027-06-30", IsCurrent: true
    });
    const { rows: [year] } = await db.query(`
      INSERT INTO "ClassYears" ("YearName","YearNumber") VALUES ('CI First Year',1)
      RETURNING "ClassYearId"
    `);
    const { rows: [program] } = await db.query(`
      INSERT INTO "Programs" ("ProgramName","ProgramCode") VALUES ('CI Program','CI-P')
      RETURNING "ProgramId"
    `);
    const department = await registry.departmentService.createDepartment({
      DepartmentName: "CI Computing", DepartmentCode: "CI-D", IsActive: true
    });
    const subject = await registry.subjectService.createSubject({
      SubjectCode: "CI101", SubjectName: "CI Science", WeeklyHours: 1,
      CreditHours: 1, IsPractical: false, IsActive: true
    });
    const room = await registry.roomService.createRoom({
      CampusId: campus.CampusId, RoomNumber: "CI-R1", RoomName: "CI Hall",
      RoomType: "Classroom", Capacity: 60, IsLab: false, IsActive: true
    });
    const teacher = await registry.teacherService.createTeacher({
      EmployeeCode: "CI-T1", FirstName: "Test", LastName: "Teacher",
      DepartmentIds: [department.DepartmentId], SubjectIds: [subject.SubjectId],
      IsActive: true
    });
    const section = await registry.sectionService.createSection({
      CampusId: campus.CampusId, AcademicSessionId: session.AcademicSessionId,
      ClassYearId: year.ClassYearId, ProgramId: program.ProgramId, DefaultRoomId: room.RoomId,
      SectionName: "A", SectionCode: "CI-A", StudentCount: 25, IsActive: true
    });
    const assignment = await registry.sectionSubjectService.createSectionSubject({
      SectionId: section.SectionId, SubjectId: subject.SubjectId,
      TeacherId: teacher.TeacherId, WeeklyHours: 1, IsActive: true
    });
    const slot = await registry.timeSlotService.createTimeSlot({
      DayOfWeek: 1, StartTime: "08:00", EndTime: "08:40",
      SlotName: "Period 1", IsActive: true
    });
    assert.equal((await registry.teacherService.getTeacherById(teacher.TeacherId)).SubjectIds[0], subject.SubjectId);
    assert.equal((await registry.sectionService.getSectionById(section.SectionId)).RoomNumber, undefined);
    const data = await getSchedulingData(session.AcademicSessionId);
    assert.equal(data.assignments.length, 1);
    assert.equal(data.timeSlots.length, 1);
    const saved = await registry.timetableEntryService.createTimetableEntry({
      SectionSubjectId: assignment.SectionSubjectId,
      RoomId: room.RoomId, TimeSlotId: slot.TimeSlotId,
      AcademicSessionId: session.AcademicSessionId, ClassType: "Regular"
    });
    assert.equal(saved.affectedRows, 1);
    assert.equal((await registry.timetableEntryService.getTimetableEntriesBySession(session.AcademicSessionId)).length, 1);
    assert.equal((await registry.conflictService.getConflictSummary(session.AcademicSessionId)).totalEntries, 1);
    const password = "temporary-CI-Admin-Passphrase-2026";
    assert.match(await registry.authService.provisionAdmin("ci-admin", password, false), /created/);
    const logged = await registry.authService.signIn("ci-admin", password);
    assert.equal(logged.user.role, "Admin");
    assert.equal((await registry.authService.getSession(logged.token)).userId, logged.user.userId);
    await registry.authService.signOut(logged.token);
    assert.equal(await registry.authService.getSession(logged.token), null);
  } finally {
    await closePgPool();
  }
});
