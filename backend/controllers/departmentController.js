const departmentService =
    require(
        "../services/departmentService"
    );


// ======================================================
// BOOLEAN
// ======================================================

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
// VALIDATION
// ======================================================

const validateDepartment =
    body => {

        const DepartmentName =
            String(
                body.DepartmentName ||
                ""
            ).trim();


        const DepartmentCode =
            String(
                body.DepartmentCode ||
                ""
            )
                .trim()
                .toUpperCase();


        if (!DepartmentName) {

            return {

                error:
                    "Department name is required."
            };
        }


        if (!DepartmentCode) {

            return {

                error:
                    "Department code is required."
            };
        }


        return {

            data: {

                DepartmentName,

                DepartmentCode,

                IsActive:
                    parseBoolean(
                        body.IsActive,
                        true
                    )
            }
        };
    };


// ======================================================
// GET ALL
// ======================================================

const getAllDepartments =
    async (
        req,
        res
    ) => {

        try {

            const departments =
                await departmentService
                    .getAllDepartments();


            return res
                .status(200)
                .json(
                    departments
                );


        } catch (error) {

            console.error(
                "GET DEPARTMENTS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to load departments.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// GET BY ID
// ======================================================

const getDepartmentById =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid department."
                    });
            }


            const department =
                await departmentService
                    .getDepartmentById(
                        id
                    );


            if (!department) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Department not found."
                    });
            }


            return res
                .status(200)
                .json(
                    department
                );


        } catch (error) {

            console.error(
                "GET DEPARTMENT ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to load department.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// CREATE
// ======================================================

const createDepartment =
    async (
        req,
        res
    ) => {

        try {

            const validation =
                validateDepartment(
                    req.body
                );


            if (
                validation.error
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            validation.error
                    });
            }


            const duplicate =
                await departmentService
                    .findDuplicateDepartment(

                        validation
                            .data
                            .DepartmentName,

                        validation
                            .data
                            .DepartmentCode
                    );


            if (duplicate) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Department name or code already exists."
                    });
            }


            const department =
                await departmentService
                    .createDepartment(
                        validation.data
                    );


            return res
                .status(201)
                .json({

                    message:
                        "Department added successfully.",

                    department
                });


        } catch (error) {

            console.error(
                "CREATE DEPARTMENT ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to create department.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// UPDATE
// ======================================================

const updateDepartment =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid department."
                    });
            }


            const existing =
                await departmentService
                    .getDepartmentById(
                        id
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Department not found."
                    });
            }


            const validation =
                validateDepartment(
                    req.body
                );


            if (
                validation.error
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            validation.error
                    });
            }


            const duplicate =
                await departmentService
                    .findDuplicateDepartment(

                        validation
                            .data
                            .DepartmentName,

                        validation
                            .data
                            .DepartmentCode,

                        id
                    );


            if (duplicate) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Department name or code already exists."
                    });
            }


            await departmentService
                .updateDepartment(
                    id,
                    validation.data
                );


            return res
                .status(200)
                .json({

                    message:
                        "Department updated successfully."
                });


        } catch (error) {

            console.error(
                "UPDATE DEPARTMENT ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to update department.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// DELETE
// ======================================================

const deleteDepartment =
    async (
        req,
        res
    ) => {

        try {

            const id =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(id) ||
                id <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid department."
                    });
            }


            const existing =
                await departmentService
                    .getDepartmentById(
                        id
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Department not found."
                    });
            }


            await departmentService
                .deleteDepartment(
                    id
                );


            return res
                .status(200)
                .json({

                    message:
                        "Department deleted successfully."
                });


        } catch (error) {

            console.error(
                "DELETE DEPARTMENT ERROR:",
                error
            );


            if (
                error.number === 547
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "This department is already used by subjects or teachers. Deactivate it instead of deleting it."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to delete department.",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getAllDepartments,

    getDepartmentById,

    createDepartment,

    updateDepartment,

    deleteDepartment
};