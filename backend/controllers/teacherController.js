const teacherService =
    require(
        "../services/teacherService"
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
// NORMALIZE ID ARRAY
// ======================================================

const normalizeIds =
    value => {

        if (!Array.isArray(value)) {
            return [];
        }


        return [
            ...new Set(
                value
                    .map(Number)
                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];
    };


// ======================================================
// VALIDATE TEACHER
// ======================================================

const validateTeacher =
    async (
        body,
        excludeTeacherId = null
    ) => {

        const EmployeeCode =
            String(
                body.EmployeeCode || ""
            ).trim();


        const FirstName =
            String(
                body.FirstName || ""
            ).trim();


        const LastName =
            String(
                body.LastName || ""
            ).trim();


        const Email =
            String(
                body.Email || ""
            ).trim();


        const Phone =
            String(
                body.Phone || ""
            ).trim();


        const Designation =
            String(
                body.Designation || ""
            ).trim();


        const DepartmentIds =
            normalizeIds(
                body.DepartmentIds
            );


        const SubjectIds =
            normalizeIds(
                body.SubjectIds
            );


        // ==================================================
        // BASIC VALIDATION
        // ==================================================

        if (!EmployeeCode) {

            return {
                error:
                    "Employee Code is required."
            };
        }


        if (!FirstName) {

            return {
                error:
                    "First Name is required."
            };
        }


        if (
            Email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(Email)
        ) {

            return {
                error:
                    "Invalid email address."
            };
        }


        // ==================================================
        // DEPARTMENT VALIDATION
        // ==================================================

        if (
            DepartmentIds.length ===
            0
        ) {

            return {
                error:
                    "Please select at least one department."
            };
        }


        const validDepartments =
            await teacherService
                .departmentsExist(
                    DepartmentIds
                );


        if (!validDepartments) {

            return {
                error:
                    "One or more selected departments are invalid or inactive."
            };
        }


        // ==================================================
        // SUBJECT VALIDATION
        // ==================================================

        if (
            SubjectIds.length ===
            0
        ) {

            return {
                error:
                    "Please select at least one subject."
            };
        }


        const selectedSubjects =
            await teacherService
                .getSubjectsByIds(
                    SubjectIds
                );


        if (
            selectedSubjects.length !==
            SubjectIds.length
        ) {

            return {
                error:
                    "One or more selected subjects do not exist."
            };
        }


        if (
            selectedSubjects.some(
                subject =>
                    !subject.IsActive
            )
        ) {

            return {
                error:
                    "One or more selected subjects are inactive."
            };
        }


        // ==================================================
        // IMPORTANT
        //
        // Subject ko DepartmentId ke saath compare
        // NAHI karna.
        //
        // Teacher ke Departments aur Subjects
        // independent selections hain.
        //
        // Example:
        //
        // Teacher Departments:
        // C.GEO + PRINCIPAL OF ECONOMICS
        //
        // Teacher Subjects:
        // English + Islamiat + Economics
        //
        // allowed hai.
        // ==================================================


        // ==================================================
        // EMPLOYEE CODE DUPLICATE
        // ==================================================

        const duplicate =
            await teacherService
                .getTeacherByEmployeeCode(
                    EmployeeCode,
                    excludeTeacherId
                );


        if (duplicate) {

            return {
                error:
                    "Employee Code already exists.",

                status:
                    409
            };
        }


        // ==================================================
        // CLEAN DATA
        // ==================================================

        return {

            data: {

                DepartmentIds,

                SubjectIds,

                EmployeeCode,

                FirstName,

                LastName:
                    LastName || null,

                Email:
                    Email || null,

                Phone:
                    Phone || null,

                Designation:
                    Designation || null,

                IsActive:
                    parseBoolean(
                        body.IsActive,
                        true
                    )
            }
        };
    };


// ======================================================
// GET ALL TEACHERS
// ======================================================

const getAllTeachers =
    async (
        req,
        res
    ) => {

        try {

            const teachers =
                await teacherService
                    .getAllTeachers();


            return res
                .status(200)
                .json(
                    teachers
                );


        } catch (error) {

            console.error(
                "GET TEACHERS ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to get teachers",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// GET TEACHER BY ID
// ======================================================

const getTeacherById =
    async (
        req,
        res
    ) => {

        try {

            const teacherId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    teacherId
                ) ||
                teacherId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid Teacher ID."
                    });
            }


            const teacher =
                await teacherService
                    .getTeacherById(
                        teacherId
                    );


            if (!teacher) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Teacher not found."
                    });
            }


            return res
                .status(200)
                .json(
                    teacher
                );


        } catch (error) {

            console.error(
                "GET TEACHER ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to get teacher",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// CREATE TEACHER
// ======================================================

const createTeacher =
    async (
        req,
        res
    ) => {

        try {

            const validation =
                await validateTeacher(
                    req.body
                );


            if (validation.error) {

                return res
                    .status(
                        validation.status ||
                        400
                    )
                    .json({

                        message:
                            validation.error
                    });
            }


            const teacher =
                await teacherService
                    .createTeacher(
                        validation.data
                    );


            return res
                .status(201)
                .json({

                    message:
                        "Teacher Added Successfully",

                    teacher
                });


        } catch (error) {

            console.error(
                "CREATE TEACHER ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Employee Code already exists or duplicate teacher relation was attempted."
                    });
            }


            if (
                error.number === 547
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "One or more selected departments or subjects are invalid."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to create teacher",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// UPDATE TEACHER
// ======================================================

const updateTeacher =
    async (
        req,
        res
    ) => {

        try {

            const teacherId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    teacherId
                ) ||
                teacherId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid Teacher ID."
                    });
            }


            const existing =
                await teacherService
                    .getTeacherById(
                        teacherId
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Teacher not found."
                    });
            }


            const validation =
                await validateTeacher(
                    req.body,
                    teacherId
                );


            if (validation.error) {

                return res
                    .status(
                        validation.status ||
                        400
                    )
                    .json({

                        message:
                            validation.error
                    });
            }


            await teacherService
                .updateTeacher(
                    teacherId,
                    validation.data
                );


            return res
                .status(200)
                .json({

                    message:
                        "Teacher Updated Successfully"
                });


        } catch (error) {

            console.error(
                "UPDATE TEACHER ERROR:",
                error
            );


            if (
                error.number === 2601 ||
                error.number === 2627
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Employee Code already exists or duplicate teacher relation was attempted."
                    });
            }


            if (
                error.number === 547
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "One or more selected departments or subjects are invalid."
                    });
            }


            return res
                .status(500)
                .json({

                    message:
                        "Failed to update teacher",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// DELETE TEACHER
// ======================================================

const deleteTeacher =
    async (
        req,
        res
    ) => {

        const teacherId =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(
                teacherId
            ) ||
            teacherId <= 0
        ) {

            return res
                .status(400)
                .json({

                    message:
                        "Invalid Teacher ID."
                });
        }


        try {

            const existing =
                await teacherService
                    .getTeacherById(
                        teacherId
                    );


            if (!existing) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Teacher not found."
                    });
            }


            try {

                await teacherService
                    .deleteTeacher(
                        teacherId
                    );


                return res
                    .status(200)
                    .json({

                        message:
                            "Teacher Deleted Successfully"
                    });


            } catch (deleteError) {

                if (
                    deleteError.number ===
                    547
                ) {

                    await teacherService
                        .deactivateTeacher(
                            teacherId
                        );


                    return res
                        .status(200)
                        .json({

                            message:
                                "Teacher is already used in timetable/academic records, so it was deactivated instead of permanently deleted.",

                            deactivated:
                                true
                        });
                }


                throw deleteError;
            }


        } catch (error) {

            console.error(
                "DELETE TEACHER ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    message:
                        "Failed to delete teacher",

                    error:
                        error.message
                });
        }
    };


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getAllTeachers,

    getTeacherById,

    createTeacher,

    updateTeacher,

    deleteTeacher
};