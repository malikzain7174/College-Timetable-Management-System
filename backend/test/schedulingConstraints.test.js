const { test } = require("node:test");
const assert = require("node:assert/strict");
const { commonCohort, evaluateSchedule, passesConfigurableRules, placedPeriods } = require("../services/schedulingConstraints");

const slot = id => ({
    TimeSlotId: id, DayOfWeek: 1, StartTime: `${8 + id}:00`, EndTime: `${8 + id}:40`, IsActive: true
});
const base = {
    SectionSubjectId: 1, SectionId: 1, SubjectId: 10, TeacherId: 8, RoomId: 4,
    AcademicSessionId: 1, CampusId: 1, ClassYearId: 1, TeachingGroupId: 3, ActiveGroupCount: 1,
    SectionCode: "A", SubjectName: "English", WeeklyHours: 1, StudentCount: 20,
    AssignmentIsActive: true, SectionIsActive: true, TeacherIsActive: true, SubjectIsActive: true
};
const pair = { ...base, SectionSubjectId: 2, SectionId: 2, SectionCode: "B" };
const timeSlots = [1, 2, 3, 4, 5, 6].map(slot);
const data = {
    assignments: [base, pair], timeSlots, rooms: [{ RoomId: 4, CampusId: 1, IsActive: true, Capacity: 50 }],
    rules: []
};

test("an empty or incomplete schedule cannot be marked valid", () => {
    const empty = evaluateSchedule(data, []);
    assert.equal(empty.status, "empty");
    assert.equal(empty.isValid, false);
    assert.equal(empty.missingAssignments.length, 2);
    const partial = evaluateSchedule(data, [{ ...base, ClassType: "Regular", TimeSlotId: 1 }]);
    assert.equal(partial.status, "incomplete");
    assert.equal(partial.missingAssignments[0].sectionCode, "B");
});

test("shared classes fulfill both assignments and count once toward the teacher limit", () => {
    const shared = [base, pair].map(row => ({ ...row, ClassType: "Common", TimeSlotId: 1 }));
    assert.deepEqual(commonCohort(base, data.assignments).map(row => row.SectionId), [1, 2]);
    assert.equal(evaluateSchedule(data, shared).status, "ready");
    assert.deepEqual([...placedPeriods(shared).values()], [1, 1]);

    const regular = [2, 3, 4].map(id => ({
        ...base, SectionSubjectId: id + 10, ClassType: "Regular", TimeSlotId: id
    }));
    const context = { row: base, teacherId: 8, sectionId: 1, subjectId: 10, slot: slot(5), timeSlots, rules: [] };
    assert.equal(passesConfigurableRules({ ...context, allEntries: [...shared, ...regular] }), true);
    assert.equal(passesConfigurableRules({
        ...context, slot: slot(6), allEntries: [...shared, ...regular, { ...base, SectionSubjectId: 20, TimeSlotId: 5 }]
    }), false);
});

test("validation detects an invalid lab or a split shared lecture", () => {
    const lab = { ...base, IsPractical: true, ClassType: "Regular", TimeSlotId: 1 };
    const invalid = evaluateSchedule(data, [lab]);
    assert.ok(invalid.conflicts.some(row => row.type === "Lab Requirement Conflict"));
    const shared = [{ ...base, ClassType: "Common", TimeSlotId: 1 }, { ...pair, ClassType: "Common", TimeSlotId: 2 }];
    assert.ok(evaluateSchedule(data, shared).conflicts.some(row => row.type === "Shared Lecture Conflict"));
});
