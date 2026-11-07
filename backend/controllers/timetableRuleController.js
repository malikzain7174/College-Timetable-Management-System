const rules = require("../services/timetableRuleService");
const { positiveId } = require("../lib/httpError");

const ruleId = req => positiveId(req.params.ruleId, "rule ID");

async function getAllRules(req, res) {
    res.json(await rules.getAllRules());
}

async function createRule(req, res) {
    res.status(201).json(await rules.createRule(req.body || {}));
}

async function updateRule(req, res) {
    res.json(await rules.updateRule(ruleId(req), req.body || {}));
}

async function toggleRule(req, res) {
    res.json(await rules.toggleRule(ruleId(req), req.body?.IsEnabled));
}

async function deleteRule(req, res) {
    const deletedRows = await rules.deleteRule(ruleId(req));
    res.json({ message: "Rule deleted.", deletedRows });
}

module.exports = { getAllRules, createRule, updateRule, toggleRule, deleteRule };
