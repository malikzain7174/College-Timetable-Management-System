const {
    sql,
    poolPromise
} = require("../config/db");


// ======================================================
// GET ALL DEPARTMENTS
// ======================================================

const getAllDepartments = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()
            .query(`

                SELECT
                    DepartmentId,
                    DepartmentName,
                    DepartmentCode,
                    IsActive,
                    CreatedAt

                FROM Departments

                ORDER BY
                    DepartmentName
            `);


    return result.recordset;
};


// ======================================================
// GET BY ID
// ======================================================

const getDepartmentById = async (
    id
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "DepartmentId",
                sql.Int,
                Number(id)
            )

            .query(`

                SELECT
                    DepartmentId,
                    DepartmentName,
                    DepartmentCode,
                    IsActive,
                    CreatedAt

                FROM Departments

                WHERE
                    DepartmentId =
                    @DepartmentId
            `);


    return result.recordset[0];
};


// ======================================================
// CHECK DUPLICATE
// ======================================================

const findDuplicateDepartment =
    async (
        departmentName,
        departmentCode,
        excludeDepartmentId = null
    ) => {

        const pool =
            await poolPromise;


        const request =
            pool.request()

                .input(
                    "DepartmentName",
                    sql.NVarChar(100),
                    departmentName
                )

                .input(
                    "DepartmentCode",
                    sql.NVarChar(20),
                    departmentCode
                );


        let query = `

            SELECT TOP 1
                DepartmentId,
                DepartmentName,
                DepartmentCode

            FROM Departments

            WHERE
            (
                LOWER(DepartmentName) =
                LOWER(@DepartmentName)

                OR

                LOWER(DepartmentCode) =
                LOWER(@DepartmentCode)
            )
        `;


        if (
            excludeDepartmentId !== null
        ) {

            request.input(
                "ExcludeDepartmentId",
                sql.Int,
                Number(
                    excludeDepartmentId
                )
            );


            query += `

                AND DepartmentId <>
                    @ExcludeDepartmentId
            `;
        }


        const result =
            await request.query(
                query
            );


        return result.recordset[0];
    };


// ======================================================
// CREATE DEPARTMENT
// ======================================================

const createDepartment = async (
    department
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "DepartmentName",
                sql.NVarChar(100),
                department.DepartmentName
            )

            .input(
                "DepartmentCode",
                sql.NVarChar(20),
                department.DepartmentCode
            )

            .input(
                "IsActive",
                sql.Bit,
                department.IsActive
            )

            .query(`

                INSERT INTO Departments
                (
                    DepartmentName,
                    DepartmentCode,
                    IsActive,
                    CreatedAt
                )

                OUTPUT
                    INSERTED.DepartmentId

                VALUES
                (
                    @DepartmentName,
                    @DepartmentCode,
                    @IsActive,
                    SYSDATETIME()
                );
            `);


    return result.recordset[0];
};


// ======================================================
// UPDATE DEPARTMENT
// ======================================================

const updateDepartment = async (
    id,
    department
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "DepartmentId",
                sql.Int,
                Number(id)
            )

            .input(
                "DepartmentName",
                sql.NVarChar(100),
                department.DepartmentName
            )

            .input(
                "DepartmentCode",
                sql.NVarChar(20),
                department.DepartmentCode
            )

            .input(
                "IsActive",
                sql.Bit,
                department.IsActive
            )

            .query(`

                UPDATE Departments

                SET
                    DepartmentName =
                        @DepartmentName,

                    DepartmentCode =
                        @DepartmentCode,

                    IsActive =
                        @IsActive

                WHERE
                    DepartmentId =
                        @DepartmentId
            `);


    return (
        result.rowsAffected[0] ||
        0
    );
};


// ======================================================
// DELETE DEPARTMENT
// ======================================================

const deleteDepartment = async (
    id
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "DepartmentId",
                sql.Int,
                Number(id)
            )

            .query(`

                DELETE FROM Departments

                WHERE
                    DepartmentId =
                    @DepartmentId
            `);


    return (
        result.rowsAffected[0] ||
        0
    );
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    getAllDepartments,

    getDepartmentById,

    findDuplicateDepartment,

    createDepartment,

    updateDepartment,

    deleteDepartment
};