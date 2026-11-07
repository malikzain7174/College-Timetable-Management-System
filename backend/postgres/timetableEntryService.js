"use strict";
const { getPgPool, withPgAdvisoryLock } = require("./client");
const { HttpError, positiveId } = require("../lib/httpError");
const { listEntries, getSchedulingData } = require("./timetableData");
const { commonCohort, lectureKey, lectureProblems, placedPeriods } = require("../services/schedulingConstraints");

const withTimetableLock = (sessionId,operation) =>
  withPgAdvisoryLock(`timetable:session:${positiveId(sessionId,"session ID")}`,operation);

async function insertEntries(db,entries) {
  if(!entries.length)return [];
  const {rows}=await db.query(`
    INSERT INTO "TimetableEntries" ("SectionSubjectId","TeacherId","RoomId",
      "TimeSlotId","AcademicSessionId","ClassType","Notes","CreatedAt","UpdatedAt")
    SELECT r."SectionSubjectId",r."TeacherId",r."RoomId",r."TimeSlotId",
      r."AcademicSessionId",r."ClassType",r."Notes",
      (now() AT TIME ZONE 'UTC'),(now() AT TIME ZONE 'UTC')
    FROM jsonb_to_recordset($1::jsonb) AS r(
      "SectionSubjectId" integer,"TeacherId" integer,"RoomId" integer,
      "TimeSlotId" integer,"AcademicSessionId" integer,
      "ClassType" text,"Notes" text)
    RETURNING "TimetableEntryId"
  `,[JSON.stringify(entries)]);
  return rows;
}
async function clearEntries(db,sessionId) {
  const {rowCount}=await db.query('DELETE FROM "TimetableEntries" WHERE "AcademicSessionId"=$1',[positiveId(sessionId,"session ID")]);
  return {deletedRows:rowCount||0};
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


async function getTimetableEntryById(key,db) {
  const [entry]=await listEntries({entryId:positiveId(key,"timetable entry ID")},db);
  if(!entry)throw new HttpError(404,"Timetable entry not found.");
  return entry;
}
async function createTimetableEntry(body) {
  const entry=readEntry(body);
  return withTimetableLock(entry.AcademicSessionId,async db=>{
    const data=await getSchedulingData(entry.AcademicSessionId,db);
    const inserted=await insertEntries(db,buildLecture(data,entry));
    return {data:await getTimetableEntryById(inserted[0].TimetableEntryId,db),affectedRows:inserted.length};
  });
}
async function withExistingLecture(key,operation) {
  const entryId=positiveId(key,"timetable entry ID");
  const initial=await getTimetableEntryById(entryId);
  return withTimetableLock(initial.AcademicSessionId,async db=>{
    const data=await getSchedulingData(initial.AcademicSessionId,db);
    const selected=data.entries.find(row=>Number(row.TimetableEntryId)===entryId);
    if(!selected)throw new HttpError(404,"Timetable entry not found.");
    const key=lectureKey(selected);
    return operation(db,data,data.entries.filter(row=>lectureKey(row)===key));
  });
}
async function updateTimetableEntry(key,body) {
  const entry=readEntry(body);
  return withExistingLecture(key,async(db,data,previous)=>{
    if(entry.AcademicSessionId!==Number(data.session.AcademicSessionId))
      throw new HttpError(409,"An existing lesson cannot be moved to another academic session.");
    const changes=buildLecture(data,entry,previous);
    const result=await db.query(`
      UPDATE "TimetableEntries" te
      SET "SectionSubjectId"=next."SectionSubjectId",
        "TeacherId"=next."TeacherId","RoomId"=next."RoomId",
        "TimeSlotId"=next."TimeSlotId","ClassType"=next."ClassType",
        "Notes"=next."Notes","UpdatedAt"=(now() AT TIME ZONE 'UTC')
      FROM jsonb_to_recordset($1::jsonb) AS next(
        "TimetableEntryId" integer,"SectionSubjectId" integer,
        "TeacherId" integer,"RoomId" integer,"TimeSlotId" integer,
        "ClassType" text,"Notes" text)
      WHERE next."TimetableEntryId"=te."TimetableEntryId"
    `,[JSON.stringify(changes)]);
    return {data:await getTimetableEntryById(key,db),affectedRows:result.rowCount};
  });
}
async function deleteTimetableEntry(key) {
  return withExistingLecture(key,async(db,_data,previous)=>{
    const ids=previous.map(row=>row.TimetableEntryId);
    const result=await db.query('DELETE FROM "TimetableEntries" WHERE "TimetableEntryId"=ANY($1::integer[])',[ids]);
    return result.rowCount;
  });
}

module.exports={
  clearEntries,createTimetableEntry,deleteTimetableEntry,getTimetableEntryById,insertEntries,
  getAllTimetableEntries:()=>listEntries(),
  getTimetableEntriesBySession:sessionId=>listEntries({sessionId}),
  getTimetableForTeacher:teacherId=>listEntries({teacherId}),
  updateTimetableEntry,withTimetableLock
};
