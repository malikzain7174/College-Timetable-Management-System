const { sql, getPool, withDatabaseLock } = require("../config/db");
const { HttpError, positiveId } = require("../lib/httpError");

const definition = {
    TEACHER_DAILY_MAX: { type: "Maximum", scopes: ["Global", "Teacher"], key: "maxLectures" },
    TEACHER_MIN_START_PERIOD: { type: "MinimumPeriod", scopes: ["Global", "Teacher"], key: "minimumPeriod" },
    TEACHER_MAX_END_PERIOD: { type: "MaximumPeriod", scopes: ["Global", "Teacher"], key: "maximumPeriod" },
    TEACHER_BLOCK_DAY: { type: "BlockedDay", scopes: ["Teacher"], key: "dayOfWeek", max: 7 },
    TEACHER_BLOCK_PERIOD: { type: "BlockedPeriod", scopes: ["Teacher"], key: "period" },
    SUBJECT_MAX_PER_DAY: { type: "Maximum", scopes: ["Global", "Subject"], key: "maxPerDay" },
    SECTION_BLOCK_PERIOD: { type: "BlockedPeriod", scopes: ["Section"], key: "period" },
    BIO_MATH_PARALLEL: { type: "Feature", scopes: ["Global"] }
};

const scopeTarget = {
    Teacher: ["Teachers", "TeacherId", "teacherId"],
    Subject: ["Subjects", "SubjectId", "subjectId"],
    Section: ["Sections", "SectionId", "sectionId"],
    Campus: ["Campuses", "CampusId", "campusId"],
    ClassYear: ["ClassYears", "ClassYearId", "classYearId"]
};

function parseRuleValue(value) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

const normalizeRule = rule => ({ ...rule, RuleValueObject: parseRuleValue(rule.RuleValue) || {} });

async function getAllRules(db) {
    db ??= await getPool();
    const { recordset } = await db.request().query(`
        SELECT RuleId, RuleCode, RuleName, RuleType, ScopeType, ScopeId, RuleValue,
            IsEnabled, IsMandatory, Priority, Description, CreatedAt, UpdatedAt
        FROM TimetableRules ORDER BY IsMandatory DESC, Priority, RuleId;
    `);
    return recordset.map(normalizeRule);
}

async function getRuleById(id, db) {
    db ??= await getPool();
    const { recordset: [rule] } = await db.request().input("id", sql.Int, id)
        .query("SELECT * FROM TimetableRules WHERE RuleId = @id;");
    if (!rule) throw new HttpError(404, "Rule not found.");
    return normalizeRule(rule);
}

async function validateRule(db, data) {
    const spec = Object.hasOwn(definition, data.RuleCode) && definition[data.RuleCode];
    if (!spec || data.RuleType !== spec.type) throw new HttpError(400, "Select a supported rule and rule type.");
    if (!spec.scopes.includes(data.ScopeType)) throw new HttpError(400, "This rule does not support that scope.");
    if (typeof data.RuleName !== "string" || !data.RuleName.trim() || data.RuleName.trim().length > 200) {
        throw new HttpError(400, "Enter a rule name of at most 200 characters.");
    }
    if (data.IsEnabled !== undefined && typeof data.IsEnabled !== "boolean") {
        throw new HttpError(400, "Enabled must be a boolean.");
    }
    if (data.IsMandatory === true) throw new HttpError(400, "Mandatory rules are built into the scheduler.");
    if (data.Description != null && (typeof data.Description !== "string" || data.Description.length > 500)) {
        throw new HttpError(400, "Description must be 500 characters or fewer.");
    }

    const value = parseRuleValue(data.RuleValue ?? (spec.key ? null : {}));
    if (!value || (spec.key
        ? Object.keys(value).length !== 1 || !Number.isInteger(value[spec.key]) ||
            value[spec.key] < 1 || value[spec.key] > (spec.max || 1440)
        : Object.keys(value).length !== 0)) {
        throw new HttpError(400, spec.key ? `Enter a valid integer for ${spec.key}.` : "This rule does not take a value.");
    }

    let scopeId = null;
    if (data.ScopeType === "Global") {
        if (data.ScopeId != null && data.ScopeId !== "") throw new HttpError(400, "A global rule does not take a scope ID.");
    } else {
        scopeId = positiveId(data.ScopeId, "rule scope ID");
        const [table, column] = scopeTarget[data.ScopeType];
        const { recordset } = await db.request().input("id", sql.Int, scopeId)
            .query(`SELECT ${column} FROM dbo.${table} WHERE ${column} = @id;`);
        if (!recordset.length) throw new HttpError(400, "The selected rule target does not exist.");
    }

    return {
        name: data.RuleName.trim(), type: spec.type, code: data.RuleCode,
        scope: data.ScopeType, scopeId, value: JSON.stringify(value),
        enabled: data.IsEnabled ?? true, priority: positiveId(data.Priority ?? 100, "priority"),
        description: data.Description?.trim() || null
    };
}

function protectMandatory(rule) {
    if (rule.IsMandatory) throw new HttpError(409, "Mandatory scheduling rules are read-only.");
}

async function saveRule(data, id) {
    return withDatabaseLock("timetable:rules", async db => {
        if (id !== undefined) protectMandatory(await getRuleById(id, db));
        const input = await validateRule(db, data);
        const request = db.request()
            .input("code", sql.NVarChar(100), input.code)
            .input("name", sql.NVarChar(200), input.name)
            .input("type", sql.NVarChar(50), input.type)
            .input("scope", sql.NVarChar(50), input.scope)
            .input("scopeId", sql.Int, input.scopeId)
            .input("value", sql.NVarChar(sql.MAX), input.value)
            .input("enabled", sql.Bit, input.enabled)
            .input("priority", sql.Int, input.priority)
            .input("description", sql.NVarChar(500), input.description);
        if (id !== undefined) request.input("id", sql.Int, id);
        const { recordset: [rule] } = await request.query(id === undefined ? `
            INSERT TimetableRules (RuleCode, RuleName, RuleType, ScopeType, ScopeId, RuleValue, IsEnabled, Priority, Description)
            OUTPUT INSERTED.*
            VALUES (@code, @name, @type, @scope, @scopeId, @value, @enabled, @priority, @description);
        ` : `
            UPDATE TimetableRules
            SET RuleCode = @code, RuleName = @name, RuleType = @type, ScopeType = @scope, ScopeId = @scopeId,
                RuleValue = @value, IsEnabled = @enabled, Priority = @priority, Description = @description, UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.* WHERE RuleId = @id;
        `);
        return normalizeRule(rule);
    });
}

async function toggleRule(id, enabled) {
    if (typeof enabled !== "boolean") throw new HttpError(400, "Enabled must be a boolean.");
    return withDatabaseLock("timetable:rules", async db => {
        const rule = await getRuleById(id, db);
        protectMandatory(rule);
        if (enabled) await validateRule(db, { ...rule, IsEnabled: enabled });
        const { recordset: [updated] } = await db.request().input("id", sql.Int, id).input("enabled", sql.Bit, enabled)
            .query("UPDATE TimetableRules SET IsEnabled = @enabled, UpdatedAt = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE RuleId = @id;");
        return normalizeRule(updated);
    });
}

async function deleteRule(id) {
    return withDatabaseLock("timetable:rules", async db => {
        protectMandatory(await getRuleById(id, db));
        const { rowsAffected } = await db.request().input("id", sql.Int, id)
            .query("DELETE FROM TimetableRules WHERE RuleId = @id;");
        return rowsAffected[0];
    });
}

function getMatchingRules(rules, code, context) {
    return rules.filter(rule =>
        rule.RuleCode === code && rule.IsEnabled &&
        (rule.ScopeType === "Global" || (
            Object.hasOwn(scopeTarget, rule.ScopeType) &&
            Number(rule.ScopeId) === Number(context[scopeTarget[rule.ScopeType][2]])
        ))
    );
}

function getBestRule(rules, code, context) {
    const matching = getMatchingRules(rules, code, context);
    return matching.find(rule => rule.ScopeType !== "Global") || matching[0];
}

module.exports = {
    getAllRules, getRuleById, toggleRule, deleteRule, getBestRule, getMatchingRules,
    createRule: data => saveRule(data), updateRule: (id, data) => saveRule(data, id)
};
