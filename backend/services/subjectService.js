const { sql, poolPromise } =
    require("../config/db");


// ======================================================
// COMMON SELECT
// ======================================================

const subjectSelect = `
    SELECT
        SubjectId,
        SubjectCode,
        SubjectName,
        CreditHours,
        WeeklyHours,
        IsPractical,
        IsActive,
        CreatedAt

    FROM Subjects
`;


// ======================================================
// GET ALL SUBJECTS
// ======================================================

const getAllSubjects = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()
            .query(`

                ${subjectSelect}

                ORDER BY
                    SubjectName,
                    SubjectCode
            `);


    return result.recordset;
};


// ======================================================
// GET SUBJECT BY ID
// ======================================================

const getSubjectById = async (id) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "SubjectId",
                sql.Int,
                Number(id)
            )

            .query(`

                ${subjectSelect}

                WHERE
                    SubjectId =
                    @SubjectId
            `);


    return result.recordset[0];
};


// ======================================================
// CREATE SUBJECT
//
// DepartmentId is intentionally not used.
// DB column can stay nullable.
// ======================================================

const createSubject = async (
    subject
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "SubjectCode",
                sql.NVarChar(30),
                subject.SubjectCode
            )

            .input(
                "SubjectName",
                sql.NVarChar(100),
                subject.SubjectName
            )

            .input(
                "CreditHours",
                sql.Decimal(5, 2),
                subject.CreditHours
            )

            .input(
                "WeeklyHours",
                sql.Int,
                subject.WeeklyHours
            )

            .input(
                "IsPractical",
                sql.Bit,
                Boolean(
                    subject.IsPractical
                )
            )

            .input(
                "IsActive",
                sql.Bit,
                Boolean(
                    subject.IsActive
                )
            )

            .query(`

                INSERT INTO Subjects
                (
                    SubjectCode,
                    SubjectName,
                    CreditHours,
                    WeeklyHours,
                    IsPractical,
                    IsActive
                )

                OUTPUT
                    INSERTED.SubjectId

                VALUES
                (
                    @SubjectCode,
                    @SubjectName,
                    @CreditHours,
                    @WeeklyHours,
                    @IsPractical,
                    @IsActive
                );
            `);


    return result.recordset[0];
};


// ======================================================
// UPDATE SUBJECT
// ======================================================

const updateSubject = async (
    id,
    subject
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "SubjectId",
                sql.Int,
                Number(id)
            )

            .input(
                "SubjectCode",
                sql.NVarChar(30),
                subject.SubjectCode
            )

            .input(
                "SubjectName",
                sql.NVarChar(100),
                subject.SubjectName
            )

            .input(
                "CreditHours",
                sql.Decimal(5, 2),
                subject.CreditHours
            )

            .input(
                "WeeklyHours",
                sql.Int,
                subject.WeeklyHours
            )

            .input(
                "IsPractical",
                sql.Bit,
                Boolean(
                    subject.IsPractical
                )
            )

            .input(
                "IsActive",
                sql.Bit,
                Boolean(
                    subject.IsActive
                )
            )

            .query(`

                UPDATE Subjects

                SET
                    SubjectCode =
                        @SubjectCode,

                    SubjectName =
                        @SubjectName,

                    CreditHours =
                        @CreditHours,

                    WeeklyHours =
                        @WeeklyHours,

                    IsPractical =
                        @IsPractical,

                    IsActive =
                        @IsActive

                WHERE
                    SubjectId =
                    @SubjectId
            `);


    return result.rowsAffected[0] || 0;
};


// ======================================================
// DELETE SUBJECT
// ======================================================

const deleteSubject = async (id) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "SubjectId",
                sql.Int,
                Number(id)
            )

            .query(`

                DELETE
                FROM Subjects

                WHERE
                    SubjectId =
                    @SubjectId
            `);


    return result.rowsAffected[0] || 0;
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    getAllSubjects,

    getSubjectById,

    createSubject,

    updateSubject,

    deleteSubject
};