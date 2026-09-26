const { sql, poolPromise } =
    require("../config/db");


// ======================================================
// COMMON SELECT
// ======================================================

const timetableSelect = `
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
        s.SectionCode,
        s.SectionName,
        s.StudentCount,

        sub.SubjectCode,
        sub.SubjectName,

        CONCAT(
            t.FirstName,
            CASE
                WHEN t.LastName IS NULL
                     OR t.LastName = ''
                THEN ''
                ELSE ' ' + t.LastName
            END
        ) AS TeacherName,

        r.RoomNumber,
        r.RoomName,
        r.RoomType,
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

        ts.SlotName

    FROM TimetableEntries te

    INNER JOIN SectionSubjects ss
        ON te.SectionSubjectId =
           ss.SectionSubjectId

    INNER JOIN Sections s
        ON ss.SectionId =
           s.SectionId

    INNER JOIN Subjects sub
        ON ss.SubjectId =
           sub.SubjectId

    INNER JOIN Teachers t
        ON te.TeacherId =
           t.TeacherId

    INNER JOIN Rooms r
        ON te.RoomId =
           r.RoomId

    INNER JOIN TimeSlots ts
        ON te.TimeSlotId =
           ts.TimeSlotId
`;


// ======================================================
// GET ALL
// ======================================================

const getAllTimetableEntries = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request().query(`

            ${timetableSelect}

            ORDER BY
                te.AcademicSessionId,
                ts.DayOfWeek,
                ts.StartTime,
                s.SectionCode
        `);


    return result.recordset;
};


// ======================================================
// GET BY SESSION
// ======================================================

const getTimetableEntriesBySession =
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

                    ${timetableSelect}

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
// GET BY ID
// ======================================================

const getTimetableEntryById =
    async (id) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TimetableEntryId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    ${timetableSelect}

                    WHERE
                        te.TimetableEntryId =
                        @TimetableEntryId
                `);


        return result.recordset[0];
    };


// ======================================================
// SECTION SUBJECT DETAILS
// ======================================================

const getSectionSubjectDetails =
    async (id) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SectionSubjectId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    SELECT
                        ss.SectionSubjectId,
                        ss.SectionId,
                        ss.SubjectId,
                        ss.TeacherId,
                        ss.IsActive,

                        s.CampusId,
                        s.AcademicSessionId,
                        s.StudentCount,
                        s.IsActive
                            AS SectionIsActive,

                        sub.SubjectCode,
                        sub.SubjectName

                    FROM SectionSubjects ss

                    INNER JOIN Sections s
                        ON ss.SectionId =
                           s.SectionId

                    INNER JOIN Subjects sub
                        ON ss.SubjectId =
                           sub.SubjectId

                    WHERE
                        ss.SectionSubjectId =
                        @SectionSubjectId
                `);


        return result.recordset[0];
    };


// ======================================================
// ROOM BY ID
// ======================================================

const getRoomById =
    async (id) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "RoomId",
                    sql.Int,
                    Number(id)
                )

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
                        RoomId =
                        @RoomId
                `);


        return result.recordset[0];
    };


// ======================================================
// TIME SLOT BY ID
// ======================================================

const getTimeSlotById =
    async (id) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TimeSlotId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    SELECT
                        TimeSlotId,
                        DayOfWeek,
                        StartTime,
                        EndTime,
                        SlotName,
                        IsActive

                    FROM TimeSlots

                    WHERE
                        TimeSlotId =
                        @TimeSlotId
                `);


        return result.recordset[0];
    };


// ======================================================
// CONFLICT CHECK
// ======================================================

const checkConflicts =
    async ({
        timetableEntryId = null,
        sectionId,
        sectionSubjectId,
        teacherId,
        roomId,
        timeSlotId,
        academicSessionId
    }) => {

        const pool =
            await poolPromise;


        const slotResult =
            await pool.request()

                .input(
                    "TimeSlotId",
                    sql.Int,
                    Number(timeSlotId)
                )

                .query(`

                    SELECT
                        TimeSlotId,
                        DayOfWeek

                    FROM TimeSlots

                    WHERE
                        TimeSlotId =
                        @TimeSlotId
                `);


        const selectedSlot =
            slotResult.recordset[0];


        if (!selectedSlot) {

            return [
                {
                    ConflictType:
                        "Invalid Time Slot"
                }
            ];
        }


        const request =
            pool.request()

                .input(
                    "SectionId",
                    sql.Int,
                    Number(sectionId)
                )

                .input(
                    "SectionSubjectId",
                    sql.Int,
                    Number(sectionSubjectId)
                )

                .input(
                    "TeacherId",
                    sql.Int,
                    Number(teacherId)
                )

                .input(
                    "RoomId",
                    sql.Int,
                    Number(roomId)
                )

                .input(
                    "TimeSlotId",
                    sql.Int,
                    Number(timeSlotId)
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        academicSessionId
                    )
                );


        let excludeClause = "";


        if (
            timetableEntryId !== null
        ) {

            request.input(
                "TimetableEntryId",
                sql.Int,
                Number(
                    timetableEntryId
                )
            );


            excludeClause = `
                AND te.TimetableEntryId
                    <> @TimetableEntryId
            `;
        }


        const result =
            await request.query(`

                SELECT
                    'Teacher'
                        AS ConflictType,

                    te.TimetableEntryId

                FROM TimetableEntries te

                WHERE
                    te.TeacherId =
                        @TeacherId

                    AND te.TimeSlotId =
                        @TimeSlotId

                    AND te.AcademicSessionId =
                        @AcademicSessionId

                    ${excludeClause}


                UNION ALL


                SELECT
                    'Room'
                        AS ConflictType,

                    te.TimetableEntryId

                FROM TimetableEntries te

                WHERE
                    te.RoomId =
                        @RoomId

                    AND te.TimeSlotId =
                        @TimeSlotId

                    AND te.AcademicSessionId =
                        @AcademicSessionId

                    ${excludeClause}


                UNION ALL


                SELECT
                    'Section'
                        AS ConflictType,

                    te.TimetableEntryId

                FROM TimetableEntries te

                INNER JOIN SectionSubjects otherSS
                    ON otherSS.SectionSubjectId =
                       te.SectionSubjectId

                WHERE
                    otherSS.SectionId =
                        @SectionId

                    AND te.TimeSlotId =
                        @TimeSlotId

                    AND te.AcademicSessionId =
                        @AcademicSessionId

                    ${excludeClause}


                UNION ALL


                SELECT
                    'Duplicate'
                        AS ConflictType,

                    te.TimetableEntryId

                FROM TimetableEntries te

                WHERE
                    te.SectionSubjectId =
                        @SectionSubjectId

                    AND te.TimeSlotId =
                        @TimeSlotId

                    AND te.AcademicSessionId =
                        @AcademicSessionId

                    ${excludeClause}
            `);


        const conflicts =
            [
                ...result.recordset
            ];


        // ==================================================
        // TEACHER DAILY LIMIT
        // Maximum 5 lectures per day
        // ==================================================

        const dailyRequest =
            pool.request()

                .input(
                    "TeacherId",
                    sql.Int,
                    Number(teacherId)
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        academicSessionId
                    )
                )

                .input(
                    "DayOfWeek",
                    sql.Int,
                    Number(
                        selectedSlot
                            .DayOfWeek
                    )
                );


        let dailyExclude = "";


        if (
            timetableEntryId !== null
        ) {

            dailyRequest.input(
                "TimetableEntryId",
                sql.Int,
                Number(
                    timetableEntryId
                )
            );


            dailyExclude = `
                AND te.TimetableEntryId
                    <> @TimetableEntryId
            `;
        }


        const dailyResult =
            await dailyRequest.query(`

                SELECT

                    COUNT(*)
                        AS LectureCount

                FROM TimetableEntries te

                INNER JOIN TimeSlots ts
                    ON ts.TimeSlotId =
                       te.TimeSlotId

                WHERE

                    te.TeacherId =
                        @TeacherId

                    AND te.AcademicSessionId =
                        @AcademicSessionId

                    AND ts.DayOfWeek =
                        @DayOfWeek

                    ${dailyExclude}
            `);


        const lectureCount =
            Number(
                dailyResult
                    .recordset[0]
                    ?.LectureCount || 0
            );


        if (
            lectureCount >= 5
        ) {

            conflicts.push({

                ConflictType:
                    "Teacher Daily Limit",

                LectureCount:
                    lectureCount,

                MaximumAllowed:
                    5
            });
        }


        return conflicts;
    };


// ======================================================
// CREATE
// ======================================================

const createTimetableEntry =
    async (data) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SectionSubjectId",
                    sql.Int,
                    data.SectionSubjectId
                )

                .input(
                    "TeacherId",
                    sql.Int,
                    data.TeacherId
                )

                .input(
                    "RoomId",
                    sql.Int,
                    data.RoomId
                )

                .input(
                    "TimeSlotId",
                    sql.Int,
                    data.TimeSlotId
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    data.AcademicSessionId
                )

                .input(
                    "ClassType",
                    sql.NVarChar(30),
                    data.ClassType
                )

                .input(
                    "Notes",
                    sql.NVarChar(500),
                    data.Notes || null
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

                    OUTPUT
                        INSERTED.TimetableEntryId

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


        return result.recordset[0];
    };


// ======================================================
// UPDATE
// ======================================================

const updateTimetableEntry =
    async (
        id,
        data
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TimetableEntryId",
                    sql.Int,
                    Number(id)
                )

                .input(
                    "SectionSubjectId",
                    sql.Int,
                    data.SectionSubjectId
                )

                .input(
                    "TeacherId",
                    sql.Int,
                    data.TeacherId
                )

                .input(
                    "RoomId",
                    sql.Int,
                    data.RoomId
                )

                .input(
                    "TimeSlotId",
                    sql.Int,
                    data.TimeSlotId
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    data.AcademicSessionId
                )

                .input(
                    "ClassType",
                    sql.NVarChar(30),
                    data.ClassType
                )

                .input(
                    "Notes",
                    sql.NVarChar(500),
                    data.Notes || null
                )

                .query(`

                    UPDATE TimetableEntries

                    SET
                        SectionSubjectId =
                            @SectionSubjectId,

                        TeacherId =
                            @TeacherId,

                        RoomId =
                            @RoomId,

                        TimeSlotId =
                            @TimeSlotId,

                        AcademicSessionId =
                            @AcademicSessionId,

                        ClassType =
                            @ClassType,

                        Notes =
                            @Notes,

                        UpdatedAt =
                            SYSDATETIME()

                    WHERE
                        TimetableEntryId =
                        @TimetableEntryId
                `);


        return (
            result.rowsAffected[0] ||
            0
        );
    };


// ======================================================
// DELETE
// ======================================================

const deleteTimetableEntry =
    async (id) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TimetableEntryId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    DELETE
                    FROM TimetableEntries

                    WHERE
                        TimetableEntryId =
                        @TimetableEntryId
                `);


        return (
            result.rowsAffected[0] ||
            0
        );
    };


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getAllTimetableEntries,

    getTimetableEntriesBySession,

    getTimetableEntryById,

    getSectionSubjectDetails,

    getRoomById,

    getTimeSlotById,

    checkConflicts,

    createTimetableEntry,

    updateTimetableEntry,

    deleteTimetableEntry
};