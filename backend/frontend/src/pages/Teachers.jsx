import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    Link
} from "react-router-dom";

import {
    getAllTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher
} from "../services/teacherService";

import {
    getAllDepartments
} from "../services/departmentService";

import {
    getAllSubjects
} from "../services/subjectService";

import "./Teachers.css";


const initialFormData = {
    DepartmentIds: [],
    SubjectIds: [],
    EmployeeCode: "",
    FirstName: "",
    LastName: "",
    Email: "",
    Phone: "",
    Designation: "",
    IsActive: true
};


// ======================================================
// NORMALIZE IDS
// ======================================================

const normalizeIds = (values) => {

    if (!Array.isArray(values)) {
        return [];
    }

    return [
        ...new Set(
            values
                .map(Number)
                .filter(
                    id =>
                        Number.isInteger(id) &&
                        id > 0
                )
        )
    ];
};


// ======================================================
// COMPONENT
// ======================================================

function Teachers() {

    const [
        teachers,
        setTeachers
    ] = useState([]);

    const [
        departments,
        setDepartments
    ] = useState([]);

    const [
        subjects,
        setSubjects
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
    ] = useState({
        ...initialFormData
    });


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadData = async () => {

            try {

                const [
                    teacherData,
                    departmentData,
                    subjectData
                ] = await Promise.all([
                    getAllTeachers(),
                    getAllDepartments(),
                    getAllSubjects()
                ]);


                if (cancelled) {
                    return;
                }


                setTeachers(
                    Array.isArray(teacherData)
                        ? teacherData
                        : []
                );


                setDepartments(
                    Array.isArray(departmentData)
                        ? departmentData
                        : []
                );


                setSubjects(
                    Array.isArray(subjectData)
                        ? subjectData
                        : []
                );


            } catch (error) {

                console.error(
                    "Load teachers error:",
                    error
                );


                if (!cancelled) {

                    alert(
                        error.response
                            ?.data
                            ?.message ||
                        "Failed to load teachers."
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
    // REFRESH TEACHERS
    // ==================================================

    const refreshTeachers =
        async () => {

            const data =
                await getAllTeachers();


            setTeachers(
                Array.isArray(data)
                    ? data
                    : []
            );
        };


    // ==================================================
    // NORMAL INPUT
    // ==================================================

    const handleChange =
        event => {

            const {
                name,
                value,
                type,
                checked
            } = event.target;


            setFormData(
                previous => ({
                    ...previous,

                    [name]:
                        type === "checkbox"
                            ? checked
                            : value
                })
            );
        };


    // ==================================================
    // DEPARTMENT SELECTION
    //
    // IMPORTANT:
    // Departments aur Subjects independent hain.
    // Department unselect karne par subjects reset
    // nahi honge.
    // ==================================================

    const handleDepartmentSelection = (
        departmentId,
        checked
    ) => {

        const id =
            Number(departmentId);


        setFormData(
            previous => {

                const currentIds =
                    normalizeIds(
                        previous.DepartmentIds
                    );


                const nextIds =
                    checked

                        ? normalizeIds([
                            ...currentIds,
                            id
                        ])

                        : currentIds.filter(
                            currentId =>
                                currentId !== id
                        );


                return {
                    ...previous,

                    DepartmentIds:
                        nextIds,

                    SubjectIds:
                        normalizeIds(
                            previous.SubjectIds
                        )
                };
            }
        );
    };


    // ==================================================
    // SUBJECT SELECTION
    //
    // Multiple subjects can remain selected together.
    // ==================================================

    const handleSubjectSelection = (
        subjectId,
        checked
    ) => {

        const id =
            Number(subjectId);


        setFormData(
            previous => {

                const currentIds =
                    normalizeIds(
                        previous.SubjectIds
                    );


                const nextIds =
                    checked

                        ? normalizeIds([
                            ...currentIds,
                            id
                        ])

                        : currentIds.filter(
                            currentId =>
                                currentId !== id
                        );


                return {
                    ...previous,

                    SubjectIds:
                        nextIds
                };
            }
        );
    };


    // ==================================================
    // RESET FORM
    // ==================================================

    const resetForm = () => {

        setFormData({
            DepartmentIds: [],
            SubjectIds: [],
            EmployeeCode: "",
            FirstName: "",
            LastName: "",
            Email: "",
            Phone: "",
            Designation: "",
            IsActive: true
        });


        setEditingId(null);

        setShowForm(false);
    };


    // ==================================================
    // ADD
    // ==================================================

    const handleAdd = () => {

        setEditingId(null);


        setFormData({
            DepartmentIds: [],
            SubjectIds: [],
            EmployeeCode: "",
            FirstName: "",
            LastName: "",
            Email: "",
            Phone: "",
            Designation: "",
            IsActive: true
        });


        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit =
        teacher => {

            const departmentIds =
                Array.isArray(
                    teacher.DepartmentIds
                )

                    ? normalizeIds(
                        teacher.DepartmentIds
                    )

                    : Array.isArray(
                        teacher.Departments
                    )

                        ? normalizeIds(
                            teacher.Departments.map(
                                department =>
                                    department.DepartmentId
                            )
                        )

                        : [];


            const subjectIds =
                Array.isArray(
                    teacher.SubjectIds
                )

                    ? normalizeIds(
                        teacher.SubjectIds
                    )

                    : Array.isArray(
                        teacher.Subjects
                    )

                        ? normalizeIds(
                            teacher.Subjects.map(
                                subject =>
                                    subject.SubjectId
                            )
                        )

                        : [];


            setEditingId(
                teacher.TeacherId
            );


            setFormData({
                DepartmentIds:
                    departmentIds,

                SubjectIds:
                    subjectIds,

                EmployeeCode:
                    teacher.EmployeeCode || "",

                FirstName:
                    teacher.FirstName || "",

                LastName:
                    teacher.LastName || "",

                Email:
                    teacher.Email || "",

                Phone:
                    teacher.Phone || "",

                Designation:
                    teacher.Designation || "",

                IsActive:
                    Boolean(
                        teacher.IsActive
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

        const departmentIds =
            normalizeIds(
                formData.DepartmentIds
            );


        const subjectIds =
            normalizeIds(
                formData.SubjectIds
            );


        if (
            !formData.EmployeeCode
                .trim()
        ) {

            alert(
                "Employee Code is required."
            );

            return false;
        }


        if (
            !formData.FirstName
                .trim()
        ) {

            alert(
                "First Name is required."
            );

            return false;
        }


        if (
            departmentIds.length === 0
        ) {

            alert(
                "Please select at least one department."
            );

            return false;
        }


        if (
            subjectIds.length === 0
        ) {

            alert(
                "Please select at least one subject."
            );

            return false;
        }


        if (
            formData.Email.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    formData.Email.trim()
                )
        ) {

            alert(
                "Please enter a valid email address."
            );

            return false;
        }


        return true;
    };


    // ==================================================
    // SAVE
    // ==================================================

    const handleSubmit =
        async event => {

            event.preventDefault();


            if (!validateForm()) {
                return;
            }


            const teacherData = {

                DepartmentIds:
                    normalizeIds(
                        formData.DepartmentIds
                    ),

                SubjectIds:
                    normalizeIds(
                        formData.SubjectIds
                    ),

                EmployeeCode:
                    formData.EmployeeCode
                        .trim(),

                FirstName:
                    formData.FirstName
                        .trim(),

                LastName:
                    formData.LastName
                        .trim(),

                Email:
                    formData.Email
                        .trim(),

                Phone:
                    formData.Phone
                        .trim(),

                Designation:
                    formData.Designation
                        .trim(),

                IsActive:
                    Boolean(
                        formData.IsActive
                    )
            };


            console.log(
                "TEACHER SAVE DATA:",
                teacherData
            );


            try {

                setSaving(true);


                if (editingId) {

                    await updateTeacher(
                        editingId,
                        teacherData
                    );


                    alert(
                        "Teacher updated successfully."
                    );

                } else {

                    await createTeacher(
                        teacherData
                    );


                    alert(
                        "Teacher added successfully."
                    );
                }


                resetForm();


                await refreshTeachers();


            } catch (error) {

                console.error(
                    "Save teacher error:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to save teacher."
                );


            } finally {

                setSaving(false);
            }
        };


    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete =
        async teacherId => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to delete this teacher?"
                );


            if (!confirmed) {
                return;
            }


            try {

                setDeletingId(
                    teacherId
                );


                const result =
                    await deleteTeacher(
                        teacherId
                    );


                alert(
                    result.message ||
                    "Teacher processed successfully."
                );


                await refreshTeachers();


            } catch (error) {

                console.error(
                    "Delete teacher error:",
                    error
                );


                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Failed to delete teacher."
                );


            } finally {

                setDeletingId(null);
            }
        };


    // ==================================================
    // SELECTED DEPARTMENTS
    // ==================================================

    const selectedDepartmentIds =
        useMemo(
            () =>
                normalizeIds(
                    formData.DepartmentIds
                ),
            [
                formData.DepartmentIds
            ]
        );


    // ==================================================
    // SELECTED SUBJECTS
    // ==================================================

    const selectedSubjectIds =
        useMemo(
            () =>
                normalizeIds(
                    formData.SubjectIds
                ),
            [
                formData.SubjectIds
            ]
        );


    // ==================================================
    // AVAILABLE SUBJECTS
    //
    // IMPORTANT:
    // All active subjects are shown.
    // They are NOT filtered by selected departments.
    // ==================================================

    const availableSubjects =
        useMemo(
            () =>
                subjects.filter(
                    subject =>
                        subject.IsActive !== false
                ),
            [
                subjects
            ]
        );


    // ==================================================
    // SEARCH
    // ==================================================

    const filteredTeachers =
        useMemo(
            () => {

                const searchText =
                    search
                        .trim()
                        .toLowerCase();


                if (!searchText) {
                    return teachers;
                }


                return teachers.filter(
                    teacher => {

                        const departmentNames =
                            teacher.DepartmentNames ||

                            (
                                Array.isArray(
                                    teacher.Departments
                                )

                                    ? teacher.Departments
                                        .map(
                                            department =>
                                                department.DepartmentName
                                        )
                                        .join(" ")

                                    : ""
                            );


                        const subjectNames =
                            teacher.SubjectNames ||

                            (
                                Array.isArray(
                                    teacher.Subjects
                                )

                                    ? teacher.Subjects
                                        .map(
                                            subject =>
                                                subject.SubjectName
                                        )
                                        .join(" ")

                                    : ""
                            );


                        const searchContent = [

                            teacher.EmployeeCode,

                            teacher.FirstName,

                            teacher.LastName,

                            departmentNames,

                            subjectNames,

                            teacher.Email,

                            teacher.Phone,

                            teacher.Designation

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                        return searchContent
                            .includes(
                                searchText
                            );
                    }
                );
            },
            [
                teachers,
                search
            ]
        );


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="teachers-page">


            {/* ==========================================
                HEADER
            ========================================== */}

            <div className="teachers-header">

                <div>

                    <h1>
                        Teachers
                    </h1>

                    <p>
                        Manage teachers, departments and subjects they can teach.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-teacher-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Teacher
                </button>

            </div>


            {/* ==========================================
                FORM
            ========================================== */}

            {showForm && (

                <div className="teacher-form-card">


                    <div className="form-header">

                        <h2>

                            {editingId
                                ? "Edit Teacher"
                                : "Add New Teacher"
                            }

                        </h2>


                        <button
                            type="button"
                            className="close-btn"
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

                        <div className="form-grid">


                            {/* =================================
                                DEPARTMENTS
                            ================================= */}

                            <div className="form-group teacher-wide-field">

                                <div className="teacher-field-heading">

                                    <label>
                                        Departments *
                                    </label>


                                    <Link
                                        to="/departments"
                                        className="manage-link"
                                    >
                                        + Manage Departments
                                    </Link>

                                </div>


                                {departments.length === 0 ? (

                                    <div className="teacher-selection-message">

                                        No departments found.
                                        Please add departments first.

                                    </div>

                                ) : (

                                    <div className="teacher-selection-grid">

                                        {departments
                                            .filter(
                                                department =>
                                                    department.IsActive !==
                                                    false
                                            )
                                            .map(
                                                department => {

                                                    const departmentId =
                                                        Number(
                                                            department.DepartmentId
                                                        );


                                                    const checked =
                                                        selectedDepartmentIds
                                                            .includes(
                                                                departmentId
                                                            );


                                                    return (

                                                        <label
                                                            key={
                                                                department.DepartmentId
                                                            }
                                                            className={
                                                                checked
                                                                    ? "teacher-selection selected"
                                                                    : "teacher-selection"
                                                            }
                                                        >

                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    checked
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                                onChange={
                                                                    event =>
                                                                        handleDepartmentSelection(
                                                                            departmentId,
                                                                            event.target.checked
                                                                        )
                                                                }
                                                            />


                                                            <span>

                                                                {
                                                                    department.DepartmentName
                                                                }

                                                            </span>


                                                            <small>

                                                                {
                                                                    department.DepartmentCode
                                                                }

                                                            </small>

                                                        </label>
                                                    );
                                                }
                                            )}

                                    </div>
                                )}

                            </div>


                            {/* =================================
                                SUBJECTS
                            ================================= */}

                            <div className="form-group teacher-wide-field">

                                <div className="teacher-field-heading">

                                    <label>
                                        Subjects Teacher Can Teach *
                                    </label>


                                    <Link
                                        to="/subjects"
                                        className="manage-link"
                                    >
                                        + Manage Subjects
                                    </Link>

                                </div>


                                {availableSubjects.length === 0 ? (

                                    <div className="teacher-selection-message">

                                        No active subjects found.
                                        Please add or activate subjects
                                        from the Subjects module.

                                    </div>

                                ) : (

                                    <div className="teacher-selection-grid">

                                        {availableSubjects.map(
                                            subject => {

                                                const subjectId =
                                                    Number(
                                                        subject.SubjectId
                                                    );


                                                const checked =
                                                    selectedSubjectIds
                                                        .includes(
                                                            subjectId
                                                        );


                                                return (

                                                    <label
                                                        key={
                                                            subject.SubjectId
                                                        }
                                                        className={
                                                            checked
                                                                ? "teacher-selection selected"
                                                                : "teacher-selection"
                                                        }
                                                    >

                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                checked
                                                            }
                                                            disabled={
                                                                saving
                                                            }
                                                            onChange={
                                                                event =>
                                                                    handleSubjectSelection(
                                                                        subjectId,
                                                                        event.target.checked
                                                                    )
                                                            }
                                                        />


                                                        <span>

                                                            {
                                                                subject.SubjectName
                                                            }

                                                        </span>


                                                        <small>

                                                            {
                                                                subject.SubjectCode
                                                            }

                                                        </small>

                                                    </label>
                                                );
                                            }
                                        )}

                                    </div>
                                )}


                                <div className="teacher-selected-summary">

                                    Selected Subjects:{" "}

                                    <strong>

                                        {
                                            selectedSubjectIds
                                                .length
                                        }

                                    </strong>

                                </div>

                            </div>


                            {/* =================================
                                EMPLOYEE CODE
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    Employee Code *
                                </label>


                                <input
                                    type="text"
                                    name="EmployeeCode"
                                    value={
                                        formData.EmployeeCode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. T001"
                                    disabled={
                                        saving
                                    }
                                    required
                                />

                            </div>


                            {/* =================================
                                FIRST NAME
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    First Name *
                                </label>


                                <input
                                    type="text"
                                    name="FirstName"
                                    value={
                                        formData.FirstName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Tayyaba"
                                    disabled={
                                        saving
                                    }
                                    required
                                />

                            </div>


                            {/* =================================
                                LAST NAME
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    Last Name
                                </label>


                                <input
                                    type="text"
                                    name="LastName"
                                    value={
                                        formData.LastName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Khan"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* =================================
                                EMAIL
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    Email
                                </label>


                                <input
                                    type="email"
                                    name="Email"
                                    value={
                                        formData.Email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="teacher@college.edu"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* =================================
                                PHONE
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    Phone
                                </label>


                                <input
                                    type="text"
                                    name="Phone"
                                    value={
                                        formData.Phone
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="03001234567"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* =================================
                                DESIGNATION
                            ================================= */}

                            <div className="form-group">

                                <label>
                                    Designation
                                </label>


                                <input
                                    type="text"
                                    name="Designation"
                                    value={
                                        formData.Designation
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Lecturer"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* =================================
                                ACTIVE
                            ================================= */}

                            <div className="form-group checkbox-group">

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

                                    Active Teacher

                                </label>

                            </div>

                        </div>


                        {/* =================================
                            FORM ACTIONS
                        ================================= */}

                        <div className="form-actions">

                            <button
                                type="button"
                                className="cancel-btn"
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
                                className="save-btn"
                                disabled={
                                    saving
                                }
                            >

                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Teacher"
                                        : "Save Teacher"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* ==========================================
                TABLE CARD
            ========================================== */}

            <div className="teachers-table-card">


                {/* ======================================
                    SEARCH
                ====================================== */}

                <div className="teachers-toolbar">

                    <div className="teacher-search-wrapper">

                        <span className="teacher-search-icon">
                            🔍
                        </span>


                        <input
                            type="text"
                            className="teacher-search-input"
                            placeholder="Search teacher, department or subject..."
                            value={
                                search
                            }
                            onChange={
                                event =>
                                    setSearch(
                                        event.target.value
                                    )
                            }
                        />

                    </div>


                    <div className="teachers-count">

                        Total Teachers:{" "}

                        <strong>
                            {
                                filteredTeachers.length
                            }
                        </strong>

                    </div>

                </div>


                {/* ======================================
                    CONTENT
                ====================================== */}

                {loading ? (

                    <div className="loading">

                        Loading teachers...

                    </div>

                ) : filteredTeachers.length === 0 ? (

                    <div className="empty">

                        No teachers found.

                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Employee Code
                                    </th>

                                    <th>
                                        Teacher
                                    </th>

                                    <th>
                                        Departments
                                    </th>

                                    <th>
                                        Subjects
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Phone
                                    </th>

                                    <th>
                                        Designation
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

                                {filteredTeachers.map(
                                    teacher => (

                                        <tr
                                            key={
                                                teacher.TeacherId
                                            }
                                        >

                                            <td>

                                                <strong>

                                                    {
                                                        teacher.EmployeeCode
                                                    }

                                                </strong>

                                            </td>


                                            <td>

                                                {
                                                    `${teacher.FirstName || ""} ${teacher.LastName || ""}`
                                                        .trim()
                                                }

                                            </td>


                                            {/* DEPARTMENTS */}

                                            <td>

                                                <div className="teacher-tags">

                                                    {Array.isArray(
                                                        teacher.Departments
                                                    ) &&
                                                    teacher.Departments.length > 0

                                                        ? teacher.Departments.map(
                                                            department => (

                                                                <span
                                                                    key={
                                                                        department.DepartmentId
                                                                    }
                                                                    className="teacher-tag"
                                                                >

                                                                    {
                                                                        department.DepartmentName
                                                                    }

                                                                </span>
                                                            )
                                                        )

                                                        : (
                                                            teacher.DepartmentNames ||
                                                            "—"
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            {/* SUBJECTS */}

                                            <td>

                                                <div className="teacher-tags">

                                                    {Array.isArray(
                                                        teacher.Subjects
                                                    ) &&
                                                    teacher.Subjects.length > 0

                                                        ? teacher.Subjects.map(
                                                            subject => (

                                                                <span
                                                                    key={
                                                                        subject.SubjectId
                                                                    }
                                                                    className="teacher-tag subject-tag"
                                                                >

                                                                    {
                                                                        subject.SubjectName
                                                                    }

                                                                </span>
                                                            )
                                                        )

                                                        : (
                                                            teacher.SubjectNames ||
                                                            "—"
                                                        )
                                                    }

                                                </div>

                                            </td>


                                            <td>

                                                {
                                                    teacher.Email ||
                                                    "—"
                                                }

                                            </td>


                                            <td>

                                                {
                                                    teacher.Phone ||
                                                    "—"
                                                }

                                            </td>


                                            <td>

                                                {
                                                    teacher.Designation ||
                                                    "—"
                                                }

                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        teacher.IsActive
                                                            ? "teacher-status active"
                                                            : "teacher-status inactive"
                                                    }
                                                >

                                                    {
                                                        teacher.IsActive
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
                                                                    teacher
                                                                )
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        disabled={
                                                            deletingId ===
                                                            teacher.TeacherId
                                                        }
                                                        onClick={
                                                            () =>
                                                                handleDelete(
                                                                    teacher.TeacherId
                                                                )
                                                        }
                                                    >

                                                        {deletingId ===
                                                        teacher.TeacherId

                                                            ? "Processing..."

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


export default Teachers;