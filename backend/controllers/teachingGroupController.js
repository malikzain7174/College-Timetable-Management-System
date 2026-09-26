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

const createTeachingGroup = async (
    req,
    res
) => {

    try {

        const {
            GroupName,
            CampusId,
            AcademicSessionId,
            ClassYearId,
            IsActive
        } = req.body;


        if (!GroupName?.trim()) {

            return res.status(400).json({
                message:
                    "Group Name is required."
            });
        }


        const campusId =
            Number(CampusId);

        const academicSessionId =
            Number(AcademicSessionId);

        const classYearId =
            Number(ClassYearId);


        if (
            !Number.isInteger(campusId) ||
            campusId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Campus is required."
            });
        }


        if (
            !Number.isInteger(
                academicSessionId
            ) ||
            academicSessionId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Academic Session is required."
            });
        }


        if (
            !Number.isInteger(classYearId) ||
            classYearId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Class Year is required."
            });
        }


        const duplicate =
            await teachingGroupService
                .findDuplicateTeachingGroup(
                    GroupName.trim(),
                    campusId,
                    academicSessionId,
                    classYearId
                );


        if (duplicate) {

            return res.status(409).json({
                message:
                    "A Teaching Group with this name already exists for the selected campus, session and class year."
            });
        }


        const result =
            await teachingGroupService
                .createTeachingGroup({

                    GroupName:
                        GroupName.trim(),

                    CampusId:
                        campusId,

                    AcademicSessionId:
                        academicSessionId,

                    ClassYearId:
                        classYearId,

                    IsActive:
                        parseBoolean(
                            IsActive,
                            true
                        )
                });


        return res.status(201).json({

            message:
                "Teaching Group created successfully.",

            teachingGroupId:
                result.TeachingGroupId
        });


    } catch (error) {

        console.error(
            "CREATE TEACHING GROUP ERROR:",
            error
        );


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Campus, Academic Session or Class Year."
            });
        }


        return res.status(500).json({
            message:
                "Failed to create Teaching Group",
            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateTeachingGroup = async (
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


        const existing =
            await teachingGroupService
                .getTeachingGroupById(id);


        if (!existing) {

            return res.status(404).json({
                message:
                    "Teaching Group not found."
            });
        }


        const {
            GroupName,
            CampusId,
            AcademicSessionId,
            ClassYearId,
            IsActive
        } = req.body;


        if (!GroupName?.trim()) {

            return res.status(400).json({
                message:
                    "Group Name is required."
            });
        }


        const campusId =
            Number(CampusId);

        const academicSessionId =
            Number(AcademicSessionId);

        const classYearId =
            Number(ClassYearId);


        if (
            !Number.isInteger(campusId) ||
            campusId <= 0 ||
            !Number.isInteger(
                academicSessionId
            ) ||
            academicSessionId <= 0 ||
            !Number.isInteger(classYearId) ||
            classYearId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Campus, Academic Session and Class Year are required."
            });
        }


        const duplicate =
            await teachingGroupService
                .findDuplicateTeachingGroup(
                    GroupName.trim(),
                    campusId,
                    academicSessionId,
                    classYearId,
                    id
                );


        if (duplicate) {

            return res.status(409).json({
                message:
                    "Another Teaching Group with this name already exists."
            });
        }


        await teachingGroupService
            .updateTeachingGroup(
                id,
                {

                    GroupName:
                        GroupName.trim(),

                    CampusId:
                        campusId,

                    AcademicSessionId:
                        academicSessionId,

                    ClassYearId:
                        classYearId,

                    IsActive:
                        parseBoolean(
                            IsActive,
                            true
                        )
                }
            );


        return res.status(200).json({
            message:
                "Teaching Group updated successfully."
        });


    } catch (error) {

        console.error(
            "UPDATE TEACHING GROUP ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to update Teaching Group",
            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

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