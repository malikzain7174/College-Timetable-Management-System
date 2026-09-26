/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

import {
    getAllSubjects,
    createSubject,
    updateSubject,
    deleteSubject
} from "../services/subjectService";

import { getAllDepartments } from "../services/departmentService";

import "./Subjects.css";


function Subjects() {

    // ==========================================
    // STATE
    // ==========================================

    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);

    const [editingId, setEditingId] = useState(null);

    const [saving, setSaving] = useState(false);

    const [deletingId, setDeletingId] = useState(null);

    const [formData, setFormData] = useState({
        SubjectCode: "",
        SubjectName: "",
        DepartmentId: "",
        CreditHours: "",
        WeeklyHours: "",
        IsPractical: false,
        IsActive: true
    });


    // ==========================================
    // RESET FORM DATA
    // ==========================================

    const getInitialFormData = () => ({
        SubjectCode: "",
        SubjectName: "",
        DepartmentId: "",
        CreditHours: "",
        WeeklyHours: "",
        IsPractical: false,
        IsActive: true
    });


    // ==========================================
    // LOAD DATA
    // ==========================================

    const loadData = useCallback(async () => {

        try {

            setLoading(true);

            const [subjectsData, departmentsData] =
                await Promise.all([
                    getAllSubjects(),
                    getAllDepartments()
                ]);

            setSubjects(
                Array.isArray(subjectsData)
                    ? subjectsData
                    : []
            );

            setDepartments(
                Array.isArray(departmentsData)
                    ? departmentsData
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load subjects:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to load subjects and departments."
            );

        } finally {

            setLoading(false);

        }

    }, []);


    // ==========================================
    // INITIAL DATA LOAD
    // ==========================================

    useEffect(() => {

        loadData();

    }, [loadData]);


    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };


    // ==========================================
    // RESET FORM
    // ==========================================

    const resetForm = () => {

        setFormData(getInitialFormData());

        setEditingId(null);

        setShowForm(false);

    };


    // ==========================================
    // OPEN ADD FORM
    // ==========================================

    const handleAdd = () => {

        setEditingId(null);

        setFormData(getInitialFormData());

        setShowForm(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==========================================
    // OPEN EDIT FORM
    // ==========================================

    const handleEdit = (subject) => {

        setEditingId(subject.SubjectId);

        setFormData({
            SubjectCode: subject.SubjectCode || "",

            SubjectName: subject.SubjectName || "",

            DepartmentId:
                subject.DepartmentId
                    ? String(subject.DepartmentId)
                    : "",

            CreditHours:
                subject.CreditHours !== null &&
                subject.CreditHours !== undefined
                    ? String(subject.CreditHours)
                    : "",

            WeeklyHours:
                subject.WeeklyHours !== null &&
                subject.WeeklyHours !== undefined
                    ? String(subject.WeeklyHours)
                    : "",

            IsPractical:
                Boolean(subject.IsPractical),

            IsActive:
                Boolean(subject.IsActive)
        });

        setShowForm(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==========================================
    // VALIDATE FORM
    // ==========================================

    const validateForm = () => {

        if (!formData.SubjectCode.trim()) {

            alert("Subject Code is required.");

            return false;
        }


        if (!formData.SubjectName.trim()) {

            alert("Subject Name is required.");

            return false;
        }


        if (!formData.DepartmentId) {

            alert("Please select a department.");

            return false;
        }


        if (
            formData.CreditHours === "" ||
            Number(formData.CreditHours) < 0
        ) {

            alert("Please enter valid Credit Hours.");

            return false;
        }


        if (
            formData.WeeklyHours === "" ||
            Number(formData.WeeklyHours) < 0
        ) {

            alert("Please enter valid Weekly Hours.");

            return false;
        }


        return true;
    };


    // ==========================================
    // CREATE / UPDATE SUBJECT
    // ==========================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        if (!validateForm()) {
            return;
        }


        const subjectData = {

            SubjectCode:
                formData.SubjectCode.trim(),

            SubjectName:
                formData.SubjectName.trim(),

            DepartmentId:
                Number(formData.DepartmentId),

            CreditHours:
                Number(formData.CreditHours),

            WeeklyHours:
                Number(formData.WeeklyHours),

            IsPractical:
                Boolean(formData.IsPractical),

            IsActive:
                Boolean(formData.IsActive)
        };


        try {

            setSaving(true);


            if (editingId) {

                await updateSubject(
                    editingId,
                    subjectData
                );

                alert(
                    "Subject updated successfully."
                );

            } else {

                await createSubject(
                    subjectData
                );

                alert(
                    "Subject added successfully."
                );
            }


            resetForm();

            await loadData();

        } catch (error) {

            console.error(
                "Save subject error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to save subject."
            );

        } finally {

            setSaving(false);

        }
    };


    // ==========================================
    // DELETE SUBJECT
    // ==========================================

    const handleDelete = async (id) => {

        const confirmDelete =
            window.confirm(
                "Are you sure you want to delete this subject?"
            );


        if (!confirmDelete) {
            return;
        }


        try {

            setDeletingId(id);

            await deleteSubject(id);

            alert(
                "Subject deleted successfully."
            );

            await loadData();

        } catch (error) {

            console.error(
                "Delete subject error:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to delete subject. It may be used by another module."
            );

        } finally {

            setDeletingId(null);

        }
    };


    // ==========================================
    // SEARCH
    // ==========================================

    const searchText =
        search.trim().toLowerCase();


    const filteredSubjects =
        subjects.filter((subject) => {

            return (

                subject.SubjectCode
                    ?.toLowerCase()
                    .includes(searchText)

                ||

                subject.SubjectName
                    ?.toLowerCase()
                    .includes(searchText)

                ||

                subject.DepartmentName
                    ?.toLowerCase()
                    .includes(searchText)

            );
        });


    // ==========================================
    // UI
    // ==========================================

    return (

        <div className="subjects-page">

            {/* =====================================
                HEADER
            ====================================== */}

            <div className="subjects-header">

                <div>

                    <h1>
                        Subjects
                    </h1>

                    <p>
                        Manage college subjects and their academic details.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-subject-btn"
                    onClick={handleAdd}
                >
                    + Add Subject
                </button>

            </div>


            {/* =====================================
                FORM
            ====================================== */}

            {showForm && (

                <div className="subject-form-card">

                    <div className="form-header">

                        <h2>
                            {editingId
                                ? "Edit Subject"
                                : "Add New Subject"
                            }
                        </h2>


                        <button
                            type="button"
                            className="close-btn"
                            onClick={resetForm}
                            disabled={saving}
                            aria-label="Close"
                        >
                            ×
                        </button>

                    </div>


                    <form onSubmit={handleSubmit}>

                        <div className="form-grid">

                            {/* SUBJECT CODE */}

                            <div className="form-group">

                                <label htmlFor="SubjectCode">
                                    Subject Code
                                </label>

                                <input
                                    id="SubjectCode"
                                    type="text"
                                    name="SubjectCode"
                                    value={formData.SubjectCode}
                                    onChange={handleChange}
                                    placeholder="e.g. CS101"
                                    maxLength={50}
                                    disabled={saving}
                                />

                            </div>


                            {/* SUBJECT NAME */}

                            <div className="form-group">

                                <label htmlFor="SubjectName">
                                    Subject Name
                                </label>

                                <input
                                    id="SubjectName"
                                    type="text"
                                    name="SubjectName"
                                    value={formData.SubjectName}
                                    onChange={handleChange}
                                    placeholder="e.g. Programming Fundamentals"
                                    maxLength={150}
                                    disabled={saving}
                                />

                            </div>


                            {/* DEPARTMENT */}

                            <div className="form-group">

                                <label htmlFor="DepartmentId">
                                    Department
                                </label>

                                <select
                                    id="DepartmentId"
                                    name="DepartmentId"
                                    value={formData.DepartmentId}
                                    onChange={handleChange}
                                    disabled={saving}
                                >

                                    <option value="">
                                        Select Department
                                    </option>


                                    {departments
                                        .filter(
                                            (department) =>
                                                department.IsActive !== false
                                        )
                                        .map(
                                            (department) => (

                                                <option
                                                    key={
                                                        department.DepartmentId
                                                    }
                                                    value={
                                                        department.DepartmentId
                                                    }
                                                >
                                                    {
                                                        department.DepartmentName
                                                    }
                                                </option>

                                            )
                                        )}

                                </select>

                            </div>


                            {/* CREDIT HOURS */}

                            <div className="form-group">

                                <label htmlFor="CreditHours">
                                    Credit Hours
                                </label>

                                <input
                                    id="CreditHours"
                                    type="number"
                                    name="CreditHours"
                                    value={formData.CreditHours}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.5"
                                    placeholder="e.g. 3"
                                    disabled={saving}
                                />

                            </div>


                            {/* WEEKLY HOURS */}

                            <div className="form-group">

                                <label htmlFor="WeeklyHours">
                                    Weekly Hours
                                </label>

                                <input
                                    id="WeeklyHours"
                                    type="number"
                                    name="WeeklyHours"
                                    value={formData.WeeklyHours}
                                    onChange={handleChange}
                                    min="0"
                                    step="1"
                                    placeholder="e.g. 3"
                                    disabled={saving}
                                />

                            </div>


                            {/* PRACTICAL */}

                            <div className="form-group checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsPractical"
                                        checked={
                                            formData.IsPractical
                                        }
                                        onChange={handleChange}
                                        disabled={saving}
                                    />

                                    <span>
                                        Practical Subject
                                    </span>

                                </label>

                            </div>


                            {/* ACTIVE */}

                            <div className="form-group checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsActive"
                                        checked={
                                            formData.IsActive
                                        }
                                        onChange={handleChange}
                                        disabled={saving}
                                    />

                                    <span>
                                        Active
                                    </span>

                                </label>

                            </div>

                        </div>


                        {/* FORM ACTIONS */}

                        <div className="form-actions">

                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={resetForm}
                                disabled={saving}
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="save-btn"
                                disabled={saving}
                            >

                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Subject"
                                        : "Save Subject"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* =====================================
                SEARCH TOOLBAR
            ====================================== */}

            <div className="subjects-toolbar">

                <div className="search-box">

                    <input
                        type="text"
                        placeholder="Search by code, name or department..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        aria-label="Search subjects"
                    />

                </div>


                <div className="subject-count">

                    Total Subjects:

                    <strong>
                        {" "}
                        {filteredSubjects.length}
                    </strong>

                </div>

            </div>


            {/* =====================================
                TABLE
            ====================================== */}

            <div className="subjects-table-card">

                {loading ? (

                    <div className="loading">
                        Loading subjects...
                    </div>

                ) : filteredSubjects.length === 0 ? (

                    <div className="empty-state">

                        <h3>
                            No Subjects Found
                        </h3>

                        <p>
                            {search
                                ? "No subjects match your search."
                                : "Add your first subject to get started."
                            }
                        </p>

                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        Code
                                    </th>

                                    <th>
                                        Subject Name
                                    </th>

                                    <th>
                                        Department
                                    </th>

                                    <th>
                                        Credit Hours
                                    </th>

                                    <th>
                                        Weekly Hours
                                    </th>

                                    <th>
                                        Type
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

                                {filteredSubjects.map(
                                    (subject) => (

                                        <tr
                                            key={
                                                subject.SubjectId
                                            }
                                        >

                                            <td>
                                                {
                                                    subject.SubjectId
                                                }
                                            </td>


                                            <td>

                                                <strong>
                                                    {
                                                        subject.SubjectCode
                                                    }
                                                </strong>

                                            </td>


                                            <td>
                                                {
                                                    subject.SubjectName
                                                }
                                            </td>


                                            <td>
                                                {
                                                    subject.DepartmentName ||
                                                    "N/A"
                                                }
                                            </td>


                                            <td>
                                                {
                                                    subject.CreditHours
                                                }
                                            </td>


                                            <td>
                                                {
                                                    subject.WeeklyHours
                                                }
                                            </td>


                                            <td>

                                                {subject.IsPractical ? (

                                                    <span className="badge practical">
                                                        Practical
                                                    </span>

                                                ) : (

                                                    <span className="badge theory">
                                                        Theory
                                                    </span>

                                                )}

                                            </td>


                                            <td>

                                                {subject.IsActive ? (

                                                    <span className="badge active">
                                                        Active
                                                    </span>

                                                ) : (

                                                    <span className="badge inactive">
                                                        Inactive
                                                    </span>

                                                )}

                                            </td>


                                            <td>

                                                <div className="action-buttons">

                                                    <button
                                                        type="button"
                                                        className="edit-btn"
                                                        onClick={() =>
                                                            handleEdit(
                                                                subject
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
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            handleDelete(
                                                                subject.SubjectId
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >

                                                        {deletingId ===
                                                        subject.SubjectId
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


export default Subjects;