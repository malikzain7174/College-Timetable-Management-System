import {
    useEffect,
    useState
} from "react";

import {
    getAllTimeSlots,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot
} from "../services/timeSlotService";

import "./TimeSlots.css";


const DAY_OPTIONS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" }
];


const initialFormData = {

    DayOfWeek: "1",

    StartTime: "",

    EndTime: "",

    SlotName: "",

    IsActive: true
};


function TimeSlots() {

    // ==================================================
    // STATE
    // ==================================================

    const [timeSlots, setTimeSlots] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [showForm, setShowForm] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadInitialData = async () => {

            try {

                const data =
                    await getAllTimeSlots();


                if (!cancelled) {

                    setTimeSlots(
                        Array.isArray(data)
                            ? data
                            : []
                    );
                }


            } catch (error) {

                console.error(
                    "Load time slots error:",
                    error
                );


                if (!cancelled) {

                    alert(
                        error.response?.data?.message ||
                        "Failed to load time slots."
                    );
                }


            } finally {

                if (!cancelled) {

                    setLoading(false);
                }
            }
        };


        loadInitialData();


        return () => {

            cancelled = true;

        };

    }, []);


    // ==================================================
    // REFRESH
    // ==================================================

    const refreshTimeSlots = async () => {

        const data =
            await getAllTimeSlots();


        setTimeSlots(
            Array.isArray(data)
                ? data
                : []
        );
    };


    // ==================================================
    // HELPERS
    // ==================================================

    const getDayName = (
        dayNumber
    ) => {

        const day =
            DAY_OPTIONS.find(
                (item) =>
                    item.value ===
                    Number(dayNumber)
            );


        return day
            ? day.label
            : `Day ${dayNumber}`;
    };


    const getInputTime = (value) => {

        if (!value) {
            return "";
        }

        return String(value).slice(
            0,
            5
        );
    };


    const formatTime = (value) => {

        if (!value) {
            return "—";
        }


        const time =
            String(value).slice(
                0,
                5
            );


        const [
            hourText,
            minute
        ] = time.split(":");


        const hour =
            Number(hourText);


        const suffix =
            hour >= 12
                ? "PM"
                : "AM";


        const displayHour =
            hour % 12 || 12;


        return `${displayHour}:${minute} ${suffix}`;
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


        setFormData((previous) => ({

            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
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

    const handleEdit = (slot) => {

        setEditingId(
            slot.TimeSlotId
        );


        setFormData({

            DayOfWeek:
                String(
                    slot.DayOfWeek
                ),

            StartTime:
                getInputTime(
                    slot.StartTime
                ),

            EndTime:
                getInputTime(
                    slot.EndTime
                ),

            SlotName:
                slot.SlotName || "",

            IsActive:
                Boolean(
                    slot.IsActive
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

        const day =
            Number(
                formData.DayOfWeek
            );


        if (
            !Number.isInteger(day) ||
            day < 1 ||
            day > 7
        ) {

            alert(
                "Please select a valid day."
            );

            return false;
        }


        if (!formData.StartTime) {

            alert(
                "Start Time is required."
            );

            return false;
        }


        if (!formData.EndTime) {

            alert(
                "End Time is required."
            );

            return false;
        }


        if (
            formData.StartTime >=
            formData.EndTime
        ) {

            alert(
                "End Time must be after Start Time."
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


        const timeSlotData = {

            DayOfWeek:
                Number(
                    formData.DayOfWeek
                ),

            StartTime:
                formData.StartTime,

            EndTime:
                formData.EndTime,

            SlotName:
                formData.SlotName.trim(),

            IsActive:
                Boolean(
                    formData.IsActive
                )
        };


        try {

            setSaving(true);


            if (editingId) {

                await updateTimeSlot(
                    editingId,
                    timeSlotData
                );


                alert(
                    "Time slot updated successfully."
                );


            } else {

                await createTimeSlot(
                    timeSlotData
                );


                alert(
                    "Time slot added successfully."
                );
            }


            resetForm();

            await refreshTimeSlots();


        } catch (error) {

            console.error(
                "Save time slot error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to save time slot."
            );


        } finally {

            setSaving(false);
        }
    };


    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete = async (
        timeSlotId
    ) => {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this time slot?"
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                timeSlotId
            );


            const result =
                await deleteTimeSlot(
                    timeSlotId
                );


            alert(
                result.message ||
                "Time slot processed successfully."
            );


            await refreshTimeSlots();


        } catch (error) {

            console.error(
                "Delete time slot error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to delete time slot."
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


    const filteredTimeSlots =
        timeSlots.filter((slot) => {

            const dayName =
                getDayName(
                    slot.DayOfWeek
                ).toLowerCase();


            return (

                dayName.includes(
                    searchText
                )

                ||

                slot.SlotName
                    ?.toLowerCase()
                    .includes(
                        searchText
                    )

                ||

                String(
                    slot.StartTime || ""
                ).includes(
                    searchText
                )

                ||

                String(
                    slot.EndTime || ""
                ).includes(
                    searchText
                )
            );
        });


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="timeslots-page">


            {/* HEADER */}

            <div className="timeslots-header">

                <div>

                    <h1>
                        Time Slots
                    </h1>

                    <p>
                        Manage timetable periods and daily class timings.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-timeslot-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Time Slot
                </button>

            </div>


            {/* FORM */}

            {showForm && (

                <div className="timeslot-form-card">

                    <div className="timeslot-form-header">

                        <h2>

                            {editingId
                                ? "Edit Time Slot"
                                : "Add New Time Slot"
                            }

                        </h2>


                        <button
                            type="button"
                            className="timeslot-close-btn"
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

                        <div className="timeslot-form-grid">


                            {/* DAY */}

                            <div className="timeslot-form-group">

                                <label htmlFor="DayOfWeek">
                                    Day *
                                </label>


                                <select
                                    id="DayOfWeek"
                                    name="DayOfWeek"
                                    value={
                                        formData.DayOfWeek
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                >

                                    {DAY_OPTIONS.map(
                                        (day) => (

                                            <option
                                                key={
                                                    day.value
                                                }
                                                value={
                                                    day.value
                                                }
                                            >
                                                {
                                                    day.label
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* SLOT NAME */}

                            <div className="timeslot-form-group">

                                <label htmlFor="SlotName">
                                    Slot Name
                                </label>

                                <input
                                    id="SlotName"
                                    type="text"
                                    name="SlotName"
                                    maxLength={50}
                                    value={
                                        formData.SlotName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Period 1"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* START */}

                            <div className="timeslot-form-group">

                                <label htmlFor="StartTime">
                                    Start Time *
                                </label>

                                <input
                                    id="StartTime"
                                    type="time"
                                    name="StartTime"
                                    value={
                                        formData.StartTime
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* END */}

                            <div className="timeslot-form-group">

                                <label htmlFor="EndTime">
                                    End Time *
                                </label>

                                <input
                                    id="EndTime"
                                    type="time"
                                    name="EndTime"
                                    value={
                                        formData.EndTime
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            {/* ACTIVE */}

                            <div className="timeslot-checkbox-group">

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
                                        Active Time Slot
                                    </span>

                                </label>

                            </div>

                        </div>


                        <div className="timeslot-form-actions">

                            <button
                                type="button"
                                className="timeslot-cancel-btn"
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
                                className="timeslot-save-btn"
                                disabled={
                                    saving
                                }
                            >

                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Time Slot"
                                        : "Save Time Slot"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* TOOLBAR */}

            <div className="timeslots-toolbar">

                <div className="timeslots-search">

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
                        placeholder="Search by day, slot name or time..."
                    />

                </div>


                <div className="timeslot-count">

                    Total Time Slots:

                    <strong>
                        {" "}
                        {
                            filteredTimeSlots.length
                        }
                    </strong>

                </div>

            </div>


            {/* TABLE */}

            <div className="timeslots-table-card">

                {loading ? (

                    <div className="timeslots-loading">
                        Loading time slots...
                    </div>

                ) : filteredTimeSlots.length === 0 ? (

                    <div className="timeslots-empty">

                        <h3>
                            No Time Slots Found
                        </h3>

                        <p>

                            {search
                                ? "No time slots match your search."
                                : "Add your first time slot."
                            }

                        </p>

                    </div>

                ) : (

                    <div className="timeslots-table-wrapper">

                        <table>

                            <thead>

                                <tr>
                                    <th>ID</th>
                                    <th>Day</th>
                                    <th>Slot</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>

                            </thead>


                            <tbody>

                                {filteredTimeSlots.map(
                                    (slot) => {

                                        const startMinutes =
                                            Number(
                                                slot.StartTime?.slice(
                                                    0,
                                                    2
                                                )
                                            ) * 60 +
                                            Number(
                                                slot.StartTime?.slice(
                                                    3,
                                                    5
                                                )
                                            );


                                        const endMinutes =
                                            Number(
                                                slot.EndTime?.slice(
                                                    0,
                                                    2
                                                )
                                            ) * 60 +
                                            Number(
                                                slot.EndTime?.slice(
                                                    3,
                                                    5
                                                )
                                            );


                                        const duration =
                                            endMinutes -
                                            startMinutes;


                                        return (

                                            <tr
                                                key={
                                                    slot.TimeSlotId
                                                }
                                            >

                                                <td>
                                                    {
                                                        slot.TimeSlotId
                                                    }
                                                </td>


                                                <td>

                                                    <strong>
                                                        {
                                                            getDayName(
                                                                slot.DayOfWeek
                                                            )
                                                        }
                                                    </strong>

                                                </td>


                                                <td>
                                                    {
                                                        slot.SlotName ||
                                                        "—"
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        formatTime(
                                                            slot.StartTime
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        formatTime(
                                                            slot.EndTime
                                                        )
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        duration
                                                    } min
                                                </td>


                                                <td>

                                                    {slot.IsActive ? (

                                                        <span className="timeslot-badge timeslot-active">
                                                            Active
                                                        </span>

                                                    ) : (

                                                        <span className="timeslot-badge timeslot-inactive">
                                                            Inactive
                                                        </span>

                                                    )}

                                                </td>


                                                <td>

                                                    <div className="timeslot-actions">

                                                        <button
                                                            type="button"
                                                            className="timeslot-edit-btn"
                                                            onClick={() =>
                                                                handleEdit(
                                                                    slot
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
                                                            className="timeslot-delete-btn"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    slot.TimeSlotId
                                                                )
                                                            }
                                                            disabled={
                                                                deletingId !== null
                                                            }
                                                        >

                                                            {deletingId ===
                                                            slot.TimeSlotId
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


export default TimeSlots;