"use strict";
const { getPgPool } = require("./client");
const { HttpError } = require("../lib/httpError");
const { createTimetableRuleService } = require("./timetableRuleService");

const groupJoin=`
 LEFT JOIN LATERAL (
   SELECT MIN(tg."TeachingGroupId") AS "TeachingGroupId",
      COUNT(*)::integer AS "ActiveGroupCount"
   FROM "TeachingGroupSections" tgs
   JOIN "TeachingGroups" tg ON tg."TeachingGroupId"=tgs."TeachingGroupId"
   WHERE tgs."SectionId"=s."SectionId" AND tg."IsActive"=1
     AND tg."CampusId"=s."CampusId"
     AND tg."AcademicSessionId"=s."AcademicSessionId"
     AND tg."ClassYearId"=s."ClassYearId"
 ) grp ON TRUE`;
const selectEntries=`
 SELECT te."TimetableEntryId",te."SectionSubjectId",te."TeacherId",te."RoomId",
   te."TimeSlotId",te."AcademicSessionId",te."ClassType",te."Notes",
   te."CreatedAt",te."UpdatedAt",ss."SectionId",ss."SubjectId",
   ss."TeacherId" AS "AssignedTeacherId",ss."WeeklyHours",ss."IsActive" AS "AssignmentIsActive",
   s."AcademicSessionId" AS "SectionSessionId",s."CampusId",s."ClassYearId",s."DefaultRoomId",
   s."SectionCode",s."SectionName",s."StudentCount",s."IsActive" AS "SectionIsActive",
   sub."SubjectCode",sub."SubjectName",sub."IsPractical",sub."IsActive" AS "SubjectIsActive",
   t."IsActive" AS "TeacherIsActive",
   concat_ws(' ',t."FirstName",NULLIF(t."LastName",'')) AS "TeacherName",
   r."RoomNumber",r."RoomName",r."RoomType",r."Capacity",
   ts."DayOfWeek",to_char(ts."StartTime",'HH24:MI:SS') AS "StartTime",
   to_char(ts."EndTime",'HH24:MI:SS') AS "EndTime",ts."SlotName",
   grp."TeachingGroupId",grp."ActiveGroupCount",a."SessionName",a."IsCurrent"
 FROM "TimetableEntries" te
 JOIN "SectionSubjects" ss ON ss."SectionSubjectId"=te."SectionSubjectId"
 JOIN "Sections" s ON s."SectionId"=ss."SectionId"
 JOIN "Subjects" sub ON sub."SubjectId"=ss."SubjectId"
 JOIN "Teachers" t ON t."TeacherId"=te."TeacherId"
 JOIN "Rooms" r ON r."RoomId"=te."RoomId"
 JOIN "TimeSlots" ts ON ts."TimeSlotId"=te."TimeSlotId"
 JOIN "AcademicSessions" a ON a."AcademicSessionId"=te."AcademicSessionId"
 ${groupJoin}`;
const order=' ORDER BY te."AcademicSessionId",ts."DayOfWeek",ts."StartTime",s."SectionCode",te."TimetableEntryId"';
const filterKeys={
  sessionId:'te."AcademicSessionId"',
  entryId:'te."TimetableEntryId"',
  teacherId:'te."TeacherId"'
};
function positiveId(value) {
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<=0)throw new HttpError(400,"A positive ID is required.");
  return n;
}
function createTimetableData(pool=getPgPool()) {
  async function listEntries(filter={},db=pool) {
    const predicates=[],values=[];
    for(const key of Object.keys(filterKeys)){
      if(filter[key]!==undefined){
        values.push(positiveId(filter[key]));
        predicates.push(`${filterKeys[key]}=$${values.length}`);
      }
    }
    const where=predicates.length?' WHERE '+predicates.join(' AND '):'';
    return (await db.query(selectEntries+where+order,values)).rows;
  }
  async function getSchedulingData(sessionId,db=pool) {
    const key=positiveId(sessionId);
    const {rows:[session]}=await db.query(`
      SELECT "AcademicSessionId","SessionName" FROM "AcademicSessions" WHERE "AcademicSessionId"=$1
    `,[key]);
    if(!session)throw new HttpError(404,"Academic session was not found.");
    const {rows:assignments}=await db.query(`
      SELECT ss."SectionSubjectId",ss."SectionId",ss."SubjectId",ss."TeacherId",ss."WeeklyHours",
        ss."IsActive" AS "AssignmentIsActive",s."CampusId",s."AcademicSessionId",
        s."ClassYearId",s."DefaultRoomId",s."SectionCode",s."SectionName",
        s."StudentCount",s."IsActive" AS "SectionIsActive",sub."SubjectCode",
        sub."SubjectName",sub."IsPractical",sub."IsActive" AS "SubjectIsActive",
        t."IsActive" AS "TeacherIsActive",
        concat_ws(' ',t."FirstName",NULLIF(t."LastName",'')) AS "TeacherName",
        grp."TeachingGroupId",grp."ActiveGroupCount"
      FROM "SectionSubjects" ss
      JOIN "Sections" s ON s."SectionId"=ss."SectionId"
      JOIN "Subjects" sub ON sub."SubjectId"=ss."SubjectId"
      JOIN "Teachers" t ON t."TeacherId"=ss."TeacherId"
      ${groupJoin}
      WHERE s."AcademicSessionId"=$1 ORDER BY ss."SectionSubjectId"
    `,[key]);
    const {rows:timeSlots}=await db.query(`
      SELECT "TimeSlotId","DayOfWeek",to_char("StartTime",'HH24:MI:SS') AS "StartTime",
        to_char("EndTime",'HH24:MI:SS') AS "EndTime","SlotName","IsActive"
      FROM "TimeSlots" ORDER BY "DayOfWeek","StartTime","TimeSlotId"
    `);
    const {rows:rooms}=await db.query(`
      SELECT r."RoomId",r."CampusId",r."RoomNumber",r."RoomName",r."RoomType",
        r."Capacity",r."IsLab",r."IsActive",
        assigned."SectionId" AS "AssignedSectionId",assigned."SectionCode" AS "AssignedSectionCode"
      FROM "Rooms" r LEFT JOIN LATERAL (
        SELECT s."SectionId",s."SectionCode" FROM "Sections" s
        WHERE s."DefaultRoomId"=r."RoomId" AND s."IsActive"=1
          AND s."AcademicSessionId"=$1
        ORDER BY s."SectionId" LIMIT 1
      ) assigned ON TRUE
      ORDER BY r."CampusId",r."RoomNumber",r."RoomId"
    `,[key]);
    return {session,assignments,timeSlots,rooms,entries:await listEntries({sessionId:key},db),
      rules:await createTimetableRuleService(pool).getAllRules(db)};
  }
  return {listEntries,getSchedulingData};
}
module.exports={createTimetableData};
