const {
    sql,
    poolPromise
} = require("../config/db");


// ======================================================
// ATTACH DEPARTMENTS + SUBJECTS
// ======================================================

const attachTeacherRelations =
    async (
        pool,
        teachers
    ) => {

        if (!teachers.length) {

            return teachers;
        }


        const teacherIds =
            teachers.map(
                teacher =>
                    Number(
                        teacher.TeacherId
                    )
            );


        // ==================================================
        // DEPARTMENTS
        // ==================================================

        const departmentRequest =
            pool.request();


        const departmentPlaceholders =
            teacherIds.map(
                (
                    teacherId,
                    index
                ) => {

                    const name =
                        `TeacherDepartmentId${index}`;


                    departmentRequest.input(
                        name,
                        sql.Int,
                        teacherId
                    );


                    return `@${name}`;
                }
            );


        const departmentResult =
            await departmentRequest.query(`

                SELECT
                    td.TeacherId,

                    d.DepartmentId,
                    d.DepartmentName,
                    d.DepartmentCode,
                    d.IsActive

                FROM TeacherDepartments td

                INNER JOIN Departments d
                    ON d.DepartmentId =
                       td.DepartmentId

                WHERE
                    td.TeacherId IN
                    (
                        ${departmentPlaceholders.join(",")}
                    )

                ORDER BY
                    d.DepartmentName
            `);


        // ==================================================
        // SUBJECTS
        // ==================================================

        const subjectRequest =
            pool.request();


        const subjectPlaceholders =
            teacherIds.map(
                (
                    teacherId,
                    index
                ) => {

                    const name =
                        `TeacherSubjectId${index}`;


                    subjectRequest.input(
                        name,
                        sql.Int,
                        teacherId
                    );


                    return `@${name}`;
                }
            );


        const subjectResult =
            await subjectRequest.query(`

                SELECT
                    ts.TeacherId,

                    s.SubjectId,
                    s.SubjectCode,
                    s.SubjectName,
                    s.DepartmentId,
                    s.IsActive

                FROM TeacherSubjects ts

                INNER JOIN Subjects s
                    ON s.SubjectId =
                       ts.SubjectId

                WHERE
                    ts.TeacherId IN
                    (
                        ${subjectPlaceholders.join(",")}
                    )

                ORDER BY
                    s.SubjectName
            `);


        // ==================================================
        // BUILD DEPARTMENT MAP
        // ==================================================

        const departmentMap =
            new Map();


        for (
            const row
            of departmentResult.recordset
        ) {

            if (
                !departmentMap.has(
                    row.TeacherId
                )
            ) {

                departmentMap.set(
                    row.TeacherId,
                    []
                );
            }


            departmentMap
                .get(
                    row.TeacherId
                )
                .push({

                    DepartmentId:
                        row.DepartmentId,

                    DepartmentName:
                        row.DepartmentName,

                    DepartmentCode:
                        row.DepartmentCode,

                    IsActive:
                        row.IsActive
                });
        }


        // ==================================================
        // BUILD SUBJECT MAP
        // ==================================================

        const subjectMap =
            new Map();


        for (
            const row
            of subjectResult.recordset
        ) {

            if (
                !subjectMap.has(
                    row.TeacherId
                )
            ) {

                subjectMap.set(
                    row.TeacherId,
                    []
                );
            }


            subjectMap
                .get(
                    row.TeacherId
                )
                .push({

                    SubjectId:
                        row.SubjectId,

                    SubjectCode:
                        row.SubjectCode,

                    SubjectName:
                        row.SubjectName,

                    DepartmentId:
                        row.DepartmentId,

                    IsActive:
                        row.IsActive
                });
        }


        // ==================================================
        // MERGE
        // ==================================================

        return teachers.map(
            teacher => {

                const departments =
                    departmentMap.get(
                        teacher.TeacherId
                    ) || [];


                const subjects =
                    subjectMap.get(
                        teacher.TeacherId
                    ) || [];


                return {

                    ...teacher,


                    // DEPARTMENTS

                    DepartmentIds:
                        departments.map(
                            item =>
                                item.DepartmentId
                        ),

                    Departments:
                        departments,

                    DepartmentNames:
                        departments
                            .map(
                                item =>
                                    item.DepartmentName
                            )
                            .join(", "),


                    // SUBJECTS

                    SubjectIds:
                        subjects.map(
                            item =>
                                item.SubjectId
                        ),

                    Subjects:
                        subjects,

                    SubjectNames:
                        subjects
                            .map(
                                item =>
                                    item.SubjectName
                            )
                            .join(", ")
                };
            }
        );
    };


// ======================================================
// GET ALL TEACHERS
// ======================================================

const getAllTeachers =
    async () => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()
                .query(`

                    SELECT
                        TeacherId,
                        DepartmentId,
                        EmployeeCode,
                        FirstName,
                        LastName,
                        Email,
                        Phone,
                        Designation,
                        IsActive,
                        CreatedAt

                    FROM Teachers

                    ORDER BY
                        TeacherId
                `);


        return attachTeacherRelations(
            pool,
            result.recordset
        );
    };


// ======================================================
// GET BY ID
// ======================================================

const getTeacherById =
    async (
        id
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TeacherId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    SELECT
                        TeacherId,
                        DepartmentId,
                        EmployeeCode,
                        FirstName,
                        LastName,
                        Email,
                        Phone,
                        Designation,
                        IsActive,
                        CreatedAt

                    FROM Teachers

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


        if (
            !result.recordset[0]
        ) {

            return undefined;
        }


        const rows =
            await attachTeacherRelations(
                pool,
                result.recordset
            );


        return rows[0];
    };


// ======================================================
// EMPLOYEE CODE
// ======================================================

const getTeacherByEmployeeCode =
    async (
        employeeCode,
        excludeTeacherId = null
    ) => {

        const pool =
            await poolPromise;


        const request =
            pool.request()

                .input(
                    "EmployeeCode",
                    sql.NVarChar(30),
                    employeeCode
                );


        let query = `

            SELECT
                TeacherId,
                EmployeeCode

            FROM Teachers

            WHERE
                EmployeeCode =
                @EmployeeCode
        `;


        if (
            excludeTeacherId !== null
        ) {

            request.input(
                "ExcludeTeacherId",
                sql.Int,
                Number(
                    excludeTeacherId
                )
            );


            query += `

                AND TeacherId <>
                    @ExcludeTeacherId
            `;
        }


        const result =
            await request.query(
                query
            );


        return result.recordset[0];
    };


// ======================================================
// CHECK DEPARTMENTS
// ======================================================

const departmentsExist =
    async (
        departmentIds
    ) => {

        if (
            !departmentIds.length
        ) {

            return true;
        }


        const uniqueIds =
            [
                ...new Set(
                    departmentIds
                        .map(Number)
                )
            ];


        const pool =
            await poolPromise;


        const request =
            pool.request();


        const placeholders =
            uniqueIds.map(
                (
                    departmentId,
                    index
                ) => {

                    const name =
                        `DepartmentId${index}`;


                    request.input(
                        name,
                        sql.Int,
                        departmentId
                    );


                    return `@${name}`;
                }
            );


        const result =
            await request.query(`

                SELECT
                    DepartmentId

                FROM Departments

                WHERE
                    IsActive = 1

                    AND DepartmentId IN
                    (
                        ${placeholders.join(",")}
                    )
            `);


        return (
            result.recordset.length ===
            uniqueIds.length
        );
    };


// ======================================================
// GET SELECTED SUBJECTS
// ======================================================

const getSubjectsByIds =
    async (
        subjectIds
    ) => {

        if (
            !subjectIds.length
        ) {

            return [];
        }


        const uniqueIds =
            [
                ...new Set(
                    subjectIds
                        .map(Number)
                )
            ];


        const pool =
            await poolPromise;


        const request =
            pool.request();


        const placeholders =
            uniqueIds.map(
                (
                    subjectId,
                    index
                ) => {

                    const name =
                        `SubjectId${index}`;


                    request.input(
                        name,
                        sql.Int,
                        subjectId
                    );


                    return `@${name}`;
                }
            );


        const result =
            await request.query(`

                SELECT
                    SubjectId,
                    SubjectCode,
                    SubjectName,
                    DepartmentId,
                    IsActive

                FROM Subjects

                WHERE
                    SubjectId IN
                    (
                        ${placeholders.join(",")}
                    )
            `);


        return result.recordset;
    };


// ======================================================
// INSERT DEPARTMENT MAPPINGS
// ======================================================

const insertDepartmentMappings =
    async (
        transaction,
        teacherId,
        departmentIds
    ) => {

        const uniqueIds =
            [
                ...new Set(
                    departmentIds
                        .map(Number)
                )
            ];


        for (
            const departmentId
            of uniqueIds
        ) {

            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .input(
                    "DepartmentId",
                    sql.Int,
                    departmentId
                )

                .query(`

                    INSERT INTO TeacherDepartments
                    (
                        TeacherId,
                        DepartmentId
                    )

                    VALUES
                    (
                        @TeacherId,
                        @DepartmentId
                    );
                `);
        }
    };


// ======================================================
// INSERT SUBJECT MAPPINGS
// ======================================================

const insertSubjectMappings =
    async (
        transaction,
        teacherId,
        subjectIds
    ) => {

        const uniqueIds =
            [
                ...new Set(
                    subjectIds
                        .map(Number)
                )
            ];


        for (
            const subjectId
            of uniqueIds
        ) {

            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .input(
                    "SubjectId",
                    sql.Int,
                    subjectId
                )

                .query(`

                    INSERT INTO TeacherSubjects
                    (
                        TeacherId,
                        SubjectId
                    )

                    VALUES
                    (
                        @TeacherId,
                        @SubjectId
                    );
                `);
        }
    };


// ======================================================
// CREATE TEACHER
// ======================================================

const createTeacher =
    async (
        teacher
    ) => {

        const pool =
            await poolPromise;


        const transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin();


        try {

            const departmentIds =
                teacher.DepartmentIds ||
                [];


            const subjectIds =
                teacher.SubjectIds ||
                [];


            // Keep first department in old column
            // for backward compatibility.
            const primaryDepartmentId =
                departmentIds.length
                    ? departmentIds[0]
                    : null;


            const result =
                await new sql.Request(
                    transaction
                )

                    .input(
                        "DepartmentId",
                        sql.Int,
                        primaryDepartmentId
                    )

                    .input(
                        "EmployeeCode",
                        sql.NVarChar(30),
                        teacher.EmployeeCode
                    )

                    .input(
                        "FirstName",
                        sql.NVarChar(50),
                        teacher.FirstName
                    )

                    .input(
                        "LastName",
                        sql.NVarChar(50),
                        teacher.LastName ||
                        null
                    )

                    .input(
                        "Email",
                        sql.NVarChar(150),
                        teacher.Email ||
                        null
                    )

                    .input(
                        "Phone",
                        sql.NVarChar(30),
                        teacher.Phone ||
                        null
                    )

                    .input(
                        "Designation",
                        sql.NVarChar(100),
                        teacher.Designation ||
                        null
                    )

                    .input(
                        "IsActive",
                        sql.Bit,
                        teacher.IsActive
                    )

                    .query(`

                        INSERT INTO Teachers
                        (
                            DepartmentId,
                            EmployeeCode,
                            FirstName,
                            LastName,
                            Email,
                            Phone,
                            Designation,
                            IsActive,
                            CreatedAt
                        )

                        OUTPUT
                            INSERTED.TeacherId

                        VALUES
                        (
                            @DepartmentId,
                            @EmployeeCode,
                            @FirstName,
                            @LastName,
                            @Email,
                            @Phone,
                            @Designation,
                            @IsActive,
                            SYSDATETIME()
                        );
                    `);


            const teacherId =
                result.recordset[0]
                    .TeacherId;


            await insertDepartmentMappings(
                transaction,
                teacherId,
                departmentIds
            );


            await insertSubjectMappings(
                transaction,
                teacherId,
                subjectIds
            );


            await transaction.commit();


            return {

                TeacherId:
                    teacherId
            };


        } catch (error) {

            await transaction.rollback();


            throw error;
        }
    };


// ======================================================
// UPDATE TEACHER
// ======================================================

const updateTeacher =
    async (
        id,
        teacher
    ) => {

        const pool =
            await poolPromise;


        const transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin();


        try {

            const teacherId =
                Number(id);


            const departmentIds =
                teacher.DepartmentIds ||
                [];


            const subjectIds =
                teacher.SubjectIds ||
                [];


            const primaryDepartmentId =
                departmentIds.length
                    ? departmentIds[0]
                    : null;


            const result =
                await new sql.Request(
                    transaction
                )

                    .input(
                        "TeacherId",
                        sql.Int,
                        teacherId
                    )

                    .input(
                        "DepartmentId",
                        sql.Int,
                        primaryDepartmentId
                    )

                    .input(
                        "EmployeeCode",
                        sql.NVarChar(30),
                        teacher.EmployeeCode
                    )

                    .input(
                        "FirstName",
                        sql.NVarChar(50),
                        teacher.FirstName
                    )

                    .input(
                        "LastName",
                        sql.NVarChar(50),
                        teacher.LastName ||
                        null
                    )

                    .input(
                        "Email",
                        sql.NVarChar(150),
                        teacher.Email ||
                        null
                    )

                    .input(
                        "Phone",
                        sql.NVarChar(30),
                        teacher.Phone ||
                        null
                    )

                    .input(
                        "Designation",
                        sql.NVarChar(100),
                        teacher.Designation ||
                        null
                    )

                    .input(
                        "IsActive",
                        sql.Bit,
                        teacher.IsActive
                    )

                    .query(`

                        UPDATE Teachers

                        SET
                            DepartmentId =
                                @DepartmentId,

                            EmployeeCode =
                                @EmployeeCode,

                            FirstName =
                                @FirstName,

                            LastName =
                                @LastName,

                            Email =
                                @Email,

                            Phone =
                                @Phone,

                            Designation =
                                @Designation,

                            IsActive =
                                @IsActive

                        WHERE
                            TeacherId =
                                @TeacherId
                    `);


            // REMOVE OLD DEPARTMENTS

            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .query(`

                    DELETE FROM TeacherDepartments

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


            // REMOVE OLD SUBJECTS

            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .query(`

                    DELETE FROM TeacherSubjects

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


            // ADD NEW

            await insertDepartmentMappings(
                transaction,
                teacherId,
                departmentIds
            );


            await insertSubjectMappings(
                transaction,
                teacherId,
                subjectIds
            );


            await transaction.commit();


            return (
                result.rowsAffected[0] ||
                0
            );


        } catch (error) {

            await transaction.rollback();


            throw error;
        }
    };


// ======================================================
// DELETE TEACHER
// ======================================================

const deleteTeacher =
    async (
        id
    ) => {

        const pool =
            await poolPromise;


        const transaction =
            new sql.Transaction(
                pool
            );


        await transaction.begin();


        try {

            const teacherId =
                Number(id);


            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .query(`

                    DELETE FROM TeacherSubjects

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


            await new sql.Request(
                transaction
            )

                .input(
                    "TeacherId",
                    sql.Int,
                    teacherId
                )

                .query(`

                    DELETE FROM TeacherDepartments

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


            const result =
                await new sql.Request(
                    transaction
                )

                    .input(
                        "TeacherId",
                        sql.Int,
                        teacherId
                    )

                    .query(`

                        DELETE FROM Teachers

                        WHERE
                            TeacherId =
                            @TeacherId
                    `);


            await transaction.commit();


            return (
                result.rowsAffected[0] ||
                0
            );


        } catch (error) {

            await transaction.rollback();


            throw error;
        }
    };


// ======================================================
// DEACTIVATE
// ======================================================

const deactivateTeacher =
    async (
        id
    ) => {

        const pool =
            await poolPromise;


        const result =
            await pool.request()

                .input(
                    "TeacherId",
                    sql.Int,
                    Number(id)
                )

                .query(`

                    UPDATE Teachers

                    SET
                        IsActive = 0

                    WHERE
                        TeacherId =
                        @TeacherId
                `);


        return (
            result.rowsAffected[0] ||
            0
        );
    };


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    getAllTeachers,

    getTeacherById,

    getTeacherByEmployeeCode,

    departmentsExist,

    getSubjectsByIds,

    createTeacher,

    updateTeacher,

    deleteTeacher,

    deactivateTeacher
};