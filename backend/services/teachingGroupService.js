const { sql, poolPromise } =
    require("../config/db");
const { HttpError } = require("../lib/httpError");
const { validateMembership, withTeachingGroupLock, writeGroupMembers } = require("./teachingGroupSectionService");


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

async function saveGroup(data, id) {
    return withTeachingGroupLock(async db => {
        const request = db.request()
            .input("id", sql.Int, id ?? null)
            .input("name", sql.NVarChar(100), data.GroupName)
            .input("campus", sql.Int, data.CampusId)
            .input("session", sql.Int, data.AcademicSessionId)
            .input("year", sql.Int, data.ClassYearId)
            .input("active", sql.Bit, data.IsActive);

        let group;
        try {
            const { recordset } = await request.query(`
                IF EXISTS (SELECT 1 FROM TeachingGroups WHERE GroupName = @name
                    AND CampusId = @campus AND AcademicSessionId = @session AND ClassYearId = @year
                    AND (@id IS NULL OR TeachingGroupId <> @id))
                    SELECT 1 AS duplicate;
                ELSE IF @id IS NULL
                    INSERT TeachingGroups (GroupName, CampusId, AcademicSessionId, ClassYearId, IsActive)
                    OUTPUT INSERTED.TeachingGroupId VALUES (@name, @campus, @session, @year, @active);
                ELSE
                    UPDATE TeachingGroups SET GroupName = @name, CampusId = @campus, AcademicSessionId = @session,
                        ClassYearId = @year, IsActive = @active
                    OUTPUT INSERTED.TeachingGroupId WHERE TeachingGroupId = @id;
            `);
            group = recordset[0];
        } catch (error) {
            if (error.number === 547) throw new HttpError(400, "The selected campus, academic session or class year does not exist.");
            throw error;
        }
        if (group?.duplicate) throw new HttpError(409, "A teaching group with this name already exists for the selected campus, session and year.");
        if (!group) throw new HttpError(404, "Teaching group not found.");

        if (data.SectionIds) {
            await writeGroupMembers(db, group.TeachingGroupId, data.SectionIds);
        } else if (id !== undefined && data.IsActive) {
            const { recordset: members } = await db.request().input("id", sql.Int, id)
                .query("SELECT SectionId FROM TeachingGroupSections WHERE TeachingGroupId = @id;");
            await validateMembership(db, id, members.map(member => member.SectionId), data);
        }
        return group;
    });
}

const deleteTeachingGroup = async (id) => {
    return withTeachingGroupLock(async db => {
        await db.request().input("id", sql.Int, id).query(`
            DELETE FROM TeachingGroupSections WHERE TeachingGroupId = @id;
            DELETE FROM TeachingGroups WHERE TeachingGroupId = @id;
        `);
    });
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
    getAllTeachingGroups, getTeachingGroupById, deleteTeachingGroup, deactivateTeachingGroup,
    createTeachingGroup: data => saveGroup(data),
    updateTeachingGroup: (id, data) => saveGroup(data, id)
};
