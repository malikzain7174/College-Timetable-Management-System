const { sql, poolPromise } = require("../config/db");
const timetableRuleService = require("./timetableRuleService");


// ======================================================
// GET GENERATION DATA
// ======================================================

const getGenerationData = async (academicSessionId) => {
    const pool = await poolPromise;

    const subjectResult = await pool.request()
        .input("AcademicSessionId", sql.Int, Number(academicSessionId))
        .query(`
            SELECT
                ss.SectionSubjectId,
                ss.SectionId,
                ss.SubjectId,
                ss.TeacherId,
                ss.WeeklyHours,

                s.CampusId,
                s.AcademicSessionId,
                s.ClassYearId,
                s.DefaultRoomId,
                s.SectionCode,
                s.SectionName,
                s.StudentCount,

                sub.SubjectCode,
                sub.SubjectName,
                sub.IsPractical,

                grp.TeachingGroupId

            FROM SectionSubjects ss

            INNER JOIN Sections s
                ON s.SectionId = ss.SectionId

            INNER JOIN Subjects sub
                ON sub.SubjectId = ss.SubjectId

            OUTER APPLY
            (
                SELECT TOP 1
                    tgs.TeachingGroupId

                FROM TeachingGroupSections tgs

                INNER JOIN TeachingGroups tg
                    ON tg.TeachingGroupId = tgs.TeachingGroupId

                WHERE
                    tgs.SectionId = ss.SectionId
                    AND tg.IsActive = 1
                    AND tg.CampusId = s.CampusId
                    AND tg.AcademicSessionId = s.AcademicSessionId
                    AND tg.ClassYearId = s.ClassYearId

                ORDER BY tgs.TeachingGroupId
            ) grp

            WHERE
                s.AcademicSessionId = @AcademicSessionId
                AND ss.IsActive = 1
                AND s.IsActive = 1

            ORDER BY ss.SectionSubjectId;
        `);

    const timeSlotResult = await pool.request().query(`
        SELECT
            TimeSlotId,
            DayOfWeek,
            StartTime,
            EndTime,
            SlotName
        FROM TimeSlots
        WHERE IsActive = 1
        ORDER BY DayOfWeek, StartTime;
    `);

    const roomResult = await pool.request().query(`
        SELECT
            r.RoomId,
            r.CampusId,
            r.RoomNumber,
            r.RoomName,
            r.RoomType,
            r.Capacity,
            r.IsLab,
            r.IsActive,

            assigned.SectionId AS AssignedSectionId,
            assigned.SectionCode AS AssignedSectionCode

        FROM Rooms r

        OUTER APPLY
        (
            SELECT TOP 1
                s.SectionId,
                s.SectionCode
            FROM Sections s
            WHERE
                s.DefaultRoomId = r.RoomId
                AND s.IsActive = 1
            ORDER BY s.SectionId
        ) assigned

        WHERE r.IsActive = 1

        ORDER BY r.CampusId, r.RoomNumber;
    `);

    return {
        subjects: subjectResult.recordset,
        timeSlots: timeSlotResult.recordset,
        rooms: roomResult.recordset
    };
};


// ======================================================
// EXISTING ENTRIES
// ======================================================

const getExistingEntries = async (academicSessionId) => {
    const pool = await poolPromise;

    const result = await pool.request()
        .input("AcademicSessionId", sql.Int, Number(academicSessionId))
        .query(`
            SELECT
                te.TimetableEntryId,
                te.TeacherId,
                te.RoomId,
                te.TimeSlotId,
                ss.SectionId,
                ss.SubjectId
            FROM TimetableEntries te
            INNER JOIN SectionSubjects ss
                ON ss.SectionSubjectId = te.SectionSubjectId
            WHERE te.AcademicSessionId = @AcademicSessionId;
        `);

    return result.recordset;
};


// ======================================================
// CLEAR TIMETABLE
// ======================================================

const clearTimetable = async (academicSessionId) => {
    const pool = await poolPromise;

    const result = await pool.request()
        .input("AcademicSessionId", sql.Int, Number(academicSessionId))
        .query(`
            DELETE FROM TimetableEntries
            WHERE AcademicSessionId = @AcademicSessionId;
        `);

    return {
        deletedRows: result.rowsAffected[0] || 0
    };
};


// ======================================================
// CONFLICT HELPERS
// ======================================================

const hasSectionConflict = (entries, sectionId, timeSlotId) => {
    return entries.some(entry =>
        Number(entry.SectionId) === Number(sectionId) &&
        Number(entry.TimeSlotId) === Number(timeSlotId)
    );
};


const hasTeacherConflict = (entries, teacherId, timeSlotId) => {
    return entries.some(entry =>
        Number(entry.TeacherId) === Number(teacherId) &&
        Number(entry.TimeSlotId) === Number(timeSlotId)
    );
};


const hasRoomConflict = (entries, roomId, timeSlotId) => {
    return entries.some(entry =>
        Number(entry.RoomId) === Number(roomId) &&
        Number(entry.TimeSlotId) === Number(timeSlotId)
    );
};


// ======================================================
// TEACHER DAILY LOAD
// Common lecture counts only once because unique slots are used.
// ======================================================

const getTeacherDailyLectureCount = (
    entries,
    teacherId,
    dayOfWeek,
    timeSlots
) => {
    const slotDays = new Map(
        timeSlots.map(slot => [
            Number(slot.TimeSlotId),
            Number(slot.DayOfWeek)
        ])
    );

    const uniqueSlots = new Set();

    for (const entry of entries) {
        if (Number(entry.TeacherId) !== Number(teacherId)) {
            continue;
        }

        const entryDay = slotDays.get(Number(entry.TimeSlotId));

        if (entryDay === Number(dayOfWeek)) {
            uniqueSlots.add(Number(entry.TimeSlotId));
        }
    }

    return uniqueSlots.size;
};


// ======================================================
// PRACTICAL / LAB
// ======================================================

const requiresLab = row => {
    if (row.IsPractical) {
        return true;
    }

    const text = `${row.SubjectCode || ""} ${row.SubjectName || ""}`
        .toLowerCase();

    return text.includes("lab") || text.includes("computer");
};


// ======================================================
// PARALLEL BIOLOGY + MATHEMATICS HELPERS
// ======================================================

const isBiologySubject = row => {
    const code = String(row.SubjectCode || "").trim().toUpperCase();
    const name = String(row.SubjectName || "").trim().toLowerCase();

    return code === "BIO101" || name.includes("biology");
};


const isMathematicsSubject = row => {
    const code = String(row.SubjectCode || "").trim().toUpperCase();
    const name = String(row.SubjectName || "").trim().toLowerCase();

    return (
        code === "MAT101" ||
        name.includes("mathematics") ||
        name === "math" ||
        name === "maths"
    );
};


const isPreMedicalSection = row => {
    const text = `${row.SectionCode || ""} ${row.SectionName || ""}`
        .toUpperCase();

    return (
        text.includes("-PM-") ||
        text.includes("PRE-MED") ||
        text.includes("PRE MED")
    );
};


const isPreEngineeringSection = row => {
    const text = `${row.SectionCode || ""} ${row.SectionName || ""}`
        .toUpperCase();

    return (
        text.includes("-PE-") ||
        text.includes("PRE-ENG") ||
        text.includes("PRE ENG")
    );
};


// ======================================================
// DISTINCT TASK ROWS
// ======================================================

const getDistinctTaskRows = task => {
    return [
        ...new Map(
            task.rows.map(row => [Number(row.SectionId), row])
        ).values()
    ];
};


// ======================================================
// TASK CAPACITY
// ======================================================

const getTaskCapacity = task => {
    const distinctRows = getDistinctTaskRows(task);

    if (task.type === "Common") {
        return distinctRows.reduce(
            (total, row) => total + Number(row.StudentCount || 0),
            0
        );
    }

    return Number(distinctRows[0]?.StudentCount || 0);
};


// ======================================================
// CONFIGURABLE RULE ENGINE HELPERS
// ======================================================

const getPeriodNumber = (slot, timeSlots) => {
    const daySlots = timeSlots
        .filter(
            item =>
                Number(item.DayOfWeek) ===
                Number(slot.DayOfWeek)
        )
        .sort(
            (a, b) =>
                String(a.StartTime || "").localeCompare(
                    String(b.StartTime || "")
                )
        );

    const index = daySlots.findIndex(
        item =>
            Number(item.TimeSlotId) ===
            Number(slot.TimeSlotId)
    );

    return index >= 0 ? index + 1 : null;
};


// ======================================================
// COUNT SAME SUBJECT FOR SECTION ON A DAY
// ======================================================

const countSubjectOnDay = ({
    entries,
    sectionId,
    subjectId,
    dayOfWeek,
    timeSlots
}) => {
    const slotDayMap = new Map(
        timeSlots.map(slot => [
            Number(slot.TimeSlotId),
            Number(slot.DayOfWeek)
        ])
    );

    return entries.filter(entry =>
        Number(entry.SectionId) === Number(sectionId) &&
        Number(entry.SubjectId) === Number(subjectId) &&
        slotDayMap.get(Number(entry.TimeSlotId)) === Number(dayOfWeek)
    ).length;
};


// ======================================================
// APPLY CONFIGURABLE FRONTEND RULES
// ======================================================

const passesConfigurableRules = ({
    row,
    teacherId,
    subjectId,
    sectionId,
    slot,
    allEntries,
    timeSlots,
    rules
}) => {
    const context = {
        teacherId: Number(teacherId),
        subjectId: Number(subjectId),
        sectionId: Number(sectionId),
        campusId: Number(row.CampusId),
        classYearId: Number(row.ClassYearId)
    };

    const period = getPeriodNumber(slot, timeSlots);


    // --------------------------------------------------
    // TEACHER DAILY MAX
    // --------------------------------------------------

    const dailyMaxRule = timetableRuleService.getBestRule(
        rules,
        "TEACHER_DAILY_MAX",
        context
    );

    if (dailyMaxRule) {
        const maxLectures = Number(
            dailyMaxRule.RuleValueObject?.maxLectures
        );

        if (
            Number.isFinite(maxLectures) &&
            maxLectures > 0 &&
            getTeacherDailyLectureCount(
                allEntries,
                teacherId,
                slot.DayOfWeek,
                timeSlots
            ) >= maxLectures
        ) {
            return false;
        }
    }


    // --------------------------------------------------
    // TEACHER MINIMUM START PERIOD
    // Example: minimumPeriod = 3 means P1/P2 blocked.
    // --------------------------------------------------

    const minStartRule = timetableRuleService.getBestRule(
        rules,
        "TEACHER_MIN_START_PERIOD",
        context
    );

    if (minStartRule) {
        const minimumPeriod = Number(
            minStartRule.RuleValueObject?.minimumPeriod
        );

        if (
            Number.isFinite(minimumPeriod) &&
            period !== null &&
            period < minimumPeriod
        ) {
            return false;
        }
    }


    // --------------------------------------------------
    // TEACHER MAXIMUM END PERIOD
    // --------------------------------------------------

    const maxEndRule = timetableRuleService.getBestRule(
        rules,
        "TEACHER_MAX_END_PERIOD",
        context
    );

    if (maxEndRule) {
        const maximumPeriod = Number(
            maxEndRule.RuleValueObject?.maximumPeriod
        );

        if (
            Number.isFinite(maximumPeriod) &&
            period !== null &&
            period > maximumPeriod
        ) {
            return false;
        }
    }


    // --------------------------------------------------
    // TEACHER BLOCK DAY
    // --------------------------------------------------

    const blockedDayRules = timetableRuleService.getMatchingRules(
        rules,
        "TEACHER_BLOCK_DAY",
        context
    );

    if (
        blockedDayRules.some(
            rule =>
                Number(rule.RuleValueObject?.dayOfWeek) ===
                Number(slot.DayOfWeek)
        )
    ) {
        return false;
    }


    // --------------------------------------------------
    // TEACHER BLOCK PERIOD
    // --------------------------------------------------

    const blockedTeacherPeriodRules =
        timetableRuleService.getMatchingRules(
            rules,
            "TEACHER_BLOCK_PERIOD",
            context
        );

    if (
        blockedTeacherPeriodRules.some(
            rule =>
                Number(rule.RuleValueObject?.period) ===
                Number(period)
        )
    ) {
        return false;
    }


    // --------------------------------------------------
    // SECTION BLOCK PERIOD
    // --------------------------------------------------

    const blockedSectionPeriodRules =
        timetableRuleService.getMatchingRules(
            rules,
            "SECTION_BLOCK_PERIOD",
            context
        );

    if (
        blockedSectionPeriodRules.some(
            rule =>
                Number(rule.RuleValueObject?.period) ===
                Number(period)
        )
    ) {
        return false;
    }


    // --------------------------------------------------
    // SUBJECT MAXIMUM PER DAY
    // --------------------------------------------------

    const subjectMaxRule = timetableRuleService.getBestRule(
        rules,
        "SUBJECT_MAX_PER_DAY",
        context
    );

    if (subjectMaxRule) {
        const maxPerDay = Number(
            subjectMaxRule.RuleValueObject?.maxPerDay
        );

        if (
            Number.isFinite(maxPerDay) &&
            maxPerDay > 0
        ) {
            const existingCount = countSubjectOnDay({
                entries: allEntries,
                sectionId,
                subjectId,
                dayOfWeek: slot.DayOfWeek,
                timeSlots
            });

            if (existingCount >= maxPerDay) {
                return false;
            }
        }
    }

    return true;
};


// ======================================================
// BUILD TASKS
// ======================================================

const buildTasks = (subjects, rules = []) => {
    const tasks = [];
    const consumed = new Set();
    const remainingHours = new Map();

    for (const row of subjects) {
        remainingHours.set(
            Number(row.SectionSubjectId),
            Number(row.WeeklyHours) || 0
        );
    }


    // --------------------------------------------------
    // IS PARALLEL BIO/MATH RULE ENABLED?
    // --------------------------------------------------

    const bioMathEnabled = Boolean(
        timetableRuleService.getBestRule(
            rules,
            "BIO_MATH_PARALLEL",
            {}
        )
    );


    // --------------------------------------------------
    // PARALLEL BIOLOGY + MATHEMATICS
    // --------------------------------------------------

    if (bioMathEnabled) {
        const academicGroups = new Map();

        for (const row of subjects) {
            const key =
                `${Number(row.CampusId)}|${Number(row.ClassYearId)}`;

            if (!academicGroups.has(key)) {
                academicGroups.set(key, []);
            }

            academicGroups.get(key).push(row);
        }

        for (const rows of academicGroups.values()) {
            const biologyRow = rows.find(
                row =>
                    isPreMedicalSection(row) &&
                    isBiologySubject(row)
            );

            const mathematicsRow = rows.find(
                row =>
                    isPreEngineeringSection(row) &&
                    isMathematicsSubject(row)
            );

            if (!biologyRow || !mathematicsRow) {
                continue;
            }

            const biologyHours =
                Number(
                    remainingHours.get(
                        Number(biologyRow.SectionSubjectId)
                    )
                ) || 0;

            const mathematicsHours =
                Number(
                    remainingHours.get(
                        Number(mathematicsRow.SectionSubjectId)
                    )
                ) || 0;

            const pairedHours = Math.min(
                biologyHours,
                mathematicsHours
            );

            if (pairedHours <= 0) {
                continue;
            }

            tasks.push({
                type: "ParallelBioMath",

                teachingGroupId:
                    biologyRow.TeachingGroupId ||
                    mathematicsRow.TeachingGroupId ||
                    null,

                subjectId: null,

                rows: [
                    biologyRow,
                    mathematicsRow
                ],

                biologyRow,
                mathematicsRow,

                requiredHours: pairedHours
            });

            remainingHours.set(
                Number(biologyRow.SectionSubjectId),
                biologyHours - pairedHours
            );

            remainingHours.set(
                Number(mathematicsRow.SectionSubjectId),
                mathematicsHours - pairedHours
            );
        }
    }


    // --------------------------------------------------
    // COMMON TEACHING GROUPS
    // --------------------------------------------------

    const groups = new Map();

    for (const row of subjects) {
        if (!row.TeachingGroupId) {
            continue;
        }

        const left =
            Number(
                remainingHours.get(
                    Number(row.SectionSubjectId)
                )
            ) || 0;

        if (left <= 0) {
            continue;
        }

        const groupId = Number(row.TeachingGroupId);

        if (!groups.has(groupId)) {
            groups.set(groupId, []);
        }

        groups.get(groupId).push({
            ...row,
            WeeklyHours: left
        });
    }

    for (const [teachingGroupId, rows] of groups) {
        const groupSectionIds = [
            ...new Set(
                rows.map(row => Number(row.SectionId))
            )
        ];

        const bySubject = new Map();

        for (const row of rows) {
            const subjectId = Number(row.SubjectId);

            if (!bySubject.has(subjectId)) {
                bySubject.set(subjectId, []);
            }

            bySubject.get(subjectId).push(row);
        }

        for (const [subjectId, subjectRows] of bySubject) {
            const subjectSections = [
                ...new Set(
                    subjectRows.map(
                        row => Number(row.SectionId)
                    )
                )
            ];

            if (
                subjectSections.length !==
                groupSectionIds.length
            ) {
                continue;
            }

            if (subjectRows.length < 2) {
                continue;
            }

            const teacherIds = [
                ...new Set(
                    subjectRows.map(
                        row => Number(row.TeacherId)
                    )
                )
            ];

            const weeklyHours = [
                ...new Set(
                    subjectRows.map(
                        row => Number(row.WeeklyHours)
                    )
                )
            ];

            if (
                teacherIds.length !== 1 ||
                weeklyHours.length !== 1
            ) {
                continue;
            }

            tasks.push({
                type: "Common",
                teachingGroupId,
                subjectId,
                rows: subjectRows,
                teacherId: teacherIds[0],
                requiredHours: weeklyHours[0]
            });

            for (const row of subjectRows) {
                consumed.add(
                    Number(row.SectionSubjectId)
                );

                remainingHours.set(
                    Number(row.SectionSubjectId),
                    0
                );
            }
        }
    }


    // --------------------------------------------------
    // REGULAR TASKS
    // --------------------------------------------------

    for (const row of subjects) {
        if (
            consumed.has(
                Number(row.SectionSubjectId)
            )
        ) {
            continue;
        }

        const hours =
            Number(
                remainingHours.get(
                    Number(row.SectionSubjectId)
                )
            ) || 0;

        if (hours <= 0) {
            continue;
        }

        tasks.push({
            type: "Regular",

            teachingGroupId:
                row.TeachingGroupId || null,

            subjectId:
                Number(row.SubjectId),

            rows: [row],

            teacherId:
                Number(row.TeacherId),

            requiredHours:
                hours
        });
    }


    // --------------------------------------------------
    // PRIORITY
    // --------------------------------------------------

    const priority = {
        ParallelBioMath: 1,
        Common: 2,
        Regular: 3
    };

    tasks.sort((a, b) => {
        const difference =
            (priority[a.type] || 99) -
            (priority[b.type] || 99);

        if (difference !== 0) {
            return difference;
        }

        return (
            Number(b.requiredHours) -
            Number(a.requiredHours)
        );
    });

    return tasks;
};


// ======================================================
// ROOM FINDER FOR NORMAL / COMMON TASKS
// ======================================================

const findRoomForTask = (
    rooms,
    existingEntries,
    task,
    timeSlotId
) => {
    const distinctRows =
        getDistinctTaskRows(task);

    const campusId =
        Number(distinctRows[0].CampusId);

    const requiredCapacity =
        getTaskCapacity(task);

    const needsLab =
        distinctRows.some(requiresLab);


    // --------------------------------------------------
    // REGULAR THEORY
    // --------------------------------------------------

    if (
        task.type === "Regular" &&
        !needsLab
    ) {
        const assignedRoomId =
            Number(
                distinctRows[0].DefaultRoomId
            );

        if (!assignedRoomId) {
            return null;
        }

        const room = rooms.find(
            item =>
                Number(item.RoomId) ===
                assignedRoomId
        );

        if (!room) {
            return null;
        }

        if (
            Number(room.CampusId) !==
            campusId
        ) {
            return null;
        }

        if (
            Number(room.Capacity) <
            requiredCapacity
        ) {
            return null;
        }

        if (
            hasRoomConflict(
                existingEntries,
                room.RoomId,
                timeSlotId
            )
        ) {
            return null;
        }

        return room;
    }


    // --------------------------------------------------
    // REGULAR PRACTICAL
    // --------------------------------------------------

    if (
        task.type === "Regular" &&
        needsLab
    ) {
        const assignedRoomId =
            Number(
                distinctRows[0].DefaultRoomId
            );

        const assignedRoom = rooms.find(
            item =>
                Number(item.RoomId) ===
                assignedRoomId
        );

        if (
            assignedRoom &&
            assignedRoom.IsLab &&
            Number(assignedRoom.CampusId) === campusId &&
            Number(assignedRoom.Capacity) >= requiredCapacity &&
            !hasRoomConflict(
                existingEntries,
                assignedRoom.RoomId,
                timeSlotId
            )
        ) {
            return assignedRoom;
        }

        return (
            rooms.find(
                room =>
                    Number(room.CampusId) === campusId &&
                    room.IsLab &&
                    Number(room.Capacity) >= requiredCapacity &&
                    !hasRoomConflict(
                        existingEntries,
                        room.RoomId,
                        timeSlotId
                    )
            ) || null
        );
    }


    // --------------------------------------------------
    // COMMON / TEACHING GROUP
    // --------------------------------------------------

    const assignedRoomIds = [
        ...new Set(
            distinctRows
                .map(row => Number(row.DefaultRoomId))
                .filter(
                    roomId =>
                        Number.isInteger(roomId) &&
                        roomId > 0
                )
        )
    ];

    if (assignedRoomIds.length === 1) {
        const sharedRoom = rooms.find(
            room =>
                Number(room.RoomId) ===
                assignedRoomIds[0]
        );

        if (
            sharedRoom &&
            Number(sharedRoom.CampusId) === campusId &&
            Number(sharedRoom.Capacity) >= requiredCapacity
        ) {
            if (
                !needsLab &&
                !hasRoomConflict(
                    existingEntries,
                    sharedRoom.RoomId,
                    timeSlotId
                )
            ) {
                return sharedRoom;
            }

            if (
                needsLab &&
                sharedRoom.IsLab &&
                !hasRoomConflict(
                    existingEntries,
                    sharedRoom.RoomId,
                    timeSlotId
                )
            ) {
                return sharedRoom;
            }
        }
    }

    return (
        rooms.find(room => {
            if (
                Number(room.CampusId) !== campusId
            ) {
                return false;
            }

            if (
                Number(room.Capacity) <
                requiredCapacity
            ) {
                return false;
            }

            if (
                needsLab &&
                !room.IsLab
            ) {
                return false;
            }

            if (
                hasRoomConflict(
                    existingEntries,
                    room.RoomId,
                    timeSlotId
                )
            ) {
                return false;
            }

            return true;
        }) || null
    );
};


// ======================================================
// FREE ROOM FINDER FOR PARALLEL MATHEMATICS
//
// Conditions:
// - same campus
// - not allotted as DefaultRoom to active section
// - capacity enough
// - not Biology room
// - free in exact TimeSlot
// ======================================================

const findFreeArrangementRoom = ({
    rooms,
    allEntries,
    mathematicsRow,
    biologyRoomId,
    timeSlotId
}) => {
    const campusId =
        Number(mathematicsRow.CampusId);

    const studentCount =
        Number(
            mathematicsRow.StudentCount || 0
        );

    const candidates = rooms
        .filter(room => {
            if (
                Number(room.CampusId) !== campusId
            ) {
                return false;
            }

            if (
                room.AssignedSectionId !== null &&
                room.AssignedSectionId !== undefined
            ) {
                return false;
            }

            if (
                Number(room.Capacity) <
                studentCount
            ) {
                return false;
            }

            if (
                Number(room.RoomId) ===
                Number(biologyRoomId)
            ) {
                return false;
            }

            if (
                hasRoomConflict(
                    allEntries,
                    room.RoomId,
                    timeSlotId
                )
            ) {
                return false;
            }

            return true;
        })
        .sort(
            (a, b) =>
                Number(a.Capacity) -
                Number(b.Capacity)
        );

    return candidates[0] || null;
    
};
