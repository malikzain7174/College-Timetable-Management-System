const { sql, poolPromise } =
    require("../config/db");


// ======================================================
// GET ALL
// ======================================================

const getAllTeachingGroupSections = async () => {

    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT
            tgs.TeachingGroupSectionId,
            tgs.TeachingGroupId,
            tg.GroupName,
            tgs.SectionId,
            s.SectionCode,
            s.SectionName,
            s.CampusId,
            s.AcademicSessionId,
            s.ClassYearId

        FROM TeachingGroupSections tgs

        INNER JOIN TeachingGroups tg
            ON tgs.TeachingGroupId =
               tg.TeachingGroupId

        INNER JOIN Sections s
            ON tgs.SectionId =
               s.SectionId

        ORDER BY
            tgs.TeachingGroupId,
            tgs.SectionId
    `);

    return result.recordset;
};


// ======================================================
// GET BY ID
// ======================================================

const getTeachingGroupSectionById = async (
    id
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TeachingGroupSectionId",
            sql.Int,
            Number(id)
        )

        .query(`
            SELECT
                TeachingGroupSectionId,
                TeachingGroupId,
                SectionId

            FROM TeachingGroupSections

            WHERE
                TeachingGroupSectionId =
                @TeachingGroupSectionId
        `);

    return result.recordset[0];
};


// ======================================================
// GET BY GROUP
// ======================================================

const getByTeachingGroupId = async (
    teachingGroupId
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            Number(teachingGroupId)
        )

        .query(`
            SELECT
                tgs.TeachingGroupSectionId,
                tgs.TeachingGroupId,
                tgs.SectionId,
                s.SectionCode,
                s.SectionName

            FROM TeachingGroupSections tgs

            INNER JOIN Sections s
                ON tgs.SectionId =
                   s.SectionId

            WHERE
                tgs.TeachingGroupId =
                @TeachingGroupId

            ORDER BY s.SectionCode
        `);

    return result.recordset;
};


// ======================================================
// GET SECTIONS BY IDS FOR VALIDATION
// ======================================================

const getSectionsByIds = async (
    sectionIds
) => {

    if (!sectionIds.length) {
        return [];
    }


    const pool = await poolPromise;

    const request = pool.request();


    const parameters =
        sectionIds.map(
            (sectionId, index) => {

                const name =
                    `SectionId${index}`;

                request.input(
                    name,
                    sql.Int,
                    sectionId
                );

                return `@${name}`;
            }
        );


    const result = await request.query(`
        SELECT
            SectionId,
            CampusId,
            AcademicSessionId,
            ClassYearId,
            SectionCode,
            SectionName

        FROM Sections

        WHERE SectionId IN
        (
            ${parameters.join(",")}
        )
    `);


    return result.recordset;
};


// ======================================================
// CREATE
// ======================================================

const createTeachingGroupSection = async (
    data
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            data.TeachingGroupId
        )

        .input(
            "SectionId",
            sql.Int,
            data.SectionId
        )

        .query(`
            INSERT INTO TeachingGroupSections
            (
                TeachingGroupId,
                SectionId
            )

            OUTPUT
                INSERTED.TeachingGroupSectionId

            VALUES
            (
                @TeachingGroupId,
                @SectionId
            );
        `);

    return result.recordset[0];
};


// ======================================================
// UPDATE
// ======================================================

const updateTeachingGroupSection = async (
    id,
    data
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TeachingGroupSectionId",
            sql.Int,
            Number(id)
        )

        .input(
            "TeachingGroupId",
            sql.Int,
            data.TeachingGroupId
        )

        .input(
            "SectionId",
            sql.Int,
            data.SectionId
        )

        .query(`
            UPDATE TeachingGroupSections

            SET
                TeachingGroupId =
                    @TeachingGroupId,

                SectionId =
                    @SectionId

            WHERE
                TeachingGroupSectionId =
                @TeachingGroupSectionId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DELETE
// ======================================================

const deleteTeachingGroupSection = async (
    id
) => {

    const pool = await poolPromise;

    await pool.request()

        .input(
            "TeachingGroupSectionId",
            sql.Int,
            Number(id)
        )

        .query(`
            DELETE FROM TeachingGroupSections

            WHERE
                TeachingGroupSectionId =
                @TeachingGroupSectionId
        `);
};


// ======================================================
// SYNC ALL SECTIONS OF A GROUP
// ======================================================

const syncTeachingGroupSections = async (
    teachingGroupId,
    sectionIds
) => {

    const uniqueSectionIds =
        [...new Set(sectionIds)];


    const pool = await poolPromise;

    const request = pool.request()

        .input(
            "TeachingGroupId",
            sql.Int,
            Number(teachingGroupId)
        );


    const values =
        uniqueSectionIds.map(
            (sectionId, index) => {

                const name =
                    `SectionId${index}`;

                request.input(
                    name,
                    sql.Int,
                    sectionId
                );

                return `
                    (
                        @TeachingGroupId,
                        @${name}
                    )
                `;
            }
        );


    const insertSql =
        values.length > 0
            ? `
                INSERT INTO TeachingGroupSections
                (
                    TeachingGroupId,
                    SectionId
                )
                VALUES
                    ${values.join(",")};
            `
            : "";


    await request.query(`
        SET XACT_ABORT ON;

        BEGIN TRY

            BEGIN TRANSACTION;

            DELETE FROM TeachingGroupSections
            WHERE TeachingGroupId =
                @TeachingGroupId;

            ${insertSql}

            COMMIT TRANSACTION;

        END TRY

        BEGIN CATCH

            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;

        END CATCH;
    `);
};


module.exports = {

    getAllTeachingGroupSections,

    getTeachingGroupSectionById,

    getByTeachingGroupId,

    getSectionsByIds,

    createTeachingGroupSection,

    updateTeachingGroupSection,

    deleteTeachingGroupSection,

    syncTeachingGroupSections
};