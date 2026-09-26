import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    getAllSections
} from "../services/sectionService";

import {
    getAllConflicts,
    getConflictSummary,
    validateTimetable
} from "../services/conflictService";

import "./Conflicts.css";


const DAYS = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday"
};


// ============================================================
// DEFAULT SUMMARY
// ============================================================

const DEFAULT_SUMMARY = {
    totalConflicts: 0,
    teacherConflicts: 0,
    roomConflicts: 0,
    sectionConflicts: 0,
    roomCapacityConflicts: 0,
    teacherDailyLoadConflicts: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    isValid: true
};


// ============================================================
// NORMALIZE SUMMARY
// ============================================================

const normalizeSummary = (
    summaryData
) => {

    return {

        totalConflicts:
            Number(
                summaryData?.totalConflicts
            ) || 0,

        teacherConflicts:
            Number(
                summaryData?.teacherConflicts
            ) || 0,

        roomConflicts:
            Number(
                summaryData?.roomConflicts
            ) || 0,

        sectionConflicts:
            Number(
                summaryData?.sectionConflicts
            ) || 0,

        roomCapacityConflicts:
            Number(
                summaryData
                    ?.roomCapacityConflicts
            ) || 0,

        teacherDailyLoadConflicts:
            Number(
                summaryData
                    ?.teacherDailyLoadConflicts
            ) || 0,

        highSeverity:
            Number(
                summaryData?.highSeverity
            ) || 0,

        mediumSeverity:
            Number(
                summaryData?.mediumSeverity
            ) || 0,

        isValid:
            summaryData?.isValid === true
    };
};


// ============================================================
// COMPONENT
// ============================================================

function Conflicts() {

    const navigate =
        useNavigate();


    // ========================================================
    // STATE
    // ========================================================

    const [
        conflicts,
        setConflicts
    ] = useState([]);


    const [
        summary,
        setSummary
    ] = useState(
        DEFAULT_SUMMARY
    );


    const [
        sections,
        setSections
    ] = useState([]);


    const [
        selectedSession,
        setSelectedSession
    ] = useState("");


    const [
        typeFilter,
        setTypeFilter
    ] = useState("");


    const [
        severityFilter,
        setSeverityFilter
    ] = useState("");


    const [
        search,
        setSearch
    ] = useState("");


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        validating,
        setValidating
    ] = useState(false);


    const [
        lastValidated,
        setLastValidated
    ] = useState(null);


    // ========================================================
    // SESSION OPTIONS
    // ========================================================

    const sessionOptions =
        useMemo(() => {

            return [
                ...new Set(
                    sections
                        .map(
                            item =>
                                Number(
                                    item
                                        .AcademicSessionId
                                )
                        )
                        .filter(
                            item =>
                                Number.isInteger(
                                    item
                                ) &&
                                item > 0
                        )
                )
            ].sort(
                (a, b) =>
                    a - b
            );

        }, [sections]);


    // ========================================================
    // INITIAL LOAD
    //
    // Load sections and select first available session.
    // setState happens after awaited external API request.
    // ========================================================

    useEffect(() => {

        let cancelled = false;


        const initializePage =
            async () => {

                try {

                    const data =
                        await getAllSections();


                    if (cancelled) {
                        return;
                    }


                    const list =
                        Array.isArray(data)
                            ? data
                            : [];


                    const sessions =
                        [
                            ...new Set(
                                list
                                    .map(
                                        item =>
                                            Number(
                                                item
                                                    .AcademicSessionId
                                            )
                                    )
                                    .filter(
                                        item =>
                                            Number.isInteger(
                                                item
                                            ) &&
                                            item > 0
                                    )
                            )
                        ].sort(
                            (a, b) =>
                                a - b
                        );


                    setSections(list);


                    if (
                        sessions.length > 0
                    ) {

                        setSelectedSession(
                            String(
                                sessions[0]
                            )
                        );

                    } else {

                        setLoading(false);
                    }


                } catch (error) {

                    if (cancelled) {
                        return;
                    }


                    console.error(
                        "Load sessions error:",
                        error
                    );


                    setLoading(false);


                    alert(
                        error.response
                            ?.data
                            ?.message ||
                        "Failed to load academic sessions."
                    );
                }
            };


        initializePage();


        return () => {

            cancelled = true;
        };

    }, []);


    // ========================================================
    // AUTO LOAD CONFLICTS
    //
    // IMPORTANT:
    // We do NOT call loadConflicts() here because that
    // function synchronously changes loading state.
    //
    // This effect performs API calls directly and only
    // updates state after the awaited external operation.
    // ========================================================

    useEffect(() => {

        if (!selectedSession) {
            return undefined;
        }


        let cancelled = false;


        const loadSessionConflicts =
            async () => {

                try {

                    const sessionId =
                        Number(
                            selectedSession
                        );


                    const [
                        conflictData,
                        summaryData
                    ] = await Promise.all([

                        getAllConflicts(
                            sessionId
                        ),

                        getConflictSummary(
                            sessionId
                        )
                    ]);


                    if (cancelled) {
                        return;
                    }


                    setConflicts(
                        Array.isArray(
                            conflictData
                        )
                            ? conflictData
                            : []
                    );


                    setSummary(
                        normalizeSummary(
                            summaryData
                        )
                    );


                } catch (error) {

                    if (cancelled) {
                        return;
                    }


                    console.error(
                        "Load conflicts error:",
                        error
                    );


                    setConflicts([]);


                    setSummary(
                        DEFAULT_SUMMARY
                    );


                    alert(
                        error.response
                            ?.data
                            ?.message ||
                        error.response
                            ?.data
                            ?.error ||
                        "Failed to load conflicts."
                    );


                } finally {

                    if (!cancelled) {

                        setLoading(false);
                    }
                }
            };


        loadSessionConflicts();


        return () => {

            cancelled = true;
        };

    }, [selectedSession]);


    // ========================================================
    // MANUAL REFRESH
    //
    // This function is called by button/event handlers,
    // so setLoading(true) is safe here.
    // ========================================================

    const loadConflicts =
        useCallback(async () => {

            if (!selectedSession) {
                return;
            }


            try {

                setLoading(true);


                const sessionId =
                    Number(
                        selectedSession
                    );


                const [
                    conflictData,
                    summaryData
                ] = await Promise.all([

                    getAllConflicts(
                        sessionId
                    ),

                    getConflictSummary(
                        sessionId
                    )
                ]);


                setConflicts(
                    Array.isArray(
                        conflictData
                    )
                        ? conflictData
                        : []
                );


                setSummary(
                    normalizeSummary(
                        summaryData
                    )
                );


            } catch (error) {

                console.error(
                    "Refresh conflicts error:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    error.response
                        ?.data
                        ?.error ||
                    "Failed to refresh conflicts."
                );


            } finally {

                setLoading(false);
            }

        }, [selectedSession]);


    // ========================================================
    // SESSION CHANGE
    // ========================================================

    const handleSessionChange =
        event => {

            const value =
                event.target.value;


            setLoading(true);

            setLastValidated(null);

            setTypeFilter("");

            setSeverityFilter("");

            setSearch("");

            setSelectedSession(
                value
            );
        };


    // ========================================================
    // VALIDATE TIMETABLE
    // ========================================================

    const handleValidate =
        async () => {

            if (!selectedSession) {
                return;
            }


            try {

                setValidating(true);


                const result =
                    await validateTimetable(
                        Number(
                            selectedSession
                        )
                    );


                setLastValidated(
                    result
                );


                await loadConflicts();


                if (result?.isValid) {

                    alert(
                        "Timetable validation completed. No conflicts found."
                    );

                } else {

                    alert(
                        `Validation completed. ${result?.totalConflicts || 0} conflict(s) found.`
                    );
                }


            } catch (error) {

                console.error(
                    "Validation error:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    error.response
                        ?.data
                        ?.error ||
                    "Failed to validate timetable."
                );


            } finally {

                setValidating(false);
            }
        };


    // ========================================================
    // CONFLICT TYPES
    // ========================================================

    const conflictTypes =
        useMemo(() => {

            return [
                ...new Set(
                    conflicts
                        .map(
                            item =>
                                item.type
                        )
                        .filter(Boolean)
                )
            ];

        }, [conflicts]);


    // ========================================================
    // FILTERED CONFLICTS
    // ========================================================

    const filteredConflicts =
        useMemo(() => {

            const text =
                search
                    .trim()
                    .toLowerCase();


            return conflicts.filter(
                conflict => {

                    // ------------------------------------------
                    // TYPE FILTER
                    // ------------------------------------------

                    if (
                        typeFilter &&
                        conflict.type !==
                            typeFilter
                    ) {

                        return false;
                    }


                    // ------------------------------------------
                    // SEVERITY FILTER
                    // ------------------------------------------

                    if (
                        severityFilter &&
                        conflict.severity !==
                            severityFilter
                    ) {

                        return false;
                    }


                    // ------------------------------------------
                    // NO SEARCH
                    // ------------------------------------------

                    if (!text) {

                        return true;
                    }


                    // ------------------------------------------
                    // SEARCH
                    // ------------------------------------------

                    const haystack =
                        [
                            conflict.type,
                            conflict.severity,
                            conflict.message,
                            conflict.teacherName,
                            conflict.roomName,
                            conflict.sectionCode,
                            conflict.subjectName,
                            conflict.teacherId,
                            conflict.roomId,
                            conflict.sectionId,
                            conflict.timeSlotId,
                            conflict.dayOfWeek
                        ]
                            .filter(
                                value =>
                                    value !==
                                        undefined &&
                                    value !==
                                        null
                            )
                            .join(" ")
                            .toLowerCase();


                    return haystack.includes(
                        text
                    );
                }
            );

        }, [
            conflicts,
            typeFilter,
            severityFilter,
            search
        ]);


    // ========================================================
    // RESOLVE
    // ========================================================

    const handleResolve =
        conflict => {

            const params =
                new URLSearchParams();


            if (selectedSession) {

                params.set(
                    "session",
                    selectedSession
                );
            }


            if (
                conflict.timetableEntryId
            ) {

                params.set(
                    "entryId",
                    String(
                        conflict
                            .timetableEntryId
                    )
                );
            }


            if (
                conflict.teacherId
            ) {

                params.set(
                    "teacherId",
                    String(
                        conflict.teacherId
                    )
                );
            }


            if (
                conflict.roomId
            ) {

                params.set(
                    "roomId",
                    String(
                        conflict.roomId
                    )
                );
            }


            if (
                conflict.sectionId
            ) {

                params.set(
                    "sectionId",
                    String(
                        conflict.sectionId
                    )
                );
            }


            if (
                conflict.timeSlotId
            ) {

                params.set(
                    "timeSlotId",
                    String(
                        conflict.timeSlotId
                    )
                );
            }


            navigate(
                `/timetable?${params.toString()}`
            );
        };


    // ========================================================
    // FORMAT TIME
    // ========================================================

    const formatTime =
        value => {

            if (!value) {

                return "-";
            }


            return String(value)
                .slice(
                    0,
                    5
                );
        };


    // ========================================================
    // GET DAY NAME
    // ========================================================

    const getDayName =
        dayOfWeek => {

            const dayNumber =
                Number(
                    dayOfWeek
                );


            return (
                DAYS[dayNumber] ||
                "-"
            );
        };


    // ========================================================
    // RESOURCE NAME
    // ========================================================

    const getResourceName =
        conflict => {

            if (
                conflict.teacherName
            ) {

                return conflict.teacherName;
            }


            if (
                conflict.roomName
            ) {

                return conflict.roomName;
            }


            if (
                conflict.sectionCode
            ) {

                return conflict.sectionCode;
            }


            if (
                conflict.subjectName
            ) {

                return conflict.subjectName;
            }


            return "-";
        };


    // ========================================================
    // NO SESSION
    // ========================================================

    const noSessions =
        !loading &&
        sessionOptions.length === 0;


    // ========================================================
    // UI
    // ========================================================

    return (

        <div className="conflicts-page">


            {/* ===============================================
                HEADER
            ================================================ */}

            <div className="conflicts-header">

                <div>

                    <h1>
                        Conflict Management
                    </h1>

                    <p>
                        Detect and resolve timetable
                        scheduling conflicts.
                    </p>

                </div>


                <div className="conflict-header-actions">

                    <button
                        type="button"
                        className="refresh-conflicts-btn"
                        onClick={
                            loadConflicts
                        }
                        disabled={
                            loading ||
                            !selectedSession
                        }
                    >

                        {loading
                            ? "Loading..."
                            : "↻ Refresh"
                        }

                    </button>


                    <button
                        type="button"
                        className="validate-btn"
                        onClick={
                            handleValidate
                        }
                        disabled={
                            validating ||
                            loading ||
                            !selectedSession
                        }
                    >

                        {validating
                            ? "Validating..."
                            : "✓ Validate Timetable"
                        }

                    </button>

                </div>

            </div>


            {/* ===============================================
                NO SESSION MESSAGE
            ================================================ */}

            {noSessions && (

                <div className="validation-status invalid">

                    <strong>
                        No Academic Session Found
                    </strong>

                    <span>
                        {" "}
                        Create sections with an
                        AcademicSessionId first.
                    </span>

                </div>
            )}


            {/* ===============================================
                TOOLBAR
            ================================================ */}

            <div className="conflict-toolbar">


                {/* SESSION */}

                <div className="conflict-field">

                    <label>
                        Academic Session
                    </label>


                    <select
                        value={
                            selectedSession
                        }
                        onChange={
                            handleSessionChange
                        }
                        disabled={
                            sessionOptions.length === 0
                        }
                    >

                        {sessionOptions.length === 0 && (

                            <option value="">
                                No Session Available
                            </option>
                        )}


                        {sessionOptions.map(
                            session => (

                                <option
                                    key={
                                        session
                                    }
                                    value={
                                        session
                                    }
                                >

                                    Session {session}

                                </option>
                            )
                        )}

                    </select>

                </div>


                {/* TYPE */}

                <div className="conflict-field">

                    <label>
                        Conflict Type
                    </label>


                    <select
                        value={
                            typeFilter
                        }
                        onChange={
                            event =>
                                setTypeFilter(
                                    event
                                        .target
                                        .value
                                )
                        }
                    >

                        <option value="">
                            All Types
                        </option>


                        {conflictTypes.map(
                            type => (

                                <option
                                    key={
                                        type
                                    }
                                    value={
                                        type
                                    }
                                >

                                    {type}

                                </option>
                            )
                        )}

                    </select>

                </div>


                {/* SEVERITY */}

                <div className="conflict-field">

                    <label>
                        Severity
                    </label>


                    <select
                        value={
                            severityFilter
                        }
                        onChange={
                            event =>
                                setSeverityFilter(
                                    event
                                        .target
                                        .value
                                )
                        }
                    >

                        <option value="">
                            All Severities
                        </option>

                        <option value="HIGH">
                            High
                        </option>

                        <option value="MEDIUM">
                            Medium
                        </option>

                    </select>

                </div>


                {/* SEARCH */}

                <div
                    className="
                        conflict-field
                        conflict-search
                    "
                >

                    <label>
                        Search
                    </label>


                    <input
                        type="text"
                        placeholder="Teacher, room, section..."
                        value={
                            search
                        }
                        onChange={
                            event =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                        }
                    />

                </div>

            </div>


            {/* ===============================================
                SUMMARY CARDS
            ================================================ */}

            <div className="conflict-summary-grid">


                {/* TOTAL */}

                <div className="conflict-stat-card">

                    <span>
                        Total Conflicts
                    </span>

                    <strong>
                        {
                            summary
                                .totalConflicts
                        }
                    </strong>

                </div>


                {/* TEACHER */}

                <div className="conflict-stat-card">

                    <span>
                        Teacher
                    </span>

                    <strong>
                        {
                            summary
                                .teacherConflicts
                        }
                    </strong>

                </div>


                {/* ROOM */}

                <div className="conflict-stat-card">

                    <span>
                        Room
                    </span>

                    <strong>
                        {
                            summary
                                .roomConflicts
                        }
                    </strong>

                </div>


                {/* SECTION */}

                <div className="conflict-stat-card">

                    <span>
                        Section
                    </span>

                    <strong>
                        {
                            summary
                                .sectionConflicts
                        }
                    </strong>

                </div>


                {/* CAPACITY */}

                <div className="conflict-stat-card">

                    <span>
                        Capacity
                    </span>

                    <strong>
                        {
                            summary
                                .roomCapacityConflicts
                        }
                    </strong>

                </div>


                {/* DAILY LOAD */}

                <div className="conflict-stat-card">

                    <span>
                        Daily Load
                    </span>

                    <strong>
                        {
                            summary
                                .teacherDailyLoadConflicts
                        }
                    </strong>

                </div>

            </div>


            {/* ===============================================
                VALIDATION STATUS
            ================================================ */}

            <div
                className={
                    summary.isValid
                        ? "validation-status valid"
                        : "validation-status invalid"
                }
            >

                <strong>

                    {summary.isValid
                        ? "✓ Timetable Valid"
                        : "⚠ Conflicts Detected"
                    }

                </strong>


                <span>

                    {summary.isValid
                        ? " No scheduling conflicts were detected."
                        : ` ${summary.totalConflicts} conflict(s) require attention.`
                    }

                </span>

            </div>


            {/* ===============================================
                LAST VALIDATION
            ================================================ */}

            {lastValidated && (

                <div className="last-validation">

                    Last validation:
                    {" "}

                    {lastValidated.isValid
                        ? "Valid"
                        : `${lastValidated.totalConflicts || 0} conflict(s)`
                    }

                </div>
            )}


            {/* ===============================================
                TABLE
            ================================================ */}

            <div className="conflicts-table-card">


                {/* LOADING */}

                {loading ? (

                    <div className="conflict-loading">

                        Loading conflicts...

                    </div>


                ) : filteredConflicts.length === 0 ? (


                    /* NO CONFLICTS */

                    <div className="no-conflicts">

                        <div className="no-conflicts-icon">
                            ✓
                        </div>


                        <h2>
                            No Conflicts Found
                        </h2>


                        <p>

                            {conflicts.length === 0
                                ? "No timetable conflicts were detected for this academic session."
                                : "No conflicts match the current filters."
                            }

                        </p>

                    </div>


                ) : (


                    /* TABLE */

                    <div className="conflict-table-wrapper">

                        <table className="conflicts-table">


                            {/* TABLE HEADER */}

                            <thead>

                                <tr>

                                    <th>
                                        #
                                    </th>

                                    <th>
                                        Type
                                    </th>

                                    <th>
                                        Severity
                                    </th>

                                    <th>
                                        Resource
                                    </th>

                                    <th>
                                        Day
                                    </th>

                                    <th>
                                        Time
                                    </th>

                                    <th>
                                        Details
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            {/* TABLE BODY */}

                            <tbody>

                                {filteredConflicts.map(
                                    (
                                        conflict,
                                        index
                                    ) => {

                                        const resource =
                                            getResourceName(
                                                conflict
                                            );


                                        const key =
                                            [
                                                conflict.type,
                                                conflict
                                                    .timetableEntryId,
                                                conflict.teacherId,
                                                conflict.roomId,
                                                conflict.sectionId,
                                                conflict.timeSlotId,
                                                index
                                            ]
                                                .filter(
                                                    value =>
                                                        value !==
                                                            undefined &&
                                                        value !==
                                                            null
                                                )
                                                .join("-");


                                        return (

                                            <tr
                                                key={
                                                    key
                                                }
                                            >


                                                {/* NUMBER */}

                                                <td>

                                                    {
                                                        index +
                                                        1
                                                    }

                                                </td>


                                                {/* TYPE */}

                                                <td>

                                                    <span className="conflict-type">

                                                        {
                                                            conflict
                                                                .type ||
                                                            "-"
                                                        }

                                                    </span>

                                                </td>


                                                {/* SEVERITY */}

                                                <td>

                                                    <span
                                                        className={
                                                            `severity-badge ${
                                                                conflict.severity ===
                                                                "HIGH"
                                                                    ? "severity-high"
                                                                    : "severity-medium"
                                                            }`
                                                        }
                                                    >

                                                        {
                                                            conflict
                                                                .severity ||
                                                            "MEDIUM"
                                                        }

                                                    </span>

                                                </td>


                                                {/* RESOURCE */}

                                                <td>

                                                    {
                                                        resource
                                                    }

                                                </td>


                                                {/* DAY */}

                                                <td>

                                                    {
                                                        getDayName(
                                                            conflict
                                                                .dayOfWeek
                                                        )
                                                    }

                                                </td>


                                                {/* TIME */}

                                                <td>

                                                    {conflict.startTime
                                                        ? (
                                                            `${formatTime(
                                                                conflict
                                                                    .startTime
                                                            )} - ${formatTime(
                                                                conflict
                                                                    .endTime
                                                            )}`
                                                        )
                                                        : "-"
                                                    }

                                                </td>


                                                {/* MESSAGE */}

                                                <td className="conflict-message">

                                                    {
                                                        conflict
                                                            .message ||
                                                        "Conflict detected."
                                                    }

                                                </td>


                                                {/* ACTION */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="resolve-btn"
                                                        onClick={
                                                            () =>
                                                                handleResolve(
                                                                    conflict
                                                                )
                                                        }
                                                    >

                                                        Resolve

                                                    </button>

                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

        </div>
    );
}


export default Conflicts;