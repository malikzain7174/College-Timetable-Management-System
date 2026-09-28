const {
    sql,
    poolPromise
} = require("../config/db");


// ======================================================
// HELPERS
// ======================================================

const safeParseJson = value => {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return {};
    }


    if (
        typeof value === "object"
    ) {

        return value;
    }


    try {

        return JSON.parse(
            String(value)
        );

    } catch {

        return {};
    }
};


const normalizeRule = row => {

    return {

        ...row,

        RuleValueObject:
            safeParseJson(
                row.RuleValue
            )

    };
};


// ======================================================
// GET ALL
// ======================================================

const getAllRules = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()
            .query(`

                SELECT
                    RuleId,
                    RuleCode,
                    RuleName,
                    RuleType,
                    ScopeType,
                    ScopeId,
                    RuleValue,
                    IsEnabled,
                    IsMandatory,
                    Priority,
                    Description,
                    CreatedAt,
                    UpdatedAt

                FROM TimetableRules

                ORDER BY
                    Priority,
                    RuleName,
                    RuleId;

            `);


    return result.recordset.map(
        normalizeRule
    );
};


// ======================================================
// GET ENABLED
// ======================================================

const getEnabledRules = async () => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()
            .query(`

                SELECT
                    RuleId,
                    RuleCode,
                    RuleName,
                    RuleType,
                    ScopeType,
                    ScopeId,
                    RuleValue,
                    IsEnabled,
                    IsMandatory,
                    Priority,
                    Description

                FROM TimetableRules

                WHERE
                    IsEnabled = 1

                ORDER BY
                    Priority,
                    RuleId;

            `);


    return result.recordset.map(
        normalizeRule
    );
};


// ======================================================
// GET BY ID
// ======================================================

const getRuleById = async (
    ruleId
) => {

    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "RuleId",
                sql.Int,
                Number(ruleId)
            )

            .query(`

                SELECT
                    RuleId,
                    RuleCode,
                    RuleName,
                    RuleType,
                    ScopeType,
                    ScopeId,
                    RuleValue,
                    IsEnabled,
                    IsMandatory,
                    Priority,
                    Description,
                    CreatedAt,
                    UpdatedAt

                FROM TimetableRules

                WHERE
                    RuleId = @RuleId;

            `);


    if (
        result.recordset.length === 0
    ) {

        return null;
    }


    return normalizeRule(
        result.recordset[0]
    );
};


// ======================================================
// CREATE
// ======================================================

const createRule = async (
    data
) => {

    const pool =
        await poolPromise;


    const ruleValue =
        typeof data.RuleValue ===
        "string"

            ? data.RuleValue

            : JSON.stringify(
                data.RuleValue ||
                {}
            );


    const result =
        await pool.request()

            .input(
                "RuleCode",
                sql.NVarChar(100),
                String(
                    data.RuleCode
                ).trim()
            )

            .input(
                "RuleName",
                sql.NVarChar(200),
                String(
                    data.RuleName
                ).trim()
            )

            .input(
                "RuleType",
                sql.NVarChar(50),
                String(
                    data.RuleType ||
                    "Custom"
                ).trim()
            )

            .input(
                "ScopeType",
                sql.NVarChar(50),
                String(
                    data.ScopeType ||
                    "Global"
                ).trim()
            )

            .input(
                "ScopeId",
                sql.Int,
                data.ScopeId
                    ? Number(
                        data.ScopeId
                    )
                    : null
            )

            .input(
                "RuleValue",
                sql.NVarChar(sql.MAX),
                ruleValue
            )

            .input(
                "IsEnabled",
                sql.Bit,
                data.IsEnabled !==
                false
            )

            .input(
                "IsMandatory",
                sql.Bit,
                data.IsMandatory ===
                true
            )

            .input(
                "Priority",
                sql.Int,
                Number(
                    data.Priority ||
                    100
                )
            )

            .input(
                "Description",
                sql.NVarChar(500),
                data.Description
                    ? String(
                        data.Description
                    ).trim()
                    : null
            )

            .query(`

                INSERT INTO TimetableRules
                (
                    RuleCode,
                    RuleName,
                    RuleType,
                    ScopeType,
                    ScopeId,
                    RuleValue,
                    IsEnabled,
                    IsMandatory,
                    Priority,
                    Description,
                    CreatedAt
                )

                OUTPUT
                    INSERTED.*

                VALUES
                (
                    @RuleCode,
                    @RuleName,
                    @RuleType,
                    @ScopeType,
                    @ScopeId,
                    @RuleValue,
                    @IsEnabled,
                    @IsMandatory,
                    @Priority,
                    @Description,
                    SYSDATETIME()
                );

            `);


    return normalizeRule(
        result.recordset[0]
    );
};


// ======================================================
// UPDATE
// ======================================================

const updateRule = async (
    ruleId,
    data
) => {

    const current =
        await getRuleById(
            ruleId
        );


    if (!current) {

        return null;
    }


    const pool =
        await poolPromise;


    const ruleValue =
        typeof data.RuleValue ===
        "string"

            ? data.RuleValue

            : JSON.stringify(
                data.RuleValue ||
                {}
            );


    const result =
        await pool.request()

            .input(
                "RuleId",
                sql.Int,
                Number(ruleId)
            )

            .input(
                "RuleCode",
                sql.NVarChar(100),
                String(
                    data.RuleCode
                ).trim()
            )

            .input(
                "RuleName",
                sql.NVarChar(200),
                String(
                    data.RuleName
                ).trim()
            )

            .input(
                "RuleType",
                sql.NVarChar(50),
                String(
                    data.RuleType ||
                    "Custom"
                ).trim()
            )

            .input(
                "ScopeType",
                sql.NVarChar(50),
                String(
                    data.ScopeType ||
                    "Global"
                ).trim()
            )

            .input(
                "ScopeId",
                sql.Int,
                data.ScopeId
                    ? Number(
                        data.ScopeId
                    )
                    : null
            )

            .input(
                "RuleValue",
                sql.NVarChar(sql.MAX),
                ruleValue
            )

            .input(
                "IsEnabled",
                sql.Bit,

                current.IsMandatory
                    ? true
                    : data.IsEnabled !==
                      false
            )

            .input(
                "Priority",
                sql.Int,
                Number(
                    data.Priority ||
                    100
                )
            )

            .input(
                "Description",
                sql.NVarChar(500),
                data.Description
                    ? String(
                        data.Description
                    ).trim()
                    : null
            )

            .query(`

                UPDATE TimetableRules

                SET
                    RuleCode =
                        @RuleCode,

                    RuleName =
                        @RuleName,

                    RuleType =
                        @RuleType,

                    ScopeType =
                        @ScopeType,

                    ScopeId =
                        @ScopeId,

                    RuleValue =
                        @RuleValue,

                    IsEnabled =
                        @IsEnabled,

                    Priority =
                        @Priority,

                    Description =
                        @Description,

                    UpdatedAt =
                        SYSDATETIME()

                OUTPUT
                    INSERTED.*

                WHERE
                    RuleId =
                        @RuleId;

            `);


    return normalizeRule(
        result.recordset[0]
    );
};


// ======================================================
// TOGGLE
// ======================================================

const toggleRule = async (
    ruleId,
    isEnabled
) => {

    const current =
        await getRuleById(
            ruleId
        );


    if (!current) {

        return {
            error:
                "Rule not found."
        };
    }


    if (
        current.IsMandatory
    ) {

        return {
            error:
                "Mandatory rules cannot be disabled."
        };
    }


    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "RuleId",
                sql.Int,
                Number(ruleId)
            )

            .input(
                "IsEnabled",
                sql.Bit,
                Boolean(
                    isEnabled
                )
            )

            .query(`

                UPDATE TimetableRules

                SET
                    IsEnabled =
                        @IsEnabled,

                    UpdatedAt =
                        SYSDATETIME()

                OUTPUT
                    INSERTED.*

                WHERE
                    RuleId =
                        @RuleId;

            `);


    return {
        data:
            normalizeRule(
                result.recordset[0]
            )
    };
};


// ======================================================
// DELETE
// ======================================================

const deleteRule = async (
    ruleId
) => {

    const current =
        await getRuleById(
            ruleId
        );


    if (!current) {

        return {
            error:
                "Rule not found."
        };
    }


    if (
        current.IsMandatory
    ) {

        return {
            error:
                "Mandatory rules cannot be deleted."
        };
    }


    const pool =
        await poolPromise;


    const result =
        await pool.request()

            .input(
                "RuleId",
                sql.Int,
                Number(ruleId)
            )

            .query(`

                DELETE FROM TimetableRules

                WHERE
                    RuleId =
                        @RuleId;

            `);


    return {
        deletedRows:
            result.rowsAffected[0] ||
            0
    };
};


// ======================================================
// RULE MATCH HELPERS FOR GENERATOR
// ======================================================

const getMatchingRules = (
    rules,
    ruleCode,
    context = {}
) => {

    return rules.filter(
        rule => {

            if (
                rule.RuleCode !==
                ruleCode
            ) {

                return false;
            }


            if (
                !rule.IsEnabled
            ) {

                return false;
            }


            if (
                rule.ScopeType ===
                "Global"
            ) {

                return true;
            }


            if (
                rule.ScopeType ===
                "Teacher"
            ) {

                return (
                    Number(
                        rule.ScopeId
                    ) ===
                    Number(
                        context.teacherId
                    )
                );
            }


            if (
                rule.ScopeType ===
                "Subject"
            ) {

                return (
                    Number(
                        rule.ScopeId
                    ) ===
                    Number(
                        context.subjectId
                    )
                );
            }


            if (
                rule.ScopeType ===
                "Section"
            ) {

                return (
                    Number(
                        rule.ScopeId
                    ) ===
                    Number(
                        context.sectionId
                    )
                );
            }


            if (
                rule.ScopeType ===
                "Campus"
            ) {

                return (
                    Number(
                        rule.ScopeId
                    ) ===
                    Number(
                        context.campusId
                    )
                );
            }


            if (
                rule.ScopeType ===
                "ClassYear"
            ) {

                return (
                    Number(
                        rule.ScopeId
                    ) ===
                    Number(
                        context.classYearId
                    )
                );
            }


            return false;
        }
    );
};


const getBestRule = (
    rules,
    ruleCode,
    context = {}
) => {

    const matching =
        getMatchingRules(
            rules,
            ruleCode,
            context
        );


    if (
        matching.length ===
        0
    ) {

        return null;
    }


    /*
        Specific rule wins over Global.
    */

    const specific =
        matching.find(
            rule =>
                rule.ScopeType !==
                "Global"
        );


    return (
        specific ||
        matching[0]
    );
};


module.exports = {

    getAllRules,

    getEnabledRules,

    getRuleById,

    createRule,

    updateRule,

    toggleRule,

    deleteRule,

    getMatchingRules,

    getBestRule,

    safeParseJson
};