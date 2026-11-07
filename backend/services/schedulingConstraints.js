const { getBestRule, getMatchingRules } = require("./timetableRuleService");

const isCommon = row => String(row.ClassType).toLowerCase() === "common";

function lectureKey(row) {
    if (isCommon(row)) {
        return ["Common", row.AcademicSessionId, row.TeacherId, row.RoomId, row.TimeSlotId, row.SubjectId].join(":");
    }
    return ["Single", row.SectionSubjectId, row.TimeSlotId].join(":");
}

function groupLectures(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const key = lectureKey(entry);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
    }
    return [...groups.values()];
}

function requiresLab(row) {
    const subject = `${row.SubjectName || ""} ${row.SubjectCode || ""}`.toLowerCase();
    return Boolean(row.IsPractical) || subject.includes("lab") || subject.includes("computer") || ["Lab", "Practical"].includes(row.ClassType);
}

function assignmentProblem(row) {
    if (!row.AssignmentIsActive || !row.SectionIsActive) return "The assignment or section is inactive.";
    if (!row.TeacherIsActive || !row.SubjectIsActive) return "The assigned teacher or subject is inactive.";
    if (row.ActiveGroupCount > 1) return "The section belongs to multiple active teaching groups. Select one group first.";
    return null;
}

function activeAssignments(assignments) {
    return assignments.filter(row => row.AssignmentIsActive && row.SectionIsActive);
}

function commonCohort(mapping, assignments) {
    if (!mapping.TeachingGroupId) return [];
    const group = activeAssignments(assignments).filter(row => row.TeachingGroupId === mapping.TeachingGroupId);
    const matching = group.filter(row => row.SubjectId === mapping.SubjectId);
    const sections = new Set(group.map(row => row.SectionId));
    if (matching.length < 2 || matching.length !== sections.size ||
        matching.some(row => row.TeacherId !== mapping.TeacherId || row.WeeklyHours !== mapping.WeeklyHours)) {
        return [];
    }
    return matching;
}

function placedPeriods(entries) {
    const slotsByAssignment = new Map();
    for (const { SectionSubjectId, TimeSlotId } of entries) {
        if (!slotsByAssignment.has(SectionSubjectId)) slotsByAssignment.set(SectionSubjectId, new Set());
        slotsByAssignment.get(SectionSubjectId).add(TimeSlotId);
    }
    return new Map([...slotsByAssignment].map(([id, slots]) => [id, slots.size]));
}

function overlapping(a, b) {
    return a && b && a.DayOfWeek === b.DayOfWeek && a.StartTime < b.EndTime && b.StartTime < a.EndTime;
}

function ruleViolation({ row, teacherId, subjectId, sectionId, slot, allEntries, timeSlots, rules }) {
    const context = { teacherId, subjectId, sectionId, campusId: row.CampusId, classYearId: row.ClassYearId };
    const best = code => getBestRule(rules, code, context)?.RuleValueObject;
    const matches = (code, key, value) => getMatchingRules(rules, code, context)
        .some(rule => Number(rule.RuleValueObject?.[key]) === value);

    const today = timeSlots.filter(item => item.DayOfWeek === slot.DayOfWeek);
    const idsToday = new Set(today.map(item => item.TimeSlotId));
    const period = today.filter(item => item.StartTime < slot.StartTime).length + 1;
    const previousToday = allEntries.filter(item => idsToday.has(item.TimeSlotId));
    const dailyRule = best("TEACHER_DAILY_MAX");
    const maxLectures = Number(dailyRule?.maxLectures ?? (
        rules.some(rule => rule.RuleCode === "TEACHER_DAILY_MAX") ? NaN : 5
    ));
    const teacherLectures = new Set(previousToday.filter(item => item.TeacherId === teacherId).map(lectureKey));
    if (maxLectures > 0 && teacherLectures.size >= maxLectures) {
        return { type: "Teacher Daily Load Conflict", message: `Teacher daily limit of ${maxLectures} lectures would be exceeded.` };
    }

    if (period < Number(best("TEACHER_MIN_START_PERIOD")?.minimumPeriod) ||
        period > Number(best("TEACHER_MAX_END_PERIOD")?.maximumPeriod) ||
        matches("TEACHER_BLOCK_DAY", "dayOfWeek", slot.DayOfWeek) ||
        matches("TEACHER_BLOCK_PERIOD", "period", period)) {
        return { type: "Teacher Availability Conflict", message: "The teacher is unavailable in this period." };
    }
    if (matches("SECTION_BLOCK_PERIOD", "period", period)) {
        return { type: "Section Availability Conflict", message: "The section is unavailable in this period." };
    }

    const maxPerDay = Number(best("SUBJECT_MAX_PER_DAY")?.maxPerDay);
    const subjectPeriods = previousToday.filter(item => item.SectionId === sectionId && item.SubjectId === subjectId).length;
    if (maxPerDay > 0 && subjectPeriods >= maxPerDay) {
        return { type: "Subject Daily Limit Conflict", message: `This subject is limited to ${maxPerDay} period(s) per day for the section.` };
    }
    return null;
}

const passesConfigurableRules = context => !ruleViolation(context);

function lectureProblems(rows, otherEntries, data) {
    const [first] = rows;
    const slot = data.timeSlots.find(item => item.TimeSlotId === first.TimeSlotId);
    const room = data.rooms.find(item => item.RoomId === first.RoomId);
    const problems = [];
    const add = (type, message) => {
        if (!problems.some(problem => problem.type === type)) problems.push({ type, message });
    };

    if (!slot?.IsActive || !room?.IsActive) add("Inactive Resource Conflict", "The room or time slot is inactive.");
    const sections = new Set(rows.map(row => row.SectionId));
    const students = [...new Map(rows.map(row => [row.SectionId, row.StudentCount || 0])).values()]
        .reduce((sum, count) => sum + count, 0);
    if (room && students > room.Capacity) {
        add(isCommon(first) ? "Common Room Capacity Conflict" : "Room Capacity Conflict", `Room capacity is ${room.Capacity} for ${students} students.`);
    }
    if (room && rows.some(row => row.CampusId !== room.CampusId)) {
        add("Campus Conflict", "The room and sections must belong to the same campus.");
    }
    if (room && !room.IsLab && rows.some(requiresLab)) {
        add("Lab Requirement Conflict", "The practical lesson needs a lab.");
    }

    if (isCommon(first)) {
        const expected = commonCohort(first, data.assignments);
        if (expected.length !== rows.length || expected.some(row => !sections.has(row.SectionId))) {
            add("Shared Lecture Conflict", "A shared lecture must include every section assigned to it.");
        }
    }

    const slotsById = new Map(data.timeSlots.map(item => [item.TimeSlotId, item]));
    for (const other of otherEntries) {
        if (!overlapping(slot, slotsById.get(other.TimeSlotId))) continue;
        if (other.TeacherId === first.TeacherId) add("Teacher Conflict", "The teacher already has a lesson at this time.");
        if (other.RoomId === first.RoomId) add("Room Conflict", "The room already has a lesson at this time.");
        if (sections.has(other.SectionId)) add("Section Conflict", "A section already has a lesson at this time.");
    }

    const activeSlots = data.timeSlots.filter(item => item.IsActive);
    for (const row of rows) {
        const problem = assignmentProblem(row);
        if (problem) add("Inactive or Invalid Assignment", problem);
        if ((row.SectionSessionId !== undefined && row.SectionSessionId !== row.AcademicSessionId) ||
            (row.AssignedTeacherId !== undefined && row.AssignedTeacherId !== row.TeacherId)) {
            add("Assignment Changed", "The saved lesson no longer matches the section or its assigned teacher.");
        }
        if (slot?.IsActive) {
            const rule = ruleViolation({
                row, teacherId: row.TeacherId, subjectId: row.SubjectId, sectionId: row.SectionId,
                slot, allEntries: otherEntries, timeSlots: activeSlots, rules: data.rules
            });
            if (rule) add(rule.type, rule.message);
        }
    }
    return problems;
}

function evaluateSchedule(data, entries) {
    const conflicts = [];
    for (const lecture of groupLectures(entries)) {
        const first = lecture[0];
        const key = lectureKey(first);
        const others = entries.filter(entry => lectureKey(entry) !== key);
        for (const problem of lectureProblems(lecture, others, data)) {
            conflicts.push({
                ...problem,
                severity: ["Teacher Daily Load Conflict", "Room Capacity Conflict", "Common Room Capacity Conflict"].includes(problem.type) ? "MEDIUM" : "HIGH",
                teacherName: first.TeacherName,
                sectionCode: lecture.map(row => row.SectionCode).join(", "),
                roomName: first.RoomName,
                subjectName: first.SubjectName,
                dayOfWeek: first.DayOfWeek,
                startTime: first.StartTime,
                endTime: first.EndTime,
                timetableEntryIds: lecture.map(row => row.TimetableEntryId).filter(Boolean)
            });
        }
    }

    const counts = placedPeriods(entries);
    const missingAssignments = [];
    for (const row of activeAssignments(data.assignments)) {
        const scheduledHours = counts.get(row.SectionSubjectId) || 0;
        const requiredHours = row.WeeklyHours;
        if (scheduledHours < requiredHours) {
            missingAssignments.push({
                sectionSubjectId: row.SectionSubjectId, sectionId: row.SectionId, sectionCode: row.SectionCode,
                subjectName: row.SubjectName, requiredHours, scheduledHours,
                reason: assignmentProblem(row) || "No eligible slot and room could be assigned."
            });
        }
        if (scheduledHours > requiredHours) {
            conflicts.push({
                type: "Weekly Demand Conflict", severity: "MEDIUM", sectionCode: row.SectionCode,
                subjectName: row.SubjectName, message: `${scheduledHours} periods are scheduled for a weekly requirement of ${requiredHours}.`
            });
        }
    }

    const status = conflicts.length ? "conflicts" : !entries.length ? "empty" : missingAssignments.length ? "incomplete" : "ready";
    return { status, isValid: status === "ready", conflicts, totalConflicts: conflicts.length, missingAssignments, totalEntries: entries.length };
}

module.exports = {
    activeAssignments, assignmentProblem, commonCohort, evaluateSchedule, groupLectures,
    lectureKey, lectureProblems, overlapping, passesConfigurableRules, placedPeriods, requiresLab
};
