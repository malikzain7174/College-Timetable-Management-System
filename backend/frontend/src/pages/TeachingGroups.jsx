import {
    useEffect,
    useState
} from "react";

import {
    getAllTeachingGroups,
    createTeachingGroup,
    updateTeachingGroup,
    deleteTeachingGroup
} from "../services/teachingGroupService";

import {
    getAllTeachingGroupSections,
    syncTeachingGroupSections
} from "../services/teachingGroupSectionService";

import {
    getAllSections
} from "../services/sectionService";

import "./TeachingGroups.css";


const initialForm = {

    GroupName: "",

    CampusId: "",

    AcademicSessionId: "",

    ClassYearId: "",

    IsActive: true,

    SectionIds: []
};


function TeachingGroups() {

    const [groups, setGroups] =
        useState([]);

    const [mappings, setMappings] =
        useState([]);

    const [sections, setSections] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [showForm, setShowForm] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);

    const [search, setSearch] =
        useState("");

    const [formData, setFormData] =
        useState(initialForm);


    // ==================================================
    // LOAD
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadData = async () => {

            try {

                const [
                    groupData,
                    mappingData,
                    sectionData
                ] = await Promise.all([

                    getAllTeachingGroups(),

                    getAllTeachingGroupSections(),

                    getAllSections()
                ]);


                if (cancelled) {
                    return;
                }


                setGroups(
                    Array.isArray(groupData)
                        ? groupData
                        : []
                );


                setMappings(
                    Array.isArray(mappingData)
                        ? mappingData
                        : []
                );


                setSections(
                    Array.isArray(sectionData)
                        ? sectionData
                        : []
                );


            } catch (error) {

                console.error(
                    "Load Teaching Groups Error:",
                    error
                );

                if (!cancelled) {

                    alert(
                        error.response?.data?.message ||
                        "Failed to load Teaching Groups."
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

    const refreshData = async () => {

        const [
            groupData,
            mappingData
        ] = await Promise.all([

            getAllTeachingGroups(),

            getAllTeachingGroupSections()
        ]);


        setGroups(groupData);

        setMappings(mappingData);
    };


    // ==================================================
    // OPTIONS
    // ==================================================

    const uniqueValues = (values) => {

        return [
            ...new Set(
                values
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined
                    )
                    .map(Number)
            )
        ].sort(
            (a, b) => a - b
        );
    };


    const campusOptions =
        uniqueValues(
            sections.map(
                (section) =>
                    section.CampusId
            )
        );


    const sessionOptions =
        uniqueValues(

            sections
                .filter(
                    (section) =>
                        !formData.CampusId ||
                        Number(
                            section.CampusId
                        ) ===
                        Number(
                            formData.CampusId
                        )
                )
                .map(
                    (section) =>
                        section.AcademicSessionId
                )
        );


    const classYearOptions =
        uniqueValues(

            sections
                .filter(
                    (section) =>

                        (!formData.CampusId ||
                            Number(
                                section.CampusId
                            ) ===
                            Number(
                                formData.CampusId
                            ))

                        &&

                        (!formData.AcademicSessionId ||
                            Number(
                                section.AcademicSessionId
                            ) ===
                            Number(
                                formData.AcademicSessionId
                            ))
                )
                .map(
                    (section) =>
                        section.ClassYearId
                )
        );


    const eligibleSections =
        sections.filter(
            (section) =>

                Number(
                    section.CampusId
                ) ===
                Number(
                    formData.CampusId
                )

                &&

                Number(
                    section.AcademicSessionId
                ) ===
                Number(
                    formData.AcademicSessionId
                )

                &&

                Number(
                    section.ClassYearId
                ) ===
                Number(
                    formData.ClassYearId
                )
        );


    // ==================================================
    // NORMAL CHANGE
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
    // SCOPE CHANGE
    // ==================================================

    const handleScopeChange = (
        name,
        value
    ) => {

        setFormData(
            (previous) => {

                const next = {

                    ...previous,

                    [name]:
                        value,

                    SectionIds:
                        []
                };


                if (name === "CampusId") {

                    next.AcademicSessionId =
                        "";

                    next.ClassYearId =
                        "";
                }


                if (
                    name ===
                    "AcademicSessionId"
                ) {

                    next.ClassYearId =
                        "";
                }


                return next;
            }
        );
    };


    // ==================================================
    // SECTION CHECKBOX
    // ==================================================

    const toggleSection = (
        sectionId
    ) => {

        setFormData(
            (previous) => {

                const exists =
                    previous.SectionIds
                        .includes(
                            sectionId
                        );


                return {

                    ...previous,

                    SectionIds:
                        exists

                            ? previous.SectionIds
                                .filter(
                                    (id) =>
                                        id !== sectionId
                                )

                            : [
                                ...previous.SectionIds,
                                sectionId
                            ]
                };
            }
        );
    };


    // ==================================================
    // ADD
    // ==================================================

    const handleAdd = () => {

        setEditingId(null);

        setFormData(
            initialForm
        );

        setShowForm(true);
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit = (group) => {

        const assignedSections =
            mappings
                .filter(
                    (mapping) =>
                        Number(
                            mapping.TeachingGroupId
                        ) ===
                        Number(
                            group.TeachingGroupId
                        )
                )
                .map(
                    (mapping) =>
                        Number(
                            mapping.SectionId
                        )
                );


        setEditingId(
            group.TeachingGroupId
        );


        setFormData({

            GroupName:
                group.GroupName || "",

            CampusId:
                String(
                    group.CampusId
                ),

            AcademicSessionId:
                String(
                    group.AcademicSessionId
                ),

            ClassYearId:
                String(
                    group.ClassYearId
                ),

            IsActive:
                Boolean(
                    group.IsActive
                ),

            SectionIds:
                assignedSections
        });


        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // RESET
    // ==================================================

    const resetForm = () => {

        setFormData(
            initialForm
        );

        setEditingId(null);

        setShowForm(false);
    };


    // ==================================================
    // SAVE
    // ==================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        if (
            !formData.GroupName.trim()
        ) {

            alert(
                "Group Name is required."
            );

            return;
        }


        if (
            !formData.CampusId ||
            !formData.AcademicSessionId ||
            !formData.ClassYearId
        ) {

            alert(
                "Campus, Academic Session and Class Year are required."
            );

            return;
        }


        if (
            formData.SectionIds.length === 0
        ) {

            alert(
                "Please select at least one Section."
            );

            return;
        }


        const data = {

            GroupName:
                formData.GroupName.trim(),

            CampusId:
                Number(
                    formData.CampusId
                ),

            AcademicSessionId:
                Number(
                    formData.AcademicSessionId
                ),

            ClassYearId:
                Number(
                    formData.ClassYearId
                ),

            IsActive:
                Boolean(
                    formData.IsActive
                )
        };


        try {

            setSaving(true);

            let groupId;


            if (editingId) {

                await updateTeachingGroup(
                    editingId,
                    data
                );

                groupId =
                    editingId;

            } else {

                const result =
                    await createTeachingGroup(
                        data
                    );


                groupId =
                    result.teachingGroupId;
            }


            await syncTeachingGroupSections(
                groupId,
                formData.SectionIds
            );


            alert(
                editingId
                    ? "Teaching Group updated successfully."
                    : "Teaching Group created successfully."
            );


            resetForm();

            await refreshData();


        } catch (error) {

            console.error(
                "Save Teaching Group Error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to save Teaching Group."
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
                "Are you sure you want to delete this Teaching Group?"
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(id);


            const result =
                await deleteTeachingGroup(
                    id
                );


            alert(
                result.message
            );


            await refreshData();


        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Failed to delete Teaching Group."
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


    const filteredGroups =
        groups.filter(
            (group) => {

                const groupMappings =
                    mappings.filter(
                        (mapping) =>
                            Number(
                                mapping.TeachingGroupId
                            ) ===
                            Number(
                                group.TeachingGroupId
                            )
                    );


                const sectionText =
                    groupMappings
                        .map(
                            (mapping) =>
                                `${mapping.SectionCode || ""} ${mapping.SectionName || ""}`
                        )
                        .join(" ")
                        .toLowerCase();


                return (

                    group.GroupName
                        ?.toLowerCase()
                        .includes(
                            searchText
                        )

                    ||

                    sectionText.includes(
                        searchText
                    )

                    ||

                    String(
                        group.CampusId
                    ).includes(
                        searchText
                    )
                );
            }
        );


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="teaching-groups-page">

            <div className="tg-header">

                <div>

                    <h1>
                        Teaching Groups
                    </h1>

                    <p>
                        Combine compatible sections into shared teaching groups.
                    </p>

                </div>


                <button
                    type="button"
                    className="tg-add-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Teaching Group
                </button>

            </div>


            {showForm && (

                <div className="tg-form-card">

                    <div className="tg-form-header">

                        <h2>
                            {editingId
                                ? "Edit Teaching Group"
                                : "Add Teaching Group"
                            }
                        </h2>


                        <button
                            type="button"
                            className="tg-close-btn"
                            onClick={
                                resetForm
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

                        <div className="tg-form-grid">


                            <div className="tg-form-group">

                                <label>
                                    Group Name *
                                </label>

                                <input
                                    type="text"
                                    name="GroupName"
                                    maxLength={100}
                                    value={
                                        formData.GroupName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. FSC Part 1 Morning"
                                />

                            </div>


                            <div className="tg-form-group">

                                <label>
                                    Campus *
                                </label>

                                <select
                                    value={
                                        formData.CampusId
                                    }
                                    onChange={
                                        (e) =>
                                            handleScopeChange(
                                                "CampusId",
                                                e.target.value
                                            )
                                    }
                                >

                                    <option value="">
                                        Select Campus
                                    </option>


                                    {campusOptions.map(
                                        (id) => (

                                            <option
                                                key={id}
                                                value={id}
                                            >
                                                Campus {id}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            <div className="tg-form-group">

                                <label>
                                    Academic Session *
                                </label>

                                <select
                                    value={
                                        formData.AcademicSessionId
                                    }
                                    onChange={
                                        (e) =>
                                            handleScopeChange(
                                                "AcademicSessionId",
                                                e.target.value
                                            )
                                    }
                                >

                                    <option value="">
                                        Select Session
                                    </option>


                                    {sessionOptions.map(
                                        (id) => (

                                            <option
                                                key={id}
                                                value={id}
                                            >
                                                Session {id}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            <div className="tg-form-group">

                                <label>
                                    Class Year *
                                </label>

                                <select
                                    value={
                                        formData.ClassYearId
                                    }
                                    onChange={
                                        (e) =>
                                            handleScopeChange(
                                                "ClassYearId",
                                                e.target.value
                                            )
                                    }
                                >

                                    <option value="">
                                        Select Class Year
                                    </option>


                                    {classYearOptions.map(
                                        (id) => (

                                            <option
                                                key={id}
                                                value={id}
                                            >
                                                Class Year {id}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                        </div>


                        <div className="tg-section-selector">

                            <h3>
                                Select Sections
                            </h3>


                            {!formData.CampusId ||
                            !formData.AcademicSessionId ||
                            !formData.ClassYearId ? (

                                <p className="tg-help">
                                    Select Campus, Academic Session and Class Year first.
                                </p>

                            ) : eligibleSections.length === 0 ? (

                                <p className="tg-help">
                                    No matching Sections found.
                                </p>

                            ) : (

                                <div className="tg-section-grid">

                                    {eligibleSections.map(
                                        (section) => {

                                            const checked =
                                                formData.SectionIds
                                                    .includes(
                                                        Number(
                                                            section.SectionId
                                                        )
                                                    );


                                            return (

                                                <label
                                                    key={
                                                        section.SectionId
                                                    }
                                                    className={
                                                        checked
                                                            ? "tg-section-option selected"
                                                            : "tg-section-option"
                                                    }
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            checked
                                                        }
                                                        onChange={() =>
                                                            toggleSection(
                                                                Number(
                                                                    section.SectionId
                                                                )
                                                            )
                                                        }
                                                    />


                                                    <span>

                                                        <strong>
                                                            {
                                                                section.SectionCode
                                                            }
                                                        </strong>

                                                        <small>
                                                            {
                                                                section.SectionName
                                                            }
                                                        </small>

                                                    </span>

                                                </label>
                                            );
                                        }
                                    )}

                                </div>
                            )}

                        </div>


                        <div className="tg-active-row">

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
                                />

                                Active Teaching Group

                            </label>

                        </div>


                        <div className="tg-form-actions">

                            <button
                                type="button"
                                className="tg-cancel-btn"
                                onClick={
                                    resetForm
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="tg-save-btn"
                                disabled={
                                    saving
                                }
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Group"
                                        : "Save Group"
                                }
                            </button>

                        </div>

                    </form>

                </div>
            )}


            <div className="tg-toolbar">

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
                    placeholder="Search groups or sections..."
                />


                <span>
                    Total Groups:{" "}
                    <strong>
                        {
                            filteredGroups.length
                        }
                    </strong>
                </span>

            </div>


            <div className="tg-table-card">

                {loading ? (

                    <div className="tg-message">
                        Loading Teaching Groups...
                    </div>

                ) : filteredGroups.length === 0 ? (

                    <div className="tg-message">
                        No Teaching Groups found.
                    </div>

                ) : (

                    <div className="tg-table-wrapper">

                        <table>

                            <thead>

                                <tr>
                                    <th>ID</th>
                                    <th>Group Name</th>
                                    <th>Campus</th>
                                    <th>Session</th>
                                    <th>Class Year</th>
                                    <th>Sections</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>

                            </thead>


                            <tbody>

                                {filteredGroups.map(
                                    (group) => {

                                        const groupMappings =
                                            mappings.filter(
                                                (mapping) =>
                                                    Number(
                                                        mapping.TeachingGroupId
                                                    ) ===
                                                    Number(
                                                        group.TeachingGroupId
                                                    )
                                            );


                                        return (

                                            <tr
                                                key={
                                                    group.TeachingGroupId
                                                }
                                            >

                                                <td>
                                                    {
                                                        group.TeachingGroupId
                                                    }
                                                </td>


                                                <td>
                                                    <strong>
                                                        {
                                                            group.GroupName
                                                        }
                                                    </strong>
                                                </td>


                                                <td>
                                                    {
                                                        group.CampusId
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        group.AcademicSessionId
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        group.ClassYearId
                                                    }
                                                </td>


                                                <td>

                                                    <div className="tg-section-badges">

                                                        {groupMappings.length === 0
                                                            ? "—"
                                                            : groupMappings.map(
                                                                (mapping) => (

                                                                    <span
                                                                        key={
                                                                            mapping.TeachingGroupSectionId
                                                                        }
                                                                        className="tg-section-badge"
                                                                    >
                                                                        {
                                                                            mapping.SectionCode ||
                                                                            mapping.SectionName
                                                                        }
                                                                    </span>

                                                                )
                                                            )
                                                        }

                                                    </div>

                                                </td>


                                                <td>

                                                    <span
                                                        className={
                                                            group.IsActive
                                                                ? "tg-badge tg-active"
                                                                : "tg-badge tg-inactive"
                                                        }
                                                    >
                                                        {
                                                            group.IsActive
                                                                ? "Active"
                                                                : "Inactive"
                                                        }
                                                    </span>

                                                </td>


                                                <td>

                                                    <div className="tg-actions">

                                                        <button
                                                            type="button"
                                                            className="tg-edit-btn"
                                                            onClick={() =>
                                                                handleEdit(
                                                                    group
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="tg-delete-btn"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    group.TeachingGroupId
                                                                )
                                                            }
                                                            disabled={
                                                                deletingId !== null
                                                            }
                                                        >
                                                            {deletingId ===
                                                            group.TeachingGroupId
                                                                ? "Deleting..."
                                                                : "Delete"
                                                            }
                                                        </button>

                                                    </div>

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


export default TeachingGroups;