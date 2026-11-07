const { sql, poolPromise, withDatabaseLock } = require("../config/db");
const { HttpError } = require("../lib/httpError");


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

const withTeachingGroupLock = operation => withDatabaseLock("timetable:teaching-groups", operation);

async function validateMembership(db, groupId, sectionIds, proposedGroup) {
    let group = proposedGroup;
    if (!group) {
        const result = await db.request().input("groupId", sql.Int, groupId)
            .query("SELECT * FROM TeachingGroups WHERE TeachingGroupId = @groupId;");
        group = result.recordset[0];
    }
    if (!group) throw new HttpError(404, "Teaching group not found.");
    if (!sectionIds.length) return;

    const { recordset: sections } = await db.request()
        .input("ids", sql.NVarChar(sql.MAX), JSON.stringify(sectionIds))
        .input("groupId", sql.Int, groupId)
        .query(`
            SELECT s.SectionId, s.SectionCode, s.CampusId, s.AcademicSessionId, s.ClassYearId,
                competing.GroupName AS OtherGroup
            FROM Sections s
            OUTER APPLY (
                SELECT TOP 1 tg.GroupName
                FROM TeachingGroupSections tgs
                JOIN TeachingGroups tg ON tg.TeachingGroupId = tgs.TeachingGroupId
                WHERE tgs.SectionId = s.SectionId AND tg.IsActive = 1 AND tg.TeachingGroupId <> @groupId
                ORDER BY tg.TeachingGroupId
            ) competing
            WHERE s.SectionId IN (SELECT CONVERT(int, value) FROM OPENJSON(@ids));
        `);
    if (sections.length !== sectionIds.length) throw new HttpError(400, "One or more selected sections do not exist.");
    for (const section of sections) {
        if (section.CampusId !== group.CampusId || section.AcademicSessionId !== group.AcademicSessionId ||
            section.ClassYearId !== group.ClassYearId) {
            throw new HttpError(400, `${section.SectionCode} must match the group's campus, academic session and class year.`);
        }
        if (group.IsActive && section.OtherGroup) {
            throw new HttpError(409, `${section.SectionCode} is already assigned to ${section.OtherGroup}. Remove it there before assigning it to this active group.`);
        }
    }
}

async function changeMembership({ TeachingGroupId, SectionId }, id) {
    return withTeachingGroupLock(async db => {
        await validateMembership(db, TeachingGroupId, [SectionId]);
        const request = db.request().input("groupId", sql.Int, TeachingGroupId)
            .input("sectionId", sql.Int, SectionId).input("id", sql.Int, id ?? null);
        const { recordset: [row] } = await request.query(`
            IF EXISTS (
                SELECT 1 FROM TeachingGroupSections WHERE TeachingGroupId = @groupId AND SectionId = @sectionId
                    AND (@id IS NULL OR TeachingGroupSectionId <> @id)
            )
                SELECT 1 AS duplicate;
            ELSE IF @id IS NULL
                INSERT TeachingGroupSections (TeachingGroupId, SectionId)
                OUTPUT INSERTED.TeachingGroupSectionId VALUES (@groupId, @sectionId);
            ELSE
                UPDATE TeachingGroupSections SET TeachingGroupId = @groupId, SectionId = @sectionId
                OUTPUT INSERTED.TeachingGroupSectionId WHERE TeachingGroupSectionId = @id;
        `);
        if (row?.duplicate) throw new HttpError(409, "The section is already in this teaching group.");
        if (!row) throw new HttpError(404, "Teaching group membership not found.");
        return row;
    });
}

async function deleteTeachingGroupSection(id) {
    return withTeachingGroupLock(async db => {
        const { rowsAffected } = await db.request().input("id", sql.Int, id)
            .query("DELETE FROM TeachingGroupSections WHERE TeachingGroupSectionId = @id;");
        if (!rowsAffected[0]) throw new HttpError(404, "Teaching group membership not found.");
    });
}

async function writeGroupMembers(db, groupId, sectionIds) {
    await validateMembership(db, groupId, sectionIds);
    await db.request().input("groupId", sql.Int, groupId)
        .input("ids", sql.NVarChar(sql.MAX), JSON.stringify(sectionIds))
        .query(`
            DELETE FROM TeachingGroupSections WHERE TeachingGroupId = @groupId
                AND SectionId NOT IN (SELECT CONVERT(int, value) FROM OPENJSON(@ids));
            INSERT TeachingGroupSections (TeachingGroupId, SectionId)
            SELECT @groupId, CONVERT(int, j.value) FROM OPENJSON(@ids) j
            WHERE NOT EXISTS (
                SELECT 1 FROM TeachingGroupSections tgs
                WHERE tgs.TeachingGroupId = @groupId AND tgs.SectionId = CONVERT(int, j.value)
            );
        `);
}

function syncTeachingGroupSections(groupId, sectionIds) {
    return withTeachingGroupLock(db => writeGroupMembers(db, groupId, sectionIds));
}

module.exports = {
    getAllTeachingGroupSections, getTeachingGroupSectionById, getByTeachingGroupId,
    createTeachingGroupSection: data => changeMembership(data),
    updateTeachingGroupSection: (id, data) => changeMembership(data, id),
    deleteTeachingGroupSection, syncTeachingGroupSections, validateMembership, withTeachingGroupLock, writeGroupMembers
};
