"use strict";

const { getPgPool } = require("./client");

// Keep SQL Server-compatible response field casing for existing React components.
const columns = '"SubjectId", "SubjectCode", "SubjectName", "CreditHours", "WeeklyHours", "IsPractical", "IsActive", "CreatedAt"';
const flag = value => value ? 1 : 0;
const id = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError("A positive numeric ID is required.");
  return number;
};

function createSubjectService(pool = getPgPool()) {
  const getAllSubjects = async () =>
    (await pool.query(`SELECT ${columns} FROM "Subjects" ORDER BY "SubjectName", "SubjectCode"`)).rows;
  const getSubjectById = async subjectId =>
    (await pool.query(`SELECT ${columns} FROM "Subjects" WHERE "SubjectId" = $1`, [id(subjectId)])).rows[0];
  const createSubject = async subject => {
    const { rows: [created] } = await pool.query(`
      INSERT INTO "Subjects" ("SubjectCode", "SubjectName", "CreditHours", "WeeklyHours", "IsPractical", "IsActive")
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING "SubjectId"
    `, [subject.SubjectCode, subject.SubjectName, subject.CreditHours ?? null,
        subject.WeeklyHours, flag(subject.IsPractical), flag(subject.IsActive)]);
    return created;
  };
  const updateSubject = async (subjectId, subject) => {
    const result = await pool.query(`
      UPDATE "Subjects" SET "SubjectCode" = $2, "SubjectName" = $3, "CreditHours" = $4,
        "WeeklyHours" = $5, "IsPractical" = $6, "IsActive" = $7
      WHERE "SubjectId" = $1
    `, [id(subjectId), subject.SubjectCode, subject.SubjectName, subject.CreditHours ?? null,
        subject.WeeklyHours, flag(subject.IsPractical), flag(subject.IsActive)]);
    return result.rowCount;
  };
  const deleteSubject = async subjectId =>
    (await pool.query('DELETE FROM "Subjects" WHERE "SubjectId" = $1', [id(subjectId)])).rowCount;
  return { getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject };
}

module.exports = { createSubjectService };
