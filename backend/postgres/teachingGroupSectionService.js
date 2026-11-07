"use strict";
const { getPgPool, withPgAdvisoryLock } = require("./client");
const { HttpError } = require("../lib/httpError");
const id = value => {
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1) throw new HttpError(400,"Positive ID required.");
  return n;
};
const ids = values => [...new Set((values||[]).map(id))];

function createTeachingGroupSectionService(pool=getPgPool()) {
  const withTeachingGroupLock = fn => withPgAdvisoryLock("timetable:teaching-groups",fn,pool);
  async function getAllTeachingGroupSections() {
    return (await pool.query(`
      SELECT tgs."TeachingGroupSectionId",tgs."TeachingGroupId",tg."GroupName",
        tgs."SectionId",s."SectionCode",s."SectionName",s."CampusId",
        s."AcademicSessionId",s."ClassYearId"
      FROM "TeachingGroupSections" tgs
      JOIN "TeachingGroups" tg ON tg."TeachingGroupId"=tgs."TeachingGroupId"
      JOIN "Sections" s ON s."SectionId"=tgs."SectionId"
      ORDER BY tgs."TeachingGroupId",tgs."SectionId"
    `)).rows;
  }
  async function getTeachingGroupSectionById(key) {
    return (await pool.query(`
      SELECT "TeachingGroupSectionId","TeachingGroupId","SectionId"
      FROM "TeachingGroupSections" WHERE "TeachingGroupSectionId"=$1
    `,[id(key)])).rows[0];
  }
  async function getByTeachingGroupId(groupId) {
    return (await pool.query(`
      SELECT tgs."TeachingGroupSectionId",tgs."TeachingGroupId",tgs."SectionId",
        s."SectionCode",s."SectionName"
      FROM "TeachingGroupSections" tgs
      JOIN "Sections" s ON s."SectionId"=tgs."SectionId"
      WHERE tgs."TeachingGroupId"=$1 ORDER BY s."SectionCode"
    `,[id(groupId)])).rows;
  }
  async function validateMembership(client,groupId,sectionIds,proposedGroup=null) {
    const group=proposedGroup||(await client.query('SELECT * FROM "TeachingGroups" WHERE "TeachingGroupId"=$1',[id(groupId)])).rows[0];
    if(!group) throw new HttpError(404,"Teaching group not found.");
    const selected=ids(sectionIds);
    if(!selected.length)return;
    const { rows: sections }=await client.query(`
      SELECT s."SectionId",s."SectionCode",s."CampusId",s."AcademicSessionId",s."ClassYearId",
        (SELECT tg."GroupName" FROM "TeachingGroupSections" tgs
          JOIN "TeachingGroups" tg ON tg."TeachingGroupId"=tgs."TeachingGroupId"
          WHERE tgs."SectionId"=s."SectionId" AND tg."IsActive"=1
            AND tg."TeachingGroupId"<>$2 ORDER BY tg."TeachingGroupId" LIMIT 1) AS "OtherGroup"
      FROM "Sections" s WHERE s."SectionId"=ANY($1::integer[])
    `,[selected,id(groupId)]);
    if(sections.length!==selected.length) throw new HttpError(400,"One or more selected sections do not exist.");
    for(const section of sections) {
      if(Number(section.CampusId)!==Number(group.CampusId)||
         Number(section.AcademicSessionId)!==Number(group.AcademicSessionId)||
         Number(section.ClassYearId)!==Number(group.ClassYearId))
        throw new HttpError(400,`${section.SectionCode} must match the group's campus, academic session and class year.`);
      if(group.IsActive&&section.OtherGroup)
        throw new HttpError(409,`${section.SectionCode} is already assigned to ${section.OtherGroup}. Remove it there before assigning it to this active group.`);
    }
  }
  async function writeGroupMembers(client,groupId,sectionIds) {
    const selected=ids(sectionIds);
    await validateMembership(client,groupId,selected);
    await client.query(`
      DELETE FROM "TeachingGroupSections" WHERE "TeachingGroupId"=$1
        AND NOT ("SectionId"=ANY($2::integer[]))
    `,[id(groupId),selected]);
    await client.query(`
      INSERT INTO "TeachingGroupSections" ("TeachingGroupId","SectionId")
      SELECT $1,unnest($2::integer[]) ON CONFLICT ("TeachingGroupId","SectionId") DO NOTHING
    `,[id(groupId),selected]);
  }
  async function changeMembership(data,key=null) {
    return withTeachingGroupLock(async client=>{
      const groupId=id(data.TeachingGroupId),sectionId=id(data.SectionId);
      await validateMembership(client,groupId,[sectionId]);
      const duplicate=await client.query(`
        SELECT "TeachingGroupSectionId" FROM "TeachingGroupSections"
        WHERE "TeachingGroupId"=$1 AND "SectionId"=$2
          AND ($3::integer IS NULL OR "TeachingGroupSectionId"<>$3)
      `,[groupId,sectionId,key===null?null:id(key)]);
      if(duplicate.rows.length)throw new HttpError(409,"The section is already in this teaching group.");
      let result;
      if(key===null)result=await client.query(`
        INSERT INTO "TeachingGroupSections" ("TeachingGroupId","SectionId")
        VALUES ($1,$2) RETURNING "TeachingGroupSectionId"
      `,[groupId,sectionId]);
      else result=await client.query(`
        UPDATE "TeachingGroupSections" SET "TeachingGroupId"=$2,"SectionId"=$3
        WHERE "TeachingGroupSectionId"=$1 RETURNING "TeachingGroupSectionId"
      `,[id(key),groupId,sectionId]);
      if(!result.rows[0])throw new HttpError(404,"Teaching group membership not found.");
      return result.rows[0];
    });
  }
  async function deleteTeachingGroupSection(key) {
    return withTeachingGroupLock(async client=>{
      const result=await client.query('DELETE FROM "TeachingGroupSections" WHERE "TeachingGroupSectionId"=$1',[id(key)]);
      if(!result.rowCount)throw new HttpError(404,"Teaching group membership not found.");
    });
  }
  const syncTeachingGroupSections=(groupId,sectionIds)=>
    withTeachingGroupLock(client=>writeGroupMembers(client,groupId,sectionIds));
  return {getAllTeachingGroupSections,getTeachingGroupSectionById,getByTeachingGroupId,
    createTeachingGroupSection:data=>changeMembership(data),
    updateTeachingGroupSection:(key,data)=>changeMembership(data,key),
    deleteTeachingGroupSection,syncTeachingGroupSections,validateMembership,
    withTeachingGroupLock,writeGroupMembers};
}
module.exports={createTeachingGroupSectionService};
