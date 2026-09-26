import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    getAllSections,
    getSectionLookups,
    createCampus,
    createAcademicSession,
    createSection,
    updateSection,
    deleteSection
} from "../services/sectionService";

import "./Sections.css";


const emptyForm = {

    CampusId: "",

    AcademicSessionId: "",

    ClassYearId: "",

    ProgramId: "",

    DefaultRoomId: "",

    SectionName: "",

    SectionCode: "",

    StudentCount: "",

    IsActive: true
};


const emptyCampusForm = {

    CampusName: "",

    CampusCode: "",

    Location: ""
};


const emptySessionForm = {

    SessionName: "",

    StartDate: "",

    EndDate: "",

    IsCurrent: false
};


const normalizeCodePart =
    value =>

        String(
            value ?? ""
        )

            .trim()

            .toUpperCase()

            .replace(
                /[^A-Z0-9]+/g,
                "-"
            )

            .replace(
                /^-+|-+$/g,
                ""
            );


function Sections() {

    // ==================================================
    // STATE
    // ==================================================

    const [
        sections,
        setSections
    ] = useState([]);


    const [
        campuses,
        setCampuses
    ] = useState([]);


    const [
        academicSessions,
        setAcademicSessions
    ] = useState([]);


    const [
        classYears,
        setClassYears
    ] = useState([]);


    const [
        programs,
        setPrograms
    ] = useState([]);


    const [
        rooms,
        setRooms
    ] = useState([]);


    const [
        form,
        setForm
    ] = useState(
        emptyForm
    );


    const [
        editingId,
        setEditingId
    ] = useState(null);


    const [
        showForm,
        setShowForm
    ] = useState(false);


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        saving,
        setSaving
    ] = useState(false);


    const [
        error,
        setError
    ] = useState("");


    const [
        search,
        setSearch
    ] = useState("");


    const [
        showCampusForm,
        setShowCampusForm
    ] = useState(false);


    const [
        showSessionForm,
        setShowSessionForm
    ] = useState(false);


    const [
        campusForm,
        setCampusForm
    ] = useState(
        emptyCampusForm
    );


    const [
        sessionForm,
        setSessionForm
    ] = useState(
        emptySessionForm
    );


    const [
        savingCampus,
        setSavingCampus
    ] = useState(false);


    const [
        savingSession,
        setSavingSession
    ] = useState(false);


    // ==================================================
    // APPLY LOOKUPS
    // ==================================================

    const applyLookupData =
        data => {

            setCampuses(
                Array.isArray(
                    data?.campuses
                )
                    ? data.campuses
                    : []
            );


            setAcademicSessions(
                Array.isArray(
                    data?.academicSessions
                )
                    ? data.academicSessions
                    : []
            );


            setClassYears(
                Array.isArray(
                    data?.classYears
                )
                    ? data.classYears
                    : []
            );


            setPrograms(
                Array.isArray(
                    data?.programs
                )
                    ? data.programs
                    : []
            );


            setRooms(
                Array.isArray(
                    data?.rooms
                )
                    ? data.rooms
                    : []
            );
        };


    // ==================================================
    // SECTION CODE
    // ==================================================

    const generateSectionCode = (
        data,
        campusList = campuses,
        yearList = classYears,
        programList = programs
    ) => {

        const campus =
            campusList.find(
                item =>

                    Number(
                        item.CampusId
                    ) ===
                    Number(
                        data.CampusId
                    )
            );


        const year =
            yearList.find(
                item =>

                    Number(
                        item.ClassYearId
                    ) ===
                    Number(
                        data.ClassYearId
                    )
            );


        const program =
            programList.find(
                item =>

                    Number(
                        item.ProgramId
                    ) ===
                    Number(
                        data.ProgramId
                    )
            );


        const campusCode =
            normalizeCodePart(
                campus?.CampusCode
            );


        const yearNumber =
            Number(
                year?.YearNumber
            );


        const programCode =
            normalizeCodePart(
                program?.ProgramCode
            );


        const sectionName =
            normalizeCodePart(
                data.SectionName
            );


        if (
            !campusCode ||
            !yearNumber ||
            !programCode ||
            !sectionName
        ) {

            return "";
        }


        return [

            campusCode,

            `${yearNumber}Y`,

            programCode,

            sectionName

        ].join("-");
    };


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled =
            false;


        const initialize =
            async () => {

                try {

                    const [
                        sectionData,
                        lookupData
                    ] =
                        await Promise.all([

                            getAllSections(),

                            getSectionLookups()
                        ]);


                    if (cancelled) {

                        return;
                    }


                    setSections(
                        Array.isArray(
                            sectionData
                        )
                            ? sectionData
                            : []
                    );


                    applyLookupData(
                        lookupData
                    );


                } catch (err) {

                    if (cancelled) {

                        return;
                    }


                    console.error(
                        "Load sections error:",
                        err
                    );


                    setError(

                        err.response
                            ?.data
                            ?.message

                        ||

                        "Failed to load sections."
                    );


                } finally {

                    if (!cancelled) {

                        setLoading(
                            false
                        );
                    }
                }
            };


        initialize();


        return () => {

            cancelled =
                true;
        };

    }, []);


    // ==================================================
    // REFRESH
    // ==================================================

    const loadSections =
        async () => {

            const data =
                await getAllSections();


            setSections(
                Array.isArray(data)
                    ? data
                    : []
            );
        };


    const refreshLookups =
        async () => {

            const data =
                await getSectionLookups();


            applyLookupData(
                data
            );


            return data;
        };


    // ==================================================
    // ROOM USERS
    // ==================================================

    const getRoomUsers =
        roomId => {

            const sessionId =
                Number(
                    form.AcademicSessionId
                );


            if (!sessionId) {

                return [];
            }


            return sections.filter(
                section =>

                    Number(
                        section.DefaultRoomId
                    ) ===
                    Number(
                        roomId
                    )

                    &&

                    Number(
                        section.AcademicSessionId
                    ) ===
                    sessionId

                    &&

                    Number(
                        section.SectionId
                    ) !==
                    Number(
                        editingId
                    )
            );
        };


    // ==================================================
    // AVAILABLE ROOMS
    //
    // IMPORTANT:
    // Room already assigned hona frontend par
    // usko hide NAHI karega.
    //
    // Backend decide karega ke same Teaching Group
    // share kar sakta hai ya nahi.
    // ==================================================

    const availableRooms =
        useMemo(() => {

            const campusId =
                Number(
                    form.CampusId
                );


            const studentCount =
                Number(
                    form.StudentCount ||
                    0
                );


            if (!campusId) {

                return [];
            }


            return rooms.filter(
                room => {

                    if (
                        Number(
                            room.CampusId
                        ) !==
                        campusId
                    ) {

                        return false;
                    }


                    if (
                        studentCount > 0

                        &&

                        Number(
                            room.Capacity
                        ) <
                        studentCount
                    ) {

                        return false;
                    }


                    return true;
                }
            );

        }, [

            rooms,

            form.CampusId,

            form.StudentCount
        ]);


    // ==================================================
    // FORM CHANGE
    // ==================================================

    const handleChange =
        event => {

            const {
                name,
                value,
                type,
                checked
            } = event.target;


            setForm(
                previous => {

                    const updated = {

                        ...previous,

                        [name]:

                            type ===
                            "checkbox"

                                ? checked

                                : value
                    };


                    // Campus change:
                    // room clear.
                    if (
                        name ===
                        "CampusId"
                    ) {

                        updated.DefaultRoomId =
                            "";
                    }


                    // If student count becomes bigger
                    // than selected room capacity,
                    // remove selected room.
                    if (
                        name ===
                            "StudentCount"

                        &&

                        updated.DefaultRoomId
                    ) {

                        const selectedRoom =
                            rooms.find(
                                room =>

                                    Number(
                                        room.RoomId
                                    ) ===
                                    Number(
                                        updated.DefaultRoomId
                                    )
                            );


                        if (
                            selectedRoom

                            &&

                            Number(
                                selectedRoom.Capacity
                            ) <
                            Number(
                                value ||
                                0
                            )
                        ) {

                            updated.DefaultRoomId =
                                "";
                        }
                    }


                    if (
                        [
                            "CampusId",
                            "ClassYearId",
                            "ProgramId",
                            "SectionName"
                        ].includes(
                            name
                        )
                    ) {

                        updated.SectionCode =
                            generateSectionCode(
                                updated
                            );
                    }


                    return updated;
                }
            );
        };


    // ==================================================
    // ADD
    // ==================================================

    const handleAdd = () => {

        setEditingId(
            null
        );


        setForm(
            emptyForm
        );


        setShowForm(
            true
        );


        setShowCampusForm(
            false
        );


        setShowSessionForm(
            false
        );


        setError("");
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit =
        section => {

            setEditingId(
                section.SectionId
            );


            setForm({

                CampusId:
                    String(
                        section.CampusId ??
                        ""
                    ),

                AcademicSessionId:
                    String(
                        section.AcademicSessionId ??
                        ""
                    ),

                ClassYearId:
                    String(
                        section.ClassYearId ??
                        ""
                    ),

                ProgramId:
                    String(
                        section.ProgramId ??
                        ""
                    ),

                DefaultRoomId:
                    String(
                        section.DefaultRoomId ??
                        ""
                    ),

                SectionName:
                    section.SectionName ??
                    "",

                SectionCode:
                    section.SectionCode ??
                    "",

                StudentCount:
                    String(
                        section.StudentCount ??
                        ""
                    ),

                IsActive:
                    section.IsActive !==
                    false
            });


            setShowCampusForm(
                false
            );


            setShowSessionForm(
                false
            );


            setShowForm(
                true
            );


            setError("");


            window.scrollTo({

                top:
                    0,

                behavior:
                    "smooth"
            });
        };


    // ==================================================
    // CANCEL
    // ==================================================

    const handleCancel =
        () => {

            setForm(
                emptyForm
            );


            setEditingId(
                null
            );


            setShowForm(
                false
            );


            setShowCampusForm(
                false
            );


            setShowSessionForm(
                false
            );


            setCampusForm(
                emptyCampusForm
            );


            setSessionForm(
                emptySessionForm
            );


            setError("");
        };


    // ==================================================
    // CREATE CAMPUS
    // ==================================================

    const handleCreateCampus =
        async () => {

            const CampusName =
                campusForm
                    .CampusName
                    .trim();


            const CampusCode =
                normalizeCodePart(
                    campusForm
                        .CampusCode
                );


            const Location =
                campusForm
                    .Location
                    .trim();


            if (!CampusName) {

                setError(
                    "Campus name is required."
                );

                return;
            }


            if (!CampusCode) {

                setError(
                    "Campus code is required."
                );

                return;
            }


            try {

                setSavingCampus(
                    true
                );


                setError("");


                const result =
                    await createCampus({

                        CampusName,

                        CampusCode,

                        Location,

                        IsActive:
                            true
                    });


                const lookupData =
                    await refreshLookups();


                const newCampusId =
                    result
                        ?.campus
                        ?.CampusId;


                if (newCampusId) {

                    setForm(
                        previous => {

                            const updated = {

                                ...previous,

                                CampusId:
                                    String(
                                        newCampusId
                                    ),

                                DefaultRoomId:
                                    ""
                            };


                            updated.SectionCode =
                                generateSectionCode(

                                    updated,

                                    lookupData
                                        ?.campuses
                                    || [],

                                    lookupData
                                        ?.classYears
                                    || [],

                                    lookupData
                                        ?.programs
                                    || []
                                );


                            return updated;
                        }
                    );
                }


                setCampusForm(
                    emptyCampusForm
                );


                setShowCampusForm(
                    false
                );


            } catch (err) {

                console.error(
                    "Create campus error:",
                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to create campus."
                );


            } finally {

                setSavingCampus(
                    false
                );
            }
        };


    // ==================================================
    // CREATE SESSION
    // ==================================================

    const handleCreateSession =
        async () => {

            const SessionName =
                sessionForm
                    .SessionName
                    .trim();


            const StartDate =
                sessionForm.StartDate;


            const EndDate =
                sessionForm.EndDate;


            if (!SessionName) {

                setError(
                    "Academic session name is required."
                );

                return;
            }


            if (!StartDate) {

                setError(
                    "Start date is required."
                );

                return;
            }


            if (!EndDate) {

                setError(
                    "End date is required."
                );

                return;
            }


            if (
                new Date(
                    EndDate
                ) <
                new Date(
                    StartDate
                )
            ) {

                setError(
                    "End date cannot be before start date."
                );

                return;
            }


            try {

                setSavingSession(
                    true
                );


                setError("");


                const result =
                    await createAcademicSession({

                        SessionName,

                        StartDate,

                        EndDate,

                        IsCurrent:
                            Boolean(
                                sessionForm.IsCurrent
                            )
                    });


                await refreshLookups();


                const newSessionId =
                    result
                        ?.session
                        ?.AcademicSessionId;


                if (newSessionId) {

                    setForm(
                        previous => ({

                            ...previous,

                            AcademicSessionId:
                                String(
                                    newSessionId
                                )
                        })
                    );
                }


                setSessionForm(
                    emptySessionForm
                );


                setShowSessionForm(
                    false
                );


            } catch (err) {

                console.error(
                    "Create session error:",
                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to create academic session."
                );


            } finally {

                setSavingSession(
                    false
                );
            }
        };


    // ==================================================
    // SAVE SECTION
    // ==================================================

    const handleSubmit =
        async event => {

            event.preventDefault();


            if (!form.CampusId) {

                setError(
                    "Please select a campus."
                );

                return;
            }


            if (
                !form.AcademicSessionId
            ) {

                setError(
                    "Please select an academic session."
                );

                return;
            }


            if (!form.ClassYearId) {

                setError(
                    "Please select a class year."
                );

                return;
            }


            if (!form.ProgramId) {

                setError(
                    "Please select a program."
                );

                return;
            }


            if (
                !form.SectionName
                    .trim()
            ) {

                setError(
                    "Section name is required."
                );

                return;
            }


            const studentCount =
                Number(
                    form.StudentCount
                );


            if (
                !Number.isInteger(
                    studentCount
                )

                ||

                studentCount <= 0
            ) {

                setError(
                    "Student count must be greater than 0."
                );

                return;
            }


            if (
                !form.DefaultRoomId
            ) {

                setError(
                    "Please assign a room."
                );

                return;
            }


            const finalSectionCode =
                generateSectionCode(
                    form
                );


            if (!finalSectionCode) {

                setError(
                    "Section code could not be generated."
                );

                return;
            }


            const payload = {

                CampusId:
                    Number(
                        form.CampusId
                    ),

                AcademicSessionId:
                    Number(
                        form.AcademicSessionId
                    ),

                ClassYearId:
                    Number(
                        form.ClassYearId
                    ),

                ProgramId:
                    Number(
                        form.ProgramId
                    ),

                DefaultRoomId:
                    Number(
                        form.DefaultRoomId
                    ),

                SectionName:
                    form.SectionName
                        .trim()
                        .toUpperCase(),

                SectionCode:
                    finalSectionCode,

                StudentCount:
                    studentCount,

                IsActive:
                    Boolean(
                        form.IsActive
                    )
            };


            try {

                setSaving(
                    true
                );


                setError("");


                if (editingId) {

                    const result =
                        await updateSection(
                            editingId,
                            payload
                        );


                    if (
                        result?.message
                    ) {

                        alert(
                            result.message
                        );
                    }


                } else {

                    await createSection(
                        payload
                    );
                }


                setForm(
                    emptyForm
                );


                setEditingId(
                    null
                );


                setShowForm(
                    false
                );


                await loadSections();

                await refreshLookups();


            } catch (err) {

                console.error(
                    "Save section error:",
                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to save section."
                );


            } finally {

                setSaving(
                    false
                );
            }
        };


    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete =
        async id => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to delete this section?"
                );


            if (!confirmed) {

                return;
            }


            try {

                setError("");


                await deleteSection(
                    id
                );


                await loadSections();


            } catch (err) {

                console.error(
                    "Delete section error:",
                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to delete section."
                );
            }
        };


    // ==================================================
    // SEARCH
    // ==================================================

    const filteredSections =
        useMemo(() => {

            const text =
                search
                    .trim()
                    .toLowerCase();


            if (!text) {

                return sections;
            }


            return sections.filter(
                section => {

                    const content =
                        [

                            section.SectionName,

                            section.SectionCode,

                            section.CampusName,

                            section.SessionName,

                            section.YearName,

                            section.ProgramName,

                            section.DefaultRoomNumber,

                            section.DefaultRoomName

                        ]

                            .filter(
                                Boolean
                            )

                            .join(" ")

                            .toLowerCase();


                    return content
                        .includes(
                            text
                        );
                }
            );

        }, [
            sections,
            search
        ]);


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="sections-page">


            <div className="sections-header">

                <div>

                    <h1>
                        Sections
                    </h1>


                    <p>
                        Manage college sections, student groups and assigned classrooms.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-section-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Section
                </button>

            </div>


            {error && (

                <div
                    style={{
                        marginBottom:
                            "16px",

                        padding:
                            "12px 14px",

                        borderRadius:
                            "8px",

                        background:
                            "#fee2e2",

                        color:
                            "#b91c1c"
                    }}
                >
                    {error}
                </div>
            )}


            {showForm && (

                <div className="section-form-card">


                    <div className="form-header">

                        <h2>

                            {editingId
                                ? "Edit Section"
                                : "Add New Section"
                            }

                        </h2>


                        <button
                            type="button"
                            className="close-btn"
                            onClick={
                                handleCancel
                            }
                            disabled={
                                saving
                            }
                        >
                            ×
                        </button>

                    </div>


                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <div className="form-grid">


                            {/* CAMPUS */}

                            <div className="form-group">

                                <div
                                    style={{
                                        display:
                                            "flex",

                                        justifyContent:
                                            "space-between",

                                        alignItems:
                                            "center",

                                        gap:
                                            "10px"
                                    }}
                                >

                                    <label>
                                        Campus *
                                    </label>


                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                setShowCampusForm(
                                                    previous =>
                                                        !previous
                                                )
                                        }
                                        style={{
                                            border:
                                                "none",

                                            background:
                                                "transparent",

                                            color:
                                                "#2563eb",

                                            fontWeight:
                                                700,

                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        + Add Campus
                                    </button>

                                </div>


                                <select
                                    name="CampusId"
                                    value={
                                        form.CampusId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Campus
                                    </option>


                                    {campuses.map(
                                        campus => (

                                            <option
                                                key={
                                                    campus.CampusId
                                                }
                                                value={
                                                    campus.CampusId
                                                }
                                            >
                                                {
                                                    campus.CampusName
                                                }
                                            </option>
                                        )
                                    )}

                                </select>


                                {showCampusForm && (

                                    <div
                                        style={{
                                            marginTop:
                                                "10px",

                                            padding:
                                                "12px",

                                            background:
                                                "#f8fafc",

                                            border:
                                                "1px solid #e2e8f0",

                                            borderRadius:
                                                "8px",

                                            display:
                                                "grid",

                                            gap:
                                                "10px"
                                        }}
                                    >

                                        <input
                                            type="text"
                                            placeholder="Campus Name"
                                            value={
                                                campusForm.CampusName
                                            }
                                            onChange={
                                                event =>
                                                    setCampusForm(
                                                        previous => ({
                                                            ...previous,

                                                            CampusName:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <input
                                            type="text"
                                            placeholder="Campus Code"
                                            value={
                                                campusForm.CampusCode
                                            }
                                            onChange={
                                                event =>
                                                    setCampusForm(
                                                        previous => ({
                                                            ...previous,

                                                            CampusCode:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <input
                                            type="text"
                                            placeholder="Location"
                                            value={
                                                campusForm.Location
                                            }
                                            onChange={
                                                event =>
                                                    setCampusForm(
                                                        previous => ({
                                                            ...previous,

                                                            Location:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <button
                                            type="button"
                                            onClick={
                                                handleCreateCampus
                                            }
                                            disabled={
                                                savingCampus
                                            }
                                        >
                                            {savingCampus
                                                ? "Saving..."
                                                : "Save Campus"
                                            }
                                        </button>

                                    </div>
                                )}

                            </div>


                            {/* SESSION */}

                            <div className="form-group">

                                <div
                                    style={{
                                        display:
                                            "flex",

                                        justifyContent:
                                            "space-between",

                                        alignItems:
                                            "center",

                                        gap:
                                            "10px"
                                    }}
                                >

                                    <label>
                                        Academic Session *
                                    </label>


                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                setShowSessionForm(
                                                    previous =>
                                                        !previous
                                                )
                                        }
                                        style={{
                                            border:
                                                "none",

                                            background:
                                                "transparent",

                                            color:
                                                "#2563eb",

                                            fontWeight:
                                                700,

                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        + Add Session
                                    </button>

                                </div>


                                <select
                                    name="AcademicSessionId"
                                    value={
                                        form.AcademicSessionId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Academic Session
                                    </option>


                                    {academicSessions.map(
                                        session => (

                                            <option
                                                key={
                                                    session.AcademicSessionId
                                                }
                                                value={
                                                    session.AcademicSessionId
                                                }
                                            >
                                                {
                                                    session.SessionName
                                                }

                                                {
                                                    session.IsCurrent
                                                        ? " (Current)"
                                                        : ""
                                                }
                                            </option>
                                        )
                                    )}

                                </select>


                                {showSessionForm && (

                                    <div
                                        style={{
                                            marginTop:
                                                "10px",

                                            padding:
                                                "12px",

                                            background:
                                                "#f8fafc",

                                            border:
                                                "1px solid #e2e8f0",

                                            borderRadius:
                                                "8px",

                                            display:
                                                "grid",

                                            gap:
                                                "10px"
                                        }}
                                    >

                                        <input
                                            type="text"
                                            placeholder="Session Name"
                                            value={
                                                sessionForm.SessionName
                                            }
                                            onChange={
                                                event =>
                                                    setSessionForm(
                                                        previous => ({
                                                            ...previous,

                                                            SessionName:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <input
                                            type="date"
                                            value={
                                                sessionForm.StartDate
                                            }
                                            onChange={
                                                event =>
                                                    setSessionForm(
                                                        previous => ({
                                                            ...previous,

                                                            StartDate:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <input
                                            type="date"
                                            value={
                                                sessionForm.EndDate
                                            }
                                            onChange={
                                                event =>
                                                    setSessionForm(
                                                        previous => ({
                                                            ...previous,

                                                            EndDate:
                                                                event
                                                                    .target
                                                                    .value
                                                        })
                                                    )
                                            }
                                        />


                                        <label>

                                            <input
                                                type="checkbox"
                                                checked={
                                                    sessionForm.IsCurrent
                                                }
                                                onChange={
                                                    event =>
                                                        setSessionForm(
                                                            previous => ({
                                                                ...previous,

                                                                IsCurrent:
                                                                    event
                                                                        .target
                                                                        .checked
                                                            })
                                                        )
                                                }
                                            />

                                            Current Session

                                        </label>


                                        <button
                                            type="button"
                                            onClick={
                                                handleCreateSession
                                            }
                                            disabled={
                                                savingSession
                                            }
                                        >
                                            {savingSession
                                                ? "Saving..."
                                                : "Save Session"
                                            }
                                        </button>

                                    </div>
                                )}

                            </div>


                            {/* CLASS YEAR */}

                            <div className="form-group">

                                <label>
                                    Class Year *
                                </label>


                                <select
                                    name="ClassYearId"
                                    value={
                                        form.ClassYearId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Class Year
                                    </option>


                                    {classYears.map(
                                        year => (

                                            <option
                                                key={
                                                    year.ClassYearId
                                                }
                                                value={
                                                    year.ClassYearId
                                                }
                                            >
                                                {
                                                    year.YearName
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>


                            {/* PROGRAM */}

                            <div className="form-group">

                                <label>
                                    Program *
                                </label>


                                <select
                                    name="ProgramId"
                                    value={
                                        form.ProgramId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Program
                                    </option>


                                    {programs.map(
                                        program => (

                                            <option
                                                key={
                                                    program.ProgramId
                                                }
                                                value={
                                                    program.ProgramId
                                                }
                                            >
                                                {
                                                    program.ProgramName
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>


                            {/* SECTION NAME */}

                            <div className="form-group">

                                <label>
                                    Section Name *
                                </label>


                                <input
                                    type="text"
                                    name="SectionName"
                                    value={
                                        form.SectionName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. A"
                                    required
                                />

                            </div>


                            {/* SECTION CODE */}

                            <div className="form-group">

                                <label>
                                    Section Code
                                </label>


                                <input
                                    type="text"
                                    value={
                                        form.SectionCode
                                    }
                                    readOnly
                                    placeholder="Automatically generated"
                                />

                            </div>


                            {/* STUDENT COUNT */}

                            <div className="form-group">

                                <label>
                                    Student Count *
                                </label>


                                <input
                                    type="number"
                                    name="StudentCount"
                                    value={
                                        form.StudentCount
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    min="1"
                                    placeholder="e.g. 40"
                                    required
                                />

                            </div>


                            {/* ASSIGNED ROOM */}

                            <div className="form-group">

                                <label>
                                    Assigned Classroom *
                                </label>


                                <select
                                    name="DefaultRoomId"
                                    value={
                                        form.DefaultRoomId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        !form.CampusId
                                    }
                                    required
                                >

                                    <option value="">

                                        {
                                            !form.CampusId

                                                ? "Select Campus First"

                                                : "Select Classroom"
                                        }

                                    </option>


                                    {availableRooms.map(
                                        room => {

                                            const users =
                                                getRoomUsers(
                                                    room.RoomId
                                                );


                                            return (

                                                <option
                                                    key={
                                                        room.RoomId
                                                    }
                                                    value={
                                                        room.RoomId
                                                    }
                                                >

                                                    {
                                                        room.RoomNumber
                                                    }

                                                    {
                                                        room.RoomName
                                                            ? ` - ${room.RoomName}`
                                                            : ""
                                                    }

                                                    {
                                                        ` - Capacity ${room.Capacity}`
                                                    }

                                                    {
                                                        users.length

                                                            ? ` - Used by ${users.map(item => item.SectionCode).join(", ")}`

                                                            : ""
                                                    }

                                                </option>
                                            );
                                        }
                                    )}

                                </select>


                                <small
                                    style={{
                                        marginTop:
                                            "6px",

                                        color:
                                            "#64748b"
                                    }}
                                >

                                    Same Teaching Group sections can share the same classroom.

                                </small>

                            </div>


                            {/* ACTIVE */}

                            <div className="form-group checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsActive"
                                        checked={
                                            form.IsActive
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    Active

                                </label>

                            </div>

                        </div>


                        <div className="form-actions">

                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={
                                    handleCancel
                                }
                                disabled={
                                    saving
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="save-btn"
                                disabled={
                                    saving
                                }
                            >

                                {
                                    saving

                                        ? "Saving..."

                                        : editingId

                                            ? "Update Section"

                                            : "Create Section"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* TABLE */}

            <div className="table-card">

                <div className="table-header">

                    <div>

                        <h2>
                            All Sections
                        </h2>


                        <p>

                            {
                                filteredSections.length
                            } section(s)

                        </p>

                    </div>


                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            gap:
                                "10px"
                        }}
                    >

                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={
                                event =>
                                    setSearch(
                                        event.target.value
                                    )
                            }
                            placeholder="Search section, campus, program or room..."
                            style={{
                                minWidth:
                                    "360px",

                                padding:
                                    "10px 12px",

                                border:
                                    "1px solid #cbd5e1",

                                borderRadius:
                                    "8px"
                            }}
                        />


                        <button
                            type="button"
                            className="refresh-btn"
                            onClick={
                                async () => {

                                    try {

                                        setLoading(
                                            true
                                        );


                                        await loadSections();

                                        await refreshLookups();


                                    } catch (err) {

                                        setError(
                                            err.response
                                                ?.data
                                                ?.message
                                            ||
                                            "Refresh failed."
                                        );


                                    } finally {

                                        setLoading(
                                            false
                                        );
                                    }
                                }
                            }
                        >
                            ↻ Refresh
                        </button>

                    </div>

                </div>


                {loading ? (

                    <div className="loading">
                        Loading sections...
                    </div>

                ) : filteredSections.length === 0 ? (

                    <div className="empty">
                        No sections found.
                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Section
                                    </th>

                                    <th>
                                        Code
                                    </th>

                                    <th>
                                        Campus
                                    </th>

                                    <th>
                                        Session
                                    </th>

                                    <th>
                                        Year
                                    </th>

                                    <th>
                                        Program
                                    </th>

                                    <th>
                                        Students
                                    </th>

                                    <th>
                                        Assigned Classroom
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filteredSections.map(
                                    section => (

                                        <tr
                                            key={
                                                section.SectionId
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        section.SectionName
                                                    }
                                                </strong>
                                            </td>


                                            <td>
                                                {
                                                    section.SectionCode
                                                }
                                            </td>


                                            <td>
                                                {
                                                    section.CampusName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    section.SessionName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    section.YearName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    section.ProgramName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    section.StudentCount ??
                                                    "-"
                                                }
                                            </td>


                                            <td>

                                                {
                                                    section.DefaultRoomNumber

                                                        ? `${section.DefaultRoomNumber}${section.DefaultRoomName ? ` - ${section.DefaultRoomName}` : ""}`

                                                        : "Not Assigned"
                                                }

                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        section.IsActive

                                                            ? "status active"

                                                            : "status inactive"
                                                    }
                                                >

                                                    {
                                                        section.IsActive

                                                            ? "Active"

                                                            : "Inactive"
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                <div className="actions">

                                                    <button
                                                        type="button"
                                                        className="edit-btn"
                                                        onClick={
                                                            () =>
                                                                handleEdit(
                                                                    section
                                                                )
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={
                                                            () =>
                                                                handleDelete(
                                                                    section.SectionId
                                                                )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

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


export default Sections;