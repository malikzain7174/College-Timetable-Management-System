const { sql, poolPromise } =
    require("../config/db");


// ============================================================
// DAY NAMES
// ============================================================

const DAYS = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday"
};


// ============================================================
// GET RAW TIMETABLE DATA
// ============================================================

const getTimetableData = async (
    academicSessionId = null
) => {

    const pool =
        await poolPromise;


    const request =
        pool.request();


    let sessionCondition = "";


    if (academicSessionId) {

        request.input(
            "AcademicSessionId",
            sql.Int,
            Number(academicSessionId)
        );


        sessionCondition = `
            AND te.AcademicSessionId =
                @AcademicSessionId
        `;
    }


    const result =
        await request.query(`

            SELECT

                te.TimetableEntryId,
                te.SectionSubjectId,
                te.TeacherId,
                te.RoomId,
                te.TimeSlotId,
                te.AcademicSessionId,
                te.ClassType,

                ss.SectionId,
                ss.SubjectId,

                s.SectionCode,
                s.SectionName,
                ISNULL(
                    s.StudentCount,
                    0
                ) AS StudentCount,

                sub.SubjectCode,
                sub.SubjectName,

                CONCAT(
                    t.FirstName,
                    CASE
                        WHEN
                            t.LastName IS NULL
                            OR t.LastName = ''
                        THEN ''
                        ELSE ' ' + t.LastName
                    END
                ) AS TeacherName,

                r.RoomNumber,
                r.RoomName,
                r.Capacity,

                ts.DayOfWeek,

                CONVERT(
                    VARCHAR(8),
                    ts.StartTime,
                    108
                ) AS StartTime,

                CONVERT(
                    VARCHAR(8),
                    ts.EndTime,
                    108
                ) AS EndTime,

                tg.TeachingGroupId

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


            OUTER APPLY
            (
                SELECT TOP 1

                    tgs.TeachingGroupId

                FROM TeachingGroupSections tgs

                WHERE
                    tgs.SectionId =
                    ss.SectionId

                ORDER BY
                    tgs.TeachingGroupSectionId
            ) tg


            WHERE 1 = 1

                ${sessionCondition}


            ORDER BY

                te.AcademicSessionId,
                ts.DayOfWeek,
                ts.StartTime,
                s.SectionCode
        `);


    return result.recordset;
};


// ============================================================
// COMMON LECTURE KEY
//
// Common lecture may have multiple timetable rows because
// every participating section has one row.
//
// We count them as ONE actual lecture when:
// teacher + room + time + subject + teaching group are same.
// ============================================================

const getLectureKey = entry => {

    const classType =
        String(
            entry.ClassType || ""
        ).toLowerCase();


    if (
        classType === "common"
    ) {

        return [
            "COMMON",
            entry.TeacherId,
            entry.RoomId,
            entry.TimeSlotId,
            entry.SubjectId,
            entry.TeachingGroupId || 0
        ].join(":");
    }


    return [
        "REGULAR",
        entry.TimetableEntryId
    ].join(":");
};


// ============================================================
// HELPER - ADD TO MAP
// ============================================================

const addToMap = (
    map,
    key,
    entry
) => {

    if (!map.has(key)) {

        map.set(
            key,
            []
        );
    }


    map.get(key)
        .push(entry);
};


// ============================================================
// GET ALL CONFLICTS
// ============================================================

const getAllConflicts = async (
    academicSessionId = null
) => {

    const entries =
        await getTimetableData(
            academicSessionId
        );


    const conflicts = [];


    // ========================================================
    // 1. TEACHER TIME CONFLICT
    // ========================================================

    const teacherTimeMap =
        new Map();


    for (const entry of entries) {

        const key =
            [
                entry.AcademicSessionId,
                entry.TeacherId,
                entry.TimeSlotId
            ].join(":");


        addToMap(
            teacherTimeMap,
            key,
            entry
        );
    }


    for (
        const group
        of teacherTimeMap.values()
    ) {

        const lectureKeys =
            new Set(
                group.map(
                    getLectureKey
                )
            );


        if (
            lectureKeys.size <= 1
        ) {
            continue;
        }


        const first =
            group[0];


        conflicts.push({

            type:
                "Teacher Conflict",

            severity:
                "HIGH",

            teacherId:
                first.TeacherId,

            teacherName:
                first.TeacherName,

            timeSlotId:
                first.TimeSlotId,

            dayOfWeek:
                first.DayOfWeek,

            dayName:
                DAYS[
                    Number(
                        first.DayOfWeek
                    )
                ] || "",

            startTime:
                first.StartTime,

            endTime:
                first.EndTime,

            conflictCount:
                lectureKeys.size,

            timetableEntryIds:
                group.map(
                    item =>
                        item.TimetableEntryId
                ),

            message:
                `${first.TeacherName} is assigned to ${lectureKeys.size} different lectures at the same time.`
        });
    }


    // ========================================================
    // 2. ROOM TIME CONFLICT
    // ========================================================

    const roomTimeMap =
        new Map();


    for (const entry of entries) {

        const key =
            [
                entry.AcademicSessionId,
                entry.RoomId,
                entry.TimeSlotId
            ].join(":");


        addToMap(
            roomTimeMap,
            key,
            entry
        );
    }


    for (
        const group
        of roomTimeMap.values()
    ) {

        const lectureKeys =
            new Set(
                group.map(
                    getLectureKey
                )
            );


        if (
            lectureKeys.size <= 1
        ) {
            continue;
        }


        const first =
            group[0];


        const roomDisplay =
            first.RoomName ||
            first.RoomNumber ||
            `Room ${first.RoomId}`;


        conflicts.push({

            type:
                "Room Conflict",

            severity:
                "HIGH",

            roomId:
                first.RoomId,

            roomName:
                roomDisplay,

            timeSlotId:
                first.TimeSlotId,

            dayOfWeek:
                first.DayOfWeek,

            dayName:
                DAYS[
                    Number(
                        first.DayOfWeek
                    )
                ] || "",

            startTime:
                first.StartTime,

            endTime:
                first.EndTime,

            conflictCount:
                lectureKeys.size,

            timetableEntryIds:
                group.map(
                    item =>
                        item.TimetableEntryId
                ),

            message:
                `${roomDisplay} is assigned to ${lectureKeys.size} different lectures at the same time.`
        });
    }


    // ========================================================
    // 3. SECTION TIME CONFLICT
    // ========================================================

    const sectionTimeMap =
        new Map();


    for (const entry of entries) {

        const key =
            [
                entry.AcademicSessionId,
                entry.SectionId,
                entry.TimeSlotId
            ].join(":");


        addToMap(
            sectionTimeMap,
            key,
            entry
        );
    }


    for (
        const group
        of sectionTimeMap.values()
    ) {

        if (
            group.length <= 1
        ) {
            continue;
        }


        const first =
            group[0];


        conflicts.push({

            type:
                "Section Conflict",

            severity:
                "HIGH",

            sectionId:
                first.SectionId,

            sectionCode:
                first.SectionCode,

            timeSlotId:
                first.TimeSlotId,

            dayOfWeek:
                first.DayOfWeek,

            dayName:
                DAYS[
                    Number(
                        first.DayOfWeek
                    )
                ] || "",

            startTime:
                first.StartTime,

            endTime:
                first.EndTime,

            conflictCount:
                group.length,

            timetableEntryIds:
                group.map(
                    item =>
                        item.TimetableEntryId
                ),

            message:
                `${first.SectionCode} has ${group.length} subjects assigned at the same time.`
        });
    }


    // ========================================================
    // 4. REGULAR ROOM CAPACITY CONFLICT
    // ========================================================

    for (const entry of entries) {

        const classType =
            String(
                entry.ClassType || ""
            ).toLowerCase();


        if (
            classType === "common"
        ) {
            continue;
        }


        const capacity =
            Number(
                entry.Capacity
            ) || 0;


        const students =
            Number(
                entry.StudentCount
            ) || 0;


        if (
            capacity >= students
        ) {
            continue;
        }


        const roomDisplay =
            entry.RoomName ||
            entry.RoomNumber ||
            `Room ${entry.RoomId}`;


        conflicts.push({

            type:
                "Room Capacity Conflict",

            severity:
                "MEDIUM",

            timetableEntryId:
                entry.TimetableEntryId,

            sectionId:
                entry.SectionId,

            sectionCode:
                entry.SectionCode,

            roomId:
                entry.RoomId,

            roomName:
                roomDisplay,

            roomCapacity:
                capacity,

            studentCount:
                students,

            timeSlotId:
                entry.TimeSlotId,

            dayOfWeek:
                entry.DayOfWeek,

            startTime:
                entry.StartTime,

            endTime:
                entry.EndTime,

            message:
                `${roomDisplay} capacity is ${capacity}, but ${entry.SectionCode} has ${students} students.`
        });
    }


    // ========================================================
    // 5. COMMON LECTURE CAPACITY
    // ========================================================

    const commonMap =
        new Map();


    for (const entry of entries) {

        const classType =
            String(
                entry.ClassType || ""
            ).toLowerCase();


        if (
            classType !== "common"
        ) {
            continue;
        }


        const key =
            getLectureKey(
                entry
            );


        addToMap(
            commonMap,
            key,
            entry
        );
    }


    for (
        const group
        of commonMap.values()
    ) {

        if (
            group.length === 0
        ) {
            continue;
        }


        const first =
            group[0];


        const uniqueSections =
            new Map();


        for (const item of group) {

            if (
                !uniqueSections.has(
                    item.SectionId
                )
            ) {

                uniqueSections.set(
                    item.SectionId,
                    Number(
                        item.StudentCount
                    ) || 0
                );
            }
        }


        let totalStudents = 0;


        for (
            const studentCount
            of uniqueSections.values()
        ) {

            totalStudents +=
                studentCount;
        }


        const capacity =
            Number(
                first.Capacity
            ) || 0;


        if (
            capacity >= totalStudents
        ) {
            continue;
        }


        const roomDisplay =
            first.RoomName ||
            first.RoomNumber ||
            `Room ${first.RoomId}`;


        conflicts.push({

            type:
                "Common Room Capacity Conflict",

            severity:
                "HIGH",

            roomId:
                first.RoomId,

            roomName:
                roomDisplay,

            teacherId:
                first.TeacherId,

            teacherName:
                first.TeacherName,

            subjectId:
                first.SubjectId,

            subjectName:
                first.SubjectName,

            teachingGroupId:
                first.TeachingGroupId,

            timeSlotId:
                first.TimeSlotId,

            dayOfWeek:
                first.DayOfWeek,

            startTime:
                first.StartTime,

            endTime:
                first.EndTime,

            roomCapacity:
                capacity,

            studentCount:
                totalStudents,

            timetableEntryIds:
                group.map(
                    item =>
                        item.TimetableEntryId
                ),

            message:
                `Common ${first.SubjectName} lecture has ${totalStudents} students, but ${roomDisplay} capacity is ${capacity}.`
        });
    }


    // ========================================================
    // 6. TEACHER DAILY LOAD
    //
    // Maximum 5 actual lectures per day.
    // Common lecture counts only once.
    // ========================================================

    const teacherDayMap =
        new Map();


    for (const entry of entries) {

        const key =
            [
                entry.AcademicSessionId,
                entry.TeacherId,
                entry.DayOfWeek
            ].join(":");


        addToMap(
            teacherDayMap,
            key,
            entry
        );
    }


    for (
        const group
        of teacherDayMap.values()
    ) {

        if (
            group.length === 0
        ) {
            continue;
        }


        const lectures =
            new Map();


        for (const entry of group) {

            const lectureKey =
                getLectureKey(
                    entry
                );


            if (
                !lectures.has(
                    lectureKey
                )
            ) {

                lectures.set(
                    lectureKey,
                    entry
                );
            }
        }


        const lectureCount =
            lectures.size;


        if (
            lectureCount <= 5
        ) {
            continue;
        }


        const first =
            group[0];


        conflicts.push({

            type:
                "Teacher Daily Load Conflict",

            severity:
                "MEDIUM",

            teacherId:
                first.TeacherId,

            teacherName:
                first.TeacherName,

            dayOfWeek:
                first.DayOfWeek,

            dayName:
                DAYS[
                    Number(
                        first.DayOfWeek
                    )
                ] || "",

            lectureCount,

            maximumAllowed:
                5,

            timetableEntryIds:
                [
                    ...lectures.values()
                ].map(
                    item =>
                        item.TimetableEntryId
                ),

            message:
                `${first.TeacherName} has ${lectureCount} lectures on ${DAYS[Number(first.DayOfWeek)] || "this day"}. Maximum allowed is 5.`
        });
    }


    return conflicts;
};


// ============================================================
// GET SUMMARY
// ============================================================

const getConflictSummary = async (
    academicSessionId = null
) => {

    const conflicts =
        await getAllConflicts(
            academicSessionId
        );


    const countType =
        type =>
            conflicts.filter(
                item =>
                    item.type === type
            ).length;


    return {

        academicSessionId,

        totalConflicts:
            conflicts.length,

        teacherConflicts:
            countType(
                "Teacher Conflict"
            ),

        roomConflicts:
            countType(
                "Room Conflict"
            ),

        sectionConflicts:
            countType(
                "Section Conflict"
            ),

        roomCapacityConflicts:

            countType(
                "Room Capacity Conflict"
            ) +

            countType(
                "Common Room Capacity Conflict"
            ),

        teacherDailyLoadConflicts:
            countType(
                "Teacher Daily Load Conflict"
            ),

        highSeverity:
            conflicts.filter(
                item =>
                    item.severity ===
                    "HIGH"
            ).length,

        mediumSeverity:
            conflicts.filter(
                item =>
                    item.severity ===
                    "MEDIUM"
            ).length,

        isValid:
            conflicts.length === 0
    };
};


// ============================================================
// VALIDATE TIMETABLE
// ============================================================

const validateTimetable = async (
    academicSessionId
) => {

    const conflicts =
        await getAllConflicts(
            academicSessionId
        );


    return {

        academicSessionId:

            Number(
                academicSessionId
            ),

        isValid:
            conflicts.length === 0,

        totalConflicts:
            conflicts.length,

        conflicts
    };
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    getAllConflicts,

    getConflictSummary,

    validateTimetable
};