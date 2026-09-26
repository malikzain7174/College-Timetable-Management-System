const {
    sql,
    poolPromise
} = require("../config/db");


// ======================================================
// GET GENERATION DATA
// ======================================================

const getGenerationData =
    async (
        academicSessionId
    ) => {

        const pool =
            await poolPromise;


        const subjectResult =
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

                        ON s.SectionId =
                           ss.SectionId

                    INNER JOIN Subjects sub

                        ON sub.SubjectId =
                           ss.SubjectId

                    OUTER APPLY
                    (
                        SELECT TOP 1
                            tgs.TeachingGroupId

                        FROM TeachingGroupSections tgs

                        INNER JOIN TeachingGroups tg

                            ON tg.TeachingGroupId =
                               tgs.TeachingGroupId

                        WHERE
                            tgs.SectionId =
                            ss.SectionId

                            AND

                            tg.IsActive = 1

                            AND

                            tg.CampusId =
                            s.CampusId

                            AND

                            tg.AcademicSessionId =
                            s.AcademicSessionId

                            AND

                            tg.ClassYearId =
                            s.ClassYearId

                        ORDER BY
                            tgs.TeachingGroupId

                    ) grp

                    WHERE
                        s.AcademicSessionId =
                        @AcademicSessionId

                        AND

                        ss.IsActive = 1

                        AND

                        s.IsActive = 1

                    ORDER BY
                        ss.SectionSubjectId
                `);


        const timeSlotResult =
            await pool.request()
                .query(`

                    SELECT
                        TimeSlotId,
                        DayOfWeek,
                        StartTime,
                        EndTime,
                        SlotName

                    FROM TimeSlots

                    WHERE
                        IsActive = 1

                    ORDER BY
                        DayOfWeek,
                        StartTime
                `);


        const roomResult =
            await pool.request()
                .query(`

                    SELECT
                        RoomId,
                        CampusId,
                        RoomNumber,
                        RoomName,
                        RoomType,
                        Capacity,
                        IsLab,
                        IsActive

                    FROM Rooms

                    WHERE
                        IsActive = 1

                    ORDER BY
                        CampusId,
                        RoomNumber
                `);


        return {

            subjects:
                subjectResult.recordset,

            timeSlots:
                timeSlotResult.recordset,

            rooms:
                roomResult.recordset
        };
    };


// ======================================================
// EXISTING ENTRIES
// ======================================================

const getExistingEntries =
    async (
        academicSessionId
    ) => {

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
                        te.TeacherId,
                        te.RoomId,
                        te.TimeSlotId,

                        ss.SectionId,
                        ss.SubjectId

                    FROM TimetableEntries te

                    INNER JOIN SectionSubjects ss

                        ON ss.SectionSubjectId =
                           te.SectionSubjectId

                    WHERE
                        te.AcademicSessionId =
                        @AcademicSessionId
                `);


        return result.recordset;
    };


// ======================================================
// CLEAR TIMETABLE
// ======================================================

const clearTimetable =
    async (
        academicSessionId
    ) => {

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

                    DELETE
                    FROM TimetableEntries

                    WHERE
                        AcademicSessionId =
                        @AcademicSessionId
                `);


        return {

            deletedRows:
                result.rowsAffected[0] ||
                0
        };
    };


// ======================================================
// CONFLICT HELPERS
// ======================================================

const hasSectionConflict = (
    entries,
    sectionId,
    timeSlotId
) => {

    return entries.some(
        entry =>

            Number(
                entry.SectionId
            ) ===
            Number(
                sectionId
            )

            &&

            Number(
                entry.TimeSlotId
            ) ===
            Number(
                timeSlotId
            )
    );
};


const hasTeacherConflict = (
    entries,
    teacherId,
    timeSlotId
) => {

    return entries.some(
        entry =>

            Number(
                entry.TeacherId
            ) ===
            Number(
                teacherId
            )

            &&

            Number(
                entry.TimeSlotId
            ) ===
            Number(
                timeSlotId
            )
    );
};


const hasRoomConflict = (
    entries,
    roomId,
    timeSlotId
) => {

    return entries.some(
        entry =>

            Number(
                entry.RoomId
            ) ===
            Number(
                roomId
            )

            &&

            Number(
                entry.TimeSlotId
            ) ===
            Number(
                timeSlotId
            )
    );
};


// ======================================================
// TEACHER DAILY LOAD
//
// Max 5 lecture slots per day.
// Common lecture has several DB rows but is ONE slot.
// ======================================================

const getTeacherDailyLectureCount = (
    entries,
    teacherId,
    dayOfWeek,
    timeSlots
) => {

    const slotDays =
        new Map(

            timeSlots.map(
                slot => [

                    Number(
                        slot.TimeSlotId
                    ),

                    Number(
                        slot.DayOfWeek
                    )
                ]
            )
        );


    const uniqueSlots =
        new Set();


    for (
        const entry
        of entries
    ) {

        if (
            Number(
                entry.TeacherId
            ) !==
            Number(
                teacherId
            )
        ) {

            continue;
        }


        const entryDay =
            slotDays.get(

                Number(
                    entry.TimeSlotId
                )
            );


        if (
            entryDay ===
            Number(
                dayOfWeek
            )
        ) {

            uniqueSlots.add(

                Number(
                    entry.TimeSlotId
                )
            );
        }
    }


    return uniqueSlots.size;
};


// ======================================================
// PRACTICAL / LAB
// ======================================================

const requiresLab =
    row => {

        if (
            row.IsPractical
        ) {

            return true;
        }


        const text =
            `${row.SubjectCode || ""} ${row.SubjectName || ""}`
                .toLowerCase();


        return (

            text.includes(
                "lab"
            )

            ||

            text.includes(
                "computer"
            )
        );
    };


// ======================================================
// DISTINCT TASK SECTION ROWS
// ======================================================

const getDistinctTaskRows =
    task => {

        return [

            ...new Map(

                task.rows.map(
                    row => [

                        Number(
                            row.SectionId
                        ),

                        row
                    ]
                )

            ).values()
        ];
    };


// ======================================================
// TASK CAPACITY
// ======================================================

const getTaskCapacity =
    task => {

        const distinctRows =
            getDistinctTaskRows(
                task
            );


        if (
            task.type ===
            "Common"
        ) {

            return distinctRows.reduce(
                (
                    total,
                    row
                ) =>

                    total +
                    Number(
                        row.StudentCount ||
                        0
                    ),

                0
            );
        }


        return Number(
            distinctRows[0]
                ?.StudentCount ||
            0
        );
    };


// ======================================================
// BUILD TASKS
// ======================================================

const buildTasks =
    subjects => {

        const tasks =
            [];


        const consumed =
            new Set();


        const groups =
            new Map();


        // ==============================================
        // COLLECT ROWS BY TEACHING GROUP
        // ==============================================

        for (
            const row
            of subjects
        ) {

            if (
                !row.TeachingGroupId
            ) {

                continue;
            }


            const groupId =
                Number(
                    row.TeachingGroupId
                );


            if (
                !groups.has(
                    groupId
                )
            ) {

                groups.set(
                    groupId,
                    []
                );
            }


            groups
                .get(
                    groupId
                )
                .push(
                    row
                );
        }


        // ==============================================
        // BUILD COMMON SUBJECT TASKS
        // ==============================================

        for (
            const [
                teachingGroupId,
                rows
            ]
            of groups
        ) {

            const groupSectionIds =
                [

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


            for (
                const row
                of rows
            ) {

                const subjectId =
                    Number(
                        row.SubjectId
                    );


                if (
                    !bySubject.has(
                        subjectId
                    )
                ) {

                    bySubject.set(
                        subjectId,
                        []
                    );
                }


                bySubject
                    .get(
                        subjectId
                    )
                    .push(
                        row
                    );
            }


            for (
                const [
                    subjectId,
                    subjectRows
                ]
                of bySubject
            ) {

                const subjectSectionIds =
                    [

                        ...new Set(

                            subjectRows.map(
                                row =>
                                    Number(
                                        row.SectionId
                                    )
                            )
                        )
                    ];


                // Subject must exist in all group members.
                if (
                    subjectSectionIds.length !==
                    groupSectionIds.length
                ) {

                    continue;
                }


                if (
                    subjectRows.length <
                    2
                ) {

                    continue;
                }


                const teacherIds =
                    [

                        ...new Set(

                            subjectRows.map(
                                row =>
                                    Number(
                                        row.TeacherId
                                    )
                            )
                        )
                    ];


                const weeklyHours =
                    [

                        ...new Set(

                            subjectRows.map(
                                row =>
                                    Number(
                                        row.WeeklyHours
                                    )
                            )
                        )
                    ];


                // Same common class only if
                // teacher and weekly hours match.
                if (
                    teacherIds.length !== 1

                    ||

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


                subjectRows.forEach(
                    row =>

                        consumed.add(

                            Number(
                                row.SectionSubjectId
                            )
                        )
                );
            }
        }


        // ==============================================
        // REGULAR TASKS
        // ==============================================

        for (
            const row
            of subjects
        ) {

            if (
                consumed.has(

                    Number(
                        row.SectionSubjectId
                    )
                )
            ) {

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
                    Number(
                        row.WeeklyHours
                    ) ||
                    0
            });
        }


        // Common first.
        tasks.sort(
            (
                a,
                b
            ) => {

                if (
                    a.type !==
                    b.type
                ) {

                    return (
                        a.type ===
                        "Common"

                            ? -1

                            : 1
                    );
                }


                return (

                    b.requiredHours -

                    a.requiredHours
                );
            }
        );


        return tasks;
    };


// ======================================================
// FIND ROOM
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


    // ==================================================
    // REGULAR THEORY
    //
    // Always use assigned home classroom.
    // ==================================================

    if (
        task.type ===
        "Regular"

        &&

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


        // If Medical and Engineering share room,
        // separate lectures cannot occur at same time.
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


    // ==================================================
    // REGULAR PRACTICAL
    //
    // Assigned room if it is a lab.
    // Otherwise find free lab.
    // ==================================================

    if (
        task.type ===
        "Regular"

        &&

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
            assignedRoom

            &&

            assignedRoom.IsLab

            &&

            Number(
                assignedRoom.CampusId
            ) ===
            campusId

            &&

            Number(
                assignedRoom.Capacity
            ) >=
            requiredCapacity

            &&

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
                room => {

                    if (
                        Number(
                            room.CampusId
                        ) !==
                        campusId
                    ) {

                        return false;
                    }


                    if (!room.IsLab) {

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
    }


    // ==================================================
    // COMMON / TEACHING GROUP
    //
    // Medical + Engineering scenario:
    //
    // If every participating section has SAME
    // DefaultRoomId, that room is compulsory.
    // ==================================================

    const assignedRoomIds =
        [

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
                            )

                            &&

                            roomId > 0
                    )
            )
        ];


    // ==================================================
    // SAME PHYSICAL CLASSROOM
    // ==================================================

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


        if (!sharedRoom) {

            return null;
        }


        if (
            Number(
                sharedRoom.CampusId
            ) !==
            campusId
        ) {

            return null;
        }


        if (
            Number(
                sharedRoom.Capacity
            ) <
            requiredCapacity
        ) {

            return null;
        }


        // Common theory:
        // must remain in shared classroom.
        if (!needsLab) {

            if (
                hasRoomConflict(

                    existingEntries,

                    sharedRoom.RoomId,

                    timeSlotId
                )
            ) {

                return null;
            }


            return sharedRoom;
        }


        // Common practical:
        // same assigned room only if lab.
        if (
            sharedRoom.IsLab

            &&

            !hasRoomConflict(

                existingEntries,

                sharedRoom.RoomId,

                timeSlotId
            )
        ) {

            return sharedRoom;
        }


        // Practical can go to lab.
        return (

            rooms.find(
                room =>

                    Number(
                        room.CampusId
                    ) ===
                    campusId

                    &&

                    room.IsLab

                    &&

                    Number(
                        room.Capacity
                    ) >=
                    requiredCapacity

                    &&

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


    // ==================================================
    // GROUP MEMBERS HAVE DIFFERENT HOME ROOMS
    //
    // This means they share only some common lectures,
    // but are not configured as one physical classroom.
    //
    // Find a suitable common room.
    // ==================================================

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
// SCHEDULE TASK
// ======================================================

const scheduleTask = ({

    task,
    timeSlots,
    rooms,
    reservedEntries,
    generatedEntries,
    academicSessionId

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
            enforceDifferentDay

            &&

            usedDays.has(
                dayOfWeek
            )
        ) {

            return false;
        }


        const allEntries =
            [

                ...reservedEntries,

                ...generatedEntries
            ];


        // ==================================================
        // SECTION CONFLICT
        // ==================================================

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


        // ==================================================
        // TEACHER SAME TIME
        // ==================================================

        if (
            hasTeacherConflict(

                allEntries,

                task.teacherId,

                slot.TimeSlotId
            )
        ) {

            return false;
        }


        // ==================================================
        // TEACHER DAILY MAX 5
        // ==================================================

        if (
            getTeacherDailyLectureCount(

                allEntries,

                task.teacherId,

                dayOfWeek,

                timeSlots
            ) >=
            5
        ) {

            return false;
        }


        // ==================================================
        // ROOM
        // ==================================================

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


        // ==================================================
        // ADD ENTRIES
        // ==================================================

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


    // ==================================================
    // PASS 1:
    // Prefer separate days
    // ==================================================

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


    // ==================================================
    // PASS 2:
    // Allow same day if necessary
    // ==================================================

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
    async (
        generatedEntries
    ) => {

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
                        entry.Notes
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
// VALIDATE HOME ROOMS BEFORE GENERATION
// ======================================================

const validateHomeRooms =
    (
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

                    `Assigned classroom for ${row.SectionCode} does not exist or is inactive.`
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
// GENERATE TIMETABLE
// ======================================================

const generateTimetable =
    async ({

        academicSessionId,

        clearExisting =
            true

    }) => {

        academicSessionId =
            Number(
                academicSessionId
            );


        if (
            !Number.isInteger(
                academicSessionId
            )

            ||

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


        // Validate BEFORE deleting existing timetable.
        validateHomeRooms(
            data.subjects,
            data.rooms
        );


        let reservedEntries =
            [];


        if (clearExisting) {

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
                data.subjects
            );


        const generatedEntries =
            [];


        const unscheduled =
            [];


        for (
            const task
            of tasks
        ) {

            const scheduled =
                scheduleTask({

                    task,

                    timeSlots:
                        data.timeSlots,

                    rooms:
                        data.rooms,

                    reservedEntries,

                    generatedEntries,

                    academicSessionId
                });


            if (
                scheduled <
                task.requiredHours
            ) {

                unscheduled.push({

                    type:
                        task.type,

                    teachingGroupId:
                        task.teachingGroupId ||
                        null,

                    subjectId:
                        task.subjectId,

                    subjectName:
                        task.rows[0]
                            .SubjectName,

                    requiredHours:
                        task.requiredHours,

                    scheduledHours:
                        scheduled,

                    sectionIds:
                        getDistinctTaskRows(
                            task
                        )
                            .map(
                                row =>
                                    Number(
                                        row.SectionId
                                    )
                            ),

                    sectionCodes:
                        getDistinctTaskRows(
                            task
                        )
                            .map(
                                row =>
                                    row.SectionCode
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

            entries:
                generatedEntries
        };
    };


// ======================================================
// GET GENERATED TIMETABLE
// ======================================================

const getGeneratedTimetable =
    async (
        academicSessionId
    ) => {

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

                        s.SectionCode,
                        s.SectionName,

                        sub.SubjectCode,
                        sub.SubjectName,

                        CONCAT
                        (
                            t.FirstName,

                            CASE

                                WHEN
                                    t.LastName
                                    IS NULL

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
                        s.SectionCode
                `);


        return result.recordset;
    };


// ======================================================
// DELETE GENERATED TIMETABLE
// ======================================================

const deleteGeneratedTimetable =
    async (
        academicSessionId
    ) => {

        return clearTimetable(

            Number(
                academicSessionId
            )
        );
    };


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    generateTimetable,

    getGeneratedTimetable,

    deleteGeneratedTimetable,

    clearTimetable
};