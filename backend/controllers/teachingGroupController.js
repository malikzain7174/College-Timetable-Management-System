const { HttpError, positiveId } = require("../lib/httpError");
const teachingGroupService =
    require("../services/teachingGroupService");


const parseBoolean = (
    value,
    defaultValue = true
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return defaultValue;
    }

    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
};


// ======================================================
// GET ALL
// ======================================================

const getAllTeachingGroups = async (
    req,
    res
) => {

    try {

        const data =
            await teachingGroupService
                .getAllTeachingGroups();

        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "GET TEACHING GROUPS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get Teaching Groups",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getTeachingGroupById = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        if (!Number.isInteger(id)) {

            return res.status(400).json({
                message:
                    "Invalid Teaching Group ID."
            });
        }


        const data =
            await teachingGroupService
                .getTeachingGroupById(id);


        if (!data) {

            return res.status(404).json({
                message:
                    "Teaching Group not found."
            });
        }


        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "GET TEACHING GROUP ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get Teaching Group",
            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

function groupInput(body = {}) {
    const { GroupName, CampusId, AcademicSessionId, ClassYearId, IsActive, SectionIds } = body;
    if (typeof GroupName !== "string" || !GroupName.trim() || GroupName.trim().length > 100) {
        throw new HttpError(400, "Enter a group name of at most 100 characters.");
    }
    if (SectionIds !== undefined && !Array.isArray(SectionIds)) {
        throw new HttpError(400, "SectionIds must be an array.");
    }
    return {
        GroupName: GroupName.trim(), CampusId: positiveId(CampusId, "campus"),
        AcademicSessionId: positiveId(AcademicSessionId, "academic session"),
        ClassYearId: positiveId(ClassYearId, "class year"),
        IsActive: parseBoolean(IsActive, true),
        SectionIds: SectionIds && [...new Set(SectionIds.map(id => positiveId(id, "section ID")))]
    };
}

async function createTeachingGroup(req, res) {
    const result = await teachingGroupService.createTeachingGroup(groupInput(req.body || {}));
    res.status(201).json({ message: "Teaching group created.", teachingGroupId: result.TeachingGroupId });
}

async function updateTeachingGroup(req, res) {
    await teachingGroupService.updateTeachingGroup(positiveId(req.params.id, "teaching group ID"), groupInput(req.body || {}));
    res.json({ message: "Teaching group updated." });
}

const deleteTeachingGroup = async (
    req,
    res
) => {

    const id =
        Number(req.params.id);


    if (!Number.isInteger(id)) {

        return res.status(400).json({
            message:
                "Invalid Teaching Group ID."
        });
    }


    try {

        const existing =
            await teachingGroupService
                .getTeachingGroupById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Teaching Group not found."
            });
        }


        try {

            await teachingGroupService
                .deleteTeachingGroup(id);


            return res.status(200).json({
                message:
                    "Teaching Group deleted successfully."
            });


        } catch (deleteError) {


            if (deleteError.number === 547) {

                await teachingGroupService
                    .deactivateTeachingGroup(id);


                return res.status(200).json({

                    message:
                        "Teaching Group is already used by another module, so it was deactivated instead of permanently deleted.",

                    deactivated:
                        true
                });
            }


            throw deleteError;
        }


    } catch (error) {

        console.error(
            "DELETE TEACHING GROUP ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to delete Teaching Group",
            error:
                error.message
        });
    }
};


module.exports = {

    getAllTeachingGroups,

    getTeachingGroupById,

    createTeachingGroup,

    updateTeachingGroup,

    deleteTeachingGroup
};