const { sql, poolPromise } =
    require("../config/db");


// ======================================================
// GET ALL
// ======================================================

const getAllTeachingGroups = async () => {

    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT
            tg.TeachingGroupId,
            tg.GroupName,
            tg.CampusId,
            tg.AcademicSessionId,
            tg.ClassYearId,
            tg.IsActive,
            COUNT(tgs.TeachingGroupSectionId)
                AS SectionCount

        FROM TeachingGroups tg

        LEFT JOIN TeachingGroupSections tgs
            ON tg.TeachingGroupId =
               tgs.TeachingGroupId

        GROUP BY
            tg.TeachingGroupId,
            tg.GroupName,
            tg.CampusId,
            tg.AcademicSessionId,
            tg.ClassYearId,
            tg.IsActive

        ORDER BY tg.TeachingGroupId
    `);

    return result.recordset;
};


// ======================================================
// GET BY ID
// ======================================================

const getTeachingGroupById = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "TeachingGroupId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT
                TeachingGroupId,
                GroupName,
                CampusId,
                AcademicSessionId,
                ClassYearId,
                IsActive

            FROM TeachingGroups

            WHERE
                TeachingGroupId =
                @TeachingGroupId
        `);

    return result.recordset[0];
};


// ======================================================
// DUPLICATE CHECK
// ======================================================

const findDuplicateTeachingGroup = async (
    groupName,
    campusId,
    academicSessionId,
    classYearId,
    excludeId = null
) => {

    const pool = await poolPromise;

    const request = pool.request()

        .input(
            "GroupName",
            sql.NVarChar(100),
            groupName
        )

        .input(
            "CampusId",
            sql.Int,
            campusId
        )

        .input(
            "AcademicSessionId",
            sql.Int,
            academicSessionId
        )

        .input(
            "ClassYearId",
            sql.Int,
            classYearId
        );


    let query = `
        SELECT TOP 1
            TeachingGroupId
        FROM TeachingGroups

        WHERE GroupName = @GroupName
          AND CampusId = @CampusId
          AND AcademicSessionId =
              @AcademicSessionId
          AND ClassYearId =
              @ClassYearId
    `;


    if (excludeId !== null) {

        request.input(
            "ExcludeId",
            sql.Int,
            Number(excludeId)
        );

        query += `
            AND TeachingGroupId
                <> @ExcludeId
        `;
    }


    const result =
        await request.query(query);

    return result.recordset[0];
};


// ======================================================
// CREATE
// ======================================================

const createTeachingGroup = async (data) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "GroupName",
            sql.NVarChar(100),
            data.GroupName
        )

        .input(
            "CampusId",
            sql.Int,
            data.CampusId
        )

        .input(
            "AcademicSessionId",
            sql.Int,
            data.AcademicSessionId
        )

        .input(
            "ClassYearId",
            sql.Int,
            data.ClassYearId
        )

        .input(
            "IsActive",
            sql.Bit,
            data.IsActive
        )

        .query(`
            INSERT INTO TeachingGroups
            (
                GroupName,
                CampusId,
                AcademicSessionId,
                ClassYearId,
                IsActive
            )

            OUTPUT INSERTED.TeachingGroupId

            VALUES
            (
                @GroupName,
                @CampusId,
                @AcademicSessionId,
                @ClassYearId,
                @IsActive
            );
        `);

    return result.recordset[0];
};


// ======================================================
// UPDATE
// ======================================================

const updateTeachingGroup = async (
    id,
    data
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            Number(id)
        )

        .input(
            "GroupName",
            sql.NVarChar(100),
            data.GroupName
        )

        .input(
            "CampusId",
            sql.Int,
            data.CampusId
        )

        .input(
            "AcademicSessionId",
            sql.Int,
            data.AcademicSessionId
        )

        .input(
            "ClassYearId",
            sql.Int,
            data.ClassYearId
        )

        .input(
            "IsActive",
            sql.Bit,
            data.IsActive
        )

        .query(`
            UPDATE TeachingGroups

            SET
                GroupName = @GroupName,
                CampusId = @CampusId,
                AcademicSessionId =
                    @AcademicSessionId,
                ClassYearId = @ClassYearId,
                IsActive = @IsActive

            WHERE
                TeachingGroupId =
                @TeachingGroupId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DELETE GROUP + ITS SECTION MAPPINGS
// ======================================================

const deleteTeachingGroup = async (id) => {

    const pool = await poolPromise;

    await pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            Number(id)
        )

        .query(`
            SET XACT_ABORT ON;

            BEGIN TRY

                BEGIN TRANSACTION;

                DELETE FROM TeachingGroupSections
                WHERE
                    TeachingGroupId =
                    @TeachingGroupId;

                DELETE FROM TeachingGroups
                WHERE
                    TeachingGroupId =
                    @TeachingGroupId;

                COMMIT TRANSACTION;

            END TRY

            BEGIN CATCH

                IF @@TRANCOUNT > 0
                    ROLLBACK TRANSACTION;

                THROW;

            END CATCH;
        `);
};


// ======================================================
// DEACTIVATE
// ======================================================

const deactivateTeachingGroup = async (id) => {

    const pool = await poolPromise;

    await pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            Number(id)
        )

        .query(`
            UPDATE TeachingGroups
            SET IsActive = 0
            WHERE
                TeachingGroupId =
                @TeachingGroupId
        `);
};


module.exports = {

    getAllTeachingGroups,

    getTeachingGroupById,

    findDuplicateTeachingGroup,

    createTeachingGroup,

    updateTeachingGroup,

    deleteTeachingGroup,

    deactivateTeachingGroup
};