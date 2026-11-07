"use strict";

const { getPgPool } = require("./client");
const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new TypeError("Positive ID required.");
  return n;
};
const flag = value => value ? 1 : 0;
const select = `
 SELECT ss."SectionSubjectId",ss."SectionId",s."SectionCode",s."SectionName",
    ss."SubjectId",sub."SubjectCode",sub."SubjectName",ss."TeacherId",
    concat(t."FirstName",CASE WHEN t."LastName" IS NULL OR t."LastName"='' THEN '' ELSE ' '||t."LastName" END) AS "TeacherName",
    ss."WeeklyHours",ss."SharedWithSectionId",
    shared."SectionCode" AS "SharedWithSectionCode",shared."SectionName" AS "SharedWithSectionName",
    ss."IsActive",ss."CreatedAt"
 FROM "SectionSubjects" ss JOIN "Sections" s ON s."SectionId"=ss."SectionId"
 JOIN "Subjects" sub ON sub."SubjectId"=ss."SubjectId"
 JOIN "Teachers" t ON t."TeacherId"=ss."TeacherId"
 LEFT JOIN "Sections" shared ON shared."SectionId"=ss."SharedWithSectionId"`;
const values = s => [id(s.SectionId),id(s.SubjectId),id(s.TeacherId),Number(s.WeeklyHours),
  flag(s.IsActive),s.SharedWithSectionId==null?null:id(s.SharedWithSectionId)];
function createSectionSubjectService(pool = getPgPool()) {
  const getAllSectionSubjects = async () =>
    (await pool.query(select+' ORDER BY ss."SectionSubjectId"')).rows;
  const getSectionSubjectById = async key =>
    (await pool.query(select+' WHERE ss."SectionSubjectId"=$1',[id(key)])).rows[0];
  const sectionExists = async key =>
    !!(await pool.query('SELECT "SectionId" FROM "Sections" WHERE "SectionId"=$1',[id(key)])).rows.length;
  const subjectExists = async key =>
    !!(await pool.query('SELECT "SubjectId" FROM "Subjects" WHERE "SubjectId"=$1',[id(key)])).rows.length;
  const teacherExists = async key =>
    !!(await pool.query('SELECT "TeacherId" FROM "Teachers" WHERE "TeacherId"=$1',[id(key)])).rows.length;
  const findDuplicate = async (sectionId,subjectId,excludeId=null) => {
    const args=[id(sectionId),id(subjectId)];
    let exclusion='';
    if(excludeId!==null){args.push(id(excludeId));exclusion=' AND "SectionSubjectId"<>$3';}
    return (await pool.query(`
      SELECT "SectionSubjectId" FROM "SectionSubjects"
      WHERE "SectionId"=$1 AND "SubjectId"=$2${exclusion} LIMIT 1
    `,args)).rows[0];
  };
  const createSectionSubject = async data =>
    (await pool.query(`
      INSERT INTO "SectionSubjects" ("SectionId","SubjectId","TeacherId","WeeklyHours","IsActive","SharedWithSectionId")
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING "SectionSubjectId"
    `,values(data))).rows[0];
  const updateSectionSubject = async (key,data) =>
    (await pool.query(`
      UPDATE "SectionSubjects" SET "SectionId"=$2,"SubjectId"=$3,
        "TeacherId"=$4,"WeeklyHours"=$5,"IsActive"=$6,"SharedWithSectionId"=$7
      WHERE "SectionSubjectId"=$1
    `,[id(key),...values(data)])).rowCount;
  const deleteSectionSubject = async key =>
    (await pool.query('DELETE FROM "SectionSubjects" WHERE "SectionSubjectId"=$1',[id(key)])).rowCount;
  const deactivateSectionSubject = async key =>
    (await pool.query('UPDATE "SectionSubjects" SET "IsActive"=0 WHERE "SectionSubjectId"=$1',[id(key)])).rowCount;
  return {getAllSectionSubjects,getSectionSubjectById,sectionExists,subjectExists,teacherExists,
    findDuplicate,createSectionSubject,updateSectionSubject,deleteSectionSubject,deactivateSectionSubject};
}
module.exports={createSectionSubjectService};
