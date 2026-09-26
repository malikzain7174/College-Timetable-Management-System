import {
    useEffect,
    useState
} from "react";

import {
    getAllSectionSubjects,
    createSectionSubject,
    updateSectionSubject,
    deleteSectionSubject
} from "../services/sectionSubjectService";

import {
    getAllSections
} from "../services/sectionService";

import {
    getAllSubjects
} from "../services/subjectService";

import {
    getAllTeachers
} from "../services/teacherService";

import "./SectionSubjects.css";


const initialFormData = {

    SectionId: "",

    SubjectId: "",

    TeacherId: "",

    WeeklyHours: "",

    SharedWithSectionId: "",

    IsActive: true
};


function SectionSubjects() {

    // ==================================================
    // STATE
    // ==================================================

    const [
        sectionSubjects,
        setSectionSubjects
    ] = useState([]);

    const [
        sections,
        setSections
    ] = useState([]);

    const [
        subjects,
        setSubjects
    ] = useState([]);

    const [
        teachers,
        setTeachers
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        search,
        setSearch
    ] = useState("");

    const [
        showForm,
        setShowForm
    ] = useState(false);

    const [
        editingId,
        setEditingId
    ] = useState(null);

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        deletingId,
        setDeletingId
    ] = useState(null);

    const [
        formData,
        setFormData
    ] = useState(
        initialFormData
    );


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadData = async () => {

            try {

                const [
                    mappingsData,
                    sectionsData,
                    subjectsData,
                    teachersData
                ] = await Promise.all([

                    getAllSectionSubjects(),

                    getAllSections(),

                    getAllSubjects(),

                    getAllTeachers()
                ]);


                if (cancelled) {
                    return;
                }


                setSectionSubjects(
                    Array.isArray(
                        mappingsData
                    )
                        ? mappingsData
                        : []
                );


                setSections(
                    Array.isArray(
                        sectionsData
                    )
                        ? sectionsData
                        : []
                );


                setSubjects(
                    Array.isArray(
                        subjectsData
                    )
                        ? subjectsData
                        : []
                );


                setTeachers(
                    Array.isArray(
                        teachersData
                    )
                        ? teachersData
                        : []
                );


            } catch (error) {

                console.error(
                    "Load Section Subjects Error:",
                    error
                );


                if (!cancelled) {

                    alert(
                        error.response?.data?.message ||
                        "Failed to load Section Subjects."
                    );
                }


            } finally {

                if (!cancelled) {

                    setLoading(false);
                }
            }
        };


        loadData();


        return () => {

            cancelled = true;
        };

    }, []);


    // ==================================================
    // REFRESH
    // ==================================================

    const refreshMappings = async () => {

        const data =
            await getAllSectionSubjects();


        setSectionSubjects(
            Array.isArray(data)
                ? data
                : []
        );
    };


    // ==================================================
    // CHANGE
    // ==================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;


        setFormData(
            (previous) => ({

                ...previous,

                [name]:
                    type === "checkbox"
                        ? checked
                        : value
            })
        );
    };


    // ==================================================
    // RESET
    // ==================================================

    const resetForm = () => {

        setFormData(
            initialFormData
        );

        setEditingId(null);

        setShowForm(false);
    };


    // ==================================================
    // ADD
    // ==================================================

    const handleAdd = () => {

        setFormData(
            initialFormData
        );

        setEditingId(null);

        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit = (mapping) => {

        setEditingId(
            mapping.SectionSubjectId
        );


        setFormData({

            SectionId:
                String(
                    mapping.SectionId
                ),

            SubjectId:
                String(
                    mapping.SubjectId
                ),

            TeacherId:
                String(
                    mapping.TeacherId
                ),

            WeeklyHours:
                String(
                    mapping.WeeklyHours
                ),

            SharedWithSectionId:
                mapping.SharedWithSectionId
                    ? String(
                        mapping.SharedWithSectionId
                    )
                    : "",

            IsActive:
                Boolean(
                    mapping.IsActive
                )
        });


        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // VALIDATION
    // ==================================================

    const validateForm = () => {

        if (!formData.SectionId) {

            alert(
                "Please select a Section."
            );

            return false;
        }


        if (!formData.SubjectId) {

            alert(
                "Please select a Subject."
            );

            return false;
        }


        if (!formData.TeacherId) {

            alert(
                "Please select a Teacher."
            );

            return false;
        }


        const weeklyHours =
            Number(
                formData.WeeklyHours
            );


        if (
            !Number.isInteger(
                weeklyHours
            ) ||
            weeklyHours <= 0
        ) {

            alert(
                "Weekly Hours must be greater than zero."
            );

            return false;
        }


        if (
            formData.SharedWithSectionId &&
            formData.SharedWithSectionId ===
            formData.SectionId
        ) {

            alert(
                "A section cannot be shared with itself."
            );

            return false;
        }


        return true;
    };


    // ==================================================
    // SAVE
    // ==================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        if (!validateForm()) {
            return;
        }


        const data = {

            SectionId:
                Number(
                    formData.SectionId
                ),

            SubjectId:
                Number(
                    formData.SubjectId
                ),

            TeacherId:
                Number(
                    formData.TeacherId
                ),

            WeeklyHours:
                Number(
                    formData.WeeklyHours
                ),

            SharedWithSectionId:
                formData.SharedWithSectionId
                    ? Number(
                        formData.SharedWithSectionId
                    )
                    : null,

            IsActive:
                Boolean(
                    formData.IsActive
                )
        };


        try {

            setSaving(true);


            if (editingId) {

                await updateSectionSubject(
                    editingId,
                    data
                );


                alert(
                    "Section Subject updated successfully."
                );


            } else {

                await createSectionSubject(
                    data
                );


                alert(
                    "Section Subject created successfully."
                );
            }


            resetForm();

            await refreshMappings();


        } catch (error) {

            console.error(
                "Save Section Subject Error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to save Section Subject."
            );


        } finally {

            setSaving(false);
        }
    };


    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete = async (
        id
    ) => {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this Section Subject?"
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                id
            );


            const result =
                await deleteSectionSubject(
                    id
                );


            alert(
                result.message ||
                "Section Subject processed successfully."
            );


            await refreshMappings();


        } catch (error) {

            console.error(
                "Delete Section Subject Error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to delete Section Subject."
            );


        } finally {

            setDeletingId(null);
        }
    };


    // ==================================================
    // SEARCH
    // ==================================================

    const searchText =
        search
            .trim()
            .toLowerCase();


    const filteredMappings =
        sectionSubjects.filter(
            (mapping) => {

                return (

                    mapping.SectionCode
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    mapping.SectionName
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    mapping.SubjectCode
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    mapping.SubjectName
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    mapping.TeacherName
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    mapping.SharedWithSectionCode
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )
                );
            }
        );


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="section-subjects-page">


            {/* HEADER */}

            <div className="section-subjects-header">

                <div>

                    <h1>
                        Section Subjects
                    </h1>

                    <p>
                        Assign subjects and teachers to sections.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-section-subject-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Assignment
                </button>

            </div>


            {/* FORM */}

            {showForm && (

                <div className="section-subject-form-card">

                    <div className="section-subject-form-header">

                        <h2>

                            {editingId
                                ? "Edit Assignment"
                                : "Add Section Subject"
                            }

                        </h2>


                        <button
                            type="button"
                            className="ss-close-btn"
                            onClick={
                                resetForm
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

                        <div className="ss-form-grid">


                            {/* SECTION */}

                            <div className="ss-form-group">

                                <label htmlFor="SectionId">
                                    Section *
                                </label>

                                <select
                                    id="SectionId"
                                    name="SectionId"
                                    value={
                                        formData.SectionId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    <option value="">
                                        Select Section
                                    </option>


                                    {sections.map(
                                        (section) => (

                                            <option
                                                key={
                                                    section.SectionId
                                                }
                                                value={
                                                    section.SectionId
                                                }
                                            >
                                                {
                                                    section.SectionCode
                                                }
                                                {" - "}
                                                {
                                                    section.SectionName
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* SUBJECT */}

                            <div className="ss-form-group">

                                <label htmlFor="SubjectId">
                                    Subject *
                                </label>

                                <select
                                    id="SubjectId"
                                    name="SubjectId"
                                    value={
                                        formData.SubjectId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    <option value="">
                                        Select Subject
                                    </option>


                                    {subjects.map(
                                        (subject) => (

                                            <option
                                                key={
                                                    subject.SubjectId
                                                }
                                                value={
                                                    subject.SubjectId
                                                }
                                            >
                                                {
                                                    subject.SubjectCode
                                                }
                                                {" - "}
                                                {
                                                    subject.SubjectName
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* TEACHER */}

                            <div className="ss-form-group">

                                <label htmlFor="TeacherId">
                                    Teacher *
                                </label>

                                <select
                                    id="TeacherId"
                                    name="TeacherId"
                                    value={
                                        formData.TeacherId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    <option value="">
                                        Select Teacher
                                    </option>


                                    {teachers.map(
                                        (teacher) => (

                                            <option
                                                key={
                                                    teacher.TeacherId
                                                }
                                                value={
                                                    teacher.TeacherId
                                                }
                                            >
                                                {
                                                    `${teacher.FirstName || ""} ${teacher.LastName || ""}`.trim()
                                                }
                                                {" - "}
                                                {
                                                    teacher.EmployeeCode
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* WEEKLY HOURS */}

                            <div className="ss-form-group">

                                <label htmlFor="WeeklyHours">
                                    Weekly Hours *
                                </label>

                                <input
                                    id="WeeklyHours"
                                    type="number"
                                    name="WeeklyHours"
                                    min="1"
                                    value={
                                        formData.WeeklyHours
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 4"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* SHARED SECTION */}

                            <div className="ss-form-group">

                                <label htmlFor="SharedWithSectionId">
                                    Shared With Section
                                </label>

                                <select
                                    id="SharedWithSectionId"
                                    name="SharedWithSectionId"
                                    value={
                                        formData.SharedWithSectionId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    <option value="">
                                        Not Shared
                                    </option>


                                    {sections
                                        .filter(
                                            (section) =>
                                                String(
                                                    section.SectionId
                                                ) !==
                                                formData.SectionId
                                        )
                                        .map(
                                            (section) => (

                                                <option
                                                    key={
                                                        section.SectionId
                                                    }
                                                    value={
                                                        section.SectionId
                                                    }
                                                >
                                                    {
                                                        section.SectionCode
                                                    }
                                                    {" - "}
                                                    {
                                                        section.SectionName
                                                    }
                                                </option>

                                            )
                                        )}

                                </select>

                            </div>


                            {/* ACTIVE */}

                            <div className="ss-checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsActive"
                                        checked={
                                            formData.IsActive
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            saving
                                        }
                                    />

                                    <span>
                                        Active Assignment
                                    </span>

                                </label>

                            </div>

                        </div>


                        <div className="ss-form-actions">

                            <button
                                type="button"
                                className="ss-cancel-btn"
                                onClick={
                                    resetForm
                                }
                                disabled={
                                    saving
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="ss-save-btn"
                                disabled={
                                    saving
                                }
                            >

                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Assignment"
                                        : "Save Assignment"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* TOOLBAR */}

            <div className="ss-toolbar">

                <div className="ss-search">

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={
                            (e) =>
                                setSearch(
                                    e.target.value
                                )
                        }
                        placeholder="Search section, subject or teacher..."
                    />

                </div>


                <div className="ss-count">

                    Total Assignments:

                    <strong>
                        {" "}
                        {
                            filteredMappings.length
                        }
                    </strong>

                </div>

            </div>


            {/* TABLE */}

            <div className="ss-table-card">

                {loading ? (

                    <div className="ss-loading">
                        Loading assignments...
                    </div>

                ) : filteredMappings.length === 0 ? (

                    <div className="ss-empty">

                        <h3>
                            No Assignments Found
                        </h3>

                        <p>
                            Add subjects and teachers to sections.
                        </p>

                    </div>

                ) : (

                    <div className="ss-table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>ID</th>

                                    <th>
                                        Section
                                    </th>

                                    <th>
                                        Subject
                                    </th>

                                    <th>
                                        Teacher
                                    </th>

                                    <th>
                                        Weekly Hours
                                    </th>

                                    <th>
                                        Shared With
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

                                {filteredMappings.map(
                                    (mapping) => (

                                        <tr
                                            key={
                                                mapping.SectionSubjectId
                                            }
                                        >

                                            <td>
                                                {
                                                    mapping.SectionSubjectId
                                                }
                                            </td>


                                            <td>

                                                <strong>
                                                    {
                                                        mapping.SectionCode
                                                    }
                                                </strong>

                                                <div className="ss-secondary">
                                                    {
                                                        mapping.SectionName
                                                    }
                                                </div>

                                            </td>


                                            <td>

                                                <strong>
                                                    {
                                                        mapping.SubjectCode
                                                    }
                                                </strong>

                                                <div className="ss-secondary">
                                                    {
                                                        mapping.SubjectName
                                                    }
                                                </div>

                                            </td>


                                            <td>
                                                {
                                                    mapping.TeacherName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    mapping.WeeklyHours
                                                }
                                            </td>


                                            <td>

                                                {mapping.SharedWithSectionId
                                                    ? (
                                                        <>
                                                            <strong>
                                                                {
                                                                    mapping.SharedWithSectionCode
                                                                }
                                                            </strong>

                                                            <div className="ss-secondary">
                                                                {
                                                                    mapping.SharedWithSectionName
                                                                }
                                                            </div>
                                                        </>
                                                    )
                                                    : "—"
                                                }

                                            </td>


                                            <td>

                                                {mapping.IsActive ? (

                                                    <span className="ss-badge ss-active">
                                                        Active
                                                    </span>

                                                ) : (

                                                    <span className="ss-badge ss-inactive">
                                                        Inactive
                                                    </span>

                                                )}

                                            </td>


                                            <td>

                                                <div className="ss-actions">

                                                    <button
                                                        type="button"
                                                        className="ss-edit-btn"
                                                        onClick={() =>
                                                            handleEdit(
                                                                mapping
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="ss-delete-btn"
                                                        onClick={() =>
                                                            handleDelete(
                                                                mapping.SectionSubjectId
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >

                                                        {deletingId ===
                                                        mapping.SectionSubjectId
                                                            ? "Deleting..."
                                                            : "Delete"
                                                        }

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


export default SectionSubjects;