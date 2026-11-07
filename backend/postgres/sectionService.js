"use strict";

// Isolated PostgreSQL section service. Not connected to production API yet.
const { getPgPool, withPgTransaction, withPgAdvisoryLock } = require("./client");
const id = value => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError("Positive ID required.");
  return n;
};
const flag = v => v === false ? 0 : 1;
const sectionSelect = `
 SELECT s."SectionId",s."CampusId",s."AcademicSessionId",s."ClassYearId",
   s."ProgramId",s."DefaultRoomId",s."SectionName",s."SectionCode",
   s."StudentCount",s."IsActive",s."CreatedAt",
   c."CampusName",c."CampusCode",a."SessionName",cy."YearName",cy."YearNumber",
   p."ProgramName",p."ProgramCode",r."RoomNumber" AS "DefaultRoomNumber",
   r."RoomName" AS "DefaultRoomName",r."RoomType" AS "DefaultRoomType",
   r."Capacity" AS "DefaultRoomCapacity",r."IsLab" AS "DefaultRoomIsLab"
 FROM "Sections" s JOIN "Campuses" c ON c."CampusId"=s."CampusId"
 JOIN "AcademicSessions" a ON a."AcademicSessionId"=s."AcademicSessionId"
 JOIN "ClassYears" cy ON cy."ClassYearId"=s."ClassYearId"
 JOIN "Programs" p ON p."ProgramId"=s."ProgramId"
 LEFT JOIN "Rooms" r ON r."RoomId"=s."DefaultRoomId"`;

function createSectionService(pool = getPgPool()) {
  async function getAllSections() {
    return (await pool.query(sectionSelect+`
      ORDER BY c."CampusName",a."SessionName",cy."YearNumber",p."ProgramName",s."SectionName"`)).rows;
  }
  async function getSectionById(sectionId) {
    return (await pool.query(sectionSelect+' WHERE s."SectionId"=$1',[id(sectionId)])).rows[0];
  }
  async function getSectionLookups() {
    const results = await Promise.all([
      pool.query(`SELECT "CampusId","CampusName","CampusCode","Location","IsActive" FROM "Campuses" WHERE "IsActive"=1 ORDER BY "CampusName"`),
      pool.query(`SELECT "AcademicSessionId","SessionName","StartDate","EndDate","IsCurrent" FROM "AcademicSessions" ORDER BY "IsCurrent" DESC,"StartDate" DESC,"SessionName"`),
      pool.query(`SELECT "ClassYearId","YearName","YearNumber" FROM "ClassYears" ORDER BY "YearNumber","YearName"`),
      pool.query(`SELECT "ProgramId","ProgramName","ProgramCode","IsActive" FROM "Programs" WHERE "IsActive"=1 ORDER BY "ProgramName"`),
      pool.query(`SELECT "RoomId","CampusId","RoomNumber","RoomName","RoomType","Capacity","BuildingName","FloorNumber","IsLab","IsActive" FROM "Rooms" WHERE "IsActive"=1 ORDER BY "CampusId","RoomNumber"`)
    ]);
    return Object.fromEntries(["campuses","academicSessions","classYears","programs","rooms"].map((key,i)=>[key,results[i].rows]));
  }
  async function createCampus(data) {
    const result = await pool.query(`
      INSERT INTO "Campuses" ("CampusName","CampusCode","Location","IsActive")
      VALUES ($1,$2,$3,$4)
      RETURNING "CampusId","CampusName","CampusCode","Location","IsActive"
    `,[data.CampusName,data.CampusCode,data.Location||null,flag(data.IsActive)]);
    return result.rows[0];
  }
  async function createAcademicSession(data) {
    // Atomic update of the current flag; advisory lock serializes concurrent session creation.
    return withPgAdvisoryLock("timetable:academic-session",async client=>{
      if(data.IsCurrent===true) await client.query('UPDATE "AcademicSessions" SET "IsCurrent"=0');
      return (await client.query(`
        INSERT INTO "AcademicSessions" ("SessionName","StartDate","EndDate","IsCurrent")
        VALUES ($1,$2,$3,$4)
        RETURNING "AcademicSessionId","SessionName","StartDate","EndDate","IsCurrent"
      `,[data.SessionName,data.StartDate,data.EndDate,data.IsCurrent===true?1:0])).rows[0];
    },pool);
  }
  async function getSectionTeachingGroupIds(sectionId,sessionId,campusId) {
    return (await pool.query(`
      SELECT DISTINCT tg."TeachingGroupId",tg."GroupName"
      FROM "TeachingGroupSections" tgs
      JOIN "TeachingGroups" tg ON tg."TeachingGroupId"=tgs."TeachingGroupId"
      WHERE tgs."SectionId"=$1 AND tg."AcademicSessionId"=$2
        AND tg."CampusId"=$3 AND tg."IsActive"=1
    `,[id(sectionId),id(sessionId),id(campusId)])).rows;
  }
  async function validateRoomAssignment({roomId,campusId,studentCount,academicSessionId,currentSectionId=null}) {
    const room=(await pool.query(`
      SELECT "RoomId","CampusId","RoomNumber","RoomName","RoomType","Capacity","IsLab","IsActive"
      FROM "Rooms" WHERE "RoomId"=$1
    `,[id(roomId)])).rows[0];
    if(!room) return {valid:false,message:"Selected room does not exist."};
    if(!room.IsActive) return {valid:false,message:"Selected room is inactive."};
    if(Number(room.CampusId)!==id(campusId))
      return {valid:false,message:"Assigned room must belong to the same campus as the section."};
    if(Number(room.Capacity)<Number(studentCount))
      return {valid:false,message:`Room ${room.RoomNumber} capacity (${room.Capacity}) is smaller than section student count (${studentCount}).`};
    const params=[id(roomId),id(academicSessionId)];
    let exclusion="";
    if(currentSectionId!==null){params.push(id(currentSectionId));exclusion=' AND "SectionId"<>$3';}
    const others=(await pool.query(`
      SELECT "SectionId","SectionCode","SectionName","StudentCount"
      FROM "Sections" WHERE "DefaultRoomId"=$1 AND "AcademicSessionId"=$2
        AND "IsActive"=1${exclusion}
    `,params)).rows;
    if(!others.length) return {valid:true,room};
    if(currentSectionId===null) return {valid:false,message:
      `Room ${room.RoomNumber} is already assigned to another section. Same room can only be shared after both sections are members of the same Teaching Group.`};
    let common=(await getSectionTeachingGroupIds(currentSectionId,academicSessionId,campusId)).map(g=>Number(g.TeachingGroupId));
    if(!common.length) return {valid:false,message:
      `Room ${room.RoomNumber} is already assigned. This section is not a member of an active Teaching Group with the other section.`};
    for(const other of others){
      const groups=(await getSectionTeachingGroupIds(other.SectionId,academicSessionId,campusId)).map(g=>Number(g.TeachingGroupId));
      common=common.filter(g=>groups.includes(g));
      if(!common.length) return {valid:false,message:
        `Room ${room.RoomNumber} is already assigned to ${other.SectionCode}. Same room is only allowed when all sharing sections belong to the same Teaching Group.`};
    }
    const total=Number(studentCount)+others.reduce((a,s)=>a+Number(s.StudentCount||0),0);
    if(total>Number(room.Capacity)) return {valid:false,message:
      `Room ${room.RoomNumber} capacity is ${room.Capacity}, but combined Teaching Group student count is ${total}.`};
    return {valid:true,room,shared:true,teachingGroupId:common[0]};
  }
  function values(section) {
    return [id(section.CampusId),id(section.AcademicSessionId),id(section.ClassYearId),
      id(section.ProgramId),section.DefaultRoomId==null?null:id(section.DefaultRoomId),
      section.SectionName,section.SectionCode,section.StudentCount==null?null:Number(section.StudentCount),
      flag(section.IsActive)];
  }
  async function createSection(section) {
    return (await pool.query(`
      INSERT INTO "Sections" ("CampusId","AcademicSessionId","ClassYearId","ProgramId",
        "DefaultRoomId","SectionName","SectionCode","StudentCount","IsActive")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING "SectionId"
    `,values(section))).rows[0];
  }
  async function updateSection(sectionId,section) {
    return (await pool.query(`
      UPDATE "Sections" SET "CampusId"=$2,"AcademicSessionId"=$3,
        "ClassYearId"=$4,"ProgramId"=$5,"DefaultRoomId"=$6,"SectionName"=$7,
        "SectionCode"=$8,"StudentCount"=$9,"IsActive"=$10 WHERE "SectionId"=$1
    `,[id(sectionId),...values(section)])).rowCount;
  }
  async function deleteSection(sectionId) {
    return (await pool.query('DELETE FROM "Sections" WHERE "SectionId"=$1',[id(sectionId)])).rowCount;
  }
  return {getAllSections,getSectionById,getSectionLookups,createCampus,createAcademicSession,
    getSectionTeachingGroupIds,validateRoomAssignment,createSection,updateSection,deleteSection};
}
module.exports={createSectionService};
