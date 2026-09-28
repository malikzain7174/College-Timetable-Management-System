const timetableRuleService =
    require(
        "../services/timetableRuleService"
    );


// ======================================================
// GET ALL
// ======================================================

const getAllRules = async (
    req,
    res
) => {

    try {

        const data =
            await timetableRuleService
                .getAllRules();


        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "GET RULES ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to load timetable rules.",

            error:
                error.message

        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createRule = async (
    req,
    res
) => {

    try {

        const {
            RuleCode,
            RuleName,
            RuleType,
            ScopeType
        } = req.body;


        if (
            !RuleCode ||
            !RuleName ||
            !RuleType ||
            !ScopeType
        ) {

            return res.status(400).json({

                message:
                    "RuleCode, RuleName, RuleType and ScopeType are required."

            });
        }


        const data =
            await timetableRuleService
                .createRule(
                    req.body
                );


        return res.status(201).json(
            data
        );

    } catch (error) {

        console.error(
            "CREATE RULE ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to create timetable rule.",

            error:
                error.message

        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateRule = async (
    req,
    res
) => {

    try {

        const ruleId =
            Number(
                req.params.ruleId
            );


        if (
            !Number.isInteger(
                ruleId
            ) ||
            ruleId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid Rule ID."

            });
        }


        const data =
            await timetableRuleService
                .updateRule(
                    ruleId,
                    req.body
                );


        if (!data) {

            return res.status(404).json({

                message:
                    "Rule not found."

            });
        }


        return res.status(200).json(
            data
        );

    } catch (error) {

        console.error(
            "UPDATE RULE ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to update timetable rule.",

            error:
                error.message

        });
    }
};


// ======================================================
// TOGGLE
// ======================================================

const toggleRule = async (
    req,
    res
) => {

    try {

        const ruleId =
            Number(
                req.params.ruleId
            );


        const result =
            await timetableRuleService
                .toggleRule(
                    ruleId,
                    req.body.IsEnabled
                );


        if (
            result.error
        ) {

            return res.status(400).json({

                message:
                    result.error

            });
        }


        return res.status(200).json(
            result.data
        );

    } catch (error) {

        console.error(
            "TOGGLE RULE ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to change rule status.",

            error:
                error.message

        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteRule = async (
    req,
    res
) => {

    try {

        const ruleId =
            Number(
                req.params.ruleId
            );


        const result =
            await timetableRuleService
                .deleteRule(
                    ruleId
                );


        if (
            result.error
        ) {

            return res.status(400).json({

                message:
                    result.error

            });
        }


        return res.status(200).json({

            message:
                "Rule deleted successfully.",

            deletedRows:
                result.deletedRows

        });

    } catch (error) {

        console.error(
            "DELETE RULE ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to delete timetable rule.",

            error:
                error.message

        });
    }
};


module.exports = {

    getAllRules,

    createRule,

    updateRule,

    toggleRule,

    deleteRule
};