"use strict";

// Isolated PostgreSQL teacher service; do not activate until all APIs are ported.
const { getPgPool, withPgTransaction } = require("./client");

const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError("A positive integer ID is required.");
  return n;
};
const uniqueIds = input => [...new Set((input || []).map(id))];
const fields = '"TeacherId", "DepartmentId", "EmployeeCode", "FirstName", "LastName", "Email", "Phone", "Designation", "IsActive", "CreatedAt"';
const truth = value => value ? 1 : 0;

function createTeacherService(pool = getPgPool()) {
  async function attachRelations(teachers) {
    if (!teachers.length) return [];
    const ids = teachers.map(t => id(t.TeacherId));
    const { rows: departments } = await pool.query(`
      SELECT td."TeacherId", d."DepartmentId", d."DepartmentName", d."DepartmentCode", d."IsActive"
      FROM "TeacherDepartments" td
      JOIN "Departments" d ON d."DepartmentId" = td."DepartmentId"
      WHERE td."TeacherId" = ANY($1::integer[]) ORDER BY d."DepartmentName"
    `, [ids]);
    const { rows: subjects } = await pool.query(`
      SELECT ts."TeacherId", s."SubjectId", s."SubjectCode", s."SubjectName",
             s."DepartmentId", s."IsActive"
      FROM "TeacherSubjects" ts JOIN "Subjects" s ON s."SubjectId" = ts."SubjectId"
      WHERE ts."TeacherId" = ANY($1::integer[]) ORDER BY s."SubjectName"
    `, [ids]);
    return teachers.map(teacher => {
      const dept = departments.filter(d => Number(d.TeacherId) === Number(teacher.TeacherId));
      const subs = subjects.filter(s => Number(s.TeacherId) === Number(teacher.TeacherId));
      return {
        ...teacher,
        DepartmentIds: dept.map(d => d.DepartmentId),
        Departments: dept.map(({ TeacherId, ...d }) => d),
        DepartmentNames: dept.map(d => d.DepartmentName).join(", "),
        SubjectIds: subs.map(s => s.SubjectId),
        Subjects: subs.map(({ TeacherId, ...s }) => s),
        SubjectNames: subs.map(s => s.SubjectName).join(", ")
      };
    });
  }
  async function getAllTeachers() {
    return attachRelations((await pool.query(`SELECT ${fields} FROM "Teachers" ORDER BY "TeacherId"`)).rows);
  }
  async function getTeacherById(teacherId) {
    const rows = (await pool.query(`SELECT ${fields} FROM "Teachers" WHERE "TeacherId" = $1`, [id(teacherId)])).rows;
    return (await attachRelations(rows))[0];
  }
  async function getTeacherByEmployeeCode(code, excludeTeacherId = null) {
    const params = [code];
    let exclusion = "";
    if (excludeTeacherId !== null) {
      params.push(id(excludeTeacherId));
      exclusion = ' AND "TeacherId" <> $2';
    }
    return (await pool.query(`SELECT "TeacherId", "EmployeeCode" FROM "Teachers" WHERE "EmployeeCode" = $1${exclusion} LIMIT 1`, params)).rows[0];
  }
  async function departmentsExist(departmentIds) {
    const ids = uniqueIds(departmentIds);
    if (!ids.length) return true;
    const { rows } = await pool.query('SELECT "DepartmentId" FROM "Departments" WHERE "IsActive" = 1 AND "DepartmentId" = ANY($1::integer[])', [ids]);
    return rows.length === ids.length;
  }
  async function getSubjectsByIds(subjectIds) {
    const ids = uniqueIds(subjectIds);
    if (!ids.length) return [];
    return (await pool.query(`
      SELECT "SubjectId", "SubjectCode", "SubjectName", "DepartmentId", "IsActive"
      FROM "Subjects" WHERE "SubjectId" = ANY($1::integer[])
    `, [ids])).rows;
  }
  async function replaceMappings(client, teacherId, departmentIds, subjectIds) {
    const departments = uniqueIds(departmentIds), subjects = uniqueIds(subjectIds);
    await client.query('DELETE FROM "TeacherDepartments" WHERE "TeacherId" = $1', [teacherId]);
    await client.query('DELETE FROM "TeacherSubjects" WHERE "TeacherId" = $1', [teacherId]);
    for (const departmentId of departments) {
      await client.query('INSERT INTO "TeacherDepartments" ("TeacherId","DepartmentId") VALUES ($1,$2)', [teacherId, departmentId]);
    }
    for (const subjectId of subjects) {
      await client.query('INSERT INTO "TeacherSubjects" ("TeacherId","SubjectId") VALUES ($1,$2)', [teacherId, subjectId]);
    }
  }
  function params(teacher) {
    return [
      uniqueIds(teacher.DepartmentIds)[0] || null,
      teacher.EmployeeCode, teacher.FirstName, teacher.LastName || null,
      teacher.Email || null, teacher.Phone || null, teacher.Designation || null, truth(teacher.IsActive)
    ];
  }
  async function createTeacher(teacher) {
    return withPgTransaction(async client => {
      const { rows: [created] } = await client.query(`
        INSERT INTO "Teachers" ("DepartmentId","EmployeeCode","FirstName","LastName",
          "Email","Phone","Designation","IsActive")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING "TeacherId"
      `, params(teacher));
      await replaceMappings(client, created.TeacherId, teacher.DepartmentIds, teacher.SubjectIds);
      return created;
    }, pool);
  }
  async function updateTeacher(teacherId, teacher) {
    return withPgTransaction(async client => {
      const key = id(teacherId);
      const result = await client.query(`
        UPDATE "Teachers" SET "DepartmentId"=$2,"EmployeeCode"=$3,"FirstName"=$4,
          "LastName"=$5,"Email"=$6,"Phone"=$7,"Designation"=$8,"IsActive"=$9
        WHERE "TeacherId"=$1
      `, [key, ...params(teacher)]);
      if (result.rowCount) await replaceMappings(client, key, teacher.DepartmentIds, teacher.SubjectIds);
      return result.rowCount;
    }, pool);
  }
  async function deleteTeacher(teacherId) {
    return withPgTransaction(async client => {
      const key = id(teacherId);
      await client.query('DELETE FROM "TeacherSubjects" WHERE "TeacherId"=$1', [key]);
      await client.query('DELETE FROM "TeacherDepartments" WHERE "TeacherId"=$1', [key]);
      return (await client.query('DELETE FROM "Teachers" WHERE "TeacherId"=$1', [key])).rowCount;
    }, pool);
  }
  const deactivateTeacher = async teacherId =>
    (await pool.query('UPDATE "Teachers" SET "IsActive"=0 WHERE "TeacherId"=$1', [id(teacherId)])).rowCount;
  return {
    getAllTeachers, getTeacherById, getTeacherByEmployeeCode, departmentsExist,
    getSubjectsByIds, createTeacher, updateTeacher, deleteTeacher, deactivateTeacher
  };
}
module.exports = { createTeacherService };
