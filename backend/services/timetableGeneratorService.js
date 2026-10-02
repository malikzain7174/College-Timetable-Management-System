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

// Max 5 unique lecture slots per teacher/day.

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

const getPeriodNumber = (
    slot,
    timeSlots
) => {

    const daySlots =
        timeSlots
            .filter(
                item =>
                    Number(item.DayOfWeek) ===
                    Number(slot.DayOfWeek)
            )
            .sort(
                (a, b) =>
                    String(a.StartTime || "")
                        .localeCompare(
                            String(b.StartTime || "")
                        )
            );

    const index =
        daySlots.findIndex(
            item =>
                Number(item.TimeSlotId) ===
                Number(slot.TimeSlotId)
        );

    return index >= 0
        ? index + 1
        : null;
};


const countSubjectOnDay = ({
    entries,
    sectionId,
    subjectId,
    dayOfWeek,
    timeSlots
}) => {

    const slotDayMap =
        new Map(
            timeSlots.map(
                slot => [
                    Number(slot.TimeSlotId),
                    Number(slot.DayOfWeek)
                ]
            )
        );

    return entries.filter(
        entry =>
            Number(entry.SectionId) ===
                Number(sectionId) &&
            Number(entry.SubjectId) ===
                Number(subjectId) &&
            slotDayMap.get(
                Number(entry.TimeSlotId)
            ) ===
                Number(dayOfWeek)
    ).length;
};


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
        teacherId:
            Number(teacherId),

        subjectId:
            Number(subjectId),

        sectionId:
            Number(sectionId),

        campusId:
            Number(row.CampusId),

        classYearId:
            Number(row.ClassYearId)
    };


    const period =
        getPeriodNumber(
            slot,
            timeSlots
        );


    // ----------------------------------------------
    // TEACHER DAILY MAX
    // ----------------------------------------------

    const dailyMaxRule =
        timetableRuleService
            .getBestRule(
                rules,
                "TEACHER_DAILY_MAX",
                context
            );


    if (dailyMaxRule) {

        const maxLectures =
            Number(
                dailyMaxRule
                    .RuleValueObject
                    ?.maxLectures
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


    // ----------------------------------------------
    // TEACHER MIN START PERIOD
    // ----------------------------------------------

    const minStartRule =
        timetableRuleService
            .getBestRule(
                rules,
                "TEACHER_MIN_START_PERIOD",
                context
            );


    if (minStartRule) {

        const minimumPeriod =
            Number(
                minStartRule
                    .RuleValueObject
                    ?.minimumPeriod
            );


        if (
            Number.isFinite(minimumPeriod) &&
            period !== null &&
            period < minimumPeriod
        ) {

            return false;
        }
    }


    // ----------------------------------------------
    // TEACHER MAX END PERIOD
    // ----------------------------------------------

    const maxEndRule =
        timetableRuleService
            .getBestRule(
                rules,
                "TEACHER_MAX_END_PERIOD",
                context
            );


    if (maxEndRule) {

        const maximumPeriod =
            Number(
                maxEndRule
                    .RuleValueObject
                    ?.maximumPeriod
            );


        if (
            Number.isFinite(maximumPeriod) &&
            period !== null &&
            period > maximumPeriod
        ) {

            return false;
        }
    }


    // ----------------------------------------------
    // TEACHER BLOCK DAY
    // ----------------------------------------------

    const blockedDayRules =
        timetableRuleService
            .getMatchingRules(
                rules,
                "TEACHER_BLOCK_DAY",
                context
            );


    if (
        blockedDayRules.some(
            rule =>
                Number(
                    rule
                        .RuleValueObject
                        ?.dayOfWeek
                ) ===
                Number(slot.DayOfWeek)
        )
    ) {

        return false;
    }


    // ----------------------------------------------
    // TEACHER BLOCK PERIOD
    // ----------------------------------------------

    const blockedTeacherPeriodRules =
        timetableRuleService
            .getMatchingRules(
                rules,
                "TEACHER_BLOCK_PERIOD",
                context
            );


    if (
        blockedTeacherPeriodRules.some(
            rule =>
                Number(
                    rule
                        .RuleValueObject
                        ?.period
                ) ===
                Number(period)
        )
    ) {

        return false;
    }


    // ----------------------------------------------
    // SECTION BLOCK PERIOD
    // ----------------------------------------------

    const blockedSectionPeriodRules =
        timetableRuleService
            .getMatchingRules(
                rules,
                "SECTION_BLOCK_PERIOD",
                context
            );


    if (
        blockedSectionPeriodRules.some(
            rule =>
                Number(
                    rule
                        .RuleValueObject
                        ?.period
                ) ===
                Number(period)
        )
    ) {

        return false;
    }


    // ----------------------------------------------
    // SUBJECT MAX PER DAY
    // ----------------------------------------------

    const subjectMaxRule =
        timetableRuleService
            .getBestRule(
                rules,
                "SUBJECT_MAX_PER_DAY",
                context
            );


    if (subjectMaxRule) {

        const maxPerDay =
            Number(
                subjectMaxRule
                    .RuleValueObject
                    ?.maxPerDay
            );


        if (
            Number.isFinite(maxPerDay) &&
            maxPerDay > 0
        ) {

            const existingCount =
                countSubjectOnDay({
                    entries:
                        allEntries,

                    sectionId,

                    subjectId,

                    dayOfWeek:
                        slot.DayOfWeek,

                    timeSlots
                });


            if (
                existingCount >=
                maxPerDay
            ) {

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


    const bioMathEnabled = Boolean(
        timetableRuleService.getBestRule(
            rules,
            "BIO_MATH_PARALLEL",
            {}
        )
    );


    for (const row of subjects) {

        remainingHours.set(

            Number(row.SectionSubjectId),

            Number(row.WeeklyHours) || 0

        );

    }



        if (bioMathEnabled) {

    // --------------------------------------------------

        // PARALLEL BIOLOGY + MATHEMATICS

        // --------------------------------------------------



        const academicGroups = new Map();



        for (const row of subjects) {

            const key = `${Number(row.CampusId)}|${Number(row.ClassYearId)}`;



            if (!academicGroups.has(key)) {

                academicGroups.set(key, []);

            }



            academicGroups.get(key).push(row);

        }



        for (const rows of academicGroups.values()) {

            const biologyRow = rows.find(row =>

                isPreMedicalSection(row) &&

                isBiologySubject(row)

            );



            const mathematicsRow = rows.find(row =>

                isPreEngineeringSection(row) &&

                isMathematicsSubject(row)

            );



            if (!biologyRow || !mathematicsRow) {

                continue;

            }



            const biologyHours = Number(

                remainingHours.get(Number(biologyRow.SectionSubjectId))

            ) || 0;



            const mathematicsHours = Number(

                remainingHours.get(Number(mathematicsRow.SectionSubjectId))

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



                requiredHours:

                    pairedHours

            });



            remainingHours.set(

                Number(

                    biologyRow.SectionSubjectId

                ),

                biologyHours - pairedHours

            );



            remainingHours.set(

                Number(

                    mathematicsRow.SectionSubjectId

                ),

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



        const left = Number(

            remainingHours.get(

                Number(

                    row.SectionSubjectId

                )

            )

        ) || 0;



        if (left <= 0) {

            continue;

        }



        const groupId =

            Number(

                row.TeachingGroupId

            );



        if (!groups.has(groupId)) {

            groups.set(

                groupId,

                []

            );

        }



        groups

            .get(groupId)

            .push({

                ...row,

                WeeklyHours:

                    left

            });

    }



    for (const [

        teachingGroupId,

        rows

    ] of groups) {



        const groupSectionIds = [

            ...new Set(

                rows.map(

                    row =>

                        Number(

                            row.SectionId

                        )

                )

            )

        ];



        const bySubject =

            new Map();



        for (const row of rows) {

            const subjectId =

                Number(

                    row.SubjectId

                );



            if (!bySubject.has(subjectId)) {

                bySubject.set(

                    subjectId,

                    []

                );

            }



            bySubject

                .get(subjectId)

                .push(row);

        }



        for (const [

            subjectId,

            subjectRows

        ] of bySubject) {



            const subjectSections = [

                ...new Set(

                    subjectRows.map(

                        row =>

                            Number(

                                row.SectionId

                            )

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

                        row =>

                            Number(

                                row.TeacherId

                            )

                    )

                )

            ];



            const weeklyHours = [

                ...new Set(

                    subjectRows.map(

                        row =>

                            Number(

                                row.WeeklyHours

                            )

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

                type:

                    "Common",



                teachingGroupId,



                subjectId,



                rows:

                    subjectRows,



                teacherId:

                    teacherIds[0],



                requiredHours:

                    weeklyHours[0]

            });



            for (const row of subjectRows) {

                consumed.add(

                    Number(

                        row.SectionSubjectId

                    )

                );



                remainingHours.set(

                    Number(

                        row.SectionSubjectId

                    ),

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

                Number(

                    row.SectionSubjectId

                )

            )

        ) {

            continue;

        }



        const hours = Number(

            remainingHours.get(

                Number(

                    row.SectionSubjectId

                )

            )

        ) || 0;



        if (hours <= 0) {

            continue;

        }



        tasks.push({

            type:

                "Regular",



            teachingGroupId:

                row.TeachingGroupId ||

                null,



            subjectId:

                Number(

                    row.SubjectId

                ),



            rows:

                [row],



            teacherId:

                Number(

                    row.TeacherId

                ),



            requiredHours:

                hours

        });

    }



    // --------------------------------------------------

    // PRIORITY

    // --------------------------------------------------



    const priority = {

        ParallelBioMath:

            1,



        Common:

            2,



        Regular:

            3

    };



    tasks.sort(

        (a, b) => {



            const difference =

                (

                    priority[a.type] ||

                    99

                )

                -

                (

                    priority[b.type] ||

                    99

                );



            if (difference !== 0) {

                return difference;

            }



            return (

                Number(

                    b.requiredHours

                )

                -

                Number(

                    a.requiredHours

                )

            );

        }

    );



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

        getDistinctTaskRows(

            task

        );



    const campusId =

        Number(

            distinctRows[0]

                .CampusId

        );



    const requiredCapacity =

        getTaskCapacity(

            task

        );



    const needsLab =

        distinctRows.some(

            requiresLab

        );



    // --------------------------------------------------

    // REGULAR THEORY

    // --------------------------------------------------



    if (

        task.type ===

        "Regular" &&

        !needsLab

    ) {



        const assignedRoomId =

            Number(

                distinctRows[0]

                    .DefaultRoomId

            );



        if (!assignedRoomId) {

            return null;

        }



        const room =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    assignedRoomId

            );



        if (!room) {

            return null;

        }



        if (

            Number(

                room.CampusId

            ) !==

            campusId

        ) {

            return null;

        }



        if (

            Number(

                room.Capacity

            ) <

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

        task.type ===

        "Regular" &&

        needsLab

    ) {



        const assignedRoomId =

            Number(

                distinctRows[0]

                    .DefaultRoomId

            );



        const assignedRoom =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    assignedRoomId

            );



        if (

            assignedRoom &&

            assignedRoom.IsLab &&

            Number(

                assignedRoom.CampusId

            ) ===

            campusId &&

            Number(

                assignedRoom.Capacity

            ) >=

            requiredCapacity &&

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

                    Number(

                        room.CampusId

                    ) ===

                    campusId &&

                    room.IsLab &&

                    Number(

                        room.Capacity

                    ) >=

                    requiredCapacity &&

                    !hasRoomConflict(

                        existingEntries,

                        room.RoomId,

                        timeSlotId

                    )

            )

            ||

            null

        );

    }



    // --------------------------------------------------

    // COMMON / TEACHING GROUP

    // --------------------------------------------------



    const assignedRoomIds = [

        ...new Set(

            distinctRows

                .map(

                    row =>

                        Number(

                            row.DefaultRoomId

                        )

                )

                .filter(

                    roomId =>

                        Number.isInteger(

                            roomId

                        ) &&

                        roomId > 0

                )

        )

    ];



    if (

        assignedRoomIds.length ===

        1

    ) {



        const sharedRoom =

            rooms.find(

                room =>

                    Number(

                        room.RoomId

                    ) ===

                    assignedRoomIds[0]

            );



        if (

            sharedRoom &&

            Number(

                sharedRoom.CampusId

            ) ===

            campusId &&

            Number(

                sharedRoom.Capacity

            ) >=

            requiredCapacity

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

        rooms.find(

            room => {



                if (

                    Number(

                        room.CampusId

                    ) !==

                    campusId

                ) {

                    return false;

                }



                if (

                    Number(

                        room.Capacity

                    ) <

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

            }

        )

        ||

        null

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

        Number(

            mathematicsRow.CampusId

        );



    const studentCount =

        Number(

            mathematicsRow.StudentCount ||

            0

        );



    const candidates =

        rooms



            .filter(

                room => {



                    if (

                        Number(

                            room.CampusId

                        ) !==

                        campusId

                    ) {

                        return false;

                    }



                    if (

                        room.AssignedSectionId !==

                        null &&

                        room.AssignedSectionId !==

                        undefined

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.Capacity

                        ) <

                        studentCount

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.RoomId

                        ) ===

                        Number(

                            biologyRoomId

                        )

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

                }

            )



            .sort(

                (a, b) =>

                    Number(

                        a.Capacity

                    )

                    -

                    Number(

                        b.Capacity

                    )

            );



    return (

        candidates[0] ||

        null

    );

};



// ======================================================

// PARALLEL BIOLOGY + MATHEMATICS SCHEDULER

// ======================================================



const scheduleParallelBioMathTask = ({

    task,

    timeSlots,

    rooms,

    reservedEntries,

    generatedEntries,

    academicSessionId,

    rules

}) => {



    const biologyRow =

        task.biologyRow;



    const mathematicsRow =

        task.mathematicsRow;



    const usedDays =

        new Set();



    let scheduled =

        0;



    // --------------------------------------------------

    // BIOLOGY HOME ROOM

    // --------------------------------------------------



    const biologyRoom =

        rooms.find(

            room =>

                Number(

                    room.RoomId

                ) ===

                Number(

                    biologyRow.DefaultRoomId

                )

        );



    if (!biologyRoom) {

        throw new Error(

            `Biology home classroom for ${biologyRow.SectionCode} was not found or is inactive.`

        );

    }



    if (

        Number(

            biologyRoom.CampusId

        ) !==

        Number(

            biologyRow.CampusId

        )

    ) {

        throw new Error(

            `Biology classroom for ${biologyRow.SectionCode} belongs to a different campus.`

        );

    }



    if (

        Number(

            biologyRoom.Capacity

        ) <

        Number(

            biologyRow.StudentCount ||

            0

        )

    ) {

        throw new Error(

            `Biology classroom ${biologyRoom.RoomNumber} is too small for ${biologyRow.SectionCode}.`

        );

    }



    if (

        Number(

            biologyRow.TeacherId

        ) ===

        Number(

            mathematicsRow.TeacherId

        )

    ) {

        throw new Error(

            `Biology and Mathematics for ${biologyRow.SectionCode} / ${mathematicsRow.SectionCode} have the same teacher, so parallel scheduling is impossible.`

        );

    }



    // --------------------------------------------------

    // TRY SLOT

    // --------------------------------------------------



    const trySlot = slot => {



        if (

            scheduled >=

            Number(

                task.requiredHours

            )

        ) {

            return false;

        }



        const dayOfWeek =

            Number(

                slot.DayOfWeek

            );



        // Max one parallel Bio/Math class per day.

        if (

            usedDays.has(

                dayOfWeek

            )

        ) {

            return false;

        }



        const allEntries = [

            ...reservedEntries,

            ...generatedEntries

        ];



        // --------------------------------------------------

        // SECTION CONFLICTS

        // --------------------------------------------------



        if (

            hasSectionConflict(

                allEntries,

                biologyRow.SectionId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        if (

            hasSectionConflict(

                allEntries,

                mathematicsRow.SectionId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // TEACHER CONFLICTS

        // --------------------------------------------------



        if (

            hasTeacherConflict(

                allEntries,

                biologyRow.TeacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        if (

            hasTeacherConflict(

                allEntries,

                mathematicsRow.TeacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // CONFIGURABLE RULES

        // --------------------------------------------------


        if (
            !passesConfigurableRules({
                row:
                    biologyRow,

                teacherId:
                    biologyRow.TeacherId,

                subjectId:
                    biologyRow.SubjectId,

                sectionId:
                    biologyRow.SectionId,

                slot,

                allEntries,

                timeSlots,

                rules
            })
        ) {

            return false;
        }


        if (
            !passesConfigurableRules({
                row:
                    mathematicsRow,

                teacherId:
                    mathematicsRow.TeacherId,

                subjectId:
                    mathematicsRow.SubjectId,

                sectionId:
                    mathematicsRow.SectionId,

                slot,

                allEntries,

                timeSlots,

                rules
            })
        ) {

            return false;
        }



        // --------------------------------------------------

        // BIOLOGY ROOM FREE?

        // --------------------------------------------------



        if (

            hasRoomConflict(

                allEntries,

                biologyRoom.RoomId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // FIND FREE MATHEMATICS ROOM

        // --------------------------------------------------



        const arrangementRoom =

            findFreeArrangementRoom({

                rooms,

                allEntries,

                mathematicsRow,

                biologyRoomId:

                    biologyRoom.RoomId,

                timeSlotId:

                    slot.TimeSlotId

            });



        if (!arrangementRoom) {

            return false;

        }



        // --------------------------------------------------

        // BIOLOGY ENTRY

        // --------------------------------------------------



        generatedEntries.push({



            SectionSubjectId:

                Number(

                    biologyRow.SectionSubjectId

                ),



            SectionId:

                Number(

                    biologyRow.SectionId

                ),



            SubjectId:

                Number(

                    biologyRow.SubjectId

                ),



            TeacherId:

                Number(

                    biologyRow.TeacherId

                ),



            RoomId:

                Number(

                    biologyRoom.RoomId

                ),



            TimeSlotId:

                Number(

                    slot.TimeSlotId

                ),



            AcademicSessionId:

                Number(

                    academicSessionId

                ),



            ClassType:

                "Regular",



            Notes:

                `Parallel Biology/Mathematics - Biology in ${biologyRoom.RoomNumber}`



        });



        // --------------------------------------------------

        // MATHEMATICS ENTRY

        // SAME TIMESLOT

        // DYNAMIC FREE ROOM

        // --------------------------------------------------



        generatedEntries.push({



            SectionSubjectId:

                Number(

                    mathematicsRow.SectionSubjectId

                ),



            SectionId:

                Number(

                    mathematicsRow.SectionId

                ),



            SubjectId:

                Number(

                    mathematicsRow.SubjectId

                ),



            TeacherId:

                Number(

                    mathematicsRow.TeacherId

                ),



            RoomId:

                Number(

                    arrangementRoom.RoomId

                ),



            TimeSlotId:

                Number(

                    slot.TimeSlotId

                ),



            AcademicSessionId:

                Number(

                    academicSessionId

                ),



            ClassType:

                "Regular",



            Notes:

                `Parallel Biology/Mathematics - Mathematics arrangement room ${arrangementRoom.RoomNumber}`



        });



        scheduled++;



        usedDays.add(

            dayOfWeek

        );



        return true;

    };



    // --------------------------------------------------

    // SCHEDULE PAIRS

    // --------------------------------------------------



    for (

        const slot

        of timeSlots

    ) {



        if (

            scheduled >=

            Number(

                task.requiredHours

            )

        ) {

            break;

        }



        trySlot(

            slot

        );

    }



    return scheduled;

};



// ======================================================

// NORMAL / COMMON SCHEDULER

// ======================================================



const scheduleTask = ({

    task,

    timeSlots,

    rooms,

    reservedEntries,

    generatedEntries,

    academicSessionId,

    rules

}) => {



    const usedDays =

        new Set();



    let scheduled =

        0;



    const trySlot = (

        slot,

        enforceDifferentDay

    ) => {



        if (

            scheduled >=

            task.requiredHours

        ) {

            return false;

        }



        const dayOfWeek =

            Number(

                slot.DayOfWeek

            );



        if (

            enforceDifferentDay &&

            usedDays.has(

                dayOfWeek

            )

        ) {

            return false;

        }



        const allEntries = [

            ...reservedEntries,

            ...generatedEntries

        ];



        // --------------------------------------------------

        // SECTION CONFLICT

        // --------------------------------------------------



        for (

            const row

            of getDistinctTaskRows(

                task

            )

        ) {



            if (

                hasSectionConflict(

                    allEntries,

                    row.SectionId,

                    slot.TimeSlotId

                )

            ) {

                return false;

            }

        }



        // --------------------------------------------------

        // TEACHER CONFLICT

        // --------------------------------------------------



        if (

            hasTeacherConflict(

                allEntries,

                task.teacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // CONFIGURABLE RULES

        // --------------------------------------------------


        for (
            const row
            of getDistinctTaskRows(
                task
            )
        ) {

            const allowed =
                passesConfigurableRules({
                    row,

                    teacherId:
                        row.TeacherId,

                    subjectId:
                        row.SubjectId,

                    sectionId:
                        row.SectionId,

                    slot,

                    allEntries,

                    timeSlots,

                    rules
                });


            if (!allowed) {

                return false;
            }
        }



        // --------------------------------------------------

        // ROOM

        // --------------------------------------------------



        const room =

            findRoomForTask(

                rooms,

                allEntries,

                task,

                slot.TimeSlotId

            );



        if (!room) {

            return false;

        }



        // --------------------------------------------------

        // ADD ENTRIES

        // --------------------------------------------------



        for (

            const row

            of task.rows

        ) {



            generatedEntries.push({



                SectionSubjectId:

                    Number(

                        row.SectionSubjectId

                    ),



                SectionId:

                    Number(

                        row.SectionId

                    ),



                SubjectId:

                    Number(

                        row.SubjectId

                    ),



                TeacherId:

                    Number(

                        row.TeacherId

                    ),



                RoomId:

                    Number(

                        room.RoomId

                    ),



                TimeSlotId:

                    Number(

                        slot.TimeSlotId

                    ),



                AcademicSessionId:

                    Number(

                        academicSessionId

                    ),



                ClassType:

                    task.type ===

                    "Common"

                        ? "Common"

                        : "Regular",



                Notes:

                    task.type ===

                    "Common"

                        ? `Shared Teaching Group lecture - ${row.SubjectName}`

                        : `Auto generated - ${row.SubjectName}`



            });

        }



        scheduled++;



        usedDays.add(

            dayOfWeek

        );



        return true;

    };



    // --------------------------------------------------

    // PASS 1 - DIFFERENT DAYS

    // --------------------------------------------------



    for (

        const slot

        of timeSlots

    ) {



        if (

            scheduled >=

            task.requiredHours

        ) {

            break;

        }



        trySlot(

            slot,

            true

        );

    }



    // --------------------------------------------------

    // PASS 2 - SAME DAY IF REQUIRED

    // --------------------------------------------------



    if (

        scheduled <

        task.requiredHours

    ) {



        for (

            const slot

            of timeSlots

        ) {



            if (

                scheduled >=

                task.requiredHours

            ) {

                break;

            }



            trySlot(

                slot,

                false

            );

        }

    }



    return scheduled;

};



// ======================================================

// INSERT GENERATED ENTRIES

// ======================================================



const insertGeneratedEntries =

    async generatedEntries => {



        if (

            generatedEntries.length ===

            0

        ) {

            return;

        }



        const pool =

            await poolPromise;



        const transaction =

            new sql.Transaction(

                pool

            );



        try {



            await transaction.begin();



            for (

                const entry

                of generatedEntries

            ) {



                await new sql.Request(

                    transaction

                )



                    .input(

                        "SectionSubjectId",

                        sql.Int,

                        entry.SectionSubjectId

                    )



                    .input(

                        "TeacherId",

                        sql.Int,

                        entry.TeacherId

                    )



                    .input(

                        "RoomId",

                        sql.Int,

                        entry.RoomId

                    )



                    .input(

                        "TimeSlotId",

                        sql.Int,

                        entry.TimeSlotId

                    )



                    .input(

                        "AcademicSessionId",

                        sql.Int,

                        entry.AcademicSessionId

                    )



                    .input(

                        "ClassType",

                        sql.NVarChar(30),

                        entry.ClassType

                    )



                    .input(

                        "Notes",

                        sql.NVarChar(500),

                        entry.Notes ||

                        null

                    )



                    .query(`



                        INSERT INTO TimetableEntries

                        (

                            SectionSubjectId,

                            TeacherId,

                            RoomId,

                            TimeSlotId,

                            AcademicSessionId,

                            ClassType,

                            Notes,

                            CreatedAt,

                            UpdatedAt

                        )



                        VALUES

                        (

                            @SectionSubjectId,

                            @TeacherId,

                            @RoomId,

                            @TimeSlotId,

                            @AcademicSessionId,

                            @ClassType,

                            @Notes,

                            SYSDATETIME(),

                            SYSDATETIME()

                        );



                    `);

            }



            await transaction.commit();



        } catch (error) {



            try {



                await transaction.rollback();



            } catch (

                rollbackError

            ) {



                console.error(

                    "TIMETABLE ROLLBACK ERROR:",

                    rollbackError

                );

            }



            throw error;

        }

    };



// ======================================================

// VALIDATE HOME ROOMS

// ======================================================



const validateHomeRooms = (

    subjects,

    rooms

) => {



    const uniqueSections =

        new Map();



    for (

        const row

        of subjects

    ) {



        if (

            !uniqueSections.has(

                Number(

                    row.SectionId

                )

            )

        ) {



            uniqueSections.set(

                Number(

                    row.SectionId

                ),

                row

            );

        }

    }



    for (

        const row

        of uniqueSections.values()

    ) {



        if (

            !row.DefaultRoomId

        ) {



            throw new Error(

                `Please assign a classroom to section ${row.SectionCode} before generating timetable.`

            );

        }



        const room =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    Number(

                        row.DefaultRoomId

                    )

            );



        if (!room) {



            throw new Error(

                `Assigned classroom for ${row.SectionCode} does not exist or is inactive. RoomId=${row.DefaultRoomId}.`

            );

        }



        if (

            Number(

                room.CampusId

            ) !==

            Number(

                row.CampusId

            )

        ) {



            throw new Error(

                `Assigned classroom for ${row.SectionCode} belongs to a different campus.`

            );

        }



        if (

            Number(

                room.Capacity

            ) <

            Number(

                row.StudentCount ||

                0

            )

        ) {



            throw new Error(

                `Classroom ${room.RoomNumber} is too small for section ${row.SectionCode}.`

            );

        }

    }

};



// ======================================================

// VALIDATE FREE ARRANGEMENT ROOMS

//

// No hard-coded R104 / R113.

// ======================================================



const validateArrangementRooms = (

    subjects,

    rooms,

    rules = []

) => {


    const bioMathRule =
        timetableRuleService
            .getBestRule(
                rules,
                "BIO_MATH_PARALLEL",
                {}
            );


    if (!bioMathRule) {

        return;
    }


    const academicGroups =

        new Map();



    for (

        const row

        of subjects

    ) {



        const key =

            `${Number(

                row.CampusId

            )}|${Number(

                row.ClassYearId

            )}`;



        if (

            !academicGroups.has(

                key

            )

        ) {



            academicGroups.set(

                key,

                []

            );

        }



        academicGroups

            .get(key)

            .push(row);

    }



    for (

        const rows

        of academicGroups.values()

    ) {



        const biologyRow =

            rows.find(

                row =>

                    isPreMedicalSection(

                        row

                    ) &&

                    isBiologySubject(

                        row

                    )

            );



        const mathematicsRow =

            rows.find(

                row =>

                    isPreEngineeringSection(

                        row

                    ) &&

                    isMathematicsSubject(

                        row

                    )

            );



        if (

            !biologyRow ||

            !mathematicsRow

        ) {

            continue;

        }



        const campusId =

            Number(

                mathematicsRow.CampusId

            );



        const studentCount =

            Number(

                mathematicsRow.StudentCount ||

                0

            );



        const availableRooms =

            rooms.filter(

                room => {



                    if (

                        Number(

                            room.CampusId

                        ) !==

                        campusId

                    ) {

                        return false;

                    }



                    if (

                        room.AssignedSectionId !==

                        null &&

                        room.AssignedSectionId !==

                        undefined

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.Capacity

                        ) <

                        studentCount

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.RoomId

                        ) ===

                        Number(

                            biologyRow.DefaultRoomId

                        )

                    ) {

                        return false;

                    }



                    return true;

                }

            );



        if (

            availableRooms.length ===

            0

        ) {



            throw new Error(

                `No unallocated classroom with enough capacity is available on the same campus for ${mathematicsRow.SectionCode}.`

            );

        }

    }

};



// ======================================================

// GENERATE TIMETABLE

// ======================================================



const generateTimetable = async ({

    academicSessionId,

    clearExisting = true

}) => {



    academicSessionId =

        Number(

            academicSessionId

        );



    if (

        !Number.isInteger(

            academicSessionId

        ) ||

        academicSessionId <= 0

    ) {



        throw new Error(

            "Valid AcademicSessionId is required."

        );

    }



    const data =

        await getGenerationData(

            academicSessionId

        );


    const rules =
        await timetableRuleService
            .getEnabledRules();



    if (

        data.subjects.length ===

        0

    ) {



        throw new Error(

            "No active SectionSubjects found for this Academic Session."

        );

    }



    if (

        data.timeSlots.length ===

        0

    ) {



        throw new Error(

            "No active TimeSlots found."

        );

    }



    if (

        data.rooms.length ===

        0

    ) {



        throw new Error(

            "No active Rooms found."

        );

    }



    // Validate before deleting current timetable.

    validateHomeRooms(

        data.subjects,

        data.rooms

    );



    validateArrangementRooms(

        data.subjects,

        data.rooms,

        rules

    );



    let reservedEntries =

        [];



    if (

        clearExisting

    ) {



        await clearTimetable(

            academicSessionId

        );



    } else {



        reservedEntries =

            await getExistingEntries(

                academicSessionId

            );

    }



    const tasks =

        buildTasks(

            data.subjects,

            rules

        );



    const generatedEntries =

        [];



    const unscheduled =

        [];



    for (

        const task

        of tasks

    ) {



        let scheduled =

            0;



        if (

            task.type ===

            "ParallelBioMath"

        ) {



            scheduled =

                scheduleParallelBioMathTask({



                    task,



                    timeSlots:

                        data.timeSlots,



                    rooms:

                        data.rooms,



                    reservedEntries,



                    generatedEntries,



                    academicSessionId,

                    rules



                });



        } else {



            scheduled =

                scheduleTask({



                    task,



                    timeSlots:

                        data.timeSlots,



                    rooms:

                        data.rooms,



                    reservedEntries,



                    generatedEntries,



                    academicSessionId,

                    rules



                });

        }



        if (

            scheduled <

            task.requiredHours

        ) {



            unscheduled.push({



                type:

                    task.type,



                subjectId:

                    task.subjectId,



                subjectName:

                    task.type ===

                    "ParallelBioMath"

                        ? "Biology + Mathematics"

                        : task.rows[0]

                            .SubjectName,



                requiredHours:

                    task.requiredHours,



                scheduledHours:

                    scheduled,



                sectionIds:

                    task.rows.map(

                        row =>

                            row.SectionId

                    )



            });

        }

    }



    await insertGeneratedEntries(

        generatedEntries

    );



    return {



        academicSessionId,



        totalGenerated:

            generatedEntries.length,



        taskCount:

            tasks.length,



        unscheduledCount:

            unscheduled.length,



        unscheduled,


        activeRuleCount:

            rules.length,



        entries:

            generatedEntries

    };

};



// ======================================================

// GET GENERATED TIMETABLE

// ======================================================



const getGeneratedTimetable =

    async academicSessionId => {



        const pool =

            await poolPromise;



        const result =

            await pool.request()



                .input(

                    "AcademicSessionId",

                    sql.Int,

                    Number(

                        academicSessionId

                    )

                )



                .query(`



                    SELECT

                        te.TimetableEntryId,

                        te.SectionSubjectId,

                        te.TeacherId,

                        te.RoomId,

                        te.TimeSlotId,

                        te.AcademicSessionId,

                        te.ClassType,

                        te.Notes,

                        te.CreatedAt,

                        te.UpdatedAt,



                        ss.SectionId,

                        ss.SubjectId,



                        s.CampusId,

                        s.ClassYearId,

                        s.SectionCode,

                        s.SectionName,

                        s.DefaultRoomId,



                        sub.SubjectCode,

                        sub.SubjectName,



                        CONCAT

                        (

                            t.FirstName,



                            CASE

                                WHEN

                                    t.LastName IS NULL

                                    OR

                                    t.LastName = ''

                                THEN

                                    ''

                                ELSE

                                    ' ' +

                                    t.LastName

                            END

                        )

                        AS TeacherName,



                        r.RoomNumber,

                        r.RoomName,

                        r.Capacity,



                        ts.DayOfWeek,



                        CONVERT

                        (

                            VARCHAR(8),

                            ts.StartTime,

                            108

                        )

                        AS StartTime,



                        CONVERT

                        (

                            VARCHAR(8),

                            ts.EndTime,

                            108

                        )

                        AS EndTime,



                        ts.SlotName



                    FROM TimetableEntries te



                    INNER JOIN SectionSubjects ss

                        ON ss.SectionSubjectId =

                           te.SectionSubjectId



                    INNER JOIN Sections s

                        ON s.SectionId =

                           ss.SectionId



                    INNER JOIN Subjects sub

                        ON sub.SubjectId =

                           ss.SubjectId



                    INNER JOIN Teachers t

                        ON t.TeacherId =

                           te.TeacherId



                    INNER JOIN Rooms r

                        ON r.RoomId =

                           te.RoomId



                    INNER JOIN TimeSlots ts

                        ON ts.TimeSlotId =

                           te.TimeSlotId



                    WHERE

                        te.AcademicSessionId =

                        @AcademicSessionId



                    ORDER BY

                        ts.DayOfWeek,

                        ts.StartTime,

                        s.SectionCode;



                `);



        return result.recordset;

    };



// ======================================================

// DELETE GENERATED TIMETABLE

// ======================================================



const deleteGeneratedTimetable =

    async academicSessionId => {



        return clearTimetable(

            Number(

                academicSessionId

            )

        );

    };



// ======================================================

// EXPORTS

// ======================================================



module.exports = {

    generateTimetable,

    getGeneratedTimetable,

    deleteGeneratedTimetable,

    clearTimetable

};