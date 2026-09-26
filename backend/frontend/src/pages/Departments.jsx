import {
    useEffect,
    useMemo,
    useState
} from "react";


import {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "../services/departmentService";


import "./Departments.css";


const emptyForm = {

    DepartmentName: "",

    DepartmentCode: "",

    IsActive: true
};


function Departments() {

    const [
        departments,
        setDepartments
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
        deletingId,
        setDeletingId
    ] = useState(null);


    const [
        search,
        setSearch
    ] = useState("");


    const [
        error,
        setError
    ] = useState("");


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled =
            false;


        getAllDepartments()

            .then(
                data => {

                    if (
                        cancelled
                    ) {

                        return;
                    }


                    setDepartments(

                        Array.isArray(
                            data
                        )
                            ? data
                            : []
                    );
                }
            )

            .catch(
                err => {

                    if (
                        cancelled
                    ) {

                        return;
                    }


                    console.error(

                        "Load departments error:",

                        err
                    );


                    setError(

                        err.response
                            ?.data
                            ?.message

                        ||

                        "Failed to load departments."
                    );
                }
            )

            .finally(
                () => {

                    if (
                        !cancelled
                    ) {

                        setLoading(
                            false
                        );
                    }
                }
            );


        return () => {

            cancelled =
                true;
        };

    }, []);


    // ==================================================
    // REFRESH
    // ==================================================

    const refreshDepartments =
        async () => {

            const data =
                await getAllDepartments();


            setDepartments(

                Array.isArray(
                    data
                )
                    ? data
                    : []
            );
        };


    // ==================================================
    // RESET
    // ==================================================

    const resetForm = () => {

        setForm(
            emptyForm
        );


        setEditingId(
            null
        );


        setShowForm(
            false
        );


        setError("");
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


        setError("");
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit =
        department => {

            setEditingId(
                department
                    .DepartmentId
            );


            setForm({

                DepartmentName:
                    department
                        .DepartmentName
                    || "",

                DepartmentCode:
                    department
                        .DepartmentCode
                    || "",

                IsActive:
                    Boolean(
                        department
                            .IsActive
                    )
            });


            setShowForm(
                true
            );


            setError("");


            window.scrollTo({

                top: 0,

                behavior:
                    "smooth"
            });
        };


    // ==================================================
    // INPUT
    // ==================================================

    const handleChange =
        event => {

            const {

                name,

                value,

                type,

                checked

            } =
                event.target;


            setForm(
                previous => ({

                    ...previous,

                    [name]:

                        type ===
                        "checkbox"

                            ? checked

                            : name ===
                              "DepartmentCode"

                                ? value
                                    .toUpperCase()

                                : value
                })
            );
        };


    // ==================================================
    // SAVE
    // ==================================================

    const handleSubmit =
        async (
            event
        ) => {

            event.preventDefault();


            if (
                !form
                    .DepartmentName
                    .trim()
            ) {

                setError(
                    "Department name is required."
                );

                return;
            }


            if (
                !form
                    .DepartmentCode
                    .trim()
            ) {

                setError(
                    "Department code is required."
                );

                return;
            }


            try {

                setSaving(
                    true
                );


                setError("");


                const data = {

                    DepartmentName:
                        form
                            .DepartmentName
                            .trim(),

                    DepartmentCode:
                        form
                            .DepartmentCode
                            .trim()
                            .toUpperCase(),

                    IsActive:
                        Boolean(
                            form.IsActive
                        )
                };


                if (
                    editingId
                ) {

                    await updateDepartment(

                        editingId,

                        data
                    );

                } else {

                    await createDepartment(
                        data
                    );
                }


                resetForm();


                await refreshDepartments();


            } catch (err) {

                console.error(

                    "Save department error:",

                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to save department."
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
        async (
            id
        ) => {

            const confirmed =
                window.confirm(

                    "Are you sure you want to delete this department?"
                );


            if (
                !confirmed
            ) {

                return;
            }


            try {

                setDeletingId(
                    id
                );


                setError("");


                await deleteDepartment(
                    id
                );


                await refreshDepartments();


            } catch (err) {

                console.error(

                    "Delete department error:",

                    err
                );


                setError(

                    err.response
                        ?.data
                        ?.message

                    ||

                    "Failed to delete department."
                );


            } finally {

                setDeletingId(
                    null
                );
            }
        };


    // ==================================================
    // SEARCH
    // ==================================================

    const filteredDepartments =
        useMemo(() => {

            const text =
                search
                    .trim()
                    .toLowerCase();


            if (!text) {

                return departments;
            }


            return departments.filter(
                item =>

                    item.DepartmentName
                        ?.toLowerCase()
                        .includes(
                            text
                        )

                    ||

                    item.DepartmentCode
                        ?.toLowerCase()
                        .includes(
                            text
                        )
            );

        }, [
            departments,
            search
        ]);


    return (

        <div className="departments-page">


            <div className="departments-header">

                <div>

                    <h1>
                        Departments
                    </h1>


                    <p>
                        Manage academic departments used by subjects and teachers.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-department-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Department
                </button>

            </div>


            {error && (

                <div className="department-error">

                    {error}

                </div>
            )}


            {showForm && (

                <div className="department-form-card">


                    <div className="form-header">

                        <h2>

                            {editingId
                                ? "Edit Department"
                                : "Add New Department"
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

                        <div className="department-form-grid">


                            <div className="form-group">

                                <label>
                                    Department Name
                                </label>


                                <input
                                    type="text"
                                    name="DepartmentName"
                                    value={
                                        form.DepartmentName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Islamiat"
                                    disabled={
                                        saving
                                    }
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Department Code
                                </label>


                                <input
                                    type="text"
                                    name="DepartmentCode"
                                    value={
                                        form.DepartmentCode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. ISL"
                                    maxLength={
                                        20
                                    }
                                    disabled={
                                        saving
                                    }
                                    required
                                />

                            </div>


                            <div
                                className="
                                    form-group
                                    department-checkbox
                                "
                            >

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
                                        disabled={
                                            saving
                                        }
                                    />

                                    Active Department

                                </label>

                            </div>

                        </div>


                        <div className="department-form-actions">

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
                                        ? "Update Department"
                                        : "Save Department"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            <div className="departments-table-card">


                <div className="departments-toolbar">

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={
                            e =>
                                setSearch(
                                    e.target.value
                                )
                        }
                        placeholder="Search department..."
                    />


                    <span>

                        Total Departments:{" "}

                        <strong>
                            {
                                filteredDepartments
                                    .length
                            }
                        </strong>

                    </span>

                </div>


                {loading ? (

                    <div className="department-state">

                        Loading departments...

                    </div>

                ) : filteredDepartments.length === 0 ? (

                    <div className="department-state">

                        No departments found.

                    </div>

                ) : (

                    <div className="department-table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Department
                                    </th>

                                    <th>
                                        Code
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

                                {filteredDepartments.map(
                                    department => (

                                        <tr
                                            key={
                                                department.DepartmentId
                                            }
                                        >

                                            <td>

                                                <strong>

                                                    {
                                                        department.DepartmentName
                                                    }

                                                </strong>

                                            </td>


                                            <td>

                                                {
                                                    department.DepartmentCode
                                                }

                                            </td>


                                            <td>

                                                <span
                                                    className={
                                                        department.IsActive
                                                            ? "department-status active"
                                                            : "department-status inactive"
                                                    }
                                                >

                                                    {
                                                        department.IsActive
                                                            ? "Active"
                                                            : "Inactive"
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                <div className="department-actions">

                                                    <button
                                                        type="button"
                                                        className="edit-btn"
                                                        onClick={
                                                            () =>
                                                                handleEdit(
                                                                    department
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
                                                            department.DepartmentId
                                                        }
                                                        onClick={
                                                            () =>
                                                                handleDelete(
                                                                    department.DepartmentId
                                                                )
                                                        }
                                                    >

                                                        {deletingId ===
                                                        department.DepartmentId

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


export default Departments;