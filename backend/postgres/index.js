"use strict";

/**
 * PostgreSQL-only service registry. Explicit opt-in through DB_PROVIDER=postgres.
 * Keeps the original SQL Server services untouched on main and in local legacy mode.
 */
const { createPostgresAuthService } = require("./authService");
const { createDepartmentService } = require("./departmentService");
const { createRoomService } = require("./roomService");
const { createSectionService } = require("./sectionService");
const { createSectionSubjectService } = require("./sectionSubjectService");
const { createSubjectService } = require("./subjectService");
const { createTeacherService } = require("./teacherService");
const { createTeachingGroupService } = require("./teachingGroupService");
const { createTeachingGroupSectionService } = require("./teachingGroupSectionService");
const { createTimeSlotService } = require("./timeSlotService");

module.exports = {
  authService: createPostgresAuthService(),
  departmentService: createDepartmentService(),
  roomService: createRoomService(),
  sectionService: createSectionService(),
  sectionSubjectService: createSectionSubjectService(),
  subjectService: createSubjectService(),
  teacherService: createTeacherService(),
  teachingGroupService: createTeachingGroupService(),
  teachingGroupSectionService: createTeachingGroupSectionService(),
  timeSlotService: createTimeSlotService(),
  timetableEntryService: require("./timetableEntryService"),
  timetableGeneratorService: require("./timetableGeneratorService"),
  timetableRuleService: require("./timetableRuleService"),
  conflictService: require("./conflictService")
};
