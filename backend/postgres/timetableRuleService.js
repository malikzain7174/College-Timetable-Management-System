"use strict";
const { getPgPool, withPgAdvisoryLock } = require("./client");
const { HttpError, positiveId } = require("../lib/httpError");
const definitions = {
  TEACHER_DAILY_MAX: {type:"Maximum",scopes:["Global","Teacher"],key:"maxLectures"},
  TEACHER_MIN_START_PERIOD: {type:"MinimumPeriod",scopes:["Global","Teacher"],key:"minimumPeriod"},
  TEACHER_MAX_END_PERIOD: {type:"MaximumPeriod",scopes:["Global","Teacher"],key:"maximumPeriod"},
  TEACHER_BLOCK_DAY: {type:"BlockedDay",scopes:["Teacher"],key:"dayOfWeek",max:7},
  TEACHER_BLOCK_PERIOD: {type:"BlockedPeriod",scopes:["Teacher"],key:"period"},
  SUBJECT_MAX_PER_DAY: {type:"Maximum",scopes:["Global","Subject"],key:"maxPerDay"},
  SECTION_BLOCK_PERIOD: {type:"BlockedPeriod",scopes:["Section"],key:"period"},
  BIO_MATH_PARALLEL: {type:"Feature",scopes:["Global"]}
};
const targets = {
  Teacher:["Teachers","TeacherId","teacherId"], Subject:["Subjects","SubjectId","subjectId"],
  Section:["Sections","SectionId","sectionId"], Campus:["Campuses","CampusId","campusId"],
  ClassYear:["ClassYears","ClassYearId","classYearId"]
};
function parseRuleValue(value) {
  try {
    const v=typeof value==="string"?JSON.parse(value):value;
    return v&&typeof v==="object"&&!Array.isArray(v)?v:null;
  }catch{return null;}
}
const normalizeRule=rule=>({...rule,RuleValueObject:parseRuleValue(rule.RuleValue)||{}});

function createTimetableRuleService(pool=getPgPool()) {
  const lock=fn=>withPgAdvisoryLock("timetable:rules",fn,pool);
  async function getAllRules(db=pool) {
    const {rows}=await db.query(`
      SELECT "RuleId","RuleCode","RuleName","RuleType","ScopeType","ScopeId",
        "RuleValue","IsEnabled","IsMandatory","Priority","Description","CreatedAt","UpdatedAt"
      FROM "TimetableRules" ORDER BY "IsMandatory" DESC,"Priority","RuleId"
    `);
    return rows.map(normalizeRule);
  }
  async function getRuleById(key,db=pool) {
    const {rows:[rule]}=await db.query('SELECT * FROM "TimetableRules" WHERE "RuleId"=$1',[positiveId(key,"rule ID")]);
    if(!rule)throw new HttpError(404,"Rule not found.");
    return normalizeRule(rule);
  }
  async function validateRule(db,data) {
    const spec=Object.hasOwn(definitions,data.RuleCode)&&definitions[data.RuleCode];
    if(!spec||data.RuleType!==spec.type)throw new HttpError(400,"Select a supported rule and rule type.");
    if(!spec.scopes.includes(data.ScopeType))throw new HttpError(400,"This rule does not support that scope.");
    if(typeof data.RuleName!=="string"||!data.RuleName.trim()||data.RuleName.trim().length>200)
      throw new HttpError(400,"Enter a rule name of at most 200 characters.");
    if(data.IsEnabled!==undefined&&typeof data.IsEnabled!=="boolean")
      throw new HttpError(400,"Enabled must be a boolean.");
    if(data.IsMandatory===true)throw new HttpError(400,"Mandatory rules are built into the scheduler.");
    if(data.Description!=null&&(typeof data.Description!=="string"||data.Description.length>500))
      throw new HttpError(400,"Description must be 500 characters or fewer.");
    const value=parseRuleValue(data.RuleValue??(spec.key?null:{}));
    if(!value||(spec.key
      ?Object.keys(value).length!==1||!Number.isInteger(value[spec.key])||
        value[spec.key]<1||value[spec.key]>(spec.max||1440)
      :Object.keys(value).length!==0))
      throw new HttpError(400,spec.key?`Enter a valid integer for ${spec.key}.`:"This rule does not take a value.");
    let scopeId=null;
    if(data.ScopeType==="Global"){
      if(data.ScopeId!=null&&data.ScopeId!=="")throw new HttpError(400,"A global rule does not take a scope ID.");
    }else{
      scopeId=positiveId(data.ScopeId,"rule scope ID");
      const [table,column]=targets[data.ScopeType];
      // These identifiers can only be looked up from the fixed, internal whitelist above.
      const {rows}=await db.query(`SELECT "${column}" FROM "${table}" WHERE "${column}"=$1`,[scopeId]);
      if(!rows.length)throw new HttpError(400,"The selected rule target does not exist.");
    }
    return {name:data.RuleName.trim(),type:spec.type,code:data.RuleCode,scope:data.ScopeType,
      scopeId,value:JSON.stringify(value),enabled:data.IsEnabled??true,
      priority:positiveId(data.Priority??100,"priority"),
      description:data.Description?.trim()||null};
  }
  const protect=rule=>{if(rule.IsMandatory)throw new HttpError(409,"Mandatory scheduling rules are read-only.");};
  async function saveRule(data,key) {
    return lock(async client=>{
      if(key!==undefined)protect(await getRuleById(key,client));
      const input=await validateRule(client,data);
      const v=[input.code,input.name,input.type,input.scope,input.scopeId,
        input.value,input.enabled?1:0,input.priority,input.description];
      let result;
      if(key===undefined){
        result=await client.query(`
          INSERT INTO "TimetableRules" ("RuleCode","RuleName","RuleType","ScopeType","ScopeId",
            "RuleValue","IsEnabled","Priority","Description")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
        `,v);
      }else{
        result=await client.query(`
          UPDATE "TimetableRules" SET "RuleCode"=$2,"RuleName"=$3,"RuleType"=$4,
            "ScopeType"=$5,"ScopeId"=$6,"RuleValue"=$7,"IsEnabled"=$8,
            "Priority"=$9,"Description"=$10,"UpdatedAt"=(now() AT TIME ZONE 'UTC')
          WHERE "RuleId"=$1 RETURNING *
        `,[positiveId(key,"rule ID"),...v]);
      }
      if(!result.rows[0])throw new HttpError(404,"Rule not found.");
      return normalizeRule(result.rows[0]);
    });
  }
  async function toggleRule(key,enabled) {
    if(typeof enabled!=="boolean")throw new HttpError(400,"Enabled must be a boolean.");
    return lock(async client=>{
      const rule=await getRuleById(key,client);protect(rule);
      if(enabled)await validateRule(client,{...rule,IsEnabled:enabled});
      const {rows:[updated]}=await client.query(`
        UPDATE "TimetableRules" SET "IsEnabled"=$2,"UpdatedAt"=(now() AT TIME ZONE 'UTC')
        WHERE "RuleId"=$1 RETURNING *
      `,[positiveId(key,"rule ID"),enabled?1:0]);
      return normalizeRule(updated);
    });
  }
  async function deleteRule(key) {
    return lock(async client=>{
      protect(await getRuleById(key,client));
      return (await client.query('DELETE FROM "TimetableRules" WHERE "RuleId"=$1',[positiveId(key,"rule ID")])).rowCount;
    });
  }
  return {getAllRules,getRuleById,toggleRule,deleteRule,validateRule,
    createRule:data=>saveRule(data),updateRule:(key,data)=>saveRule(data,key)};
}
function getMatchingRules(rules,code,context) {
  return rules.filter(rule=>rule.RuleCode===code&&rule.IsEnabled&&(
    rule.ScopeType==="Global"||
    (Object.hasOwn(targets,rule.ScopeType)&&
      Number(rule.ScopeId)===Number(context[targets[rule.ScopeType][2]]))
  ));
}
function getBestRule(rules,code,context) {
  const match=getMatchingRules(rules,code,context);
  return match.find(rule=>rule.ScopeType!=="Global")||match[0];
}
// Factory method and pure rule selectors exported independently for the scheduler.
module.exports={
  createTimetableRuleService,getBestRule,getMatchingRules,
  getAllRules:db=>createTimetableRuleService().getAllRules(db),
  getRuleById:(id,db)=>createTimetableRuleService().getRuleById(id,db),
  createRule:data=>createTimetableRuleService().createRule(data),
  updateRule:(id,data)=>createTimetableRuleService().updateRule(id,data),
  toggleRule:(id,enabled)=>createTimetableRuleService().toggleRule(id,enabled),
  deleteRule:id=>createTimetableRuleService().deleteRule(id)
};
