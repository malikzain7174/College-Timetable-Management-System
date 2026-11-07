#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const sql = readFileSync(join(__dirname, "001_initial_schema.sql"), "utf8");
const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)"/g)].map(match => match[1]);
const references = [...sql.matchAll(/REFERENCES "([^"]+)"\s*\(/g)].map(match => match[1]);
const expected = [
  "AcademicSessions", "Campuses", "ClassYears", "Departments", "PasswordResetTokens",
  "Programs", "Rooms", "Sections", "SectionSubjects", "Subjects", "TeacherDepartments",
  "Teachers", "TeacherSubjects", "TeachingGroups", "TeachingGroupSections", "TimeSlots",
  "TimetableEntries", "TimetableRules", "Users", "UserSessions",
];

test("schema includes all 19 source tables and auth sessions", () => {
  assert.equal(tables.length, expected.length);
  assert.deepEqual([...tables].sort(), [...expected].sort());
});
test("every referenced table has a definition", () => {
  for (const target of references) assert.ok(tables.includes(target), "Missing " + target);
});
test("schema has essential indexes and timetable uniqueness rules", () => {
  assert.match(sql, /UX_TimetableEntries_SectionSubject_TimeSlot_Session/);
  assert.match(sql, /UX_Users_Username/);
  assert.match(sql, /IX_UserSessions_UserId_ExpiresAt/);
  assert.match(sql, /FK_TimetableEntries_Teachers/);
});
test("schema is transaction-wrapped and has no common T-SQL tokens", () => {
  assert.match(sql, /\bBEGIN\s*;/);
  assert.match(sql, /\bCOMMIT\s*;/);
  assert.doesNotMatch(sql, /\bNONCLUSTERED\b|\bGETDATE\s*\(|\bSYSUTCDATETIME\s*\(|\bIDENTITY\s*\(|\[dbo\]/i);
});
