import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getAllTimetableRules,
    createTimetableRule,
    updateTimetableRule,
    toggleTimetableRule,
    deleteTimetableRule
} from "../services/timetableRuleService";

import {
    getAllTeachers
} from "../services/teacherService";

import {
    getAllSubjects
} from "../services/subjectService";

import {
    getAllSections
} from "../services/sectionService";

import "./TimetableRules.css";


const RULE_CATALOG = [

    {
        code:
            "TEACHER_DAILY_MAX",

        name:
            "Teacher Daily Maximum Lectures",

        type:
            "Maximum",

        valueKey:
            "maxLectures",

        defaultValue:
            5,

        scopes:
            [
                "Global",
                "Teacher"
            ]
    },

    {
        code:
            "TEACHER_MIN_START_PERIOD",

        name:
            "Teacher Minimum Starting Period",

        type:
            "MinimumPeriod",

        valueKey:
            "minimumPeriod",

        defaultValue:
            3,

        scopes:
            [
                "Global",
                "Teacher"
            ]
    },

    {
        code:
            "TEACHER_MAX_END_PERIOD",

        name:
            "Teacher Maximum Ending Period",

        type:
            "MaximumPeriod",

        valueKey:
            "maximumPeriod",

        defaultValue:
            6,

        scopes:
            [
                "Global",
                "Teacher"
            ]
    },

    {
        code:
            "TEACHER_BLOCK_DAY",

        name:
            "Teacher Block Day",

        type:
            "BlockedDay",

        valueKey:
            "dayOfWeek",

        defaultValue:
            1,

        scopes:
            [
                "Teacher"
            ]
    },

    {
        code:
            "TEACHER_BLOCK_PERIOD",

        name:
            "Teacher Block Period",

        type:
            "BlockedPeriod",

        valueKey:
            "period",

        defaultValue:
            1,

        scopes:
            [
                "Teacher"
            ]
    },

    {
        code:
            "SUBJECT_MAX_PER_DAY",

        name:
            "Subject Maximum Per Day",

        type:
            "Maximum",

        valueKey:
            "maxPerDay",

        defaultValue:
            1,

        scopes:
            [
                "Global",
                "Subject"
            ]
    },

    {
        code:
            "SECTION_BLOCK_PERIOD",

        name:
            "Section Block Period",

        type:
            "BlockedPeriod",

        valueKey:
            "period",

        defaultValue:
            1,

        scopes:
            [
                "Section"
            ]
    },

    {
        code:
            "BIO_MATH_PARALLEL",

        name:
            "Biology + Mathematics Parallel",

        type:
            "Feature",

        valueKey:
            null,

        defaultValue:
            null,

        scopes:
            [
                "Global"
            ]
    }

];


const EMPTY_FORM = {

    RuleCode:
        "TEACHER_MIN_START_PERIOD",

    RuleName:
        "Teacher Minimum Starting Period",

    RuleType:
        "MinimumPeriod",

    ScopeType:
        "Teacher",

    ScopeId:
        "",

    Value:
        3,

    Priority:
        50,

    Description:
        "",

    IsEnabled:
        true
};


const getRuleObject = rule => {

    if (
        rule.RuleValueObject &&
        typeof rule.RuleValueObject ===
        "object"
    ) {

        return rule.RuleValueObject;
    }


    try {

        return JSON.parse(
            rule.RuleValue ||
            "{}"
        );

    } catch {

        return {};
    }
};


function TimetableRules() {

    const [
        rules,
        setRules
    ] = useState([]);


    const [
        teachers,
        setTeachers
    ] = useState([]);


    const [
        subjects,
        setSubjects
    ] = useState([]);


    const [
        sections,
        setSections
    ] = useState([]);


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        saving,
        setSaving
    ] = useState(false);


    const [
        showForm,
        setShowForm
    ] = useState(false);


    const [
        editingId,
        setEditingId
    ] = useState(null);


    const [
        form,
        setForm
    ] = useState(
        EMPTY_FORM
    );


    const loadData =
        async () => {

            try {

                setLoading(true);


                const [
                    rulesData,
                    teacherData,
                    subjectData,
                    sectionData
                ] = await Promise.all([

                    getAllTimetableRules(),

                    getAllTeachers(),

                    getAllSubjects(),

                    getAllSections()

                ]);


                setRules(
                    Array.isArray(
                        rulesData
                    )
                        ? rulesData
                        : []
                );


                setTeachers(
                    Array.isArray(
                        teacherData
                    )
                        ? teacherData
                        : []
                );


                setSubjects(
                    Array.isArray(
                        subjectData
                    )
                        ? subjectData
                        : []
                );


                setSections(
                    Array.isArray(
                        sectionData
                    )
                        ? sectionData
                        : []
                );

            } catch (error) {

                console.error(
                    "LOAD RULES ERROR:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to load timetable rules."
                );

            } finally {

                setLoading(false);
            }
        };


    useEffect(
        () => {

            loadData();

        },
        []
    );


    const selectedCatalog =
        useMemo(
            () =>

                RULE_CATALOG.find(
                    item =>
                        item.code ===
                        form.RuleCode
                ),

            [
                form.RuleCode
            ]
        );


    const openAddForm =
        () => {

            setEditingId(
                null
            );


            setForm(
                EMPTY_FORM
            );


            setShowForm(
                true
            );
        };


    const closeForm =
        () => {

            setShowForm(
                false
            );


            setEditingId(
                null
            );


            setForm(
                EMPTY_FORM
            );
        };


    const handleRuleTypeChange =
        event => {

            const code =
                event.target.value;


            const catalog =
                RULE_CATALOG.find(
                    item =>
                        item.code ===
                        code
                );


            if (!catalog) {

                return;
            }


            setForm(
                previous => ({

                    ...previous,

                    RuleCode:
                        catalog.code,

                    RuleName:
                        catalog.name,

                    RuleType:
                        catalog.type,

                    ScopeType:
                        catalog.scopes[0],

                    ScopeId:
                        "",

                    Value:
                        catalog
                            .defaultValue

                })
            );
        };


    const handleEdit =
        rule => {

            if (
                rule.IsMandatory
            ) {

                return;
            }


            const catalog =
                RULE_CATALOG.find(
                    item =>
                        item.code ===
                        rule.RuleCode
                );


            const valueObject =
                getRuleObject(
                    rule
                );


            let value =
                "";


            if (
                catalog?.valueKey
            ) {

                value =
                    valueObject[
                        catalog
                            .valueKey
                    ] ??
                    catalog
                        .defaultValue;
            }


            setEditingId(
                rule.RuleId
            );


            setForm({

                RuleCode:
                    rule.RuleCode,

                RuleName:
                    rule.RuleName,

                RuleType:
                    rule.RuleType,

                ScopeType:
                    rule.ScopeType,

                ScopeId:
                    rule.ScopeId ||
                    "",

                Value:
                    value,

                Priority:
                    rule.Priority,

                Description:
                    rule.Description ||
                    "",

                IsEnabled:
                    Boolean(
                        rule.IsEnabled
                    )

            });


            setShowForm(
                true
            );
        };


    const buildPayload =
        () => {

            const catalog =
                RULE_CATALOG.find(
                    item =>
                        item.code ===
                        form.RuleCode
                );


            let ruleValue =
                {};


            if (
                catalog?.valueKey
            ) {

                ruleValue = {

                    [
                        catalog.valueKey
                    ]:
                        Number(
                            form.Value
                        )

                };
            }


            return {

                RuleCode:
                    form.RuleCode,

                RuleName:
                    form.RuleName,

                RuleType:
                    form.RuleType,

                ScopeType:
                    form.ScopeType,

                ScopeId:
                    form.ScopeType ===
                    "Global"

                        ? null

                        : Number(
                            form.ScopeId
                        ),

                RuleValue:
                    ruleValue,

                IsEnabled:
                    form.IsEnabled,

                Priority:
                    Number(
                        form.Priority
                    ),

                Description:
                    form.Description
                        .trim()

            };
        };


    const handleSubmit =
        async event => {

            event.preventDefault();


            if (
                form.ScopeType !==
                "Global" &&
                !form.ScopeId
            ) {

                alert(
                    "Please select the rule target."
                );

                return;
            }


            try {

                setSaving(
                    true
                );


                const payload =
                    buildPayload();


                if (
                    editingId
                ) {

                    await updateTimetableRule(
                        editingId,
                        payload
                    );

                } else {

                    await createTimetableRule(
                        payload
                    );
                }


                closeForm();


                await loadData();

            } catch (error) {

                console.error(
                    "SAVE RULE ERROR:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to save rule."
                );

            } finally {

                setSaving(
                    false
                );
            }
        };


    const handleToggle =
        async rule => {

            if (
                rule.IsMandatory
            ) {

                return;
            }


            try {

                await toggleTimetableRule(

                    rule.RuleId,

                    !rule.IsEnabled

                );


                await loadData();

            } catch (error) {

                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to change rule status."
                );
            }
        };


    const handleDelete =
        async rule => {

            if (
                rule.IsMandatory
            ) {

                return;
            }


            if (
                !window.confirm(
                    `Delete rule "${rule.RuleName}"?`
                )
            ) {

                return;
            }


            try {

                await deleteTimetableRule(
                    rule.RuleId
                );


                await loadData();

            } catch (error) {

                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to delete rule."
                );
            }
        };


    const getScopeLabel =
        rule => {

            if (
                rule.ScopeType ===
                "Global"
            ) {

                return "Global";
            }


            if (
                rule.ScopeType ===
                "Teacher"
            ) {

                const teacher =
                    teachers.find(
                        item =>
                            Number(
                                item.TeacherId
                            ) ===
                            Number(
                                rule.ScopeId
                            )
                    );


                return teacher
                    ? `${teacher.FirstName || ""} ${teacher.LastName || ""}`.trim()
                    : `Teacher ${rule.ScopeId}`;
            }


            if (
                rule.ScopeType ===
                "Subject"
            ) {

                const subject =
                    subjects.find(
                        item =>
                            Number(
                                item.SubjectId
                            ) ===
                            Number(
                                rule.ScopeId
                            )
                    );


                return (
                    subject
                        ?.SubjectName ||
                    `Subject ${rule.ScopeId}`
                );
            }


            if (
                rule.ScopeType ===
                "Section"
            ) {

                const section =
                    sections.find(
                        item =>
                            Number(
                                item.SectionId
                            ) ===
                            Number(
                                rule.ScopeId
                            )
                    );


                return (
                    section
                        ?.SectionCode ||
                    section
                        ?.SectionName ||
                    `Section ${rule.ScopeId}`
                );
            }


            return (
                `${rule.ScopeType} ${rule.ScopeId}`
            );
        };


    const getValueLabel =
        rule => {

            const value =
                getRuleObject(
                    rule
                );


            switch (
                rule.RuleCode
            ) {

                case "TEACHER_DAILY_MAX":

                    return (
                        `${value.maxLectures ?? "-"} lectures/day`
                    );


                case "TEACHER_MIN_START_PERIOD":

                    return (
                        `Start from Period ${value.minimumPeriod ?? "-"}`
                    );


                case "TEACHER_MAX_END_PERIOD":

                    return (
                        `Up to Period ${value.maximumPeriod ?? "-"}`
                    );


                case "TEACHER_BLOCK_DAY":

                    return (
                        `Day ${value.dayOfWeek ?? "-"}`
                    );


                case "TEACHER_BLOCK_PERIOD":

                case "SECTION_BLOCK_PERIOD":

                    return (
                        `Period ${value.period ?? "-"}`
                    );


                case "SUBJECT_MAX_PER_DAY":

                    return (
                        `${value.maxPerDay ?? "-"} per day`
                    );


                case "BIO_MATH_PARALLEL":

                    return "Feature toggle";


                default:

                    return (
                        rule.RuleValue ||
                        "-"
                    );
            }
        };


    const renderScopeTarget =
        () => {

            if (
                form.ScopeType ===
                "Global"
            ) {

                return null;
            }


            if (
                form.ScopeType ===
                "Teacher"
            ) {

                return (

                    <div className="tr-field">

                        <label>
                            Teacher
                        </label>

                        <select
                            value={
                                form.ScopeId
                            }
                            onChange={
                                event =>
                                    setForm(
                                        previous => ({
                                            ...previous,
                                            ScopeId:
                                                event.target.value
                                        })
                                    )
                            }
                        >

                            <option value="">
                                Select Teacher
                            </option>

                            {teachers.map(
                                teacher => (

                                    <option
                                        key={
                                            teacher.TeacherId
                                        }
                                        value={
                                            teacher.TeacherId
                                        }
                                    >
                                        {`${teacher.FirstName || ""} ${teacher.LastName || ""}`.trim()}
                                    </option>

                                )
                            )}

                        </select>

                    </div>
                );
            }


            if (
                form.ScopeType ===
                "Subject"
            ) {

                return (

                    <div className="tr-field">

                        <label>
                            Subject
                        </label>

                        <select
                            value={
                                form.ScopeId
                            }
                            onChange={
                                event =>
                                    setForm(
                                        previous => ({
                                            ...previous,
                                            ScopeId:
                                                event.target.value
                                        })
                                    )
                            }
                        >

                            <option value="">
                                Select Subject
                            </option>

                            {subjects.map(
                                subject => (

                                    <option
                                        key={
                                            subject.SubjectId
                                        }
                                        value={
                                            subject.SubjectId
                                        }
                                    >
                                        {subject.SubjectCode}
                                        {" — "}
                                        {subject.SubjectName}
                                    </option>

                                )
                            )}

                        </select>

                    </div>
                );
            }


            if (
                form.ScopeType ===
                "Section"
            ) {

                return (

                    <div className="tr-field">

                        <label>
                            Section
                        </label>

                        <select
                            value={
                                form.ScopeId
                            }
                            onChange={
                                event =>
                                    setForm(
                                        previous => ({
                                            ...previous,
                                            ScopeId:
                                                event.target.value
                                        })
                                    )
                            }
                        >

                            <option value="">
                                Select Section
                            </option>

                            {sections.map(
                                section => (

                                    <option
                                        key={
                                            section.SectionId
                                        }
                                        value={
                                            section.SectionId
                                        }
                                    >
                                        {section.SectionCode ||
                                         section.SectionName}
                                    </option>

                                )
                            )}

                        </select>

                    </div>
                );
            }


            return null;
        };


    return (

        <div className="tr-page">

            <div className="tr-header">

                <div>

                    <span className="tr-eyebrow">
                        Generator Configuration
                    </span>

                    <h1>
                        Timetable Rules
                    </h1>

                    <p>
                        Turn scheduling rules on or off,
                        change limits, and create
                        teacher, subject or section
                        specific rules.
                    </p>

                </div>

                <button
                    type="button"
                    className="tr-add-button"
                    onClick={
                        openAddForm
                    }
                >
                    + Add Rule
                </button>

            </div>


            <div className="tr-info">

                <strong>
                    🔒 Mandatory rules
                </strong>

                cannot be disabled because they protect
                the timetable from teacher, room and
                section collisions.

            </div>


            {showForm && (

                <form
                    className="tr-form-card"
                    onSubmit={
                        handleSubmit
                    }
                >

                    <div className="tr-form-title">

                        <div>

                            <span className="tr-eyebrow">
                                Rule Builder
                            </span>

                            <h2>
                                {editingId
                                    ? "Edit Rule"
                                    : "Create Rule"}
                            </h2>

                        </div>

                        <button
                            type="button"
                            className="tr-close"
                            onClick={
                                closeForm
                            }
                        >
                            ×
                        </button>

                    </div>


                    <div className="tr-form-grid">

                        <div className="tr-field">

                            <label>
                                Rule
                            </label>

                            <select
                                value={
                                    form.RuleCode
                                }
                                onChange={
                                    handleRuleTypeChange
                                }
                            >

                                {RULE_CATALOG.map(
                                    item => (

                                        <option
                                            key={
                                                item.code
                                            }
                                            value={
                                                item.code
                                            }
                                        >
                                            {item.name}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>


                        <div className="tr-field">

                            <label>
                                Apply To
                            </label>

                            <select
                                value={
                                    form.ScopeType
                                }
                                onChange={
                                    event =>
                                        setForm(
                                            previous => ({
                                                ...previous,

                                                ScopeType:
                                                    event.target.value,

                                                ScopeId:
                                                    ""
                                            })
                                        )
                                }
                            >

                                {selectedCatalog
                                    ?.scopes
                                    ?.map(
                                        scope => (

                                            <option
                                                key={
                                                    scope
                                                }
                                                value={
                                                    scope
                                                }
                                            >
                                                {scope}
                                            </option>

                                        )
                                    )}

                            </select>

                        </div>


                        {renderScopeTarget()}


                        {selectedCatalog
                            ?.valueKey && (

                            <div className="tr-field">

                                <label>
                                    Value
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={
                                        form.Value
                                    }
                                    onChange={
                                        event =>
                                            setForm(
                                                previous => ({
                                                    ...previous,

                                                    Value:
                                                        event.target.value
                                                })
                                            )
                                    }
                                />

                            </div>

                        )}


                        <div className="tr-field">

                            <label>
                                Priority
                            </label>

                            <input
                                type="number"
                                min="1"
                                value={
                                    form.Priority
                                }
                                onChange={
                                    event =>
                                        setForm(
                                            previous => ({
                                                ...previous,

                                                Priority:
                                                    event.target.value
                                            })
                                        )
                                }
                            />

                        </div>


                        <div className="tr-field tr-description">

                            <label>
                                Description
                            </label>

                            <input
                                type="text"
                                value={
                                    form.Description
                                }
                                onChange={
                                    event =>
                                        setForm(
                                            previous => ({
                                                ...previous,

                                                Description:
                                                    event.target.value
                                            })
                                        )
                                }
                                placeholder="Optional description..."
                            />

                        </div>

                    </div>


                    <div className="tr-form-actions">

                        <button
                            type="button"
                            className="tr-cancel"
                            onClick={
                                closeForm
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="tr-save"
                            disabled={
                                saving
                            }
                        >
                            {saving
                                ? "Saving..."
                                : "Save Rule"}
                        </button>

                    </div>

                </form>

            )}


            <div className="tr-table-card">

                {loading ? (

                    <div className="tr-empty">
                        Loading rules...
                    </div>

                ) : rules.length ===
                    0 ? (

                    <div className="tr-empty">
                        No timetable rules found.
                    </div>

                ) : (

                    <div className="tr-table-wrap">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Rule
                                    </th>

                                    <th>
                                        Scope
                                    </th>

                                    <th>
                                        Value
                                    </th>

                                    <th>
                                        Priority
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {rules.map(
                                    rule => (

                                        <tr
                                            key={
                                                rule.RuleId
                                            }
                                        >

                                            <td>

                                                <button
                                                    type="button"
                                                    className={
                                                        rule.IsEnabled
                                                            ? "tr-toggle on"
                                                            : "tr-toggle"
                                                    }
                                                    disabled={
                                                        rule.IsMandatory
                                                    }
                                                    onClick={
                                                        () =>
                                                            handleToggle(
                                                                rule
                                                            )
                                                    }
                                                >

                                                    <span />

                                                </button>


                                                {rule.IsMandatory && (

                                                    <small className="tr-lock">
                                                        🔒 Mandatory
                                                    </small>

                                                )}

                                            </td>


                                            <td>

                                                <strong>
                                                    {rule.RuleName}
                                                </strong>

                                                <small className="tr-code">
                                                    {rule.RuleCode}
                                                </small>

                                                {rule.Description && (

                                                    <small className="tr-description-text">
                                                        {rule.Description}
                                                    </small>

                                                )}

                                            </td>


                                            <td>

                                                <span className="tr-scope">
                                                    {rule.ScopeType}
                                                </span>

                                                <small>
                                                    {getScopeLabel(
                                                        rule
                                                    )}
                                                </small>

                                            </td>


                                            <td>
                                                {getValueLabel(
                                                    rule
                                                )}
                                            </td>


                                            <td>
                                                {rule.Priority}
                                            </td>


                                            <td>

                                                {!rule.IsMandatory && (

                                                    <div className="tr-actions">

                                                        <button
                                                            type="button"
                                                            className="tr-edit"
                                                            onClick={
                                                                () =>
                                                                    handleEdit(
                                                                        rule
                                                                    )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="tr-delete"
                                                            onClick={
                                                                () =>
                                                                    handleDelete(
                                                                        rule
                                                                    )
                                                            }
                                                        >
                                                            Delete
                                                        </button>

                                                    </div>

                                                )}

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>
    );
}


export default TimetableRules;