"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSectionService } = require("../postgres/sectionService");

function mock(resolver) {
  const queries=[];
  return { queries, async query(sql,args=[]) {queries.push({sql,args});return resolver(sql,args);} };
}
test("sections: list and IDs use parameterized lookups",async()=>{
 const pool=mock(()=>({rows:[{SectionId:2}]}));
 const service=createSectionService(pool);
 assert.deepEqual(await service.getSectionById(2),{SectionId:2});
 assert.deepEqual(pool.queries[0].args,[2]);
 await assert.rejects(service.getSectionById("not-a-number"),TypeError);
 assert.equal(pool.queries.length,1);
});
test("sections: create and update preserve ID/rowCount results",async()=>{
 const pool=mock(sql=>({rows:sql.includes("RETURNING")?[{SectionId:4}]:[],rowCount:1}));
 const service=createSectionService(pool);
 const data={CampusId:1,AcademicSessionId:2,ClassYearId:3,ProgramId:4,
   DefaultRoomId:null,SectionName:"A",SectionCode:"A-1",StudentCount:25,IsActive:true};
 assert.deepEqual(await service.createSection(data),{SectionId:4});
 assert.deepEqual(pool.queries[0].args,[1,2,3,4,null,"A","A-1",25,1]);
 assert.equal(await service.updateSection(4,data),1);
 assert.equal(await service.deleteSection(4),1);
});
test("sections: reject inactive or wrong-campus rooms",async()=>{
 const pool=mock(sql=>({rows:sql.includes('FROM "Rooms"')?[{
   RoomId:3,CampusId:2,RoomNumber:"R1",Capacity:50,IsActive:1
 }]:[]}));
 const result=await createSectionService(pool).validateRoomAssignment({
   roomId:3,campusId:1,studentCount:20,academicSessionId:2
 });
 assert.equal(result.valid,false);
 assert.match(result.message,/same campus/);
});
test("sections: enforce group membership before reusing classroom",async()=>{
 const pool=mock(sql=>{
   if(sql.includes('FROM "Rooms"'))return {rows:[{RoomId:3,CampusId:1,RoomNumber:"R1",Capacity:50,IsActive:1}]};
   if(sql.includes('FROM "Sections" WHERE'))return {rows:[{SectionId:5,SectionCode:"B",StudentCount:20}]};
   return {rows:[]};
 });
 const result=await createSectionService(pool).validateRoomAssignment({
   roomId:3,campusId:1,studentCount:20,academicSessionId:2
 });
 assert.equal(result.valid,false);
 assert.match(result.message,/Teaching Group/);
});
