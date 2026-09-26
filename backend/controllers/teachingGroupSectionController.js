const teachingGroupSectionService =
    require("../services/teachingGroupSectionService");

const teachingGroupService =
    require("../services/teachingGroupService");


// ======================================================
// GET ALL
// ======================================================

const getAllTeachingGroupSections = async (
    req,
    res
) => {

    try {

        const data =
            await teachingGroupSectionService
                .getAllTeachingGroupSections();


        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "GET GROUP SECTIONS ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to get Teaching Group Sections",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY GROUP
// ======================================================

const getByTeachingGroupId = async (
    req,
    res
) => {

    try {

        const teachingGroupId =
            Number(
                req.params.teachingGroupId
            );


        const data =
            await teachingGroupSectionService
                .getByTeachingGroupId(
                    teachingGroupId
                );


        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "GET GROUP SECTIONS ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to get group sections",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getTeachingGroupSectionById = async (
    req,
    res
) => {

    try {

        const data =
            await teachingGroupSectionService
                .getTeachingGroupSectionById(
                    req.params.id
                );


        if (!data) {

            return res.status(404).json({
                message:
                    "Teaching Group Section not found."
            });
        }


        return res.status(200).json(
            data
        );

    } catch (error) {

        return res.status(500).json({
            message:
                "Failed to get Teaching Group Section",
            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createTeachingGroupSection = async (
    req,
    res
) => {

    try {

        const teachingGroupId =
            Number(
                req.body.TeachingGroupId
            );

        const sectionId =
            Number(
                req.body.SectionId
            );


        if (
            !Number.isInteger(
                teachingGroupId
            ) ||
            !Number.isInteger(
                sectionId
            )
        ) {

            return res.status(400).json({
                message:
                    "Valid TeachingGroupId and SectionId are required."
            });
        }


        const result =
            await teachingGroupSectionService
                .createTeachingGroupSection({

                    TeachingGroupId:
                        teachingGroupId,

                    SectionId:
                        sectionId
                });


        return res.status(201).json({

            message:
                "Section added to Teaching Group.",

            data:
                result
        });


    } catch (error) {

        console.error(
            "CREATE GROUP SECTION ERROR:",
            error
        );


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "This section is already assigned to this Teaching Group."
            });
        }


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Teaching Group or Section."
            });
        }


        return res.status(500).json({
            message:
                "Failed to add Section",
            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateTeachingGroupSection = async (
    req,
    res
) => {

    try {

        const id =
            Number(req.params.id);


        const existing =
            await teachingGroupSectionService
                .getTeachingGroupSectionById(
                    id
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Teaching Group Section not found."
            });
        }


        await teachingGroupSectionService
            .updateTeachingGroupSection(
                id,
                {
                    TeachingGroupId:
                        Number(
                            req.body.TeachingGroupId
                        ),

                    SectionId:
                        Number(
                            req.body.SectionId
                        )
                }
            );


        return res.status(200).json({
            message:
                "Teaching Group Section updated."
        });


    } catch (error) {

        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "This Section is already assigned to the group."
            });
        }


        return res.status(500).json({
            message:
                "Failed to update mapping",
            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteTeachingGroupSection = async (
    req,
    res
) => {

    try {

        const existing =
            await teachingGroupSectionService
                .getTeachingGroupSectionById(
                    req.params.id
                );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Teaching Group Section not found."
            });
        }


        await teachingGroupSectionService
            .deleteTeachingGroupSection(
                req.params.id
            );


        return res.status(200).json({
            message:
                "Section removed from Teaching Group."
        });


    } catch (error) {

        return res.status(500).json({
            message:
                "Failed to remove Section",
            error:
                error.message
        });
    }
};


// ======================================================
// SYNC SECTIONS
// ======================================================

const syncTeachingGroupSections = async (
    req,
    res
) => {

    try {

        const teachingGroupId =
            Number(
                req.params.teachingGroupId
            );


        const group =
            await teachingGroupService
                .getTeachingGroupById(
                    teachingGroupId
                );


        if (!group) {

            return res.status(404).json({
                message:
                    "Teaching Group not found."
            });
        }


        if (
            !Array.isArray(
                req.body.SectionIds
            )
        ) {

            return res.status(400).json({
                message:
                    "SectionIds must be an array."
            });
        }


        const sectionIds =
            [...new Set(
                req.body.SectionIds.map(
                    Number
                )
            )];


        if (
            sectionIds.some(
                (id) =>
                    !Number.isInteger(id) ||
                    id <= 0
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid Section ID."
            });
        }


        const sections =
            await teachingGroupSectionService
                .getSectionsByIds(
                    sectionIds
                );


        if (
            sections.length !==
            sectionIds.length
        ) {

            return res.status(400).json({
                message:
                    "One or more selected Sections do not exist."
            });
        }


        const mismatch =
            sections.find(
                (section) =>

                    Number(
                        section.CampusId
                    ) !==
                    Number(
                        group.CampusId
                    )

                    ||

                    Number(
                        section.AcademicSessionId
                    ) !==
                    Number(
                        group.AcademicSessionId
                    )

                    ||

                    Number(
                        section.ClassYearId
                    ) !==
                    Number(
                        group.ClassYearId
                    )
            );


        if (mismatch) {

            return res.status(400).json({

                message:
                    "All selected Sections must belong to the same Campus, Academic Session and Class Year as the Teaching Group."
            });
        }


        await teachingGroupSectionService
            .syncTeachingGroupSections(
                teachingGroupId,
                sectionIds
            );


        return res.status(200).json({

            message:
                "Teaching Group Sections updated successfully."
        });


    } catch (error) {

        console.error(
            "SYNC GROUP SECTIONS ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to update Teaching Group Sections",
            error:
                error.message
        });
    }
};


module.exports = {

    getAllTeachingGroupSections,

    getByTeachingGroupId,

    getTeachingGroupSectionById,

    createTeachingGroupSection,

    updateTeachingGroupSection,

    deleteTeachingGroupSection,

    syncTeachingGroupSections
};