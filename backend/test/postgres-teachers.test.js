"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createTeacherService } = require("../postgres/teacherService");

function fixture(resolver) {
  const history = [];
  const client = {
    async query(sql, values = []) {
      history.push({ sql, values });
      return resolver(sql, values);
    },
    release() {}
  };
  return { history, query: client.query, async connect() { return client; } };
}
const teacher = {
  EmployeeCode: "T01", FirstName: "Ayesha", LastName: "Khan",
  DepartmentIds: [2, 2, 3], SubjectIds: [7, 7, 8],
  IsActive: true, Email: null, Phone: null, Designation: "Lecturer"
};
test("teachers: create uses a transaction and deduplicates relations", async () => {
  const db = fixture(sql => ({ rows: sql.includes('RETURNING "TeacherId"') ? [{ TeacherId: 5 }] : [], rowCount: 1 }));
  const result = await createTeacherService(db).createTeacher(teacher);
  assert.deepEqual(result, { TeacherId: 5 });
  assert.equal(db.history[0].sql, "BEGIN");
  assert.equal(db.history.at(-1).sql, "COMMIT");
  assert.equal(db.history.filter(x => x.sql.includes('INSERT INTO "TeacherDepartments"')).length, 2);
  assert.equal(db.history.filter(x => x.sql.includes('INSERT INTO "TeacherSubjects"')).length, 2);
  assert.ok(db.history.some(x => x.sql.includes('RETURNING "TeacherId"')));
});
test("teachers: update missing row does not destroy mappings", async () => {
  const db = fixture(sql => ({ rows: [], rowCount: sql.includes('UPDATE "Teachers"') ? 0 : 1 }));
  assert.equal(await createTeacherService(db).updateTeacher(5, teacher), 0);
  assert.equal(db.history.filter(x => x.sql.includes('DELETE FROM "TeacherDepartments"')).length, 0);
});
test("teachers: grouped read response keeps IDs, objects and comma-separated names", async () => {
  const db = fixture(sql => {
    if (sql.includes('FROM "Teachers"')) return { rows: [{
      TeacherId: 5, FirstName: "Ayesha", EmployeeCode: "T01"
    }], rowCount: 1 };
    if (sql.includes('FROM "TeacherDepartments"')) return { rows: [{
      TeacherId: 5, DepartmentId: 2, DepartmentName: "Science", DepartmentCode: "SCI", IsActive: 1
    }], rowCount: 1 };
    if (sql.includes('FROM "TeacherSubjects"')) return { rows: [{
      TeacherId: 5, SubjectId: 8, SubjectName: "Physics", SubjectCode: "PHY", DepartmentId: 2, IsActive: 1
    }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  const result = (await createTeacherService(db).getAllTeachers())[0];
  assert.deepEqual(result.DepartmentIds, [2]);
  assert.equal(result.DepartmentNames, "Science");
  assert.equal(result.SubjectNames, "Physics");
  assert.deepEqual(result.SubjectIds, [8]);
});
test("teachers: rejecting invalid ids prevents SQL execution", async () => {
  const db = fixture(() => ({ rows: [], rowCount: 0 }));
  await assert.rejects(createTeacherService(db).deleteTeacher("bad"), TypeError);
  assert.deepEqual(db.history.map(x => x.sql), ["BEGIN", "ROLLBACK"]);
});
