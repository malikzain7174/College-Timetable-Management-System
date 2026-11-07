"use strict";
const { getPgPool, withPgAdvisoryLock } = require("./client");
const { createTeachingGroupSectionService } = require("./teachingGroupSectionService");
const { HttpError } = require("../lib/httpError");
const id = value => {
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1)throw new HttpError(400,"Positive ID required.");
  return n;
};
function createTeachingGroupService(pool=getPgPool()) {
  const members=createTeachingGroupSectionService(pool);
  const withTeachingGroupLock=fn=>withPgAdvisoryLock("timetable:teaching-groups",fn,pool);
  const getAllTeachingGroups=async()=>(await pool.query(`
    SELECT tg."TeachingGroupId",tg."GroupName",tg."CampusId",tg."AcademicSessionId",
      tg."ClassYearId",tg."IsActive",count(tgs."TeachingGroupSectionId")::integer AS "SectionCount"
    FROM "TeachingGroups" tg LEFT JOIN "TeachingGroupSections" tgs
      ON tgs."TeachingGroupId"=tg."TeachingGroupId"
    GROUP BY tg."TeachingGroupId" ORDER BY tg."TeachingGroupId"
  `)).rows;
  const getTeachingGroupById=async key=>(await pool.query(`
    SELECT "TeachingGroupId","GroupName","CampusId","AcademicSessionId","ClassYearId","IsActive"
    FROM "TeachingGroups" WHERE "TeachingGroupId"=$1
  `,[id(key)])).rows[0];
  async function saveGroup(data,key) {
    return withTeachingGroupLock(async client=>{
      const values=[data.GroupName,id(data.CampusId),id(data.AcademicSessionId),
        id(data.ClassYearId),data.IsActive?1:0];
      const groupId=key===undefined?null:id(key);
      const duplicate=await client.query(`
        SELECT "TeachingGroupId" FROM "TeachingGroups"
        WHERE "GroupName"=$1 AND "CampusId"=$2 AND "AcademicSessionId"=$3
          AND "ClassYearId"=$4 AND ($5::integer IS NULL OR "TeachingGroupId"<>$5)
      `,[...values.slice(0,4),groupId]);
      if(duplicate.rows.length)throw new HttpError(409,
        "A teaching group with this name already exists for the selected campus, session and year.");
      let result;
      try {
        result=groupId===null
          ? await client.query(`
              INSERT INTO "TeachingGroups" ("GroupName","CampusId","AcademicSessionId","ClassYearId","IsActive")
              VALUES ($1,$2,$3,$4,$5) RETURNING "TeachingGroupId"
            `,values)
          : await client.query(`
              UPDATE "TeachingGroups" SET "GroupName"=$2,"CampusId"=$3,
                "AcademicSessionId"=$4,"ClassYearId"=$5,"IsActive"=$6
              WHERE "TeachingGroupId"=$1 RETURNING "TeachingGroupId"
            `,[groupId,...values]);
      }catch(e){
        if(e.code==="23503")throw new HttpError(400,
          "The selected campus, academic session or class year does not exist.");
        throw e;
      }
      const group=result.rows[0];
      if(!group)throw new HttpError(404,"Teaching group not found.");
      if(data.SectionIds){
        await members.writeGroupMembers(client,group.TeachingGroupId,data.SectionIds);
      }else if(groupId!==null&&data.IsActive){
        const sections=(await client.query(`
          SELECT "SectionId" FROM "TeachingGroupSections" WHERE "TeachingGroupId"=$1
        `,[groupId])).rows.map(x=>x.SectionId);
        await members.validateMembership(client,groupId,sections,data);
      }
      return group;
    });
  }
  const deleteTeachingGroup=async key=>withTeachingGroupLock(async client=>{
    const groupId=id(key);
    await client.query('DELETE FROM "TeachingGroupSections" WHERE "TeachingGroupId"=$1',[groupId]);
    await client.query('DELETE FROM "TeachingGroups" WHERE "TeachingGroupId"=$1',[groupId]);
  });
  const deactivateTeachingGroup=async key=>{
    await pool.query('UPDATE "TeachingGroups" SET "IsActive"=0 WHERE "TeachingGroupId"=$1',[id(key)]);
  };
  return {getAllTeachingGroups,getTeachingGroupById,deleteTeachingGroup,deactivateTeachingGroup,
    createTeachingGroup:data=>saveGroup(data),updateTeachingGroup:(key,data)=>saveGroup(data,key)};
}
module.exports={createTeachingGroupService};
