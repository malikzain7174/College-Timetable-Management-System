const {
    sql,
    poolPromise
} = require("../config/db");


// ======================================================
// COMMON SECTION SELECT
// ======================================================

const sectionSelect = `
    SELECT
        s.SectionId,
        s.CampusId,
        s.AcademicSessionId,
        s.ClassYearId,
        s.ProgramId,
        s.DefaultRoomId,

        s.SectionName,
        s.SectionCode,
        s.StudentCount,
        s.IsActive,
        s.CreatedAt,

        c.CampusName,
        c.CampusCode,

        a.SessionName,

        cy.YearName,
        cy.YearNumber,

        p.ProgramName,
        p.ProgramCode,

        r.RoomNumber AS DefaultRoomNumber,
        r.RoomName AS DefaultRoomName,
        r.RoomType AS DefaultRoomType,
        r.Capacity AS DefaultRoomCapacity,
        r.IsLab AS DefaultRoomIsLab

    FROM Sections s

    INNER JOIN Campuses c
        ON c.CampusId =
           s.CampusId

    INNER JOIN AcademicSessions a
        ON a.AcademicSessionId =
           s.AcademicSessionId

    INNER JOIN ClassYears cy
        ON cy.ClassYearId =
           s.ClassYearId

    INNER JOIN Programs p
        ON p.ProgramId =
           s.ProgramId

    LEFT JOIN Rooms r
        ON r.RoomId =
           s.DefaultRoomId
`;


// ======================================================
// GET ALL SECTIONS
// ======================================================

const getAllSections = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()
            .query(`

                ${sectionSelect}

                ORDER BY
                    c.CampusName,
                    a.SessionName,
                    cy.YearNumber,
                    p.ProgramName,
                    s.SectionName
            `);


    return result.recordset;
};


// ======================================================
// GET SECTION BY ID
// ======================================================

const getSectionById = async (
    id
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "SectionId",
                sql.Int,
                Number(id)
            )

            .query(`

                ${sectionSelect}

                WHERE
                    s.SectionId =
                    @SectionId
            `);


    return result.recordset[0];
};


// ======================================================
// LOOKUPS
// ======================================================

const getSectionLookups =
    async () => {

        const pool =
            await poolPromise;


        const [
            campusesResult,
            sessionsResult,
            classYearsResult,
            programsResult,
            roomsResult
        ] =
            await Promise.all([


                // ==========================================
                // CAMPUSES
                // ==========================================

                pool.request().query(`

                    SELECT
                        CampusId,
                        CampusName,
                        CampusCode,
                        Location,
                        IsActive

                    FROM Campuses

                    WHERE
                        IsActive = 1

                    ORDER BY
                        CampusName
                `),


                // ==========================================
                // ACADEMIC SESSIONS
                // ==========================================

                pool.request().query(`

                    SELECT
                        AcademicSessionId,
                        SessionName,
                        StartDate,
                        EndDate,
                        IsCurrent

                    FROM AcademicSessions

                    ORDER BY
                        IsCurrent DESC,
                        StartDate DESC,
                        SessionName
                `),


                // ==========================================
                // CLASS YEARS
                // ==========================================

                pool.request().query(`

                    SELECT
                        ClassYearId,
                        YearName,
                        YearNumber

                    FROM ClassYears

                    ORDER BY
                        YearNumber,
                        YearName
                `),


                // ==========================================
                // PROGRAMS
                // ==========================================

                pool.request().query(`

                    SELECT
                        ProgramId,
                        ProgramName,
                        ProgramCode,
                        IsActive

                    FROM Programs

                    WHERE
                        IsActive = 1

                    ORDER BY
                        ProgramName
                `),


                // ==========================================
                // ROOMS
                //
                // IMPORTANT:
                // Room yahan kisi single section se
                // join nahi ho raha.
                //
                // Same TeachingGroup sections
                // same room use kar sakte hain.
                // ==========================================

                pool.request().query(`

                    SELECT
                        RoomId,
                        CampusId,
                        RoomNumber,
                        RoomName,
                        RoomType,
                        Capacity,
                        BuildingName,
                        FloorNumber,
                        IsLab,
                        IsActive

                    FROM Rooms

                    WHERE
                        IsActive = 1

                    ORDER BY
                        CampusId,
                        RoomNumber
                `)
            ]);


        return {

            campuses:
                campusesResult.recordset,

            academicSessions:
                sessionsResult.recordset,

            classYears:
                classYearsResult.recordset,

            programs:
                programsResult.recordset,

            rooms:
                roomsResult.recordset
        };
    };


// ======================================================
// CREATE CAMPUS
// ======================================================

const createCampus =
    async (
        data
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "CampusName",
                    sql.NVarChar(100),
                    data.CampusName
                )

                .input(
                    "CampusCode",
                    sql.NVarChar(20),
                    data.CampusCode
                )

                .input(
                    "Location",
                    sql.NVarChar(200),
                    data.Location || null
                )

                .input(
                    "IsActive",
                    sql.Bit,
                    data.IsActive !== false
                )

                .query(`

                    INSERT INTO Campuses
                    (
                        CampusName,
                        CampusCode,
                        Location,
                        IsActive,
                        CreatedAt
                    )

                    OUTPUT
                        INSERTED.CampusId,
                        INSERTED.CampusName,
                        INSERTED.CampusCode,
                        INSERTED.Location,
                        INSERTED.IsActive

                    VALUES
                    (
                        @CampusName,
                        @CampusCode,
                        @Location,
                        @IsActive,
                        SYSDATETIME()
                    );
                `);


        return result.recordset[0];
    };


// ======================================================
// CREATE ACADEMIC SESSION
// ======================================================

const createAcademicSession =
    async (
        data
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SessionName",
                    sql.NVarChar(20),
                    data.SessionName
                )

                .input(
                    "StartDate",
                    sql.Date,
                    data.StartDate
                )

                .input(
                    "EndDate",
                    sql.Date,
                    data.EndDate
                )

                .input(
                    "IsCurrent",
                    sql.Bit,
                    data.IsCurrent === true
                )

                .query(`

                    IF @IsCurrent = 1
                    BEGIN

                        UPDATE AcademicSessions

                        SET
                            IsCurrent = 0;

                    END;


                    INSERT INTO AcademicSessions
                    (
                        SessionName,
                        StartDate,
                        EndDate,
                        IsCurrent,
                        CreatedAt
                    )

                    OUTPUT
                        INSERTED.AcademicSessionId,
                        INSERTED.SessionName,
                        INSERTED.StartDate,
                        INSERTED.EndDate,
                        INSERTED.IsCurrent

                    VALUES
                    (
                        @SessionName,
                        @StartDate,
                        @EndDate,
                        @IsCurrent,
                        SYSDATETIME()
                    );
                `);


        return result.recordset[0];
    };


// ======================================================
// GET SECTION ACTIVE TEACHING GROUP IDS
// ======================================================

const getSectionTeachingGroupIds =
    async (
        sectionId,
        academicSessionId,
        campusId
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SectionId",
                    sql.Int,
                    Number(sectionId)
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        academicSessionId
                    )
                )

                .input(
                    "CampusId",
                    sql.Int,
                    Number(campusId)
                )

                .query(`

                    SELECT DISTINCT
                        tg.TeachingGroupId,
                        tg.GroupName

                    FROM TeachingGroupSections tgs

                    INNER JOIN TeachingGroups tg

                        ON tg.TeachingGroupId =
                           tgs.TeachingGroupId

                    WHERE
                        tgs.SectionId =
                        @SectionId

                        AND

                        tg.AcademicSessionId =
                        @AcademicSessionId

                        AND

                        tg.CampusId =
                        @CampusId

                        AND

                        tg.IsActive = 1
                `);


        return result.recordset;
    };


// ======================================================
// VALIDATE ROOM ASSIGNMENT
//
// RULES:
//
// 1. Room exists and active
// 2. Same campus
// 3. Capacity enough
// 4. If room already assigned:
//      all sharing sections must belong to
//      SAME active TeachingGroup.
// 5. Combined group student count must fit room.
// ======================================================

const validateRoomAssignment =
    async ({
        roomId,
        campusId,
        studentCount,
        academicSessionId,
        currentSectionId = null
    }) => {

        const pool =
            await poolPromise;


        // ==================================================
        // GET ROOM
        // ==================================================

        const roomResult =
            await pool.request()

                .input(
                    "RoomId",
                    sql.Int,
                    Number(roomId)
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


        const room =
            roomResult.recordset[0];


        if (!room) {

            return {
                valid:
                    false,

                message:
                    "Selected room does not exist."
            };
        }


        if (!room.IsActive) {

            return {
                valid:
                    false,

                message:
                    "Selected room is inactive."
            };
        }


        if (
            Number(
                room.CampusId
            ) !==
            Number(
                campusId
            )
        ) {

            return {
                valid:
                    false,

                message:
                    "Assigned room must belong to the same campus as the section."
            };
        }


        if (
            Number(
                room.Capacity
            ) <
            Number(
                studentCount
            )
        ) {

            return {
                valid:
                    false,

                message:
                    `Room ${room.RoomNumber} capacity (${room.Capacity}) is smaller than section student count (${studentCount}).`
            };
        }


        // ==================================================
        // OTHER SECTIONS ALREADY USING SAME HOME ROOM
        // IN SAME SESSION
        // ==================================================

        const otherRequest =
            pool.request()

                .input(
                    "RoomId",
                    sql.Int,
                    Number(roomId)
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        academicSessionId
                    )
                );


        let otherSql = `

            SELECT
                SectionId,
                SectionCode,
                SectionName,
                StudentCount

            FROM Sections

            WHERE
                DefaultRoomId =
                @RoomId

                AND

                AcademicSessionId =
                @AcademicSessionId

                AND

                IsActive = 1
        `;


        if (
            currentSectionId !== null
        ) {

            otherRequest.input(
                "CurrentSectionId",
                sql.Int,
                Number(
                    currentSectionId
                )
            );


            otherSql += `

                AND
                SectionId <>
                @CurrentSectionId
            `;
        }


        const otherResult =
            await otherRequest.query(
                otherSql
            );


        const otherSections =
            otherResult.recordset;


        // Room is not used by another section.
        if (
            otherSections.length === 0
        ) {

            return {
                valid:
                    true,

                room
            };
        }


        // ==================================================
        // NEW SECTION DOES NOT YET HAVE TEACHING GROUP
        // RELATIONSHIP.
        //
        // Existing grouped sections should be edited
        // after group membership exists.
        // ==================================================

        if (
            currentSectionId === null
        ) {

            return {
                valid:
                    false,

                message:
                    `Room ${room.RoomNumber} is already assigned to another section. Same room can only be shared after both sections are members of the same Teaching Group.`
            };
        }


        // ==================================================
        // CURRENT SECTION GROUP IDS
        // ==================================================

        const currentGroups =
            await getSectionTeachingGroupIds(

                currentSectionId,

                academicSessionId,

                campusId
            );


        if (
            currentGroups.length === 0
        ) {

            return {
                valid:
                    false,

                message:
                    `Room ${room.RoomNumber} is already assigned. This section is not a member of an active Teaching Group with the other section.`
            };
        }


        let commonGroupIds =
            currentGroups.map(
                group =>
                    Number(
                        group.TeachingGroupId
                    )
            );


        // ==================================================
        // EVERY SECTION SHARING ROOM MUST HAVE AT LEAST
        // ONE COMMON TEACHING GROUP WITH CURRENT SECTION.
        // ==================================================

        for (
            const otherSection
            of otherSections
        ) {

            const otherGroups =
                await getSectionTeachingGroupIds(

                    otherSection.SectionId,

                    academicSessionId,

                    campusId
                );


            const otherIds =
                otherGroups.map(
                    group =>
                        Number(
                            group.TeachingGroupId
                        )
                );


            commonGroupIds =
                commonGroupIds.filter(
                    groupId =>
                        otherIds.includes(
                            groupId
                        )
                );


            if (
                commonGroupIds.length === 0
            ) {

                return {
                    valid:
                        false,

                    message:
                        `Room ${room.RoomNumber} is already assigned to ${otherSection.SectionCode}. Same room is only allowed when all sharing sections belong to the same Teaching Group.`
                };
            }
        }


        // ==================================================
        // COMBINED CAPACITY
        //
        // Example:
        // Medical 20 + Engineering 25 = 45
        // Room Capacity must be >= 45.
        // ==================================================

        const combinedStudentCount =
            Number(
                studentCount
            )
            +
            otherSections.reduce(
                (
                    total,
                    section
                ) =>

                    total +
                    Number(
                        section.StudentCount ||
                        0
                    ),

                0
            );


        if (
            combinedStudentCount >
            Number(
                room.Capacity
            )
        ) {

            return {
                valid:
                    false,

                message:
                    `Room ${room.RoomNumber} capacity is ${room.Capacity}, but combined Teaching Group student count is ${combinedStudentCount}.`
            };
        }


        return {
            valid:
                true,

            room,

            shared:
                true,

            teachingGroupId:
                commonGroupIds[0]
        };
    };


// ======================================================
// CREATE SECTION
// ======================================================

const createSection =
    async (
        section
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "CampusId",
                    sql.Int,
                    Number(
                        section.CampusId
                    )
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        section.AcademicSessionId
                    )
                )

                .input(
                    "ClassYearId",
                    sql.Int,
                    Number(
                        section.ClassYearId
                    )
                )

                .input(
                    "ProgramId",
                    sql.Int,
                    Number(
                        section.ProgramId
                    )
                )

                .input(
                    "DefaultRoomId",
                    sql.Int,
                    Number(
                        section.DefaultRoomId
                    )
                )

                .input(
                    "SectionName",
                    sql.NVarChar(50),
                    section.SectionName
                )

                .input(
                    "SectionCode",
                    sql.NVarChar(50),
                    section.SectionCode
                )

                .input(
                    "StudentCount",
                    sql.Int,
                    Number(
                        section.StudentCount
                    )
                )

                .input(
                    "IsActive",
                    sql.Bit,
                    section.IsActive !== false
                )

                .query(`

                    INSERT INTO Sections
                    (
                        CampusId,
                        AcademicSessionId,
                        ClassYearId,
                        ProgramId,
                        DefaultRoomId,
                        SectionName,
                        SectionCode,
                        StudentCount,
                        IsActive,
                        CreatedAt
                    )

                    OUTPUT
                        INSERTED.SectionId

                    VALUES
                    (
                        @CampusId,
                        @AcademicSessionId,
                        @ClassYearId,
                        @ProgramId,
                        @DefaultRoomId,
                        @SectionName,
                        @SectionCode,
                        @StudentCount,
                        @IsActive,
                        SYSDATETIME()
                    );
                `);


        return result.recordset[0];
    };


// ======================================================
// UPDATE SECTION
// ======================================================

const updateSection =
    async (
        id,
        section
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SectionId",
                    sql.Int,
                    Number(id)
                )

                .input(
                    "CampusId",
                    sql.Int,
                    Number(
                        section.CampusId
                    )
                )

                .input(
                    "AcademicSessionId",
                    sql.Int,
                    Number(
                        section.AcademicSessionId
                    )
                )

                .input(
                    "ClassYearId",
                    sql.Int,
                    Number(
                        section.ClassYearId
                    )
                )

                .input(
                    "ProgramId",
                    sql.Int,
                    Number(
                        section.ProgramId
                    )
                )

                .input(
                    "DefaultRoomId",
                    sql.Int,
                    Number(
                        section.DefaultRoomId
                    )
                )

                .input(
                    "SectionName",
                    sql.NVarChar(50),
                    section.SectionName
                )

                .input(
                    "SectionCode",
                    sql.NVarChar(50),
                    section.SectionCode
                )

                .input(
                    "StudentCount",
                    sql.Int,
                    Number(
                        section.StudentCount
                    )
                )

                .input(
                    "IsActive",
                    sql.Bit,
                    section.IsActive !== false
                )

                .query(`

                    UPDATE Sections

                    SET
                        CampusId =
                            @CampusId,

                        AcademicSessionId =
                            @AcademicSessionId,

                        ClassYearId =
                            @ClassYearId,

                        ProgramId =
                            @ProgramId,

                        DefaultRoomId =
                            @DefaultRoomId,

                        SectionName =
                            @SectionName,

                        SectionCode =
                            @SectionCode,

                        StudentCount =
                            @StudentCount,

                        IsActive =
                            @IsActive

                    WHERE
                        SectionId =
                        @SectionId
                `);


        return (
            result.rowsAffected[0] ||
            0
        );
    };


// ======================================================
// DELETE SECTION
// ======================================================

const deleteSection =
    async (
        id
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "SectionId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    DELETE
                    FROM Sections

                    WHERE
                        SectionId =
                        @SectionId
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

    getAllSections,

    getSectionById,

    getSectionLookups,

    createCampus,

    createAcademicSession,

    getSectionTeachingGroupIds,

    validateRoomAssignment,

    createSection,

    updateSection,

    deleteSection
};