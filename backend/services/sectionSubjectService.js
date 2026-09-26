const { sql, poolPromise } = require("../config/db");


// ======================================================
// GET ALL SECTION SUBJECTS
// ======================================================

const getAllSectionSubjects = async () => {

    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT
            ss.SectionSubjectId,

            ss.SectionId,
            s.SectionCode,
            s.SectionName,

            ss.SubjectId,
            sub.SubjectCode,
            sub.SubjectName,

            ss.TeacherId,

            CONCAT(
                t.FirstName,
                CASE
                    WHEN t.LastName IS NULL
                        OR t.LastName = ''
                    THEN ''
                    ELSE ' ' + t.LastName
                END
            ) AS TeacherName,

            ss.WeeklyHours,

            ss.SharedWithSectionId,

            shared.SectionCode
                AS SharedWithSectionCode,

            shared.SectionName
                AS SharedWithSectionName,

            ss.IsActive,
            ss.CreatedAt

        FROM SectionSubjects ss

        INNER JOIN Sections s
            ON ss.SectionId = s.SectionId

        INNER JOIN Subjects sub
            ON ss.SubjectId = sub.SubjectId

        INNER JOIN Teachers t
            ON ss.TeacherId = t.TeacherId

        LEFT JOIN Sections shared
            ON ss.SharedWithSectionId =
               shared.SectionId

        ORDER BY
            ss.SectionSubjectId
    `);

    return result.recordset;
};


// ======================================================
// GET BY ID
// ======================================================

const getSectionSubjectById = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "SectionSubjectId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT
                ss.SectionSubjectId,

                ss.SectionId,
                s.SectionCode,
                s.SectionName,

                ss.SubjectId,
                sub.SubjectCode,
                sub.SubjectName,

                ss.TeacherId,

                CONCAT(
                    t.FirstName,
                    CASE
                        WHEN t.LastName IS NULL
                            OR t.LastName = ''
                        THEN ''
                        ELSE ' ' + t.LastName
                    END
                ) AS TeacherName,

                ss.WeeklyHours,

                ss.SharedWithSectionId,

                shared.SectionCode
                    AS SharedWithSectionCode,

                shared.SectionName
                    AS SharedWithSectionName,

                ss.IsActive,
                ss.CreatedAt

            FROM SectionSubjects ss

            INNER JOIN Sections s
                ON ss.SectionId = s.SectionId

            INNER JOIN Subjects sub
                ON ss.SubjectId = sub.SubjectId

            INNER JOIN Teachers t
                ON ss.TeacherId = t.TeacherId

            LEFT JOIN Sections shared
                ON ss.SharedWithSectionId =
                   shared.SectionId

            WHERE
                ss.SectionSubjectId =
                @SectionSubjectId
        `);

    return result.recordset[0];
};


// ======================================================
// CHECK SECTION EXISTS
// ======================================================

const sectionExists = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "SectionId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT SectionId
            FROM Sections
            WHERE SectionId = @SectionId
        `);

    return result.recordset.length > 0;
};


// ======================================================
// CHECK SUBJECT EXISTS
// ======================================================

const subjectExists = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "SubjectId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT SubjectId
            FROM Subjects
            WHERE SubjectId = @SubjectId
        `);

    return result.recordset.length > 0;
};


// ======================================================
// CHECK TEACHER EXISTS
// ======================================================

const teacherExists = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "TeacherId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT TeacherId
            FROM Teachers
            WHERE TeacherId = @TeacherId
        `);

    return result.recordset.length > 0;
};


// ======================================================
// CHECK DUPLICATE SECTION + SUBJECT
// ======================================================

const findDuplicate = async (
    sectionId,
    subjectId,
    excludeId = null
) => {

    const pool = await poolPromise;

    const request = pool.request()
        .input(
            "SectionId",
            sql.Int,
            Number(sectionId)
        )
        .input(
            "SubjectId",
            sql.Int,
            Number(subjectId)
        );


    let query = `
        SELECT TOP 1
            SectionSubjectId
        FROM SectionSubjects
        WHERE
            SectionId = @SectionId
            AND SubjectId = @SubjectId
    `;


    if (excludeId !== null) {

        request.input(
            "ExcludeId",
            sql.Int,
            Number(excludeId)
        );

        query += `
            AND SectionSubjectId <> @ExcludeId
        `;
    }


    const result =
        await request.query(query);

    return result.recordset[0];
};


// ======================================================
// CREATE
// ======================================================

const createSectionSubject = async (data) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "SectionId",
            sql.Int,
            data.SectionId
        )

        .input(
            "SubjectId",
            sql.Int,
            data.SubjectId
        )

        .input(
            "TeacherId",
            sql.Int,
            data.TeacherId
        )

        .input(
            "WeeklyHours",
            sql.Int,
            data.WeeklyHours
        )

        .input(
            "IsActive",
            sql.Bit,
            data.IsActive
        )

        .input(
            "SharedWithSectionId",
            sql.Int,
            data.SharedWithSectionId ?? null
        )

        .query(`
            INSERT INTO SectionSubjects
            (
                SectionId,
                SubjectId,
                TeacherId,
                WeeklyHours,
                IsActive,
                CreatedAt,
                SharedWithSectionId
            )
            OUTPUT
                INSERTED.SectionSubjectId
            VALUES
            (
                @SectionId,
                @SubjectId,
                @TeacherId,
                @WeeklyHours,
                @IsActive,
                SYSDATETIME(),
                @SharedWithSectionId
            );
        `);

    return result.recordset[0];
};


// ======================================================
// UPDATE
// ======================================================

const updateSectionSubject = async (
    id,
    data
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "SectionSubjectId",
            sql.Int,
            Number(id)
        )

        .input(
            "SectionId",
            sql.Int,
            data.SectionId
        )

        .input(
            "SubjectId",
            sql.Int,
            data.SubjectId
        )

        .input(
            "TeacherId",
            sql.Int,
            data.TeacherId
        )

        .input(
            "WeeklyHours",
            sql.Int,
            data.WeeklyHours
        )

        .input(
            "IsActive",
            sql.Bit,
            data.IsActive
        )

        .input(
            "SharedWithSectionId",
            sql.Int,
            data.SharedWithSectionId ?? null
        )

        .query(`
            UPDATE SectionSubjects
            SET
                SectionId = @SectionId,
                SubjectId = @SubjectId,
                TeacherId = @TeacherId,
                WeeklyHours = @WeeklyHours,
                IsActive = @IsActive,
                SharedWithSectionId =
                    @SharedWithSectionId
            WHERE
                SectionSubjectId =
                @SectionSubjectId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// HARD DELETE
// ======================================================

const deleteSectionSubject = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "SectionSubjectId",
            sql.Int,
            Number(id)
        )
        .query(`
            DELETE FROM SectionSubjects
            WHERE
                SectionSubjectId =
                @SectionSubjectId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DEACTIVATE
// ======================================================

const deactivateSectionSubject = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "SectionSubjectId",
            sql.Int,
            Number(id)
        )
        .query(`
            UPDATE SectionSubjects
            SET IsActive = 0
            WHERE
                SectionSubjectId =
                @SectionSubjectId
        `);

    return result.rowsAffected[0];
};


module.exports = {

    getAllSectionSubjects,

    getSectionSubjectById,

    sectionExists,

    subjectExists,

    teacherExists,

    findDuplicate,

    createSectionSubject,

    updateSectionSubject,

    deleteSectionSubject,

    deactivateSectionSubject
};