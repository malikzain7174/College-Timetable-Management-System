const express =
    require("express");

const timetableRuleController =
    require(
        "../controllers/timetableRuleController"
    );


const router =
    express.Router();


router.get(
    "/",
    timetableRuleController
        .getAllRules
);


router.post(
    "/",
    timetableRuleController
        .createRule
);


router.put(
    "/:ruleId",
    timetableRuleController
        .updateRule
);


router.patch(
    "/:ruleId/toggle",
    timetableRuleController
        .toggleRule
);


router.delete(
    "/:ruleId",
    timetableRuleController
        .deleteRule
);


module.exports =
    router;